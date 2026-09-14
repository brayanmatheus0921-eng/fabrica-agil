import { requireAuth } from "@/server/auth";
import { Agent, run, tool } from "@openai/agents";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { readWorkshop, executableWorkshopPatchSchema, WORKSHOP_STAGES, type WorkshopStage } from "@/core/coo-workshop";
import { loadCompanyContext } from "@/server/ai/company-context";
import { INDUSTRIAL_CONSULTANT_INSTRUCTIONS } from "@/server/ai/prompt";
import { generations, sameOrigin } from "@/server/ai/chat-generation";
import { prepareAction, proposeAction, proposalView } from "@/server/coo/action-service";
import { readSystem, systemQuerySchema } from "@/server/coo/read-system";
import type { CooAction } from "@/core/coo-actions";
import { COO_ACTION_INSTRUCTIONS } from "@/server/coo/instructions";
import { canvasSchema, validateCanvas } from "@/core/workspace-artifacts";
import { CANVAS_INSTRUCTIONS } from "@/server/ai/artifact-agent";
import { taskProgress } from "@/core/task-progress";
import { findReusableCanvas } from "@/server/artifact-deduplication";

export const runtime = "nodejs";
export const maxDuration = 180;
const inputSchema = z.object({ threadId: z.string().min(1).max(200), requestId: z.string().uuid(), message: z.string().trim().min(1).max(6000) });

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Escreva uma mensagem de até 6.000 caracteres." }, { status: 400 });
  if (!env.OPENAI_API_KEY) return Response.json({ error: "Integração do COO não configurada." }, { status: 503 });
  const { threadId: requestedThreadId, requestId, message } = parsed.data;
  const controller = new AbortController();
  const disconnect = () => controller.abort();
  request.signal.addEventListener("abort", disconnect, { once: true });
  if (request.signal.aborted) controller.abort();
  const userId = `user-${requestId}`, assistantId = `assistant-${requestId}`;
  const lockedThreadId = await prisma.$transaction(async tx => {
    let targetThreadId = requestedThreadId;
    if (requestedThreadId === "new") {
      const cleanTitle = message.replace(/\s+/g, " ").trim();
      const created = await tx.conversationThread.create({ data: {
        companyId: auth.companyId,
        title: cleanTitle.length > 72 ? `${cleanTitle.slice(0, 69)}…` : cleanTitle,
        generationId: requestId,
        generationStartedAt: new Date(),
      }, select: { id: true } });
      targetThreadId = created.id;
    } else {
      const lock = await tx.conversationThread.updateMany({ where: { id: requestedThreadId, companyId: auth.companyId,
        OR: [{ generationId: null }, { generationStartedAt: { lt: new Date(Date.now() - 180_000) } }] },
        data: { generationId: requestId, generationStartedAt: new Date() } });
      if (!lock.count) return null;
    }
    if (await tx.conversationMessage.findUnique({ where: { id: userId } })) throw new Error("Mensagem já recebida.");
    await tx.conversationMessage.create({ data: { id: userId, threadId: targetThreadId, authorUserId: auth.userId, role: "USER", content: message } });
    return targetThreadId;
  }).catch(() => null);
  if (!lockedThreadId) return Response.json({ error: "Aguarde a resposta atual terminar. Sua mensagem não foi reenviada." }, { status: 409 });
  const threadId = lockedThreadId;
  generations.set(requestId, controller);
  const timer = setTimeout(() => controller.abort(new Error("Tempo de resposta excedido")), 150_000);
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(output) {
      let text = "";
      const emit = (event: object) => { try { output.enqueue(encoder.encode(JSON.stringify(event) + "\n")); } catch { controller.abort(); } };
      try {
        emit({ type: "ack", userId, assistantId, threadId });
        emit({ type: "activity", text: "Consultando o diagnóstico e o contexto salvo…" });
        const thread = await prisma.conversationThread.findFirstOrThrow({ where: { id: threadId, companyId: auth.companyId }, include: { messages: { orderBy: { createdAt: "desc" }, take: 40 } } });
        const current = readWorkshop(thread.workflowState);
        let actionDraft: CooAction | null = null;
        const context = await loadCompanyContext(auth.companyId);
        const diagnosis = current ? await prisma.diagnosticSession.findFirst({ where: { id: current.diagnosticId, companyId: auth.companyId, status: "COMPLETED" }, include: { answers: { include: { question: true } } } }) : null;
        if (current && !diagnosis) throw new Error("Diagnóstico indisponível");
        const methods = await prisma.improvementMethod.findMany({ where: { status: "ACTIVE" }, include: { versions: { where: { publishedAt: { not: null } }, orderBy: { version: "desc" }, take: 1 } } });
        const catalog = methods.filter(m => m.versions.length).map(m => ({ code: m.code, name: m.name, description: m.description, steps: m.versions[0].steps }));
        const nextStage = current ? WORKSHOP_STAGES[Math.min(5, WORKSHOP_STAGES.indexOf(current.stage) + 1)] : "UNDERSTAND";
        const allowedStages = WORKSHOP_STAGES.slice(0, WORKSHOP_STAGES.indexOf(nextStage) + 1) as [WorkshopStage, ...WorkshopStage[]];
        async function stageAction(raw: unknown) {
          if (actionDraft) return "Já existe uma proposta nesta resposta. Aguarde a aprovação antes de propor outra ação.";
          try {
            const prepared = await prepareAction(prisma, auth, threadId, raw);
            actionDraft = prepared.action;
            return JSON.stringify({ summary: prepared.summary, details: prepared.details, notice: "Somente proposta. Nenhuma alteração foi executada. Termine perguntando exatamente a pergunta summary. O cartão Aprovar aparecerá ao concluir a resposta." });
          } catch(e) { return e instanceof Error ? e.message : "Ação inválida"; }
        }
        const propose = tool({ name: "propor_acao", description: "Prepara uma única alteração para aprovação humana. Nunca executa. actionJson deve seguir o catálogo de ações nas instruções.", parameters: z.object({ actionJson: z.string() }), execute: async ({actionJson}) => { try { return await stageAction(JSON.parse(actionJson)); } catch { return "JSON inválido; corrija os campos."; } } });
        const consult = tool({ name: "consultar_sistema", description: "Consulta registros reais por empresa, ID, projeto e nome; use paginação. Use para identificar o destino antes de propor qualquer alteração. Somente leitura.", parameters: systemQuerySchema, execute: async q => JSON.stringify(await readSystem(prisma,auth.companyId,q)) });
        const register = tool({ name: "registrar_etapa_plano", description: `Propõe revisão completa, depende de aprovação pelo cartão. Etapa atual: ${current?.stage}. Próxima etapa permitida: ${nextStage}.`, parameters: executableWorkshopPatchSchema.extend({ stage: z.enum(allowedStages) }), execute: patch => stageAction({type:"workshop.patch",patch}) });
        const skill = current ? await readFile(path.join(process.cwd(), "docs/ai/skills/coo-plano-colaborativo/SKILL.md"), "utf8") : "";
        const createCanvas = tool({ name: "criar_ferramenta_canvas", description: "Cria ou reutiliza no Canvas uma planilha ou documento editável pedido ou aceito pelo gestor. Para uma ferramenta repetida, use REUSE. Se o usuário pedir funções novas e já existir uma versão, primeiro pergunte se deseja manter a antiga ou substituí-la; só depois use KEEP_BOTH ou REPLACE conforme a resposta. Não altera tarefas ou aprovações. " + CANVAS_INSTRUCTIONS, parameters: canvasSchema.extend({ taskId: z.string().nullable(), duplicateHandling: z.enum(["REUSE", "KEEP_BOTH", "REPLACE"]) }), execute: async raw => {
          const content = validateCanvas(raw);
          if (raw.taskId && !await prisma.task.findFirst({ where: { id: raw.taskId, companyId: auth.companyId, ...(current?.planId ? {actionPlanId: current.planId} : {}) } })) return "Tarefa inválida. Use uma tarefa deste plano ou null.";
          const existing = await findReusableCanvas({ companyId: auth.companyId, title: content.title, kind: content.kind, taskId: raw.taskId, threadId });
          if (existing && raw.duplicateHandling === "REUSE") return `A ferramenta já existe: ${existing.title}. Está em Ferramentas e arquivos. Nenhuma alteração feita.`;
          return stageAction({ type:"artifact.save", content, taskId:raw.taskId, replaceArtifactId:existing && raw.duplicateHandling === "REPLACE" ? existing.id : null });
        }});
        const agent = new Agent({ name: "COO Fábrica Ágil", model: env.OPENAI_MODEL ?? "gpt-5.6-luna", tools: current && current.stage !== "FOLLOW_UP" ? [consult, propose, register, createCanvas] : [consult, propose, createCanvas],
          instructions: `${INDUSTRIAL_CONSULTANT_INSTRUCTIONS}\n${skill}\n${COO_ACTION_INSTRUCTIONS}`,
        });
        // Selected diagnosis is authoritative; historical model prose is not matrix evidence.
        const snapshot = diagnosis?.resultSnapshot && typeof diagnosis.resultSnapshot === "object" ? { ...diagnosis.resultSnapshot as object } as Record<string, unknown> : null;
        if (snapshot) { delete snapshot.analysis; delete snapshot.analysisError; }
        const selectedPlan = current?.planId ? await prisma.actionPlan.findFirst({ where: { id: current.planId, companyId: auth.companyId }, include: { tasks: { include: { evidence: { orderBy: { createdAt: "desc" }, take: 100 } } }, checkins: { orderBy: { createdAt: "desc" }, take: 5 } } }) : null;
        const progressPlan = selectedPlan ?? (!current ? await prisma.actionPlan.findFirst({ where: { companyId: auth.companyId, status: "ACTIVE" }, orderBy: { createdAt: "desc" }, include: { tasks: { include: { evidence: true } } } }) : null);
        const artifacts = await prisma.workspaceArtifact.findMany({ where: { companyId: auth.companyId, OR: [{threadId}, ...(progressPlan ? [{taskId: {in: progressPlan.tasks.map(t=>t.id)}}] : [])] }, select: {id:true,title:true,taskId:true,kind:true,confirmedAt:true,interpretation:true}, orderBy:{updatedAt:"desc"},take:30 });
        const automaticProgress = progressPlan ? taskProgress(progressPlan.tasks, artifacts) : null;
        const scopedContext = current ? { company: context.company, selectedPlan, memories: context.memories, note: "Use exclusivamente o diagnóstico selecionado abaixo. Memórias são contexto histórico, não substituem a matriz." } : context;
        const projects = await readSystem(prisma, auth.companyId, {area:"projects",query:"",projectId:null,recordId:null,offset:0});
        const input = JSON.stringify({ today: new Date().toLocaleDateString("sv-SE", {timeZone:"America/Sao_Paulo"}), projects, context: scopedContext, automaticProgress, artifacts: artifacts.map(a=>({...a, interpretation:a.confirmedAt?a.interpretation:null, notice:a.confirmedAt?"Leitura confirmada pelo usuário; não prova independente.":"Rascunho ou leitura pendente; não usar como resultado."})), workshop: current, diagnosis: diagnosis ? { id: diagnosis.id, title: diagnosis.title, matrix: snapshot, answers: diagnosis.answers.map(a => ({ code: a.question.code, question: a.question.prompt, value: a.value, notes: a.notes })) } : null, methods: catalog, messages: [...thread.messages].reverse().map(m => ({ id: m.id, role: m.role, content: m.content })) });
        emit({ type: "activity", text: "Preparando uma resposta e o próximo passo…" });
        const result = await run(agent, input, { stream: true, signal: controller.signal, maxTurns: 5 });
        for await (const chunk of result.toTextStream()) {
          if (controller.signal.aborted) throw new Error("Resposta interrompida");
          text += chunk;
          emit({ type: "delta", text: chunk });
        }
        await result.completed;
        if (controller.signal.aborted || !text.trim()) throw new Error("Resposta interrompida ou vazia");
        const saved = await prisma.$transaction(async tx => {
          if (current) {
            const source = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM "DiagnosticSession" WHERE id = ${current.diagnosticId} AND "companyId" = ${auth.companyId} FOR UPDATE`;
            if (!source.length) throw new Error("O diagnóstico foi excluído durante a conversa.");
          }
          await tx.$queryRaw`SELECT id FROM "ConversationThread" WHERE id = ${threadId} FOR UPDATE`;
          const fresh = await tx.conversationThread.findFirst({ where: { id: threadId, companyId: auth.companyId, generationId: requestId } });
          if (!fresh || controller.signal.aborted) throw new Error("Resposta interrompida");
          const proposal = actionDraft ? await proposeAction(tx, auth, threadId, userId, actionDraft) : null;
          await tx.conversationMessage.create({ data: { id: assistantId, threadId, role: "ASSISTANT", content: text, metadata: { requestId } } });
          await tx.conversationThread.update({ where: { id: threadId }, data: { lastMessageAt: new Date(), generationId: null, generationStartedAt: null,  } });
          return { state: current, proposal: proposal ? proposalView(proposal) : null };
        });
        emit({ type: "done", state: saved.state, proposal: saved.proposal });
      } catch (error) {
        const interrupted = controller.signal.aborted;
        console.error("COO chat:", interrupted ? "interrupted" : error instanceof Error ? error.name : "failed");
        // Partial text remains visible and explicitly marked, but tool changes are discarded.
        await prisma.conversationMessage.upsert({ where: { id: assistantId }, update: {}, create: { id: assistantId, threadId, role: "ASSISTANT", content: text || (interrupted ? "Resposta interrompida. Você pode continuar quando quiser." : "Não consegui responder agora. Sua mensagem está salva; tente novamente."), metadata: { interrupted, failed: !interrupted, requestId } } }).catch(() => undefined);
        emit({ type: interrupted ? "stopped" : "error", text: interrupted ? "Resposta interrompida. As confirmações desta resposta não foram aplicadas." : "Não foi possível concluir. A mensagem ficou salva; tente novamente." });
      } finally {
        clearTimeout(timer); generations.delete(requestId); request.signal.removeEventListener("abort", disconnect);
        await prisma.conversationThread.updateMany({ where: { id: threadId, generationId: requestId }, data: { generationId: null, generationStartedAt: null } });
        try { output.close(); } catch { /* Disconnected client. */ }
      }
    },
    cancel() { controller.abort(); },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" } });
}

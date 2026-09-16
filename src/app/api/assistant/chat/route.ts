import { requireAuth } from "@/server/auth";
import { Agent, run, tool } from "@openai/agents";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { readWorkshop } from "@/core/coo-workshop";
import { loadCompanyContext } from "@/server/ai/company-context";
import { INDUSTRIAL_CONSULTANT_INSTRUCTIONS } from "@/server/ai/prompt";
import { generations, sameOrigin } from "@/server/ai/chat-generation";
import { prepareAction, proposeAction, proposalView } from "@/server/coo/action-service";
import { readSystem, systemQuerySchema } from "@/server/coo/read-system";
import { interviewResumeEligible, type CooAction } from "@/core/coo-actions";
import { COO_ACTION_INSTRUCTIONS } from "@/server/coo/instructions";
import { WORKSHOP_AGENT_INSTRUCTIONS, completePlanExecution, groundedInterviewSchema, renderInterviewQuestion } from "@/server/ai/workshop-agent";
import { canvasSchema, validateCanvas } from "@/core/workspace-artifacts";
import { CANVAS_INSTRUCTIONS } from "@/server/ai/artifact-agent";
import { taskProgress } from "@/core/task-progress";
import { findReusableCanvas } from "@/server/artifact-deduplication";
import { resolveCooMode } from "@/core/coo-mode";

export const runtime = "nodejs";
export const maxDuration = 180;
const inputSchema = z.object({ threadId: z.string().min(1).max(200), requestId: z.string().uuid(), message: z.string().trim().min(1).max(6000).optional(), resumeProposalId: z.string().min(1).max(200).optional() }).strict().refine(value => Boolean(value.message) !== Boolean(value.resumeProposalId));

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Escreva uma mensagem de até 6.000 caracteres." }, { status: 400 });
  if (!env.OPENAI_API_KEY) return Response.json({ error: "Integração do COO não configurada." }, { status: 503 });
  const { threadId: requestedThreadId, requestId, message, resumeProposalId } = parsed.data;
  const controller = new AbortController();
  const disconnect = () => controller.abort();
  request.signal.addEventListener("abort", disconnect, { once: true });
  if (request.signal.aborted) controller.abort();
  const userId = message ? `user-${requestId}` : null, assistantId = resumeProposalId ? `assistant-resume-${resumeProposalId}` : `assistant-${requestId}`;
  const lockedThreadId = await prisma.$transaction(async tx => {
    let targetThreadId = requestedThreadId;
    if (requestedThreadId === "new") {
      if (!message) return null;
      const cleanTitle = message.replace(/\s+/g, " ").trim();
      const created = await tx.conversationThread.create({ data: {
        companyId: auth.companyId,
        title: cleanTitle.length > 72 ? `${cleanTitle.slice(0, 69)}…` : cleanTitle,
        generationId: requestId,
        generationStartedAt: new Date(),
      }, select: { id: true } });
      targetThreadId = created.id;
    } else {
      if (resumeProposalId) {
        const proposal = await tx.cooActionProposal.findFirst({ where: { id: resumeProposalId, threadId: requestedThreadId, companyId: auth.companyId, proposedByUserId: auth.userId, status: "APPLIED" } });
        if (!proposal) return null;
        const alreadyContinued=Boolean(await tx.conversationMessage.findUnique({ where: { id: assistantId } }));
        const latestUser = await tx.conversationMessage.findFirst({ where: { threadId: requestedThreadId, role: "USER" }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { metadata: true } });
        if (!interviewResumeEligible(proposal.action,resumeProposalId,latestUser?.metadata,alreadyContinued)) return null;
      }
      const lock = await tx.conversationThread.updateMany({ where: { id: requestedThreadId, companyId: auth.companyId,
        OR: [{ generationId: null }, { generationStartedAt: { lt: new Date(Date.now() - 180_000) } }] },
        data: { generationId: requestId, generationStartedAt: new Date() } });
      if (!lock.count) return null;
    }
    if (userId && message) {
      if (await tx.conversationMessage.findUnique({ where: { id: userId } })) throw new Error("Mensagem já recebida.");
      await tx.conversationMessage.create({ data: { id: userId, threadId: targetThreadId, authorUserId: auth.userId, role: "USER", content: message } });
    }
    return targetThreadId;
  }).catch(() => null);
  if (!lockedThreadId) return Response.json({ error: resumeProposalId ? "Esta etapa já foi retomada ou a conversa avançou. Reabra a conversa para conferir." : "Aguarde a resposta atual terminar. Sua mensagem não foi reenviada." }, { status: 409 });
  const threadId = lockedThreadId;
  generations.set(requestId, controller);
  const timer = setTimeout(() => controller.abort(new Error("Tempo de resposta excedido")), 150_000);
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(output) {
      let text = "";
      const emit = (event: object) => { try { output.enqueue(encoder.encode(JSON.stringify(event) + "\n")); } catch { controller.abort(); } };
      const heartbeat=setInterval(()=>emit({type:"ping"}),10000);
      try {
        emit({ type: "ack", userId, assistantId, threadId });
        emit({ type: "activity", text: "Consultando o diagnóstico e o contexto salvo…" });
        const thread = await prisma.conversationThread.findFirstOrThrow({ where: { id: threadId, companyId: auth.companyId }, include: { messages: { orderBy: { createdAt: "desc" }, take: 40 } } });
        const current = readWorkshop(thread.workflowState);
        const resumeExecution=Boolean(resumeProposalId&&current?.stage==="FOLLOW_UP");
        const proposalSourceId=userId??(resumeExecution?thread.messages.find(m=>m.role==="USER")?.id:null);
        let actionDraft: CooAction | null = null;
        const context = await loadCompanyContext(auth.companyId);
        const diagnosis = current ? await prisma.diagnosticSession.findFirst({ where: { id: current.diagnosticId, companyId: auth.companyId, status: "COMPLETED" }, include: { answers: { include: { question: true } } } }) : null;
        if (current && !diagnosis) throw new Error("Diagnóstico indisponível");
        const selectedPlan = current?.planId ? await prisma.actionPlan.findFirst({ where: { id: current.planId, companyId: auth.companyId }, include: { tasks: { include: { evidence: { orderBy: { createdAt: "desc" }, take: 100 } } }, checkins: { orderBy: { createdAt: "desc" }, take: 5 } } }) : null;
        const progressPlan = selectedPlan ?? (!current ? await prisma.actionPlan.findFirst({ where: { companyId: auth.companyId, status: "ACTIVE" }, orderBy: { createdAt: "desc" }, include: { tasks: { include: { evidence: true } } } }) : null);
        const planTasks = progressPlan?.tasks.filter(task => task.status !== "CANCELLED") ?? [];
        const mode = resolveCooMode({ workshopStage: current?.stage ?? null, hasCompletedDiagnostic: Boolean(diagnosis || context.diagnostic?.status === "COMPLETED"), activeTaskCount: planTasks.length, pendingTaskCount: planTasks.filter(task => task.status !== "DONE").length });
        const methods = await prisma.improvementMethod.findMany({ where: { status: "ACTIVE" }, include: { versions: { where: { publishedAt: { not: null } }, orderBy: { version: "desc" }, take: 1 } } });
        const catalog = methods.filter(m => m.versions.length).map(m => ({ code: m.code, name: m.name, description: m.description, steps: m.versions[0].steps }));
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
        const planningSkill = current ? await readFile(path.join(process.cwd(), "docs/ai/skills/coo-plano-colaborativo/SKILL.md"), "utf8") : "";
        const modeSkill = await readFile(path.join(process.cwd(), "docs/ai/skills/coo-modos-de-trabalho/SKILL.md"), "utf8");
        const createCanvas = tool({ name: "criar_ferramenta_canvas", description: "Cria ou reutiliza no Canvas uma planilha ou documento editável pedido ou aceito pelo gestor. Para uma ferramenta repetida, use REUSE. Se o usuário pedir funções novas e já existir uma versão, primeiro pergunte se deseja manter a antiga ou substituí-la; só depois use KEEP_BOTH ou REPLACE conforme a resposta. Não altera tarefas ou aprovações. " + CANVAS_INSTRUCTIONS, parameters: canvasSchema.extend({ taskId: z.string().nullable(), duplicateHandling: z.enum(["REUSE", "KEEP_BOTH", "REPLACE"]) }), execute: async raw => {
          const content = validateCanvas(raw);
          if (raw.taskId && !await prisma.task.findFirst({ where: { id: raw.taskId, companyId: auth.companyId, ...(current?.planId ? {actionPlanId: current.planId} : {}) } })) return "Tarefa inválida. Use uma tarefa deste plano ou null.";
          const existing = await findReusableCanvas({ companyId: auth.companyId, title: content.title, kind: content.kind, taskId: raw.taskId, threadId });
          if (existing && raw.duplicateHandling === "REUSE") return `A ferramenta já existe: ${existing.title}. Está em Ferramentas e arquivos. Nenhuma alteração feita.`;
          return stageAction({ type:"artifact.save", content, taskId:raw.taskId, replaceArtifactId:existing && raw.duplicateHandling === "REPLACE" ? existing.id : null });
        }});
        const interviewing=mode==="PLANNING";
        const planLocked=mode==="PLAN_REQUIRED";
        const agent = new Agent({ name: "COO Fábrica Ágil", model: env.OPENAI_MODEL ?? "gpt-5.6-luna", tools: (resumeProposalId&&!resumeExecution) || interviewing || planLocked ? [consult] : [consult, propose, createCanvas],
          instructions: `${modeSkill}\n\nMODO DEFINIDO PELO SERVIDOR: ${mode}. Não troque de modo.\n${interviewing ? `${planningSkill}\n${WORKSHOP_AGENT_INSTRUCTIONS}` : `${INDUSTRIAL_CONSULTANT_INSTRUCTIONS}\n${COO_ACTION_INSTRUCTIONS}`}${planLocked ? `\nExiste diagnóstico concluído, mas não há plano aprovado nesta empresa. Não proponha tarefas, projetos, ferramentas ou execução. Oriente o gestor a abrir [o resultado do diagnóstico](/diagnostico?id=${context.diagnostic?.id ?? ""}#proximo-passo) e clicar em Montar plano com o COO.` : ""}${resumeExecution ? "\nO plano completo acabou de ser aprovado pela plataforma. Consulte suas tarefas e formulários. Explique o primeiro passo com link para a tarefa. Se houver necessidade de documento ou planilha complementar ainda inexistente, prepare uma proposta de ferramenta vinculada a essa tarefa para aprovação; não execute nada. Não recrie formulários que já estão no guia. Não pergunte de novo os acordos já confirmados." : resumeProposalId ? "\nEsta resposta retoma a conversa imediatamente após a aprovação de uma etapa preparatória. Não há nova resposta do gestor. Explique em uma frase o que foi salvo e faça uma pergunta concreta sobre o próximo dado indispensável para construir um plano completo com 3 a 5 iniciativas e 5W2H. Não valide hipóteses por aprovação de etapa. Não proponha nem execute ações neste turno. Uma medição ausente pode entrar como primeira iniciativa; não deixe a entrevista parada esperando uma semana de dados." : ""}`,
        });
        // Selected diagnosis is authoritative; historical model prose is not matrix evidence.
        const snapshot = diagnosis?.resultSnapshot && typeof diagnosis.resultSnapshot === "object" ? { ...diagnosis.resultSnapshot as object } as Record<string, unknown> : null;
        if (snapshot) { delete snapshot.analysis; delete snapshot.analysisError; }
        const artifacts = await prisma.workspaceArtifact.findMany({ where: { companyId: auth.companyId, OR: [{threadId}, ...(progressPlan ? [{taskId: {in: progressPlan.tasks.map(t=>t.id)}}] : [])] }, select: {id:true,title:true,taskId:true,kind:true,confirmedAt:true,interpretation:true}, orderBy:{updatedAt:"desc"},take:30 });
        const automaticProgress = progressPlan ? taskProgress(progressPlan.tasks, artifacts) : null;
        const scopedContext = current ? { company: context.company, selectedPlan, memories: context.memories, note: "Use exclusivamente o diagnóstico selecionado abaixo. Memórias são contexto histórico, não substituem a matriz." } : context;
        const projects = await readSystem(prisma, auth.companyId, {area:"projects",query:"",projectId:null,recordId:null,offset:0});
        const input = JSON.stringify({ today: new Date().toLocaleDateString("sv-SE", {timeZone:"America/Sao_Paulo"}), cooMode: mode, projects, context: scopedContext, automaticProgress, artifacts: artifacts.map(a=>({...a, interpretation:a.confirmedAt?a.interpretation:null, notice:a.confirmedAt?"Leitura confirmada pelo usuário; não prova independente.":"Rascunho ou leitura pendente; não usar como resultado."})), workshop: current, diagnosis: diagnosis ? { id: diagnosis.id, title: diagnosis.title, matrix: snapshot, answers: diagnosis.answers.map(a => ({ code: a.question.code, question: a.question.prompt, value: a.value, notes: a.notes })) } : null, methods: catalog, messages: [...thread.messages].reverse().map(m => ({ id: m.id, role: m.role, content: m.content })), ...(resumeProposalId ? { continuation: resumeExecution ? "Plano completo aprovado: organizar ferramentas necessárias e primeiro passo nas tarefas existentes." : "Aprovação de etapa preparatória; fazer a próxima pergunta sem afirmar que o plano foi aprovado." } : {}) });
        emit({ type: "activity", text: "Preparando uma resposta e o próximo passo…" });
        if(interviewing){
          const responseSchema=groundedInterviewSchema(thread.messages.filter(m=>m.role==="USER").map(m=>m.id),diagnosis?.answers.map(a=>a.question.code)??[],catalog.map(m=>m.code));
          const interviewer=new Agent({name:"COO planejamento",model:env.OPENAI_MODEL ?? "gpt-5.6-sol",instructions:agent.instructions as string,tools:[consult],outputType:responseSchema,modelSettings:{reasoning:{effort:"medium"}}});
          let correction="";
          for(let attempt=0;attempt<3;attempt++){
            try{
              const response=await run(interviewer,input+correction,{signal:controller.signal,maxTurns:8});
              const answer=responseSchema.parse(response.finalOutput);
              if(answer.proposal){
                if(resumeProposalId)throw Error("Retomada: faça a próxima pergunta; ainda não há nova resposta do gestor.");
                const prepared=await prepareAction(prisma,auth,threadId,{type:"workshop.patch",patch:{...answer.proposal,plan:completePlanExecution(answer.proposal.plan)}});
                actionDraft=prepared.action;
                text=`${answer.reply.trim()}\n\n${prepared.summary}`;
              }else{
                text=renderInterviewQuestion(answer.reply,answer.question);
              }
              break;
            }catch(error){
              if(attempt===2||controller.signal.aborted)throw error;
              correction=`\nCorrija sua resposta anterior: ${error instanceof Error?error.message:"Resposta inválida"}. Prepare a proposta completa se os dados já existem; caso contrário faça a pergunta que falta. Não exponha esta validação ao gestor.`;
              emit({type:"activity",text:"Conferindo o plano e os dados combinados…"});
            }
          }
          emit({type:"delta",text});
        }else{
        const result = await run(agent, input, { stream: true, signal: controller.signal, maxTurns: 8 });
        for await (const chunk of result.toTextStream()) {
          if (controller.signal.aborted) throw new Error("Resposta interrompida");
          text += chunk;
          emit({ type: "delta", text: chunk });
        }
        await result.completed;
        }
        if (controller.signal.aborted || !text.trim()) throw new Error("Resposta interrompida ou vazia");
        const saved = await prisma.$transaction(async tx => {
          if (current) {
            const source = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM "DiagnosticSession" WHERE id = ${current.diagnosticId} AND "companyId" = ${auth.companyId} FOR UPDATE`;
            if (!source.length) throw new Error("O diagnóstico foi excluído durante a conversa.");
          }
          await tx.$queryRaw`SELECT id FROM "ConversationThread" WHERE id = ${threadId} FOR UPDATE`;
          const fresh = await tx.conversationThread.findFirst({ where: { id: threadId, companyId: auth.companyId, generationId: requestId } });
          if (!fresh || controller.signal.aborted) throw new Error("Resposta interrompida");
          const proposal = actionDraft && proposalSourceId ? await proposeAction(tx, auth, threadId, proposalSourceId, actionDraft) : null;
          await tx.conversationMessage.create({ data: { id: assistantId, threadId, role: "ASSISTANT", content: text, metadata: { requestId, ...(resumeProposalId ? { continuationForProposalId: resumeProposalId } : {}) } } });
          await tx.conversationThread.update({ where: { id: threadId }, data: { lastMessageAt: new Date(), generationId: null, generationStartedAt: null,  } });
          return { state: current, proposal: proposal ? proposalView(proposal) : null };
        });
        emit({ type: "done", state: saved.state, proposal: saved.proposal });
      } catch (error) {
        const interrupted = controller.signal.aborted;
        console.error("COO chat:", interrupted ? "interrupted" : error instanceof Error ? error.name : "failed");
        // Partial text remains visible and explicitly marked, but tool changes are discarded.
        if (!resumeProposalId) await prisma.conversationMessage.upsert({ where: { id: assistantId }, update: {}, create: { id: assistantId, threadId, role: "ASSISTANT", content: text || (interrupted ? "Resposta interrompida. Você pode continuar quando quiser." : "Não consegui responder agora. Sua mensagem está salva; tente novamente."), metadata: { interrupted, failed: !interrupted, requestId } } }).catch(() => undefined);
        emit({ type: interrupted ? "stopped" : "error", text: interrupted ? "Resposta interrompida. As confirmações desta resposta não foram aplicadas." : "Não foi possível concluir. A mensagem ficou salva; tente novamente." });
      } finally {
        clearInterval(heartbeat); clearTimeout(timer); generations.delete(requestId); request.signal.removeEventListener("abort", disconnect);
        await prisma.conversationThread.updateMany({ where: { id: threadId, generationId: requestId }, data: { generationId: null, generationStartedAt: null } });
        try { output.close(); } catch { /* Disconnected client. */ }
      }
    },
    cancel() { controller.abort(); },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" } });
}

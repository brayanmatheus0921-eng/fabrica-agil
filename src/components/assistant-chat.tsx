"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUpRight, Files, History, ListChecks, LoaderCircle, MoreHorizontal, PanelLeftOpen, Pencil, Plus, RefreshCw, Sparkles, Target, Trash2, X } from "lucide-react";
import { ReadingDetails } from "@/components/reading-layout";
import { AssistantComposer } from "@/components/assistant-composer";
import { ArtifactWorkspace } from "@/components/artifact-workspace";
import { AssistantMarkdown } from "@/components/assistant-markdown";
import { STAGE_LABELS, WORKSHOP_STAGES, type WorkshopState, type WorkshopStage } from "@/core/coo-workshop";

type Message = { id: string; role: string; content: string };

const desktopHistoryQuery = "(min-width: 1024px)";
function subscribeDesktopHistory(callback: () => void) {
  const query = window.matchMedia(desktopHistoryQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
function readDesktopHistory() {
  return window.matchMedia(desktopHistoryQuery).matches;
}

function ThinkingStatus({ activity }: { activity: string }) {
  const supportingText = activity.startsWith("Respondendo")
    ? "Transformando a análise em uma orientação curta e prática."
    : activity.includes("diagnóstico") || activity.includes("contexto")
      ? "Reunindo apenas os dados que ajudam nesta conversa."
      : activity.includes("Organizando")
        ? "Separando o que foi confirmado do que ainda precisa ser validado."
        : "Preparando o próximo passo sem complicar sua rotina.";

  return <div className="max-w-xl py-1" role="status" aria-live="polite">
    <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-primary"><Sparkles className="size-3.5" />COO analisando</p>
    <div className="mt-2 flex items-center gap-2"><LoaderCircle className="size-4 shrink-0 animate-spin text-primary motion-reduce:animate-none" /><p className="text-sm font-semibold">{activity}</p></div>
    <p className="mt-1 pl-6 text-xs leading-5 text-muted">{supportingText}</p>
  </div>;
}

export function AssistantChat({ messages: initialMessages, threads, currentThreadId, initialWorkshop, initialGenerationId, deleteAction, renameAction, newChatAction, disabled, defaultValue, companyName, hasDiagnostic, hasPlan, suggestions, error }: {
  messages: Message[]; threads: Array<{ id: string; title: string; updatedAt: string }>; currentThreadId: string;
  initialWorkshop: WorkshopState | null; initialGenerationId: string | null;
  deleteAction: (form: FormData) => void | Promise<void>; renameAction: (form: FormData) => void | Promise<void>; newChatAction: (form: FormData) => void | Promise<void>;
  disabled?: boolean; defaultValue?: string; companyName: string; hasDiagnostic: boolean; hasPlan: boolean; suggestions: Array<{ label: string; kind: "task" | "review" | "diagnostic" }>; error?: string;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages), [draft, setDraft] = useState(defaultValue ?? "");
  const [activeThreadId, setActiveThreadId] = useState(currentThreadId);
  const activeThreadIdRef = useRef(currentThreadId);
  const [state, setState] = useState(initialWorkshop), [panelOverride, setPanel] = useState<boolean | null>(null);
  const desktopHistory = useSyncExternalStore(subscribeDesktopHistory, readDesktopHistory, () => false);
  const panel = panelOverride ?? desktopHistory;
  const [canvasRefresh, setCanvasRefresh] = useState(0), [canvasPanel, setCanvasPanel] = useState(false);
  const [openArtifactId, setOpenArtifactId] = useState<string>();
  const canvasDirty = useRef(false);
  const [busy, setBusy] = useState(Boolean(initialGenerationId)), [stopping, setStopping] = useState(false);
  const [activity, setActivity] = useState(initialGenerationId ? "Há uma resposta em andamento. Aguarde ou clique em Parar." : "");
  const [notice, setNotice] = useState(error ?? ""), [away, setAway] = useState(false);
  const [switchingChat, setSwitchingChat] = useState(false);
  const busyRef = useRef(Boolean(initialGenerationId)), requestId = useRef(initialGenerationId), abortRef = useRef<AbortController | null>(null);
  const pendingMessage = useRef("");
  const scroll = useRef<HTMLDivElement>(null), follow = useRef(true);
  useEffect(() => { const node = scroll.current; if (node && follow.current) node.scrollTop = node.scrollHeight; }, [messages, activity]);
  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    if (!initialGenerationId) return;
    const interval = setInterval(() => { if (!abortRef.current) window.location.reload(); }, 5000);
    return () => clearInterval(interval);
  }, [initialGenerationId]);

  async function stop() {
    if (!busyRef.current || stopping) return;
    setStopping(true); setActivity("Interrompendo resposta…");
    abortRef.current?.abort();
    try { await fetch("/api/assistant/stop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ threadId: activeThreadIdRef.current, requestId: requestId.current, message: pendingMessage.current }) }); }
    finally { busyRef.current = false; setBusy(false); setStopping(false); setActivity(""); setNotice("Resposta interrompida. Você pode continuar."); router.refresh(); }
  }

  async function send() {
    const text = draft.trim();
    // Synchronous guard: catches double Enter/click before React has rendered.
    if (busyRef.current || disabled || !text) return;
    busyRef.current = true; setBusy(true); setNotice(""); setActivity("Entendendo seu pedido…"); setDraft(""); follow.current = true;
    const id = crypto.randomUUID(); requestId.current = id;
    pendingMessage.current = text;
    const controller = new AbortController(); abortRef.current = controller;
    const assistantId = `assistant-${id}`;
    setMessages(old => [...old, { id: `user-${id}`, role: "USER", content: text }]);
    let received = "", frame: ReturnType<typeof setTimeout> | null = null, finished = false, ack = false;
    const flush = () => { if (frame) clearTimeout(frame); frame = null; if (received) setMessages(old => old.some(m => m.id === assistantId) ? old.map(m => m.id === assistantId ? { ...m, content: received } : m) : [...old, { id: assistantId, role: "ASSISTANT", content: received }]); };
    try {
      const response = await fetch("/api/assistant/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ threadId: activeThreadIdRef.current, requestId: id, message: text }), signal: controller.signal });
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error ?? "Não foi possível enviar. Atualize a página e tente novamente."); }
      if (!response.body) throw new Error("Conexão sem resposta.");
      const reader = response.body.getReader(), decoder = new TextDecoder(); let buffer = "";
      while (true) {
        const chunk = await reader.read(); if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        let end: number;
        while ((end = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, end); buffer = buffer.slice(end + 1); if (!line) continue;
          const event = JSON.parse(line);
          if (event.type === "ack") { ack = true; setActivity("Mensagem salva. Consultando o contexto…"); if (event.threadId && event.threadId !== activeThreadIdRef.current) { activeThreadIdRef.current = event.threadId; setActiveThreadId(event.threadId); const url = new URL(window.location.href); url.searchParams.set("chat", event.threadId); url.searchParams.delete("pergunta"); window.history.replaceState(null, "", url); } }
          if (event.type === "activity") setActivity(event.text);
          if (event.type === "delta") { received += event.text; setActivity("Respondendo…"); if (!frame) frame = setTimeout(flush, 40); }
          if (event.type === "done") { finished = true; setState(event.state); if (event.artifact) { setCanvasRefresh(v => v + 1); setOpenArtifactId(event.artifact.id); setCanvasPanel(true); setPanel(false); setNotice(event.artifact.operation === "REUSE" ? `Ferramenta reutilizada: ${event.artifact.title}` : event.artifact.operation === "REPLACE" ? `Ferramenta atualizada: ${event.artifact.title}` : `Ferramenta criada: ${event.artifact.title}`); } }
          if (event.type === "error" || event.type === "stopped") { finished = true; setNotice(event.text); }
        }
      }
      flush(); if (!finished) throw new Error("A conexão foi interrompida. Reabra a conversa para conferir o que ficou salvo.");
    } catch (failure) {
      flush();
      if (!controller.signal.aborted) {
        setNotice(failure instanceof Error ? failure.message : "Não foi possível enviar.");
        if (!ack) { setDraft(text); setMessages(old => old.filter(m => m.id !== `user-${id}`)); }
      }
    } finally {
      flush(); abortRef.current = null;
      if (!controller.signal.aborted) { busyRef.current = false; setBusy(false); setActivity(""); router.refresh(); }
    }
  }

  async function revisit(stage: WorkshopStage) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try { const response = await fetch("/api/assistant/workshop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ threadId: currentThreadId, stage }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setState(data.state); setNotice(`Etapa reaberta: ${STAGE_LABELS[stage]}. Conte ao consultor o que deseja revisar.`); }
    catch (e) { setNotice(e instanceof Error ? e.message : "Não foi possível reabrir."); }
    finally { busyRef.current = false; setBusy(false); }
  }

  function openThread(id: string) {
    if (busyRef.current || switchingChat || id === activeThreadIdRef.current) return;
    setSwitchingChat(true);
    window.setTimeout(() => router.push(`/assistente?chat=${id}`), 130);
  }

  return <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden bg-white">
    <section className={`assistant-chat-pane flex min-w-0 flex-1 flex-col transition-[opacity,transform] duration-200 ease-out ${switchingChat ? "translate-y-1 opacity-0" : "translate-y-0 opacity-100"}`}>
      <header className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3"><button type="button" onClick={() => { if (canvasDirty.current && !window.confirm("Descartar alterações não salvas?")) return; canvasDirty.current = false; setCanvasPanel(false); setPanel(!panel); }} aria-expanded={panel} aria-controls="assistant-details" aria-label="Abrir ou fechar histórico de conversas" title="Histórico de conversas" className="grid size-10 shrink-0 place-items-center rounded-xl border transition hover:bg-surface-muted"><PanelLeftOpen className={`size-4 transition-transform duration-200 ${panel ? "rotate-180" : ""}`} /></button><div className="min-w-0"><h1 className="text-sm font-semibold">COO</h1><p className="truncate text-xs text-muted">{state ? `Plano em conjunto · ${STAGE_LABELS[state.stage]}` : "Uma conversa de cada vez, no seu ritmo"}</p></div></div>
        <div className="flex shrink-0 gap-2"><button type="button" disabled={busy} onClick={() => { if (canvasPanel && canvasDirty.current && !window.confirm("Descartar alterações não salvas?")) return; canvasDirty.current = false; setCanvasPanel(v => !v); setPanel(false); }} aria-expanded={canvasPanel} aria-controls="assistant-canvas" className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition hover:bg-surface-muted disabled:opacity-50"><Files className="size-4"/><span className="hidden sm:inline">Ferramentas e arquivos</span><span className="sm:hidden">Ferramentas</span></button></div>
      </header>
      {notice ? <div role="status" className="flex shrink-0 items-center justify-between gap-2 border-b bg-amber-50 px-4 py-2 text-xs text-amber-900"><span>{notice}</span><button aria-label="Fechar aviso" onClick={() => setNotice("")}><X className="size-4" /></button></div> : null}
      {state?.stage === "REVIEW" && state.planId ? <a href={`/plano-de-acao?id=${state.planId}`} className="shrink-0 border-b bg-accent px-4 py-3 text-sm font-semibold">Plano pronto para sua revisão → Revisar e aprovar</a> : null}
      <div ref={scroll} onScroll={() => { const node = scroll.current; if (node) { follow.current = node.scrollHeight - node.scrollTop - node.clientHeight < 90; setAway(!follow.current); } }} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          {!messages.length ? <div className="py-8 text-center sm:py-12"><p className="text-xl font-semibold tracking-tight">O que vamos resolver hoje?</p><p className="mt-2 text-sm text-muted">Escolha uma sugestão ou escreva do seu jeito.</p><div className="mx-auto mt-6 grid max-w-lg gap-2 text-left">{suggestions.slice(0, 3).map((suggestion) => { const Icon = suggestion.kind === "task" ? ListChecks : suggestion.kind === "review" ? RefreshCw : Target; return <button key={`${suggestion.kind}-${suggestion.label}`} type="button" onClick={() => setDraft(suggestion.label)} className="group flex min-h-11 items-center gap-3 rounded-xl border bg-surface px-3.5 py-2.5 text-[13px] leading-5 transition hover:border-primary/35 hover:bg-surface-muted"><Icon className="size-4 shrink-0 text-primary" /><span className="min-w-0 flex-1 truncate">{suggestion.label}</span><ArrowUpRight className="size-3.5 shrink-0 text-muted transition group-hover:text-primary" /></button>; })}</div></div> : messages.map((m, index) => <div key={m.id} className="contents">{busy && activity && m.role === "ASSISTANT" && index === messages.length - 1 ? <ThinkingStatus activity={activity} /> : null}<article aria-label={m.role === "USER" ? "Sua mensagem" : "Resposta do consultor"} className={m.role === "USER" ? "ml-auto max-w-[90%] rounded-2xl bg-surface-muted px-4 py-3 text-sm leading-6" : "max-w-full text-sm leading-7"}><AssistantMarkdown text={m.content} /></article></div>)}
          {busy && activity && messages.at(-1)?.role !== "ASSISTANT" ? <ThinkingStatus activity={activity} /> : null}
        </div>
      </div>
      {away ? <button onClick={() => { follow.current = true; scroll.current?.scrollTo({ top: scroll.current.scrollHeight, behavior: "smooth" }); }} className="mx-auto -mt-10 mb-2 z-10 rounded-full border bg-white p-2 shadow" aria-label="Ir para última mensagem"><ArrowDown className="size-4" /></button> : null}
      <div className="shrink-0 bg-white px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:px-6"><AssistantComposer value={draft} onChange={setDraft} onSend={send} onStop={stop} busy={busy} stopping={stopping} disabled={disabled} /></div>
    </section>
    {canvasPanel ? <aside id="assistant-canvas" aria-label="Canvas do COO" className="absolute inset-y-0 right-0 z-20 w-full overflow-y-auto border-l bg-white p-4 shadow-xl sm:w-[min(90%,640px)] xl:static xl:w-[48%] xl:shrink-0 xl:shadow-none"><button aria-label="Fechar Canvas" className="mb-4 ml-auto flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs" onClick={() => { if (canvasDirty.current && !window.confirm("Descartar alterações não salvas?")) return; canvasDirty.current = false; setCanvasPanel(false); }}>Voltar à conversa<X className="size-4"/></button><ArtifactWorkspace threadId={activeThreadId} refreshKey={canvasRefresh} openArtifactId={openArtifactId} onDirtyChange={value => { canvasDirty.current = value; }} /></aside> : null}
    <aside id="assistant-details" aria-label="Histórico de conversas" aria-hidden={!panel} className={`absolute inset-y-0 left-0 z-20 flex w-[min(90%,320px)] flex-col overflow-hidden bg-white shadow-xl transition-[transform,opacity,width] duration-300 ease-out lg:order-first lg:static lg:shrink-0 lg:shadow-none ${panel ? "translate-x-0 border-r opacity-100 lg:w-[292px]" : "pointer-events-none -translate-x-full border-r opacity-0 lg:w-0 lg:translate-x-0 lg:border-r-0"}`}>
      <div className="flex h-full w-[min(90vw,320px)] shrink-0 flex-col lg:w-[292px]">
      <div className="flex h-[65px] shrink-0 items-center justify-between border-b px-4"><div className="flex items-center gap-2"><History className="size-4 text-primary"/><h2 className="text-sm font-bold">Conversas</h2></div><button aria-label="Fechar histórico" title="Fechar histórico" onClick={() => setPanel(false)} className="grid size-9 place-items-center rounded-lg hover:bg-surface-muted"><X className="size-4" /></button></div>
      <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto p-3">
        <form action={newChatAction}><button disabled={busy} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border bg-surface px-3 text-xs font-bold transition hover:bg-surface-muted disabled:opacity-40"><Plus className="size-4"/>Nova conversa</button></form>
        <p className="mt-5 px-1 text-[9px] font-black uppercase tracking-[0.18em] text-muted">Histórico</p>
        <div className="mt-2 space-y-1.5">{threads.map(t => <div key={t.id} className={`group relative flex min-h-11 items-center gap-1 rounded-xl border p-2 pl-3 transition-colors ${t.id === currentThreadId ? "border-primary/35 bg-accent-warm" : "bg-surface hover:bg-surface-muted"}`}><button type="button" aria-current={t.id === currentThreadId ? "page" : undefined} disabled={busy || switchingChat} onClick={() => openThread(t.id)} className="min-w-0 flex-1 truncate text-left text-xs font-bold disabled:opacity-50">{t.title}</button><details className="group/menu relative shrink-0"><summary aria-label={`Opções da conversa ${t.title}`} title="Opções" className="grid size-8 cursor-pointer list-none place-items-center rounded-lg text-muted transition hover:bg-white hover:text-foreground [&::-webkit-details-marker]:hidden"><MoreHorizontal className="size-4" /></summary><div className="absolute right-0 top-9 z-30 w-48 overflow-hidden rounded-xl border bg-white p-1.5 shadow-xl"><details className="group/edit"><summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-lg px-2.5 text-xs font-semibold hover:bg-surface-muted [&::-webkit-details-marker]:hidden"><Pencil className="size-3.5" />Editar nome</summary><form action={renameAction} className="mt-1 border-t p-2"><input type="hidden" name="threadId" value={t.id} /><label className="text-[10px] font-semibold text-muted">Nome da conversa<input name="title" defaultValue={t.title} maxLength={72} required className="mt-1 w-full rounded-lg border bg-white px-2 py-1.5 text-xs outline-none focus:border-primary" /></label><button disabled={busy} className="mt-2 min-h-8 w-full rounded-lg bg-primary px-2 text-xs font-bold text-white disabled:opacity-40">Salvar nome</button></form></details><form action={deleteAction} className="mt-1 border-t pt-1"><input type="hidden" name="threadId" value={t.id} /><button disabled={busy} className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-30"><Trash2 className="size-3.5" />Excluir conversa</button></form></div></details></div>)}</div>
        <details className="mt-5 rounded-xl border bg-surface">
          <summary className="cursor-pointer list-none px-3 py-3 text-xs font-bold [&::-webkit-details-marker]:hidden">Contexto e etapas do plano</summary>
          <div className="border-t p-3">
            <p className="text-xs leading-5 text-muted">{companyName}<br />{hasDiagnostic ? "Diagnóstico salvo" : "Sem diagnóstico"} · {hasPlan ? "Plano ativo" : "Plano ainda não aprovado"}</p>
            {state ? <section className="mt-4"><h3 className="text-xs font-semibold">Etapas do plano</h3><ReadingDetails title="Resumo do que combinamos" className="mt-3"><p className="text-sm leading-6 text-muted">{state.summary}</p></ReadingDetails><ol className="mt-3 space-y-1">{WORKSHOP_STAGES.map((stage, index) => <li key={stage}><button disabled={busy || index > state.furthestStage || index >= 5 || state.stage === "FOLLOW_UP"} onClick={() => revisit(stage)} className={`w-full rounded-lg px-2 py-2 text-left text-xs disabled:cursor-default ${stage === state.stage ? "bg-accent font-bold" : "disabled:text-muted"}`}>{index + 1}. {STAGE_LABELS[stage]}{stage === state.stage ? " · atual" : index <= state.furthestStage && index < 5 ? " · revisar" : ""}</button></li>)}</ol>
              {state.decision ? <p className="mt-3 text-xs"><strong>Prioridade combinada:</strong> {state.decision.primaryTitle}<br />{state.decision.reason}</p> : null}
              <details className="mt-3 text-xs"><summary className="cursor-pointer font-bold">Informações e revisões salvas</summary><p className="mt-2 font-bold">Confirmado pelo gestor</p>{state.confirmedFacts.map((f,i) => <p key={i} className="mt-1">• {f.statement}</p>)}<p className="mt-2 font-bold">Hipóteses, ainda não comprovadas</p>{state.hypotheses.map((h,i) => <p key={i}>{h}</p>)}{state.history.map((h,i) => <p key={i} className="mt-2 border-t pt-2">Revisão {h.revision} · {STAGE_LABELS[h.stage]}<br />{h.summary}</p>)}</details>
            </section> : null}
          </div>
        </details>
      </div>
      </div>
    </aside>
  </div>;
}

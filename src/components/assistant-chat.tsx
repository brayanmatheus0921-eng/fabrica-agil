"use client";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Files, History, ListChecks, MoreHorizontal, PanelLeftOpen, Pencil, Plus, RefreshCw, Target, Trash2, X } from "lucide-react";
import { ConversationRecord } from "./conversation-record";
import { emptyConversationMemory, type ConversationMemory } from "@/core/conversation-memory";
import { AssistantProposals } from "@/components/assistant-proposals";
import { approvalIntent, type CooProposalView } from "@/core/coo-actions";
import { AssistantComposer } from "@/components/assistant-composer";
import { ArtifactWorkspace } from "@/components/artifact-workspace";
import { AssistantMarkdown } from "@/components/assistant-markdown";
import { notifyCompanyDataChanged } from "@/components/company-data-sync";
import { STAGE_LABELS, type WorkshopState } from "@/core/coo-workshop";

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

function ThinkingStatus({ activity, planning }: { activity: string; planning: boolean }) {
  return <div className="flex max-w-xl items-center gap-2 py-1 text-xs text-muted" role="status" aria-live="polite">
    <span aria-hidden="true" className="inline-flex items-center gap-1">{[0,1,2].map(i=><span key={i} className="size-1.5 animate-bounce rounded-full bg-primary motion-reduce:animate-none" style={{animationDelay:`${i*180}ms`}} />)}</span>
    <span>{planning ? "Planejador" : "COO"} analisando · {activity}</span>
  </div>;
}

export function AssistantChat({ messages: initialMessages, threads, currentThreadId, initialWorkshop, initialGenerationId, deleteAction, renameAction, newChatAction, disabled, defaultValue, suggestions, error, planningWorkspace = false, initialMemory }: {
  messages: Message[]; threads: Array<{ id: string; title: string; updatedAt: string }>; currentThreadId: string;
  initialMemory?: ConversationMemory; initialWorkshop: WorkshopState | null; initialGenerationId: string | null;
  deleteAction: (form: FormData) => void | Promise<void>; renameAction: (form: FormData) => void | Promise<void>; newChatAction: (form: FormData) => void | Promise<void>;
  disabled?: boolean; defaultValue?: string; companyName: string; hasDiagnostic: boolean; hasPlan: boolean; suggestions: Array<{ label: string; kind: "task" | "review" | "diagnostic" }>; error?: string; planningWorkspace?: boolean;
}) {
  const router = useRouter();
  const [memory, setMemory] = useState(initialMemory ?? emptyConversationMemory(planningWorkspace ? "PLAN" : "COO"));
  const [recordPanel, setRecordPanel] = useState(false);
  const [messages, setMessages] = useState(initialMessages), [draft, setDraft] = useState(defaultValue ?? "");
  const [activeThreadId, setActiveThreadId] = useState(currentThreadId);
  const activeThreadIdRef = useRef(currentThreadId);
  const [state, setState] = useState(initialWorkshop), [panelOverride, setPanel] = useState<boolean | null>(null);
  const desktopHistory = useSyncExternalStore(subscribeDesktopHistory, readDesktopHistory, () => false);
  const panel = panelOverride ?? desktopHistory;
  const [proposalRefresh, setProposalRefresh] = useState(0);
  const [proposals,setProposals] = useState<CooProposalView[]>([]);
  const [canvasRefresh, setCanvasRefresh] = useState(0), [canvasPanel, setCanvasPanel] = useState(false);
  const [openArtifactId, setOpenArtifactId] = useState<string>();
  const canvasDirty = useRef(false);
  const [busy, setBusy] = useState(Boolean(initialGenerationId)), [stopping, setStopping] = useState(false);
  const [activity, setActivity] = useState(initialGenerationId ? "Há uma resposta em andamento. Aguarde ou clique em Parar." : "");
  const [notice, setNotice] = useState(error ?? ""), [away, setAway] = useState(false);
  const [switchingChat, setSwitchingChat] = useState(false);
  const busyRef = useRef(Boolean(initialGenerationId)), requestId = useRef(initialGenerationId), abortRef = useRef<AbortController | null>(null);
  const pendingMessage = useRef("");
  const resumedOnOpen = useRef(false);
  const scroll = useRef<HTMLDivElement>(null), follow = useRef(true), readingAnchor = useRef<string|null>(null);
  useEffect(() => { const node = scroll.current; if (node && follow.current) node.scrollTop = node.scrollHeight; }, [messages, activity]);
  useLayoutEffect(() => { const node=scroll.current,id=readingAnchor.current; if(!node||!id)return; const target=[...node.querySelectorAll<HTMLElement>("[data-message-id]")].find(element=>element.dataset.messageId===id); if(!target)return; node.scrollTop += target.getBoundingClientRect().top-node.getBoundingClientRect().top-24; readingAnchor.current=null; },[messages]);
  useEffect(()=>{
    const node=scroll.current,last=[...node?.querySelectorAll<HTMLElement>("[data-message-id]")??[]].at(-1);
    if(!node||!last)return;
    const observer=new IntersectionObserver(([entry])=>setAway(!entry.isIntersecting),{root:node,threshold:0.1});
    observer.observe(last);
    return()=>observer.disconnect();
  },[messages]);
  useEffect(()=>{if(activeThreadId==="new")return;const controller=new AbortController();fetch(`/api/assistant/proposals?threadId=${encodeURIComponent(activeThreadId)}`,{signal:controller.signal}).then(async r=>{if(!r.ok)throw Error("Não foi possível carregar as propostas.");return r.json();}).then(data=>setProposals(data.proposals)).catch(()=>{});return()=>controller.abort();},[activeThreadId,proposalRefresh]);
  useEffect(() => {
    if (resumedOnOpen.current || initialGenerationId || currentThreadId === "new" || initialMessages.at(-1)?.role !== "ASSISTANT" || !(/^(Etapa de preparação salva\.|Plano completo aprovado e tarefas liberadas\.)/.test(initialMessages.at(-1)?.content??""))) return;
    resumedOnOpen.current = true;
    fetch(`/api/assistant/proposals?threadId=${encodeURIComponent(currentThreadId)}`).then(r=>r.json()).then(data=>{
      const proposal=(data.proposals as CooProposalView[]).findLast(p=>p.status==="APPLIED"&&p.resumeInterview);
      if(proposal){readingAnchor.current=initialMessages.at(-2)?.id??null;void resumeInterview(proposal);}
    }).catch(()=>{});
  // Only the server-rendered conversation on opening can recover an old approval.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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

  async function resumeInterview(proposal:CooProposalView) {
    if (!proposal.resumeInterview || busyRef.current || disabled) return;
    busyRef.current=true;setBusy(true);setActivity("Preparando o próximo passo…");setNotice("");follow.current=false;
    if(!readingAnchor.current)readingAnchor.current=proposal.sourceMessageId;
    const id=crypto.randomUUID(),assistantId=`assistant-resume-${proposal.id}`;
    requestId.current=id;pendingMessage.current="";
    const controller=new AbortController();abortRef.current=controller;
    let received="",finished=false;
    const flush=()=>{if(received)setMessages(old=>old.some(m=>m.id===assistantId)?old.map(m=>m.id===assistantId?{...m,content:received}:m):[...old,{id:assistantId,role:"ASSISTANT",content:received}]);};
    try {
      const response=await fetch("/api/assistant/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({threadId:proposal.threadId,workspace:planningWorkspace ? "PLAN" : "COO",requestId:id,resumeProposalId:proposal.id}),signal:controller.signal});
      if(!response.ok){const data=await response.json().catch(()=>({}));throw Error(data.error??"Não foi possível continuar o plano.");}
      if(!response.body)throw Error("Conexão sem resposta.");
      const reader=response.body.getReader(),decoder=new TextDecoder();let buffer="";
      while(true){const chunk=await reader.read();if(chunk.done)break;buffer+=decoder.decode(chunk.value,{stream:true});let end:number;
        while((end=buffer.indexOf("\n"))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);if(!line)continue;
          const event=JSON.parse(line);
          if(event.type==="activity")setActivity(event.text);
          if(event.type==="delta"){received+=event.text;setActivity("Respondendo…");flush();}
          if(event.type==="done"){finished=true;setState(planningWorkspace ? event.state : null); if(event.memory)setMemory(event.memory);setProposalRefresh(v=>v+1);}
          if(event.type==="error"||event.type==="stopped"){finished=true;received="";setMessages(old=>old.filter(m=>m.id!==assistantId));setNotice(planningWorkspace ? "A aprovação foi salva. Continue com o planejador." : "A aprovação foi salva. Peça ao COO para continuar.");}
        }
      }
      if(!finished)throw Error("A conexão foi interrompida. Reabra a conversa para conferir a próxima pergunta.");
    }catch(e){received="";setMessages(old=>old.filter(m=>m.id!==assistantId));if(!controller.signal.aborted)setNotice(e instanceof Error?e.message:"Não foi possível continuar o plano.");}
    finally{
      abortRef.current=null;busyRef.current=false;setBusy(false);setActivity("");router.refresh();
      if(finished&&received)requestAnimationFrame(()=>{
        const node=scroll.current,target=[...node?.querySelectorAll<HTMLElement>("[data-message-id]")??[]].find(element=>element.dataset.messageId===assistantId);
        if(!node||!target)return;
        const below=target.getBoundingClientRect().bottom-node.getBoundingClientRect().bottom+16;
        if(below>0)node.scrollTop+=below;
        setAway(node.scrollHeight-node.scrollTop-node.clientHeight>90);
      });
    }
  }

  async function send() {
    const text = draft.trim();
    // Synchronous guard: catches double Enter/click before React has rendered.
    if (busyRef.current || disabled || !text) return;
    busyRef.current = true; setBusy(true); setNotice(""); setActivity("Entendendo seu pedido…"); setDraft(""); follow.current = false;
    const decision = approvalIntent(text);
    if (decision && activeThreadIdRef.current !== "new") {
      try {
        const r = await fetch(`/api/assistant/proposals?threadId=${encodeURIComponent(activeThreadIdRef.current)}`);
        if (!r.ok) throw Error("Não consegui conferir a proposta. Tente novamente.");
        const data = await r.json();
        const pending = (data.proposals as CooProposalView[]).filter(p=>p.status==="PENDING");
        if (pending.length === 1) {
          const response = await fetch("/api/assistant/proposals",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:pending[0].id,decision})});
          const result = await response.json();
          if(!response.ok) throw Error(result.error);
          const p = result.proposal as CooProposalView;
          const answer = p.result?.message ?? (p.status==="REJECTED"?"Proposta recusada. Nenhuma alteração foi feita.":"Esta proposta perdeu a validade. Peça uma nova revisão antes de confirmar.");
          const approvalMessageId=crypto.randomUUID();readingAnchor.current=approvalMessageId;
          setMessages(old=>[...old,{id:approvalMessageId,role:"USER",content:text},{id:crypto.randomUUID(),role:"ASSISTANT",content:answer}]);
          const fresh = await fetch(`/api/assistant/proposals?threadId=${encodeURIComponent(activeThreadIdRef.current)}`).then(r=>r.json());
          setState(planningWorkspace ? fresh.workshop : null); if(fresh.memory)setMemory(fresh.memory); setProposalRefresh(v=>v+1);setCanvasRefresh(v=>v+1);router.refresh();
          busyRef.current=false;setBusy(false);setActivity("");if(p.status==="APPLIED"){notifyCompanyDataChanged();await resumeInterview(p);}return;
        }
      } catch(e) {
        setNotice(e instanceof Error?e.message:"Não foi possível confirmar.");setDraft(text);busyRef.current=false;setBusy(false);setActivity("");return;
      }
    }
    const id = crypto.randomUUID(); requestId.current = id;
    pendingMessage.current = text;
    const controller = new AbortController(); abortRef.current = controller;
    const assistantId = `assistant-${id}`;
    readingAnchor.current=`user-${id}`;
    setMessages(old => [...old, { id: `user-${id}`, role: "USER", content: text }]);
    let received = "", frame: ReturnType<typeof setTimeout> | null = null, finished = false, ack = false;
    const flush = () => { if (frame) clearTimeout(frame); frame = null; if (received) setMessages(old => old.some(m => m.id === assistantId) ? old.map(m => m.id === assistantId ? { ...m, content: received } : m) : [...old, { id: assistantId, role: "ASSISTANT", content: received }]); };
    try {
      const response = await fetch("/api/assistant/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ threadId: activeThreadIdRef.current, workspace: planningWorkspace ? "PLAN" : "COO", requestId: id, message: text }), signal: controller.signal });
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
          if (event.type === "ack") { ack = true; setActivity("Mensagem salva. Consultando o contexto…"); if(event.userId)setMessages(old=>old.map(m=>m.id===`user-${id}`?{...m,id:event.userId}:m)); if (event.threadId && event.threadId !== activeThreadIdRef.current) { activeThreadIdRef.current = event.threadId; setActiveThreadId(event.threadId); const url = new URL(window.location.href); url.searchParams.set("chat", event.threadId); url.searchParams.delete("pergunta"); window.history.replaceState(null, "", url); } }
          if (event.type === "activity") setActivity(event.text);
          if (event.type === "delta") { received += event.text; setActivity("Respondendo…"); if (!frame) frame = setTimeout(flush, 40); }
          if (event.type === "done") { setProposalRefresh(v=>v+1); finished = true; setState(planningWorkspace ? event.state : null); if(event.memory)setMemory(event.memory); if (event.artifact) { setCanvasRefresh(v => v + 1); setOpenArtifactId(event.artifact.id); setCanvasPanel(true); setPanel(false); setNotice(event.artifact.operation === "REUSE" ? `Ferramenta reutilizada: ${event.artifact.title}` : event.artifact.operation === "REPLACE" ? `Ferramenta atualizada: ${event.artifact.title}` : `Ferramenta criada: ${event.artifact.title}`); } }
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

  function openThread(id: string) {
    if (busyRef.current || switchingChat || id === activeThreadIdRef.current) return;
    setSwitchingChat(true);
    window.setTimeout(() => router.push(`${planningWorkspace ? "/plano-de-acao/construir" : "/assistente"}?chat=${id}`), 130);
  }

  const attachedSources=new Set(messages.filter((m,index)=>m.role==="USER"&&messages[index+1]?.role==="ASSISTANT").map(m=>m.id));
  const onProposalApplied=(proposal:CooProposalView)=>{notifyCompanyDataChanged();setNotice("Ação aplicada com sua aprovação.");setCanvasRefresh(v=>v+1);const approvalId=crypto.randomUUID();readingAnchor.current=approvalId;follow.current=false;setMessages(old=>[...old,{id:approvalId,role:"USER",content:`Aprovei: ${proposal.summary}`},{id:crypto.randomUUID(),role:"ASSISTANT",content:proposal.result?.message??"Ação aplicada."}]);router.refresh();fetch(`/api/assistant/proposals?threadId=${encodeURIComponent(activeThreadId)}`).then(r=>r.json()).then(data=>{if(data.workshop!==undefined)setState(data.workshop);if(data.memory)setMemory(data.memory);}).catch(()=>{});void resumeInterview(proposal);};
  const onProposalChanged=(proposal:CooProposalView)=>setProposals(old=>old.map(p=>p.id===proposal.id?proposal:p));
  const onProposalAdjust=(text:string)=>{setDraft(text);document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Mensagem para o consultor"]')?.focus();};
  const dedicatedPlanning=planningWorkspace;

  return <div className="coo-chat relative flex min-h-0 min-w-0 flex-1 overflow-hidden bg-white">
    <section className={`assistant-chat-pane relative flex min-w-0 flex-1 flex-col transition-[opacity,transform] duration-200 ease-out ${switchingChat ? "translate-y-1 opacity-0" : "translate-y-0 opacity-100"}`}>
      <header className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3"><button type="button" onClick={() => { if (canvasDirty.current && !window.confirm("Descartar alterações não salvas?")) return; canvasDirty.current = false; setCanvasPanel(false); setPanel(!panel); }} aria-expanded={panel} aria-controls="assistant-details" aria-label="Abrir ou fechar histórico de conversas" title="Histórico de conversas" className="grid size-10 shrink-0 place-items-center rounded-xl border transition hover:bg-surface-muted"><PanelLeftOpen className={`size-4 transition-transform duration-200 ${panel ? "rotate-180" : ""}`} /></button><div className="min-w-0"><h1 className="text-sm font-semibold">{dedicatedPlanning ? "Plano de ação" : "COO"}</h1><p className="truncate text-xs text-muted">{state ? `Somente planejamento · ${STAGE_LABELS[state.stage]}` : "Seu consultor de operações"}</p></div></div>
        <button type="button" role="tab" aria-selected={recordPanel} aria-controls="conversation-record" onClick={() => { setRecordPanel(!recordPanel); setCanvasPanel(false); setPanel(false); }} className="ml-auto min-h-10 rounded-lg border px-3 text-xs font-semibold">Registro</button>
        {!dedicatedPlanning ? <div className="flex shrink-0 gap-2"><button type="button" disabled={busy} onClick={() => { if (canvasPanel && canvasDirty.current && !window.confirm("Descartar alterações não salvas?")) return; canvasDirty.current = false; setCanvasPanel(v => !v); setRecordPanel(false); setPanel(false); }} aria-expanded={canvasPanel} aria-controls="assistant-canvas" className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition hover:bg-surface-muted disabled:opacity-50"><Files className="size-4"/><span className="hidden sm:inline">Ferramentas e arquivos</span><span className="sm:hidden">Ferramentas</span></button></div> : <span className="rounded-full bg-accent px-3 py-1.5 text-[11px] font-semibold text-primary">Plano primeiro</span>}
      </header>
      {notice ? <div role="status" className="flex shrink-0 items-center justify-between gap-2 border-b bg-amber-50 px-4 py-2 text-xs text-amber-900"><span>{notice}</span><button aria-label="Fechar aviso" onClick={() => setNotice("")}><X className="size-4" /></button></div> : null}
      {state?.stage === "REVIEW" && state.planId ? <a href={`/plano-de-acao?id=${state.planId}`} className="shrink-0 border-b bg-accent px-4 py-3 text-sm font-semibold">Plano pronto para sua revisão → Revisar e aprovar</a> : null}
      <div ref={scroll} data-empty={!messages.length} onScroll={() => { const node = scroll.current; if (node) { follow.current = node.scrollHeight - node.scrollTop - node.clientHeight < 90; setAway(!follow.current); } }} className="coo-conversation min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          {!messages.length ? <div className="coo-welcome py-8 text-center sm:py-12"><p className="coo-welcome-title">{planningWorkspace ? "Vamos construir seu plano" : "O que vamos fazer hoje?"}</p><p className="mt-2 text-sm text-muted">{planningWorkspace ? "Vou analisar o diagnóstico, sugerir caminhos e fazer uma pergunta por vez." : "Converse com seu COO. Da decisão à execução, com sua aprovação."}</p><div className="mx-auto mt-6 grid max-w-md gap-2 text-left">{suggestions.slice(0, 3).map((suggestion) => { const Icon = suggestion.kind === "task" ? ListChecks : suggestion.kind === "review" ? RefreshCw : Target; return <button key={`${suggestion.kind}-${suggestion.label}`} type="button" onClick={() => setDraft(suggestion.label)} className="group flex min-h-11 items-center gap-3 rounded-xl border bg-surface px-3.5 py-2.5 text-[13px] leading-5 transition hover:border-primary/35 hover:bg-surface-muted"><Icon className="size-4 shrink-0 text-primary" /><span className="min-w-0 flex-1 truncate">{suggestion.label}</span><ArrowUpRight className="size-3.5 shrink-0 text-muted transition group-hover:text-primary" /></button>; })}</div></div> : messages.map((m, index) => <div key={m.id} className="contents"><article data-message-id={m.id} aria-label={m.role === "USER" ? "Sua mensagem" : "Resposta do consultor"} className={m.role === "USER" ? "ml-auto max-w-[90%] rounded-2xl bg-surface-muted px-4 py-3 text-sm leading-6" : "max-w-full text-sm leading-7"}><AssistantMarkdown text={m.content} /></article>{m.role==="ASSISTANT"&&messages[index-1]?.role==="USER"?<AssistantProposals rows={proposals.filter(p=>p.sourceMessageId===messages[index-1].id)} busy={busy} onAdjust={onProposalAdjust} onApplied={onProposalApplied} onChanged={onProposalChanged}/>:null}</div>)}
          {proposals.some(p=>p.status==="PENDING"&&!attachedSources.has(p.sourceMessageId))?<AssistantProposals rows={proposals.filter(p=>p.status==="PENDING"&&!attachedSources.has(p.sourceMessageId))} busy={busy} onAdjust={onProposalAdjust} onApplied={onProposalApplied} onChanged={onProposalChanged}/>:null}
          {busy && activity ? <ThinkingStatus activity={activity} planning={planningWorkspace} /> : null}
        </div>
      </div>
      {away ? <button onClick={() => { follow.current = true; scroll.current?.scrollTo({ top: scroll.current.scrollHeight, behavior: "smooth" }); }} className="absolute bottom-36 right-4 z-10 rounded-full border bg-white p-2 shadow" aria-label="Ir para última mensagem" title="Nova mensagem abaixo"><ArrowDown className="size-4" /></button> : null}
      <div className="shrink-0 bg-white px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:px-6"><AssistantComposer value={draft} onChange={setDraft} onSend={send} onStop={stop} busy={busy} stopping={stopping} disabled={disabled} planning={planningWorkspace} /></div>
    </section>
    {recordPanel ? <aside id="conversation-record" role="tabpanel" aria-label="Registro da conversa" className="absolute inset-y-0 right-0 z-20 w-full overflow-y-auto border-l bg-white p-5 shadow-xl sm:w-[min(90%,420px)] xl:static xl:shrink-0 xl:shadow-none"><div className="mb-5 flex items-center justify-between"><h2 className="font-semibold">Registro · {planningWorkspace ? "Plano" : "COO"}</h2><button aria-label="Fechar registro" onClick={() => setRecordPanel(false)} className="min-h-10 px-3">Voltar à conversa</button></div><ConversationRecord memory={memory} planning={planningWorkspace} busy={busy} onCorrect={() => { setDraft("Correção do Registro: "); setRecordPanel(false); document.querySelector<HTMLTextAreaElement>("textarea")?.focus(); }} /></aside> : null}
    {canvasPanel && !dedicatedPlanning ? <aside id="assistant-canvas" aria-label="Canvas do COO" className="absolute inset-y-0 right-0 z-20 w-full overflow-y-auto border-l bg-white p-4 shadow-xl sm:w-[min(90%,640px)] xl:static xl:w-[48%] xl:shrink-0 xl:shadow-none"><button aria-label="Fechar Canvas" className="mb-4 ml-auto flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs" onClick={() => { if (canvasDirty.current && !window.confirm("Descartar alterações não salvas?")) return; canvasDirty.current = false; setCanvasPanel(false); }}>Voltar à conversa<X className="size-4"/></button><ArtifactWorkspace threadId={activeThreadId} refreshKey={canvasRefresh} openArtifactId={openArtifactId} onDirtyChange={value => { canvasDirty.current = value; }} /></aside> : null}
    <aside id="assistant-details" aria-label="Histórico de conversas" aria-hidden={!panel} className={`absolute inset-y-0 left-0 z-20 flex w-[min(90%,320px)] flex-col overflow-hidden bg-white shadow-xl transition-[transform,opacity,width] duration-300 ease-out lg:order-first lg:static lg:shrink-0 lg:shadow-none ${panel ? "translate-x-0 border-r opacity-100 lg:w-[292px]" : "pointer-events-none -translate-x-full border-r opacity-0 lg:w-0 lg:translate-x-0 lg:border-r-0"}`}>
      <div className="flex h-full w-[min(90vw,320px)] shrink-0 flex-col lg:w-[292px]">
      <div className="flex h-[65px] shrink-0 items-center justify-between border-b px-4"><div className="flex items-center gap-2"><History className="size-4 text-primary"/><h2 className="text-sm font-bold">Conversas</h2></div><button aria-label="Fechar histórico" title="Fechar histórico" onClick={() => setPanel(false)} className="grid size-9 place-items-center rounded-lg hover:bg-surface-muted"><X className="size-4" /></button></div>
      <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto p-3">
        {planningWorkspace ? <Link href="/plano-de-acao" className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border bg-surface px-3 text-xs font-bold transition hover:bg-surface-muted">Voltar aos diagnósticos</Link> : <form action={newChatAction}><button disabled={busy} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border bg-surface px-3 text-xs font-bold transition hover:bg-surface-muted disabled:opacity-40"><Plus className="size-4"/>Nova conversa</button></form>}
        <p className="mt-5 px-1 text-[9px] font-black uppercase tracking-[0.18em] text-muted">{planningWorkspace ? "Planos por diagnóstico" : "Histórico"}</p>
        <div className="mt-2 space-y-1.5">{threads.map(t => <div key={t.id} className={`group relative flex min-h-11 items-center gap-1 rounded-xl border p-2 pl-3 transition-colors ${t.id === currentThreadId ? "border-primary/35 bg-accent-warm" : "bg-surface hover:bg-surface-muted"}`}><button type="button" aria-current={t.id === currentThreadId ? "page" : undefined} disabled={busy || switchingChat} onClick={() => openThread(t.id)} className="min-w-0 flex-1 truncate text-left text-xs font-bold disabled:opacity-50">{t.title}</button><details className="group/menu relative shrink-0"><summary aria-label={`Opções da conversa ${t.title}`} title="Opções" className="grid size-8 cursor-pointer list-none place-items-center rounded-lg text-muted transition hover:bg-white hover:text-foreground [&::-webkit-details-marker]:hidden"><MoreHorizontal className="size-4" /></summary><div className="absolute right-0 top-9 z-30 w-48 overflow-hidden rounded-xl border bg-white p-1.5 shadow-xl"><details className="group/edit"><summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-lg px-2.5 text-xs font-semibold hover:bg-surface-muted [&::-webkit-details-marker]:hidden"><Pencil className="size-3.5" />Editar nome</summary><form action={renameAction} className="mt-1 border-t p-2"><input type="hidden" name="threadId" value={t.id} /><label className="text-[10px] font-semibold text-muted">Nome da conversa<input name="title" defaultValue={t.title} maxLength={72} required className="mt-1 w-full rounded-lg border bg-white px-2 py-1.5 text-xs outline-none focus:border-primary" /></label><button disabled={busy} className="mt-2 min-h-8 w-full rounded-lg bg-primary px-2 text-xs font-bold text-white disabled:opacity-40">Salvar nome</button></form></details><form action={deleteAction} className="mt-1 border-t pt-1"><input type="hidden" name="threadId" value={t.id} /><button disabled={busy} className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-30"><Trash2 className="size-3.5" />Excluir conversa</button></form></div></details></div>)}</div>

      </div>
      </div>
    </aside>
  </div>;
}

"use client";
import { AssistantMarkdown } from "./assistant-markdown";
import { STAGE_LABELS, type WorkshopStage } from "@/core/coo-workshop";
import type { ConversationMemory } from "@/core/conversation-memory";

export function ConversationRecord({ memory, planning, onCorrect, busy }: { memory: ConversationMemory; planning: boolean; onCorrect: () => void; busy: boolean }) {
  const stage = planning ? STAGE_LABELS[memory.currentStage as WorkshopStage] ?? "Entender" : ({ ADVISORY: "Conversa geral", EXECUTION: "Execução", FOLLOW_UP: "Acompanhamento" }[memory.currentStage] ?? "Conversa geral");
  const sections = [
    ["Fatos confirmados", memory.confirmedFacts.map(item => item.text)],
    ["Decisões", memory.decisions.map(item => item.text)],
    ["Hipóteses — ainda não confirmadas", memory.hypotheses],
    ["Pendências", memory.pendingQuestions],
  ] as const;
  return <div className="space-y-5 text-sm">
    <p className="text-xs leading-5 text-muted">O que {planning ? "o planejador" : "o COO"} entendeu nesta conversa. Relatos confirmados não equivalem a resultados medidos.</p>
    <section><h3 className="font-semibold">Resumo</h3><AssistantMarkdown text={memory.summary || "O registro será atualizado ao longo da conversa."} /></section>
    {sections.map(([title, items]) => <section key={title}><h3 className="font-semibold">{title}</h3>{items.length ? <ul className="mt-2 list-disc space-y-2 pl-5">{items.map((item, index) => <li key={index}><AssistantMarkdown text={item} /></li>)}</ul> : <p className="mt-1 text-xs text-muted">Nenhum registro por enquanto.</p>}</section>)}
    <section><h3 className="font-semibold">Etapa atual</h3><p className="mt-1">{stage}</p></section>
    <section><h3 className="font-semibold">Próximo passo</h3><AssistantMarkdown text={memory.nextStep || "Continue a conversa para definir o próximo passo."} /></section>
    <button type="button" disabled={busy} onClick={onCorrect} className="min-h-11 w-full rounded-lg border px-3 font-semibold disabled:opacity-40">Corrigir uma informação</button>
    <p className="text-xs leading-5 text-muted">A correção é feita pela conversa. Alterações em planos e tarefas continuam dependendo da sua aprovação.</p>
  </div>;
}

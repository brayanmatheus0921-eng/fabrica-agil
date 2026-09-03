"use client";
import { useRef } from "react";
import { ArrowUp, Square, LoaderCircle } from "lucide-react";
export function AssistantComposer({ value, onChange, onSend, onStop, busy, stopping, disabled }: {
  value: string; onChange: (value: string) => void; onSend: () => void; onStop: () => void; busy: boolean; stopping: boolean; disabled?: boolean;
}) {
  const input = useRef<HTMLTextAreaElement>(null);
  return <form onSubmit={event => { event.preventDefault(); if (!busy && !disabled) onSend(); }} className="mx-auto max-w-3xl">
    <div className="flex items-end gap-2 rounded-2xl border bg-white p-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/20">
      <textarea ref={input} aria-label="Mensagem para o consultor" value={value} disabled={disabled} maxLength={6000} rows={1}
        placeholder={busy ? "Aguarde a resposta ou clique em Parar" : "Converse com seu consultor…"}
        onChange={event => { onChange(event.target.value); event.target.style.height = "auto"; event.target.style.height = `${Math.min(event.target.scrollHeight, 160)}px`; }}
        onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (!busy && !disabled && !event.repeat) onSend(); } }}
        className="max-h-40 min-h-11 min-w-0 flex-1 resize-none bg-transparent px-3 py-2.5 text-base leading-6 outline-none sm:text-sm" />
      {busy ? <button type="button" aria-label="Parar resposta" title="Parar resposta" onClick={onStop} disabled={stopping} onKeyDown={e => { if (e.key === "Enter") e.preventDefault(); }} className="mb-1 grid size-10 shrink-0 place-items-center rounded-full bg-primary text-white disabled:opacity-50">{stopping ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" /> : <Square className="size-4 fill-current" />}</button>
        : <button type="submit" aria-label="Enviar mensagem" disabled={disabled || !value.trim()} className="mb-1 grid size-10 shrink-0 place-items-center rounded-full bg-primary text-white disabled:opacity-30"><ArrowUp className="size-5" /></button>}
    </div>
    <p className="mt-2 text-center text-[10px] text-muted">Enter envia · Shift + Enter quebra linha · Confira as sugestões antes de aplicar</p>
  </form>;
}

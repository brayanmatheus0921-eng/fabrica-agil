"use client";

import { useActionState } from "react";
import { generateDiagnosticPlan } from "./plan-actions";

export function GeneratePlanButton({ sessionId }: { sessionId: string }) {
  const [state, action, pending] = useActionState(generateDiagnosticPlan, { error: null });
  return <form action={action} className="space-y-3">
    <input type="hidden" name="sessionId" value={sessionId} />
    <button disabled={pending} className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
      {pending ? "Abrindo conversa…" : "Construir plano com o COO"}
    </button>
    {pending ? <p role="status" className="text-xs text-muted">Preparando o diagnóstico para a conversa.</p> : null}
    {state.error ? <p role="alert" className="max-w-lg text-sm text-red-700">{state.error}</p> : null}
  </form>;
}

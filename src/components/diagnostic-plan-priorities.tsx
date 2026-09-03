import { diagnosticPlanSchema } from "@/core/diagnostic-plan";
import { asDiagnosticRecord } from "@/core/diagnostic-history";

export function DiagnosticPlanPriorities({ outcome }: { outcome: unknown }) {
  const parsed = diagnosticPlanSchema.safeParse(outcome);
  if (!parsed.success) return null;
  const methods = asDiagnosticRecord(outcome).methods;
  return <section className="space-y-4">
    <div><h2 className="text-xl font-black">As 3 prioridades do seu plano</h2><p className="mt-1 text-sm text-muted">Por que agir, o que fazer e como saber se melhorou. Metas e responsáveis são sugestões para sua revisão.</p></div>
    {parsed.data.priorities.map((priority, index) => {
      const method = Array.isArray(methods) ? methods.map(asDiagnosticRecord).find((item) => item.code === priority.methodCode) : null;
      return <article key={priority.title} className="rounded-2xl border bg-white p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-wider text-[#9a6538]">Prioridade {index + 1} · {priority.area}</p>
        <h3 className="mt-2 text-lg font-bold">{priority.title}</h3>
        <div className="mt-4 grid gap-4 text-sm leading-6 md:grid-cols-2">
          <p><strong>Fatos do diagnóstico:</strong> {priority.facts}<span className="mt-1 block text-xs text-muted">Evidências: {priority.evidenceCodes.join(", ")}</span></p>
          <p><strong>Hipótese de causa:</strong> {priority.inference}</p>
          <p><strong>Por que priorizar:</strong> {priority.rationale}</p>
          <p><strong>Método:</strong> {method ? String(method.name) : "Coleta de evidências antes de escolher um método"}</p>
          <p><strong>Responsável sugerido:</strong> {priority.suggestedOwner}</p>
          <p><strong>Como medir:</strong> {priority.indicator}<br/><strong>Meta sugerida:</strong> {priority.suggestedTarget}</p>
        </div>
        <ol className="mt-5 space-y-3">{priority.actions.map((action) => <li key={action.title} className="rounded-xl bg-surface-muted p-4 text-sm leading-6">
          <p className="font-bold">{action.title}</p><p>{action.what}</p><p className="mt-1 text-muted">Por quê: {action.why}</p><p className="mt-1">Entrega: {action.expectedOutput}</p><p className="mt-2 text-xs font-bold">{action.dueInDays <= 30 ? "Curto prazo" : action.dueInDays <= 90 ? "Médio prazo" : "Longo prazo"} · {action.dueInDays} dias após aprovação</p>
        </li>)}</ol>
      </article>;
    })}
    {parsed.data.missingEvidence.length ? <aside className="rounded-xl border bg-amber-50 p-4 text-sm"><strong>Ainda precisamos confirmar:</strong><ul className="mt-2 list-inside list-disc">{parsed.data.missingEvidence.map((item) => <li key={item}>{item}</li>)}</ul></aside> : null}
  </section>;
}

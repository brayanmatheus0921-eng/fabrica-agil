import Link from "next/link";
import { finishRota30Diagnostic, saveAdaptiveImpact, saveAdaptivePriority } from "./actions";

type Candidate = { pillar: string; score: number | null };

const labels: Record<string, string> = {
  "Fluxo e prazo": "Atrasos, filas e pedidos parados",
  "Capacidade e gargalo": "Máquina, setor ou pessoa limitando o ritmo",
  "Qualidade e retrabalho": "Erros, correções e retrabalho",
  "Materiais e informação": "Falta de material ou informação",
  "Gestão e padronização": "Variação, prioridade ou responsabilidade",
};

const consequences = ["Atraso", "Perda de produção", "Retrabalho ou sucata", "Custo adicional", "Hora extra", "Reclamação ou perda de cliente", "Desgaste da equipe", "Outro"];

export function DiagnosticAdaptiveForm({ step, sessionId, candidates, selectedPillar, consequence, impact, questionCount, error }: { step: 1 | 2 | 3; sessionId: string; candidates: Candidate[]; selectedPillar?: string; consequence?: string; impact?: number; questionCount: number; error?: string }) {
  const action = step === 1 ? saveAdaptivePriority : step === 2 ? saveAdaptiveImpact : finishRota30Diagnostic;
  const total = questionCount + 3;
  const current = questionCount + step;
  return (
    <form action={action} className="flex min-h-0 flex-1 flex-col gap-[clamp(0.25rem,1.2dvh,0.75rem)]">
      <input type="hidden" name="sessionId" value={sessionId} />
      <div className="flex items-center justify-between text-xs font-bold text-muted"><span><span className="text-primary">Diagnóstico</span> ? Confirmação</span><span>Etapa {current} de {total}</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
      <fieldset className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto rounded-2xl border bg-white px-[clamp(0.75rem,2.5vw,1.75rem)] py-[clamp(0.5rem,1.8dvh,1rem)]">
        <legend className="px-1 text-xs font-bold uppercase tracking-[0.14em] text-primary">Confirmação {step} de 3</legend>
        {step === 1 ? <>
          <h1 className="text-[clamp(1rem,3dvh,1.5rem)] font-black leading-[clamp(1.25rem,3.8dvh,1.875rem)] text-[#0b1320]">Qual situação mais prejudica a fábrica hoje?</h1>
          <p className="mt-1 text-xs leading-4 text-muted sm:text-sm">As respostas indicaram duas áreas de atenção. Escolha a que mais atrapalha a fábrica hoje.</p>
          <div className="mt-[clamp(0.5rem,1.8dvh,1.25rem)] grid gap-[clamp(0.25rem,1dvh,0.625rem)]">{candidates.map((candidate, index) => <label key={candidate.pillar} className="flex cursor-pointer items-center gap-3 rounded-xl border p-[clamp(0.5rem,1.5dvh,1rem)] text-xs has-[:checked]:border-primary has-[:checked]:bg-accent sm:text-sm"><input required className="sr-only" type="radio" name="selectedPillar" value={candidate.pillar} defaultChecked={selectedPillar === candidate.pillar} /><span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#eeece8] text-xs font-black">{index + 1}</span><span className="font-semibold">{labels[candidate.pillar] ?? candidate.pillar}</span></label>)}</div>
        </> : null}
        {step === 2 ? <>
          <h1 className="text-[clamp(1rem,3dvh,1.5rem)] font-black leading-[clamp(1.25rem,3.8dvh,1.875rem)] text-[#0b1320]">Qual é a principal consequência?</h1>
          <p className="mt-1 text-xs leading-4 text-muted sm:text-sm">Depois indique o peso desse impacto na operação.</p>
          <div className="mt-[clamp(0.375rem,1.4dvh,1rem)] grid grid-cols-2 gap-1.5 sm:grid-cols-4">{consequences.map((item) => <label key={item} className="cursor-pointer rounded-xl border p-[clamp(0.4rem,1.2dvh,0.75rem)] text-xs font-semibold leading-4 has-[:checked]:border-primary has-[:checked]:bg-accent sm:text-sm"><input required className="sr-only" type="radio" name="consequence" value={item} defaultChecked={consequence === item} />{item}</label>)}</div>
          <p className="mt-[clamp(0.375rem,1.3dvh,1rem)] text-[11px] font-bold uppercase tracking-[0.12em] text-primary sm:text-xs">Qual o impacto?</p>
          <div className="mt-1.5 grid grid-cols-3 gap-1.5">{[[1,"Baixo"],[2,"Médio"],[3,"Alto"]].map(([value,label]) => <label key={value} className="cursor-pointer rounded-xl border p-[clamp(0.4rem,1.2dvh,0.75rem)] text-center text-xs font-bold has-[:checked]:border-primary has-[:checked]:bg-accent sm:text-sm"><input required className="sr-only" type="radio" name="impact" value={value} defaultChecked={impact === value} />{label}</label>)}</div>
        </> : null}
        {step === 3 ? <>
          <h1 className="text-[clamp(1rem,3dvh,1.5rem)] font-black leading-[clamp(1.25rem,3.8dvh,1.875rem)] text-[#0b1320]">Qual fato recente comprova isso?</h1>
          <p className="mt-1 text-xs leading-4 text-muted sm:text-sm">Cite um pedido, etapa, quantidade, tempo ou registro. Quanto mais concreto, mais confiável será a indicação.</p>
          <textarea required minLength={3} autoFocus name="evidence" rows={4} placeholder="Ex.: Na última semana, 7 pedidos ficaram dois dias esperando o corte." className="mt-[clamp(0.5rem,1.8dvh,1.25rem)] min-h-20 w-full flex-1 resize-none rounded-xl border bg-white p-3 text-sm outline-none transition focus:border-primary" />
        </> : null}
        {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
      </fieldset>
      <div className="flex shrink-0 justify-between border-t pt-[clamp(0.375rem,1.2dvh,0.75rem)]"><Link href={step === 1 ? `/diagnostico/novo?session=${sessionId}&q=${questionCount}` : `/diagnostico/novo?session=${sessionId}&step=adaptativa-${step - 1}`} className="rounded-xl border px-4 py-[clamp(0.5rem,1.5dvh,0.625rem)] text-sm font-bold text-muted">Voltar</Link><button className="rounded-xl bg-primary px-5 py-[clamp(0.5rem,1.5dvh,0.625rem)] text-sm font-bold text-white">{step === 3 ? "Concluir diagnóstico" : "Avançar"}</button></div>
    </form>
  );
}



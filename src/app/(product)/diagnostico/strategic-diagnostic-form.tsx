import Link from "next/link";
import { saveStrategicAnswer } from "./strategic-actions";

type Question = { id: string; code: string; pillar: string; prompt: string; helpText: string | null; options: unknown };
const answerOptions = [
  { value: "YES", label: "Sim", detail: "Existe e é aplicado" },
  { value: "PARTIAL", label: "Parcial", detail: "Existe, mas não funciona sempre" },
  { value: "NO", label: "Não", detail: "Não existe ou não é aplicado" },
];
const impactOptions = [
  { value: "NO_RELEVANT_IMPACT", label: "Não gera impacto relevante" },
  { value: "LOCAL_WASTE", label: "Gera perda de tempo ou retrabalho localizado" },
  { value: "BUSINESS_IMPACT", label: "Afeta custo, produtividade, prazo ou capacidade" },
  { value: "FLOW_OR_CUSTOMER_IMPACT", label: "Interrompe a produção, atrasa entregas ou afeta o cliente" },
  { value: "UNKNOWN", label: "Não sabemos ou não medimos" },
];

export function StrategicDiagnosticForm({ sessionId, questions, currentIndex, initialValue, initialNotes, error }: { sessionId: string; questions: Question[]; currentIndex: number; initialValue?: unknown; initialNotes: string; error?: string }) {
  const index = Math.min(Math.max(currentIndex, 0), questions.length - 1);
  const question = questions[index];
  const impactQuestion = question.code.endsWith(".IMPACT");
  const theme = question.pillar.replace(/^PM\d(?:\.\d)?\s*-\s*/, "");
  const progress = Math.round(((index + 1) / questions.length) * 100);
  const options: Array<{ value: string; label: string; detail?: string }> = impactQuestion ? impactOptions : answerOptions;

  return <form action={saveStrategicAnswer} className="flex min-h-0 flex-1 flex-col gap-[clamp(.3rem,1.2dvh,.65rem)]">
    <input type="hidden" name="sessionId" value={sessionId}/><input type="hidden" name="questionId" value={question.id}/><input type="hidden" name="index" value={index}/><input type="hidden" name="questionKind" value={impactQuestion ? "IMPACT" : "ANSWER"}/>
    <div className="flex shrink-0 justify-between gap-4 text-xs font-bold text-muted"><span><span className="text-primary">{theme}</span> · {impactQuestion ? "Impacto observado" : "Pergunta"}</span><span>{index + 1} de {questions.length}</span></div>
    <div className="h-1.5 shrink-0 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }}/></div>
    <fieldset className="min-h-0 flex-1 overflow-y-auto rounded-2xl border bg-white px-[clamp(.8rem,3vw,1.7rem)] py-[clamp(.6rem,2dvh,1.2rem)]"><legend className="sr-only">{question.prompt}</legend>
      <p className="text-xs font-bold uppercase tracking-[.14em] text-primary">{impactQuestion ? "Fechamento do tema" : question.code}</p><h1 className="mt-1 text-[clamp(1rem,2.8dvh,1.45rem)] font-black leading-tight text-[#0b1320]">{question.prompt}</h1><p className="mt-1 text-xs leading-5 text-muted">{question.helpText}</p>
      {impactQuestion ? <div className="mt-4 rounded-xl border border-[#dce7da] bg-[#f7faf5] px-3 py-2 text-[11px] leading-4 text-[#59616d]"><strong>Você informa apenas o efeito.</strong> Status, nota, desempenho, importância e posição na matriz serão calculados automaticamente.</div> : null}
      <div className={`mt-4 grid gap-2 ${impactQuestion ? "grid-cols-1" : "sm:grid-cols-3"}`}>{options.map((option, optionIndex) => <label key={option.value} className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 has-[:checked]:border-primary has-[:checked]:bg-accent has-[:checked]:text-primary"><input required type="radio" name="value" value={option.value} defaultChecked={initialValue === option.value}/><span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#edf1eb] text-[10px] font-black">{optionIndex + 1}</span><span><span className="text-sm font-black">{option.label}</span>{option.detail ? <span className="mt-0.5 block text-[11px] text-muted">{option.detail}</span> : null}</span></label>)}</div>
      {!impactQuestion ? <label className="mt-4 block text-xs font-bold text-[#59616d]">Observação ou evidência <span className="font-normal text-muted">(opcional)</span><textarea name="notes" defaultValue={initialNotes} rows={2} placeholder="Ex.: planilha usada, número recente, exemplo ou problema observado" className="mt-1 w-full resize-none rounded-xl border bg-[#f8f7f4] px-3 py-2 text-sm font-normal outline-none focus:border-primary"/></label> : null}
      {error ? <p className="mt-2 text-xs font-bold text-red-700">{error}</p> : null}
    </fieldset>
    <div className="flex shrink-0 items-center justify-between border-t pt-2"><Link href={index > 0 ? `/diagnostico/novo?session=${sessionId}&q=${index}` : "/diagnostico"} className="rounded-xl border px-4 py-2.5 text-sm font-bold text-muted">Voltar</Link><button className="rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-white">{index + 1 === questions.length ? "Revisar" : "Avançar"}</button></div>
  </form>;
}

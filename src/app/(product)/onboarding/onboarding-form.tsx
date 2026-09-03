"use client";

import { useState } from "react";
import { useActionState } from "react";
import { initialOnboardingFormState, type OnboardingFormState } from "@/core/onboarding";
import { saveOnboarding } from "./actions";

type Values = { name: string; sector: string; productionType: string; teamSize: number | null; biggestChallenge: string; mainGoal: string; productionStages: string };
type Props = { initialValues: Values };
const fields = [
  { key: "name", title: "Qual é o nome da empresa?", hint: "Use o nome pelo qual sua equipe conhece a fábrica.", placeholder: "Ex.: Móveis Horizonte", type: "text" },
  { key: "sector", title: "Em qual setor a empresa atua?", hint: "Isso ajuda o consultor a interpretar seu contexto.", placeholder: "Ex.: Fábrica de móveis", type: "text" },
  { key: "productionType", title: "Como é o tipo de produção?", hint: "Você pode combinar mais de uma opção.", placeholder: "Ex.: Sob medida, seriada ou mista", type: "text" },
  { key: "teamSize", title: "Quantas pessoas trabalham na equipe?", hint: "Considere quem participa da operação hoje.", placeholder: "Ex.: 18", type: "number" },
  { key: "biggestChallenge", title: "Qual é o maior problema atual?", hint: "Descreva a situação que mais consome tempo, dinheiro ou capacidade.", placeholder: "Ex.: Pedidos atrasam porque a montagem fica esperando peças do corte.", type: "textarea" },
  { key: "mainGoal", title: "Qual principal resultado você quer alcançar?", hint: "Pense no resultado que faria mais diferença nos próximos meses.", placeholder: "Ex.: Entregar no prazo sem aumentar a equipe.", type: "textarea" },
  { key: "productionStages", title: "Quais são as principais etapas da produção?", hint: "Separe as etapas por vírgula ou uma por linha.", placeholder: "Ex.: projeto, corte, usinagem, montagem, acabamento, expedição", type: "textarea" },
] as const;

function FieldError({ state, name }: { state: OnboardingFormState; name: string }) {
  const message = state.fieldErrors?.[name]?.[0];
  return message ? <p className="mt-2 text-xs font-semibold text-[#a33d36]">{message}</p> : null;
}

export function OnboardingForm({ initialValues }: Props) {
  const [state, formAction, pending] = useActionState(saveOnboarding, initialOnboardingFormState);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({
    name: initialValues.name, sector: initialValues.sector, productionType: initialValues.productionType,
    teamSize: initialValues.teamSize?.toString() ?? "", biggestChallenge: initialValues.biggestChallenge,
    mainGoal: initialValues.mainGoal, productionStages: initialValues.productionStages,
  });
  const field = fields[step];
  const currentValue = values[field.key] ?? "";
  const setCurrent = (value: string) => setValues((current) => ({ ...current, [field.key]: value }));
  const next = () => { const element = document.getElementById(`onboarding-${field.key}`) as HTMLInputElement | HTMLTextAreaElement | null; const rawValue = element?.value ?? currentValue; setCurrent(rawValue); if (rawValue.trim()) setStep((current) => Math.min(current + 1, fields.length - 1)); };

  return (
    <form action={formAction} className="space-y-7">
      {fields.filter((item) => item.key !== field.key).map((item) => <input key={item.key} type="hidden" name={item.key} value={values[item.key] ?? ""} />)}
      <div className="flex items-center justify-between gap-4 text-xs font-bold text-muted"><span>Empresa</span><span>Pergunta {step + 1} de {fields.length}</span></div>
      <div className="flex gap-1.5" aria-label="Progresso do cadastro">{fields.map((item, index) => <span key={item.key} className={`h-1.5 flex-1 rounded-full transition ${index <= step ? "bg-primary" : "bg-surface-muted"}`} />)}</div>
      <div className="min-h-[310px] rounded-2xl border bg-surface-muted/40 p-5 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Etapa {step + 1}</p>
        <label className="mt-5 block text-xl font-bold leading-8 sm:text-2xl" htmlFor={`onboarding-${field.key}`}>{field.title}</label>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">{field.hint}</p>
        {field.type === "textarea" ? <textarea id={`onboarding-${field.key}`} name={field.key} autoFocus className="mt-7 min-h-28 w-full resize-y rounded-xl border bg-white px-4 py-3 text-base outline-none placeholder:text-[#9a968f] focus:border-primary/50 focus:ring-3 focus:ring-primary/10" value={currentValue} onChange={(event) => setCurrent(event.target.value)} onInput={(event) => setCurrent(event.currentTarget.value)} placeholder={field.placeholder} /> : <input id={`onboarding-${field.key}`} name={field.key} autoFocus className="mt-7 w-full rounded-xl border bg-white px-4 py-3 text-base outline-none placeholder:text-[#9a968f] focus:border-primary/50 focus:ring-3 focus:ring-primary/10" type={field.type} min={field.type === "number" ? 1 : undefined} value={currentValue} onChange={(event) => setCurrent(event.target.value)} onInput={(event) => setCurrent(event.currentTarget.value)} placeholder={field.placeholder} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); next(); } }} />}
        <FieldError state={state} name={field.key} />
      </div>
      {state.status === "error" ? <p aria-live="polite" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.message}</p> : null}
      <div className="flex items-center justify-between gap-3 border-t pt-5"><button type="button" disabled={step === 0} onClick={() => setStep((current) => Math.max(current - 1, 0))} className="rounded-xl px-4 py-3 text-sm font-bold text-muted disabled:invisible">Voltar</button>{step < fields.length - 1 ? <button type="button" onClick={next} className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white">Continuar <span aria-hidden="true">?</span></button> : <button type="submit" disabled={pending} className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60">{pending ? "Salvando..." : "Salvar e ir para o diagnóstico"}</button>}</div>
    </form>
  );
}



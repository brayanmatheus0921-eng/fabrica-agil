import Link from "next/link";
import {
  ENTERPRISE_DOMAIN_DESCRIPTIONS,
  ENTERPRISE_DOMAIN_LABELS,
  type EnterpriseTriageAdaptiveQuestion,
  type EnterpriseDomain,
} from "@/core/enterprise-triage-method";
import {
  finishEnterpriseTriage,
  saveEnterpriseFollowUp,
  saveEnterpriseTieBreaker,
} from "./enterprise-actions";

export function EnterpriseTriageFollowUpForm({
  sessionId,
  question,
  currentIndex,
  totalQuestions,
  totalMainQuestions,
  initialValue,
  error,
}: {
  sessionId: string;
  question: EnterpriseTriageAdaptiveQuestion;
  currentIndex: number;
  totalQuestions: number;
  totalMainQuestions: number;
  initialValue?: string;
  error?: string;
}) {
  return (
    <form
      action={saveEnterpriseFollowUp}
      className="flex min-h-0 flex-1 flex-col gap-2"
    >
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="questionCode" value={question.code} />
      <input type="hidden" name="index" value={currentIndex} />

      <div className="flex shrink-0 items-center justify-between gap-4 text-[11px] font-bold text-muted sm:text-xs">
        <span>
          <span className="text-primary">Diagnóstico de setor</span> → Aprofundamento
        </span>
        <span>
          Pergunta extra {currentIndex + 1} de {totalQuestions}
        </span>
      </div>

      <div className="h-1.5 shrink-0 overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full w-[88%] rounded-full bg-primary" />
      </div>

      <p className="shrink-0 text-[11px] leading-4 text-muted sm:text-xs">
        Esta pergunta apareceu porque uma resposta anterior indicou atenção.
      </p>

      <fieldset className="min-h-0 flex-1 overflow-hidden rounded-2xl border bg-white px-4 pb-2 pt-1 sm:px-6">
        <legend className="px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary sm:text-xs">
          Pergunta adaptativa
        </legend>
        <div className="flex h-full min-h-0 flex-col">
          <p className="mt-0.5 shrink-0 text-sm font-bold leading-[18px] sm:text-base sm:leading-5">
            {question.prompt}
          </p>
          <p className="mt-0.5 shrink-0 text-[11px] leading-4 text-muted sm:text-xs">
            {question.helpText}
          </p>

          <div className="mt-1.5 grid min-h-0 flex-1 content-start gap-1">
            {question.options.map((option, optionIndex) => (
              <label
                key={option.value}
                className="group flex min-h-7 w-full cursor-pointer items-center gap-2.5 rounded-xl border border-[#dedbd5] bg-white px-3 py-0.5 text-left text-xs font-semibold leading-4 text-foreground transition hover:border-primary/55 hover:bg-[#f8faf7] has-[:checked]:border-primary has-[:checked]:bg-accent has-[:checked]:text-primary sm:px-4 sm:text-[13px]"
              >
                <input
                  required
                  type="radio"
                  name="value"
                  value={option.value}
                  defaultChecked={initialValue === option.value}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  className="grid size-5 shrink-0 place-items-center rounded-full bg-[#eeece8] text-[10px] font-black text-[#5f6d64] transition group-hover:bg-accent group-hover:text-primary peer-checked:bg-primary peer-checked:text-white"
                >
                  {option.value === "UNKNOWN" ? "?" : optionIndex + 1}
                </span>
                <span className="min-w-0 flex-1">{option.label}</span>
              </label>
            ))}
          </div>

          {error ? (
            <p className="mt-1 shrink-0 text-xs font-semibold text-red-700">
              {error}
            </p>
          ) : null}
        </div>
      </fieldset>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t pt-2">
        <Link
          href={
            currentIndex > 0
              ? `/diagnostico/empresa?step=aprofundamento&a=${currentIndex}`
              : `/diagnostico/empresa?q=${totalMainQuestions}`
          }
          className="rounded-xl border bg-white px-4 py-2.5 text-sm font-bold text-muted transition hover:border-primary/40 hover:text-primary"
        >
          Voltar
        </Link>
        <button
          type="submit"
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-strong"
        >
          Avançar
        </button>
      </div>
    </form>
  );
}

export function EnterpriseTriageAdaptiveForm({
  step,
  sessionId,
  candidates,
  selectedDomain,
  totalMainQuestions,
  followUpCount,
  error,
}: {
  step: "desempate" | "evidencia";
  sessionId: string;
  candidates: EnterpriseDomain[];
  selectedDomain?: EnterpriseDomain;
  totalMainQuestions: number;
  followUpCount: number;
  error?: string;
}) {
  if (step === "desempate") {
    return (
      <form
        action={saveEnterpriseTieBreaker}
        className="flex min-h-0 flex-1 flex-col gap-3"
      >
        <input type="hidden" name="sessionId" value={sessionId} />
        <div className="flex items-center justify-between text-xs font-bold text-muted">
          <span>
            <span className="text-primary">Diagnóstico de setor</span> → Confirmação
          </span>
          <span>última etapa</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
          <div className="h-full w-[94%] rounded-full bg-primary" />
        </div>
        <fieldset className="flex min-h-0 flex-1 flex-col justify-center overflow-hidden rounded-2xl border bg-white px-4 py-5 sm:px-8">
          <legend className="px-1 text-xs font-bold uppercase tracking-[0.14em] text-primary">
            Desempate rápido
          </legend>
          <h1 className="text-xl font-black text-[#0b1320] sm:text-2xl">
            Qual destas situações mais prejudica a empresa hoje?
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            As respostas deixaram duas áreas muito próximas. Escolha somente a
            que deveria ser investigada primeiro.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {candidates.map((domain, index) => (
              <label
                key={domain}
                className="flex cursor-pointer gap-3 rounded-2xl border p-4 transition hover:border-primary/50 has-[:checked]:border-primary has-[:checked]:bg-accent"
              >
                <input
                  required
                  className="sr-only"
                  type="radio"
                  name="selectedDomain"
                  value={domain}
                  defaultChecked={selectedDomain === domain}
                />
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#eeece8] text-xs font-black">
                  {index + 1}
                </span>
                <span>
                  <span className="block font-bold">
                    {ENTERPRISE_DOMAIN_LABELS[domain]}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted">
                    {ENTERPRISE_DOMAIN_DESCRIPTIONS[domain]}
                  </span>
                </span>
              </label>
            ))}
          </div>
          {error ? (
            <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>
          ) : null}
        </fieldset>
        <div className="flex justify-between border-t pt-3">
          <Link
            href={
              followUpCount > 0
                ? `/diagnostico/empresa?step=aprofundamento&a=${followUpCount}`
                : `/diagnostico/empresa?q=${totalMainQuestions}`
            }
            className="rounded-xl border px-4 py-2.5 text-sm font-bold text-muted"
          >
            Voltar
          </Link>
          <button className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white">
            Avançar
          </button>
        </div>
      </form>
    );
  }

  return (
    <form
      action={finishEnterpriseTriage}
      className="flex min-h-0 flex-1 flex-col gap-3"
    >
      <input type="hidden" name="sessionId" value={sessionId} />
      <div className="flex items-center justify-between text-xs font-bold text-muted">
        <span>
          <span className="text-primary">Diagnóstico de setor</span> → Evidência
        </span>
        <span>última etapa</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full w-full rounded-full bg-primary" />
      </div>
      <fieldset className="flex min-h-0 flex-1 flex-col justify-center overflow-hidden rounded-2xl border bg-white px-4 py-5 sm:px-8">
        <legend className="px-1 text-xs font-bold uppercase tracking-[0.14em] text-primary">
          Confirmação final
        </legend>
        <h1 className="text-xl font-black text-[#0b1320] sm:text-2xl">
          Qual fato recente mostra que isso está acontecendo?
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Pode ser um atraso, venda perdida, falta de caixa, margem ruim ou outro
          exemplo real. Uma frase já ajuda.
        </p>
        <textarea
          name="evidence"
          rows={5}
          autoFocus
          placeholder="Ex.: Neste mês vendemos bem, mas faltou caixa para comprar material de três pedidos."
          className="mt-5 w-full resize-none rounded-xl border bg-white p-4 text-sm outline-none transition focus:border-primary"
        />
        {error ? (
          <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>
        ) : null}
      </fieldset>
      <div className="flex flex-wrap justify-between gap-2 border-t pt-3">
        <Link
          href={
            candidates.length > 1
              ? "/diagnostico/empresa?step=desempate"
              : followUpCount > 0
                ? `/diagnostico/empresa?step=aprofundamento&a=${followUpCount}`
                : `/diagnostico/empresa?q=${totalMainQuestions}`
          }
          className="rounded-xl border px-4 py-2.5 text-sm font-bold text-muted"
        >
          Voltar
        </Link>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="submit"
            name="skipEvidence"
            value="1"
            formNoValidate
            className="rounded-xl border px-4 py-2.5 text-sm font-bold text-muted"
          >
            Não tenho exemplo agora
          </button>
          <button className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white">
            Ver resultado
          </button>
        </div>
      </div>
    </form>
  );
}



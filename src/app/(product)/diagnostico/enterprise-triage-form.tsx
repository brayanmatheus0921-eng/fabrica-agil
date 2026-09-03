import Link from "next/link";
import {
  ENTERPRISE_TRIAGE_OUTCOME_OPTIONS,
} from "@/core/enterprise-triage-method";
import { saveEnterpriseTriageAnswer } from "./enterprise-actions";

type Question = {
  id: string;
  code: string;
  pillar: string;
  prompt: string;
  helpText: string | null;
  options: unknown;
};

function getOptions(question: Question) {
  const rawOptions = question.options;
  if (
    !Array.isArray(rawOptions) ||
    !rawOptions.every((option) => typeof option === "string")
  ) {
    return [];
  }

  if (question.code === "TRIAGE-OUTCOME") {
    return ENTERPRISE_TRIAGE_OUTCOME_OPTIONS.map((option) => ({
      label: option.label,
      value: option.value,
    }));
  }

  return rawOptions.map((label, index) => ({
    label,
    value:
      index === rawOptions.length - 1
        ? "UNKNOWN"
        : String([1, 3, 5][index]),
  }));
}

export function EnterpriseTriageForm({
  sessionId,
  questions,
  currentIndex,
  initialValue,
  error,
}: {
  sessionId: string;
  questions: Question[];
  currentIndex: number;
  initialValue?: string;
  error?: string;
}) {
  const index = Math.min(Math.max(currentIndex, 0), questions.length - 1);
  const question = questions[index];
  const options = getOptions(question);
  const totalJourneySteps = questions.length + 1;

  return (
    <form
      action={saveEnterpriseTriageAnswer}
      className="flex min-h-0 flex-1 flex-col gap-2"
    >
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="questionId" value={question.id} />
      <input type="hidden" name="index" value={index} />

      <div className="flex shrink-0 items-center justify-between gap-4 text-[11px] font-bold text-muted sm:text-xs">
        <span>
          <span className="text-primary">Empresa</span> → Diagnóstico de setor
        </span>
        <span>
          Pergunta {index + 1} de {questions.length}
        </span>
      </div>

      <div className="h-1.5 shrink-0 overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${((index + 1) / totalJourneySteps) * 100}%` }}
        />
      </div>

      <p className="shrink-0 text-xs leading-4 text-muted">
        Responda pela realidade mais comum dos últimos 30 a 90 dias.
      </p>

      <fieldset className="min-h-0 flex-1 overflow-hidden rounded-2xl border bg-white px-4 pb-3 pt-1 sm:px-6 sm:pb-4">
        <legend className="px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary sm:text-xs">
          {question.pillar}
        </legend>
        <div className="flex h-full min-h-0 flex-col">
          <p className="mt-1 shrink-0 text-base font-bold leading-5 sm:text-lg sm:leading-6">
            {question.prompt}
          </p>
          {question.helpText ? (
            <p className="mt-1 shrink-0 text-xs leading-4 text-muted sm:text-sm sm:leading-5">
              {question.helpText}
            </p>
          ) : null}

          <div className="mt-2 grid min-h-0 flex-1 content-start gap-1 overflow-y-auto pb-1">
            {options.map((option, optionIndex) => (
              <label
                key={option.value}
                className="group flex min-h-8 w-full cursor-pointer items-center gap-3 rounded-xl border border-[#dedbd5] bg-white px-3 py-1 text-left text-sm font-semibold text-foreground transition hover:border-primary/55 hover:bg-[#f8faf7] has-[:checked]:border-primary has-[:checked]:bg-accent has-[:checked]:text-primary sm:px-4"
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
                  className="grid size-6 shrink-0 place-items-center rounded-full bg-[#eeece8] text-xs font-black text-[#5f6d64] transition group-hover:bg-accent group-hover:text-primary peer-checked:bg-primary peer-checked:text-white"
                >
                  {option.value === "UNKNOWN" ? "?" : optionIndex + 1}
                </span>
                <span className="min-w-0 flex-1">{option.label}</span>
              </label>
            ))}
          </div>

          {error ? (
            <p className="mt-2 shrink-0 text-sm font-semibold text-red-700">
              {error}
            </p>
          ) : null}
        </div>
      </fieldset>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t pt-2">
        <Link
          href={
            index > 0 ? `/diagnostico/empresa?q=${index}` : "/diagnostico"
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



import Link from "next/link";
import { saveDiagnosticAnswer } from "./actions";

type Question = { id: string; pillar: string; prompt: string; helpText: string | null; options: unknown };

const fallbackOptions = [
  "Situação controlada",
  "Acontece algumas vezes",
  "Situação crítica",
  "Não sei/não medimos",
];

function getAnswerOptions(options: unknown) {
  if (
    Array.isArray(options) &&
    options.length === 4 &&
    options.every((option) => typeof option === "string")
  ) {
    return options;
  }

  return fallbackOptions;
}

export function DiagnosticForm({ sessionId, questions, currentIndex, initialValue, error }: { sessionId: string; questions: Question[]; currentIndex: number; initialValue?: number | "UNKNOWN"; error?: string }) {
  const index = Math.min(Math.max(currentIndex, 0), questions.length - 1);
  const question = questions[index];
  const answerOptions = getAnswerOptions(question.options);

  return (
    <form
      action={saveDiagnosticAnswer}
      className="flex min-h-0 flex-1 flex-col gap-[clamp(0.25rem,1.2dvh,0.625rem)]"
    >
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="questionId" value={question.id} />
      <input type="hidden" name="index" value={index} />

      <div className="flex shrink-0 items-center justify-between gap-4 text-[11px] font-bold text-muted sm:text-xs">
        <span>
          <span className="text-primary">Empresa</span> ? Diagnóstico
        </span>
        <span>
          Pergunta {index + 1} de {questions.length}
        </span>
      </div>

      <div className="h-1.5 shrink-0 overflow-hidden rounded-full bg-surface-muted" aria-label="Progresso do diagnóstico">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${((index + 1) / questions.length) * 100}%` }}
        />
      </div>

      <p className="shrink-0 text-[11px] leading-4 text-muted sm:text-xs">
        Escolha a resposta mais próxima da realidade. Se não souber, tudo bem.
      </p>

      <fieldset className="min-h-0 flex-1 overflow-hidden rounded-2xl border bg-white px-[clamp(0.75rem,2.5vw,1.5rem)] pb-2 pt-1">
        <legend className="px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary sm:text-xs">
          {index + 1}. {question.pillar}
        </legend>
        <div className="flex h-full min-h-0 flex-col">
          <p className="mt-0.5 shrink-0 text-[clamp(0.875rem,2.5dvh,1.125rem)] font-bold leading-[clamp(1.125rem,3.2dvh,1.5rem)]">
            {question.prompt}
          </p>
          {question.helpText ? (
            <p className="mt-0.5 shrink-0 text-[11px] leading-4 text-muted sm:text-xs">
              {question.helpText}
            </p>
          ) : null}

          <div className="mt-[clamp(0.375rem,1.3dvh,0.75rem)] grid min-h-0 w-full flex-1 grid-rows-4 gap-[clamp(0.2rem,0.8dvh,0.375rem)] self-center sm:max-h-48">
            {answerOptions.map((label, optionIndex) => {
              const value =
                optionIndex === answerOptions.length - 1
                  ? "UNKNOWN"
                  : [1, 3, 5][optionIndex];

              return (
                <label
                  key={value}
                  className="group flex h-full min-h-0 w-full cursor-pointer items-center gap-2.5 rounded-xl border border-[#dedbd5] bg-white px-3 py-0.5 text-left text-[clamp(0.7rem,1.8dvh,0.875rem)] font-semibold leading-4 text-foreground transition hover:border-primary/55 hover:bg-[#f8faf7] has-[:checked]:border-primary has-[:checked]:bg-accent has-[:checked]:text-primary sm:px-4"
                >
                  <input
                    required
                    type="radio"
                    name="value"
                    value={value}
                    defaultChecked={initialValue === value}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className="grid size-[clamp(1.25rem,3.8dvh,1.5rem)] shrink-0 place-items-center rounded-full bg-[#eeece8] text-[10px] font-black text-[#5f6d64] transition group-hover:bg-accent group-hover:text-primary peer-checked:bg-primary peer-checked:text-white"
                  >
                    {value === "UNKNOWN" ? "?" : optionIndex + 1}
                  </span>
                  <span className="min-w-0 flex-1">{label}</span>
                </label>
              );
            })}
          </div>

          {error ? (
            <p className="mt-1 shrink-0 text-xs font-semibold text-red-700">
              {error}
            </p>
          ) : null}
        </div>
      </fieldset>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t pt-[clamp(0.375rem,1.2dvh,0.625rem)]">
        <Link
          href={
            index > 0
              ? `/diagnostico/novo?session=${sessionId}&q=${index}`
              : "/diagnostico"
          }
          className="rounded-xl border bg-white px-4 py-[clamp(0.5rem,1.5dvh,0.625rem)] text-sm font-bold text-muted transition hover:border-primary/40 hover:text-primary"
        >
          Voltar
        </Link>
        <button
          type="submit"
          className="rounded-xl bg-primary px-5 py-[clamp(0.5rem,1.5dvh,0.625rem)] text-sm font-bold text-white transition hover:bg-primary-strong"
        >
          Avançar
        </button>
      </div>
    </form>
  );
}



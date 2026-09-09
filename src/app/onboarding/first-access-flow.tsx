import { ArrowRight, Building2, Database } from "lucide-react";
import Link from "next/link";
import {
  companyProfileQuestions,
  type CompanyProfileValues,
} from "@/core/company-profile";
import { OnboardingProgress } from "@/components/onboarding-progress";
import { saveOnboardingStep } from "./actions";

export function FirstAccessFlow({
  initialValues,
  started,
  question = 1,
  error,
}: {
  initialValues: CompanyProfileValues;
  started: boolean;
  question?: number;
  error?: string;
}) {
  if (!started) {
    return (
      <main className="first-access min-h-dvh bg-background px-4 py-5 sm:px-8 sm:py-8">
        <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-3xl flex-col">
          <header className="flex items-center justify-between">
            <Link href="/" className="text-lg font-black tracking-[-0.04em] text-[#0b1320]">
              Fábrica Ágil
            </Link>
            <Link href="/dashboard" className="rounded-xl border bg-white px-4 py-2.5 text-sm font-bold text-[#59616d] hover:text-[#0b1320]">
              Pular por agora
            </Link>
          </header>
          <div className="flex flex-1 flex-col items-center justify-center py-10 text-center sm:py-16">
            <div className="mb-8 w-full max-w-2xl">
              <OnboardingProgress current={1} />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0b1320]">
              Primeiro acesso
            </p>
            <h1 className="mt-3 max-w-xl text-2xl font-bold tracking-[-0.03em] text-foreground sm:text-3xl">
              Primeiro, dê contexto à sua consultora
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-muted">
              São 9 respostas rápidas sobre a realidade da fábrica. Depois,
              você faz o diagnóstico operacional para encontrar o principal
              gargalo da produção.
            </p>
            <p className="mt-3 text-xs font-semibold text-[#7b897f]">
              Tempo estimado: 2 minutos
            </p>
            <Link href="/onboarding?step=form" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#0b1320] px-6 py-3.5 text-sm font-bold text-white shadow-[0_10px_25px_rgba(23,107,69,0.18)] hover:bg-[#111a2a]">
              Começar cadastro
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const current = Math.min(
    Math.max(question, 1),
    companyProfileQuestions.length,
  );
  const field = companyProfileQuestions[current - 1];
  const initialValue = initialValues[field.key] ?? "";

  return (
    <main className="first-access min-h-dvh bg-background px-4 py-4 sm:px-8 sm:py-6 lg:py-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 sm:gap-6">
        <header className="relative z-10 flex items-center justify-between">
          <Link href="/onboarding" className="text-base font-bold tracking-[-0.03em] text-foreground">
            Fábrica Ágil
          </Link>
          <Link href="/dashboard" className="rounded-xl border bg-white px-3.5 py-2 text-sm font-bold text-[#59616d] transition hover:border-[#c9c4bc] hover:text-[#0b1320] sm:px-4">
            Pular por agora
          </Link>
        </header>

        <div className="flex items-center justify-center">
          <section className="flex w-full min-w-0 flex-col rounded-2xl border bg-surface p-4 shadow-[0_8px_32px_rgba(20,35,27,0.04)] sm:p-6 lg:p-8">
            <div className="mb-3 shrink-0">
              <OnboardingProgress current={1} />
            </div>
            <div className="mb-3 flex shrink-0 items-center gap-3 sm:mb-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#f5e8d8] text-[#0b1320] sm:size-10">
                <Building2 aria-hidden="true" className="size-5" />
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0b1320] sm:text-xs">
                  Contexto da empresa
                </p>
                <p className="text-xs leading-5 text-muted">
                  Pergunta {current} de {companyProfileQuestions.length}
                </p>
              </div>
            </div>

            <form action={saveOnboardingStep} className="flex min-w-0 flex-col gap-5 sm:gap-6">
              <input type="hidden" name="question" value={current} />
              <div className="flex shrink-0 gap-1.5" aria-label="Progresso do cadastro">
                {companyProfileQuestions.map((item, index) => (
                  <span
                    key={item.key}
                    className={`h-1.5 flex-1 rounded-full ${
                      index < current ? "bg-[#0b1320]" : "bg-[#eeece8]"
                    }`}
                  />
                ))}
              </div>

              <fieldset className="min-w-0 border-0 p-0">
                <legend className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                  Etapa {current}
                </legend>
                <h1 className="mt-2 text-xl font-semibold leading-7 tracking-[-0.02em] text-foreground">
                  {field.title}
                </h1>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {field.hint}
                </p>

                {field.type === "choice" ? (
                  <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                    {field.options.map((option, index) => (
                      <label
                        key={option}
                        className="group flex min-h-12 min-w-0 cursor-pointer items-center gap-2.5 rounded-xl border bg-surface px-3 py-2.5 text-sm font-medium leading-5 transition-colors hover:border-primary/60 has-[:checked]:border-primary has-[:checked]:bg-surface-muted has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary"
                      >
                        <input
                          required
                          type="radio"
                          name="value"
                          value={option}
                          defaultChecked={String(initialValue) === option}
                          className="peer sr-only"
                        />
                        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-muted text-xs font-semibold text-muted peer-checked:bg-primary peer-checked:text-[var(--primary-contrast)]">
                          {index + 1}
                        </span>
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <label htmlFor="answer" className="sr-only">
                    {field.title}
                  </label>
                )}

                {field.type !== "choice" ? (
                  <input
                    id="answer"
                    name="value"
                    required
                    autoFocus
                    defaultValue={String(initialValue)}
                    type={field.type}
                    min={field.type === "number" ? 1 : undefined}
                    placeholder={field.placeholder}
                    className="mt-4 w-full rounded-xl border bg-white px-4 py-3 text-base outline-none placeholder:text-[#9a968f] focus:border-[#0b1320] sm:mt-6"
                  />
                ) : null}

                {error ? (
                  <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>
                ) : null}
              </fieldset>

              <div className="flex items-center justify-between gap-3 border-t pt-4">
                {current > 1 ? (
                  <Link href={`/onboarding?step=form&question=${current - 1}`} className="px-3 py-2.5 text-sm font-bold text-[#69717d] sm:px-4">
                    Voltar
                  </Link>
                ) : (
                  <span />
                )}
                <button type="submit" className="min-h-11 min-w-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-primary-strong">
                  {current === companyProfileQuestions.length
                    ? "Salvar e continuar para triagem"
                    : "Continuar"}
                </button>
              </div>
            </form>
          </section>
        </div>
        <div className="flex items-center justify-center gap-2 text-[11px] leading-[18px] text-[#7b897f]">
          <Database aria-hidden="true" className="size-3.5" />
          Cada resposta é salva antes de avançar
        </div>
      </div>
    </main>
  );
}



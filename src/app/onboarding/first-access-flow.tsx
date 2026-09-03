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
      <main className="h-dvh overflow-hidden bg-[#f5f3ef] px-4 py-5 sm:px-8 sm:py-8">
        <div className="mx-auto flex h-full max-w-6xl flex-col">
          <header className="flex items-center justify-between">
            <Link href="/" className="text-lg font-black tracking-[-0.04em] text-[#0b1320]">
              Fábrica Ágil
            </Link>
            <Link href="/dashboard" className="rounded-xl border bg-white px-4 py-2.5 text-sm font-bold text-[#59616d] hover:text-[#0b1320]">
              Pular por agora
            </Link>
          </header>
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="mb-8 w-full max-w-2xl">
              <OnboardingProgress current={1} />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0b1320]">
              Primeiro acesso
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-[-0.04em] text-[#0b1320] sm:text-5xl">
              Primeiro, dê contexto à sua consultora
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[#69717d] sm:text-base">
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
    <main className="h-dvh overflow-hidden bg-[#f5f3ef] p-3 sm:px-8 sm:py-5">
      <div className="mx-auto grid h-full max-w-4xl grid-rows-[44px_minmax(0,1fr)_18px] gap-2 sm:grid-rows-[48px_minmax(0,1fr)_18px] sm:gap-3">
        <header className="relative z-10 flex items-center justify-between">
          <Link href="/onboarding" className="text-lg font-black tracking-[-0.04em] text-[#0b1320]">
            Fábrica Ágil
          </Link>
          <Link href="/dashboard" className="rounded-xl border bg-white px-3.5 py-2 text-sm font-bold text-[#59616d] transition hover:border-[#c9c4bc] hover:text-[#0b1320] sm:px-4">
            Pular por agora
          </Link>
        </header>

        <div className="flex min-h-0 items-center justify-center">
          <section className="flex h-full max-h-[660px] w-full min-h-0 flex-col overflow-hidden rounded-2xl border bg-white p-4 shadow-[0_20px_60px_rgba(20,35,27,0.08)] sm:rounded-3xl sm:p-7">
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
                <p className="text-sm text-[#69717d]">
                  Pergunta {current} de {companyProfileQuestions.length}
                </p>
              </div>
            </div>

            <form action={saveOnboardingStep} className="flex min-h-0 flex-1 flex-col gap-3 sm:gap-4">
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

              <fieldset className="flex min-h-0 flex-1 flex-col justify-center rounded-2xl border bg-[#f8f9f6] p-4 sm:p-7">
                <legend className="px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0b1320] sm:text-xs">
                  Etapa {current}
                </legend>
                <h1 className="mt-1 text-xl font-bold leading-7 text-[#0b1320] sm:mt-3 sm:text-2xl sm:leading-8">
                  {field.title}
                </h1>
                <p className="mt-1.5 text-xs leading-5 text-[#69717d] sm:mt-2 sm:text-sm sm:leading-6">
                  {field.hint}
                </p>

                {field.type === "choice" ? (
                  <div className="mt-4 grid gap-2 sm:mt-6 sm:grid-cols-2">
                    {field.options.map((option, index) => (
                      <label
                        key={option}
                        className="group flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-[#dedbd5] bg-white px-4 py-3 text-sm font-semibold transition hover:border-[#0b1320]/50 has-[:checked]:border-[#0b1320] has-[:checked]:bg-[#f5e8d8] has-[:checked]:text-[#0b1320]"
                      >
                        <input
                          required
                          type="radio"
                          name="value"
                          value={option}
                          defaultChecked={String(initialValue) === option}
                          className="peer sr-only"
                        />
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#eeece8] text-xs font-black text-[#5f6d64] peer-checked:bg-[#0b1320] peer-checked:text-white">
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

              <div className="flex shrink-0 items-center justify-between border-t pt-3 sm:pt-4">
                {current > 1 ? (
                  <Link href={`/onboarding?step=form&question=${current - 1}`} className="px-3 py-2.5 text-sm font-bold text-[#69717d] sm:px-4">
                    Voltar
                  </Link>
                ) : (
                  <span />
                )}
                <button type="submit" className="rounded-xl bg-[#0b1320] px-4 py-2.5 text-sm font-bold text-white sm:px-5 sm:py-3">
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



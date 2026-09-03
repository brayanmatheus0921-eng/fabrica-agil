import { Check, ChevronRight } from "lucide-react";

const steps = [
  { label: "Empresa", detail: "Contexto da fábrica" },
  { label: "Diagnóstico", detail: "Gargalo operacional" },
] as const;

export function OnboardingProgress({
  current,
  completed = false,
}: {
  current: 1 | 2;
  completed?: boolean;
}) {
  return (
    <div
      aria-label={`Etapa ${current} de 2 do primeiro acesso`}
      className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:gap-3"
    >
      {steps.map((step, index) => {
        const number = index + 1;
        const stepCompleted = number < current || (completed && number === current);
        const active = number === current && !completed;

        return (
          <div key={step.label} className="contents">
            <div
              className={`min-w-0 rounded-xl border px-2.5 py-2 sm:px-4 ${
                active
                  ? "border-[#0b1320] bg-[#f5e8d8]"
                : stepCompleted
                    ? "border-[#cfe1d4] bg-white"
                    : "border-[#e2e6e0] bg-white/65"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-black ${
                    active || stepCompleted
                      ? "bg-[#0b1320] text-white"
                      : "bg-[#eeece8] text-[#7b897f]"
                  }`}
                >
                  {stepCompleted ? (
                    <Check aria-hidden="true" className="size-3" />
                  ) : (
                    number
                  )}
                </span>
                <span
                  className={`truncate text-[11px] font-black sm:text-xs ${
                    active ? "text-[#0b1320]" : "text-[#59616d]"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              <span className="mt-1 hidden truncate pl-7 text-[10px] text-[#7b897f] sm:block">
                {step.detail}
              </span>
            </div>
            {index < steps.length - 1 ? (
              <ChevronRight
                aria-hidden="true"
                className="size-3.5 text-[#aab3ac]"
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}





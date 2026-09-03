import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

const steps = [
  {
    label: "Entender",
    detail: "Ver o que está travando",
  },
  {
    label: "Agir",
    detail: "Executar o plano",
  },
  {
    label: "Acompanhar",
    detail: "Medir e ajustar com o COO",
  },
] as const;

export function GuidedJourney({
  current,
  className,
}: {
  current: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <div
      aria-label={`Etapa ${current} de 3 da jornada`}
      className={cn(
        "grid grid-cols-3 gap-1 rounded-xl border border-[#e2e6eb] bg-white p-2",
        className,
      )}
    >
      {steps.map((step, index) => {
        const number = index + 1;
        const complete = number < current;
        const active = number === current;

        return (
          <div
            key={step.label}
            className={cn(
              "flex min-w-0 flex-col items-center gap-2 rounded-lg px-1 py-2.5 min-[380px]:flex-row sm:gap-3 sm:px-3",
              active && "bg-[#edf2f8]",
            )}
          >
            <span
              className={cn(
                "grid size-6 sm:size-8 shrink-0 place-items-center rounded-full text-xs font-semibold",
                complete && "bg-[#e8f1eb] text-[#285f3c]",
                active && "bg-white text-primary",
                !complete && !active && "bg-[#eeece8] text-muted",
              )}
            >
              {complete ? <Check aria-hidden="true" className="size-4" /> : number}
            </span>
            <span>
              <span className="block text-xs font-semibold sm:text-sm">{step.label}</span>
              <span className="hidden text-xs leading-4 text-muted sm:block">
                {step.detail}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}







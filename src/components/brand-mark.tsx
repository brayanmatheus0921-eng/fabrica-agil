import { cn } from "@/lib/cn";

export function BrandMark({ compact = false, collapsed = false, inverse = false }: {
  compact?: boolean;
  collapsed?: boolean;
  inverse?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3" aria-label="Fábrica Ágil — Inteligência que vira produtividade">
      <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-surface-muted text-xl font-black tracking-[-0.08em] text-primary">
        <span>F<span className="text-foreground">A</span></span>
      </span>
      <span className={cn("brand-copy min-w-0", compact && "hidden sm:block", collapsed && "hidden")}>
        <span className={cn("block whitespace-nowrap text-[15px] font-black uppercase tracking-[-0.035em]", inverse ? "text-white" : "text-foreground")}>
          FÁBRICA <span className="text-primary">ÁGIL</span>
        </span>
        <span className="block whitespace-nowrap text-[8px] font-semibold uppercase tracking-[0.08em] text-muted">
          Inteligência que vira produtividade
        </span>
      </span>
    </div>
  );
}

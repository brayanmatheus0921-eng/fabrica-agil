import { Factory } from "lucide-react";
import { cn } from "@/lib/cn";

export function BrandMark({ compact = false, collapsed = false, inverse = false }: {
  compact?: boolean;
  collapsed?: boolean;
  inverse?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-[13px] border border-accent/55 bg-primary-strong text-accent shadow-[0_10px_28px_rgba(55,42,26,0.20)]">
        <Factory aria-hidden="true" className="size-5" strokeWidth={2} />
      </span>
      <span className={cn("brand-copy min-w-0", compact && "hidden sm:block", collapsed && "hidden")}>
        <span className={cn("block truncate text-[15px] font-black tracking-[-0.025em]", inverse ? "text-white" : "text-foreground")}>
          Fábrica Ágil
        </span>
        <span className={cn("block truncate text-[10px] font-bold uppercase tracking-[0.14em]", inverse ? "text-accent" : "text-muted")}>
          Consultoria com COO
        </span>
      </span>
    </div>
  );
}

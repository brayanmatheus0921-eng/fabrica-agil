import { cn } from "@/lib/cn";
import { BrandSymbol } from "@/components/brand-symbol";

export function BrandMark({ compact = false, collapsed = false, inverse = false, large = false }: {
  compact?: boolean;
  collapsed?: boolean;
  inverse?: boolean;
  large?: boolean;
}) {
  return (
    <div className={cn("flex min-w-0 items-center", large ? "gap-4" : "gap-2.5")} aria-label="Fábrica Ágil">
      <BrandSymbol className={large ? "size-16" : "size-10"} />
      <span className={cn("brand-copy min-w-0", compact && "hidden sm:block", collapsed && "hidden")}>
        <span className={cn("block whitespace-nowrap font-black uppercase tracking-[-0.055em]", large ? "text-[29px] leading-[0.95]" : "text-[16px] leading-[1.05]", inverse ? "text-white" : "text-foreground")}>
          FÁBRICA
        </span>
        <span className={cn("block whitespace-nowrap font-black uppercase tracking-[-0.055em] text-primary", large ? "text-[29px] leading-[0.95]" : "text-[16px] leading-[1.05]")}>
          ÁGIL
        </span>
      </span>
    </div>
  );
}

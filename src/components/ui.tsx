import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function SectionCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-[#e2e6eb] bg-surface shadow-[0_2px_10px_rgba(11,19,32,0.03)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        tone === "neutral" && "bg-[#eeece8] text-[#59616d]",
        tone === "success" && "bg-[#e8f1eb] text-[#285f3c]",
        tone === "warning" && "bg-accent-warm text-[#7a4d28]",
      )}
    >
      {children}
    </span>
  );
}



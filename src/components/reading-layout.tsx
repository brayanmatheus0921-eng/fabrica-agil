import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

/** Secondary information stays available without competing with the next action. */
export function ReadingDetails({ title, description, children, className, open = false }: {
  title: string; description?: string; children: ReactNode; className?: string; open?: boolean;
}) {
  return <details open={open} className={cn("group/reading rounded-xl border border-[#e2e6eb] bg-white", className)}>
    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 py-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
      <span className="min-w-0"><span className="block text-sm font-semibold text-primary">{title}</span>{description ? <span className="mt-1 block text-xs font-normal leading-5 text-muted">{description}</span> : null}</span>
      <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted transition-transform group-open/reading:rotate-180 motion-reduce:transition-none" />
    </summary>
    <div className="border-t border-[#e9edf2] px-5 py-5">{children}</div>
  </details>;
}

export function ReadingField({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0"><dt className="text-xs font-semibold text-[#596575]">{label}</dt><dd className="mt-1.5 break-words text-sm font-normal leading-6 text-[#39485b]">{children}</dd></div>;
}

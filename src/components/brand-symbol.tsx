import { cn } from "@/lib/cn";

export function BrandSymbol({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" className={cn("shrink-0", className)} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="15" fill="#1E1E1E" />
      <path d="M8 45V31l13-7v21H8Z" fill="#66666A" />
      <path d="M25 45V22l13-7v24l-6 6h-7Z" fill="#96969A" />
      <path d="M40 16 56 7v38H35l5-6V16Z" fill="#F97316" />
    </svg>
  );
}

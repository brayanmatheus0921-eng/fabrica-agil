"use client";

import { Menu, MessageSquareText, Settings2, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { DesktopNavigation } from "@/components/app-navigation";
import { BrandMark } from "@/components/brand-mark";
import { cn } from "@/lib/cn";

const pageNames: Record<string, string> = {
  dashboard: "Visão geral",
  empresa: "Minha empresa",
  diagnostico: "Diagnóstico",
  gargalo: "Gargalo prioritário",
  "plano-de-acao": "Plano de ação",
  tarefas: "Gestão de projetos",
  acompanhamento: "Acompanhamento",
  assistente: "COO",
  aulas: "Aulas",
  configuracoes: "Configurações",
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const segment = pathname.split("/").filter(Boolean)[0] ?? "dashboard";
  const pageName = pageNames[segment] ?? "Fábrica Ágil";
  const chatPage = segment === "assistente" || pathname === "/plano-de-acao/construir";

  return (
    <div className="app-shell min-h-screen bg-background lg:pl-[72px]">
      <input id="mobile-sidebar-toggle" type="checkbox" className="sr-only" aria-label="Alternar menu móvel" />

      <aside className="desktop-sidebar fixed inset-y-0 left-0 z-50 hidden w-[72px] flex-col overflow-hidden border-r bg-white transition-[width,box-shadow] duration-300 ease-out lg:flex">
        <div className="sidebar-brand-row relative flex h-[72px] shrink-0 items-center border-b px-4">
          <BrandMark />
        </div>

        <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-3 py-5">
          <DesktopNavigation />
        </div>

        <div className="sidebar-footer shrink-0 border-t p-3">
          <Link href="/configuracoes" title="Configurações" aria-current={segment === "configuracoes" ? "page" : undefined} className={cn("navigation-link flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition", segment === "configuracoes" ? "bg-accent-warm text-primary" : "text-muted hover:bg-surface-muted hover:text-foreground")}>
            <Settings2 aria-hidden="true" className="size-[18px] shrink-0" />
            <span className="navigation-label truncate">Configurações</span>
          </Link>
        </div>
      </aside>

      <div className="mobile-sidebar fixed inset-0 z-50 hidden lg:hidden">
        <label htmlFor="mobile-sidebar-toggle" aria-label="Fechar menu" className="absolute inset-0 bg-[#07101d]/55 backdrop-blur-sm" />
        <aside className="relative flex h-full w-[min(88vw,320px)] flex-col bg-white shadow-2xl">
          <div className="flex h-[68px] items-center justify-between border-b px-4">
            <BrandMark />
            <label htmlFor="mobile-sidebar-toggle" aria-label="Fechar menu lateral" className="grid size-9 cursor-pointer place-items-center rounded-xl bg-surface-muted text-muted"><X className="size-5" /></label>
          </div>
          <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-3 py-5">
            <DesktopNavigation />
          </div>
          <Link href="/configuracoes" className="flex min-h-14 items-center gap-3 border-t px-6 text-sm font-semibold text-muted"><Settings2 aria-hidden="true" className="size-4" />Configurações</Link>
        </aside>
      </div>

      <div className="min-w-0">
        <header className={cn("sticky top-0 z-30 h-[64px] items-center justify-between border-b bg-white/95 px-4 backdrop-blur-xl sm:px-6 lg:px-8", chatPage ? "flex lg:hidden" : "flex")}>
          <div className="flex min-w-0 items-center gap-3">
            <label htmlFor="mobile-sidebar-toggle" aria-label="Abrir menu lateral" className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl border bg-white lg:hidden"><Menu className="size-5" /></label>
            <p className="truncate text-sm font-semibold">{pageName}</p>
          </div>
          <div className="flex items-center gap-2">
            {segment !== "assistente" ? <Link href="/assistente" className="hidden min-h-10 items-center gap-2 rounded-xl border bg-white px-3.5 text-xs font-semibold sm:inline-flex"><MessageSquareText className="size-4" />Falar com o COO</Link> : null}
            <span className="grid size-9 place-items-center rounded-full bg-primary text-[10px] font-bold text-[var(--primary-contrast)]">FA</span>
          </div>
        </header>
        <main className={cn(chatPage ? "h-[calc(100dvh-64px)] min-h-0 overflow-hidden lg:h-dvh" : "mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-8")}>{children}</main>
      </div>
    </div>
  );
}

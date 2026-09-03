"use client";

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Brain,
  Building2,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  Map,
  MessageSquareText,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

type NavigationItem = { href: string; label: string; icon: LucideIcon };

export const navigation: Array<{ label: string; items: NavigationItem[] }> = [
  {
    label: "Principal",
    items: [
      { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
      { href: "/assistente", label: "COO", icon: MessageSquareText },
    ],
  },
  {
    label: "1 · Entender",
    items: [
      { href: "/empresa", label: "Minha empresa", icon: Building2 },
      { href: "/diagnostico", label: "Diagnóstico", icon: ClipboardCheck },
    ],
  },
  {
    label: "2 · Agir",
    items: [
      { href: "/plano-de-acao", label: "Plano de ação", icon: Map },
      { href: "/tarefas", label: "Projetos e tarefas", icon: ListChecks },
    ],
  },
  {
    label: "3 · Evoluir",
    items: [{ href: "/acompanhamento", label: "Acompanhamento", icon: Activity }],
  },
  {
    label: "Apoio",
    items: [
      { href: "/aulas", label: "Aulas", icon: GraduationCap },
      { href: "/memoria", label: "Histórico", icon: Brain },
    ],
  },
];

function isActiveRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DesktopNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegação principal" className="app-navigation flex flex-col gap-5">
      {navigation.map((section) => (
        <div key={section.label}>
          <p className="navigation-section-label px-3 text-[9px] font-black uppercase tracking-[0.19em] text-muted">
            {section.label}
          </p>
          <div className="mt-2 space-y-1">
            {section.items.map((item) => {
              const active = isActiveRoute(pathname, item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "navigation-link group relative flex min-h-11 items-center rounded-xl text-sm font-semibold transition",
                    "gap-3 px-3",
                    active
                      ? "bg-accent-warm text-primary"
                      : "text-muted hover:bg-surface-muted hover:text-foreground",
                  )}
                >
                  <Icon aria-hidden="true" className="size-[18px] shrink-0" strokeWidth={1.9} />
                  <span className="navigation-label truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

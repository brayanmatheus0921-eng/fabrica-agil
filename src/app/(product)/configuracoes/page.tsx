import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, LogOut } from "lucide-react";
import { logout } from "@/app/auth-actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { SectionCard } from "@/components/ui";
import { requireAuth } from "@/server/auth";

export const metadata: Metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const auth = await requireAuth();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Sua conta</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="mt-2 text-sm text-muted">Ajuste a aparência e gerencie seu acesso.</p>
      </div>

      <SectionCard className="space-y-5 p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-semibold">Aparência</h2>
          <p className="mt-1 text-sm text-muted">Escolha como prefere visualizar a plataforma.</p>
        </div>
        <ThemeToggle />
      </SectionCard>

      <SectionCard className="space-y-5 p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-semibold">Empresa e informações</h2>
          <p className="mt-1 text-sm text-muted">{auth.company.name}</p>
          <p className="mt-3 text-sm text-muted">Diagnósticos, projetos, arquivos e conversas podem ser consultados nas respectivas áreas.</p>
        </div>
        <Link href="/empresa" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary hover:underline">
          Ver minha empresa <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </SectionCard>

      <SectionCard className="space-y-4 p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-semibold">Acesso</h2>
          <p className="mt-1 text-sm text-muted">Conectado como {auth.userName}.</p>
        </div>
        <form action={logout}>
          <button className="inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition hover:bg-surface-muted">
            <LogOut aria-hidden="true" className="size-4" /> Sair da conta
          </button>
        </form>
      </SectionCard>
    </div>
  );
}

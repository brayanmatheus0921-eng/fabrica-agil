import { AppShell } from "@/components/app-shell";
import { requireAuth } from "@/server/auth";
import { CompanyDataSync } from "@/components/company-data-sync";

export const dynamic = "force-dynamic";

export default async function ProductLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireAuth();

  return (
    <AppShell>
      <CompanyDataSync />
      {children}
    </AppShell>
  );
}

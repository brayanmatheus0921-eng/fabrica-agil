import { AppShell } from "@/components/app-shell";
import { requireAuth } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function ProductLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const auth = await requireAuth();
  const company = auth.company;

  return (
    <AppShell companyName={company.name} userName={auth.userName} onboardingComplete={company.onboardingStatus === "COMPLETED"}>
      {children}
    </AppShell>
  );
}

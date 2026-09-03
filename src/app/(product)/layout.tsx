import { AppShell } from "@/components/app-shell";
import { getDevCompany } from "@/server/dev-company";

export const dynamic = "force-dynamic";

export default async function ProductLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const company = await getDevCompany();

  return (
    <AppShell companyName={company.name} onboardingComplete={company.onboardingStatus === "COMPLETED"}>
      {children}
    </AppShell>
  );
}

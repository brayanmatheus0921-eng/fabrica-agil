import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDevCompany } from "@/server/dev-company";
import { FirstAccessFlow } from "./first-access-flow";

export const metadata: Metadata = { title: "Primeiro acesso" };
export const dynamic = "force-dynamic";

function readText(value: unknown, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "string" ? candidate : "";
}

export default async function FirstAccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    step?: string;
    question?: string;
    error?: string;
  }>;
}) {
  const company = await getDevCompany();
  if (company.onboardingStatus === "COMPLETED") redirect("/empresa");
  if (company.onboardingStatus === "IN_PROGRESS") {
    redirect("/diagnostico/novo?onboarding=1");
  }
  const params = await searchParams;

  return (
    <FirstAccessFlow
      started={params.step === "form"}
      question={Number(params.question) || 1}
      error={params.error}
      initialValues={{
        name: company.name === "Minha fábrica" ? "" : company.name,
        productionType: company.productionType ?? "",
        teamSize: company.teamSize,
        monthlyRevenueRange: readText(
          company.onboardingData,
          "monthlyRevenueRange",
        ),
        monthlyOrderVolume: readText(
          company.onboardingData,
          "monthlyOrderVolume",
        ),
        onTimeDeliveryRange: readText(
          company.onboardingData,
          "onTimeDeliveryRange",
        ),
        reworkRange: readText(company.onboardingData, "reworkRange"),
        ownerDependency: readText(
          company.onboardingData,
          "ownerDependency",
        ),
        mainGoal: readText(company.onboardingData, "mainGoal"),
      }}
    />
  );
}



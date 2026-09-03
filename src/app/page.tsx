import { redirect } from "next/navigation";
import { getDevCompany } from "@/server/dev-company";

export default async function Home() {
  const company = await getDevCompany();
  redirect(company.onboardingStatus === "COMPLETED" ? "/dashboard" : "/onboarding");
}



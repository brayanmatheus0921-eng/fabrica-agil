import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/server/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const context = await getAuthContext();
  if (context) redirect(context.company.onboardingStatus === "COMPLETED" ? "/dashboard" : "/onboarding");
  return <main className="grid min-h-dvh place-items-center bg-background px-4 py-8"><LoginForm /></main>;
}

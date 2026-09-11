import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/server/auth";
import { LoginForm } from "./login-form";
import { Factory } from "lucide-react";
import styles from "./login.module.css";

export const metadata: Metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const context = await getAuthContext();
  if (context) redirect(context.company.onboardingStatus === "COMPLETED" ? "/dashboard" : "/onboarding");
  return (
    <main className={styles.page}>
      <Factory aria-hidden="true" className={styles.watermark} strokeWidth={0.8} />
      <div className={styles.content}>
        <div className={styles.brand} aria-label="Fábrica Ágil">
          <Factory aria-hidden="true" className={styles.brandIcon} />
          <span>Fábrica Ágil</span>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}

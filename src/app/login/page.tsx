import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/server/auth";
import { LoginForm } from "./login-form";
import { BrandMark } from "@/components/brand-mark";
import styles from "./login.module.css";

export const metadata: Metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const context = await getAuthContext();
  if (context) redirect(context.company.onboardingStatus === "COMPLETED" ? "/dashboard" : "/onboarding");
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <div className={styles.brand}>
          <BrandMark large />
          <p className={styles.brandTagline}>DIAGNÓSTICO <span aria-hidden="true">|</span> PRIORIDADE <span aria-hidden="true">|</span> EXECUÇÃO</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}

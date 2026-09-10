"use client";

import { ArrowLeft, ArrowRight, Factory } from "lucide-react";
import { FormEvent, useState } from "react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (step === "email") {
      if (!email.trim().toLowerCase().endsWith("@faba.com")) {
        setError("Digite seu e-mail de acesso.");
        return;
      }
      setStep("code");
      return;
    }

    setBusy(true);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    const data = (await response.json()) as { error?: string; redirectTo?: string };
    if (!response.ok || !data.redirectTo) {
      setError(data.error ?? "Não foi possível entrar.");
      setBusy(false);
      return;
    }
    window.location.assign(data.redirectTo);
  }

  return (
    <form onSubmit={submit} className="w-full max-w-[420px] rounded-3xl border bg-white p-6 shadow-xl sm:p-8">
      <div className="grid size-11 place-items-center rounded-2xl bg-primary text-[var(--primary-contrast)]"><Factory className="size-5" /></div>
      <p className="mt-6 text-xs font-bold uppercase tracking-[.16em] text-primary">Fábrica Ágil</p>
      <h1 className="mt-2 text-2xl font-bold">{step === "email" ? "Acesse sua empresa" : "Digite o código"}</h1>
      <p className="mt-2 text-sm leading-6 text-muted">{step === "email" ? "Use o e-mail criado para você." : <>Código de acesso para <strong className="font-semibold text-foreground">{email}</strong></>}</p>

      {step === "email" ? (
        <label className="mt-7 block text-sm font-semibold">E-mail<input autoFocus required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nome@faba.com" className="mt-2 h-12 w-full rounded-xl border bg-white px-4 font-normal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /></label>
      ) : (
        <label className="mt-7 block text-sm font-semibold">Código<input autoFocus required inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} placeholder="••••" className="mt-2 h-12 w-full rounded-xl border bg-white px-4 text-center text-xl font-normal tracking-[.35em] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /></label>
      )}

      {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
      <button disabled={busy} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-[var(--primary-contrast)] transition hover:brightness-95 disabled:opacity-60">{busy ? "Entrando..." : step === "email" ? "Continuar" : "Entrar"}<ArrowRight className="size-4" /></button>
      {step === "code" ? <button type="button" onClick={() => { setStep("email"); setCode(""); setError(""); }} className="mt-3 flex h-10 w-full items-center justify-center gap-2 text-sm text-muted"><ArrowLeft className="size-4" />Trocar e-mail</button> : null}
    </form>
  );
}

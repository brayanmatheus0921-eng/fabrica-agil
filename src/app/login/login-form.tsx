"use client";

import { LoaderCircle } from "lucide-react";
import { type FormEvent, type KeyboardEvent, useRef, useState } from "react";
import styles from "./login.module.css";

const CODE_LENGTH = 6;

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const codeInputs = useRef<Array<HTMLInputElement | null>>([]);

  function focusDigit(index: number) {
    const input = codeInputs.current[index];
    input?.focus();
    input?.select();
  }

  function updateDigits(value: string, index: number) {
    const numbers = value.replace(/\D/g, "");
    if (value && !numbers) return;
    // Autofill can deliver the entire code to any focused box.
    const start = numbers.length >= CODE_LENGTH ? 0 : index;
    const incoming = numbers.slice(0, CODE_LENGTH - start);
    setDigits((current) => {
      const next = [...current];
      if (!incoming) next[start] = "";
      else [...incoming].forEach((digit, offset) => { next[start + offset] = digit; });
      return next;
    });
    setError("");
    if (incoming) focusDigit(Math.min(start + incoming.length, CODE_LENGTH - 1));
  }

  function handleCodeKey(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (/^[0-9]$/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      updateDigits(event.key, index);
    } else if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      focusDigit(index - 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      focusDigit(Math.max(0, Math.min(CODE_LENGTH - 1, index + (event.key === "ArrowLeft" ? -1 : 1))));
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setError("");
    if (step === "email") {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail.endsWith("@faba.com")) {
        setError("Digite seu e-mail de acesso.");
        return;
      }
      setEmail(normalizedEmail);
      setStep("code");
      return;
    }

    if (digits.some((digit) => !digit)) {
      setError("Preencha os 6 dígitos do código.");
      focusDigit(digits.findIndex((digit) => !digit));
      return;
    }

    submitting.current = true;
    setBusy(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: digits.join("") }),
      });
      const data = (await response.json()) as { error?: string; redirectTo?: string };
      if (!response.ok || !data.redirectTo) {
        setError(data.error ?? "Não foi possível entrar. Tente novamente.");
        submitting.current = false;
        setBusy(false);
        return;
      }
      window.location.assign(data.redirectTo);
    } catch {
      setError("Não foi possível conectar. Tente novamente.");
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className={styles.card} aria-labelledby="login-title" aria-busy={busy}>
      <div key={step} className={styles.step}>
        <h1 id="login-title" className={styles.title}>
          {step === "email" ? "Acesse sua conta" : "Digite seu código de acesso"}
        </h1>
        {step === "email" ? (
          <>
            <p className={styles.description}>Entre com o e-mail criado para você.</p>
            <label className={styles.emailLabel} htmlFor="login-email">E-mail</label>
            <input
              id="login-email" name="email" autoFocus required type="email"
              autoComplete="username" autoCapitalize="none" spellCheck={false}
              value={email}
              onChange={(event) => { setEmail(event.target.value); setError(""); }}
              placeholder="Digite seu e-mail" aria-invalid={!!error}
              aria-describedby={error ? "login-error" : undefined}
              className={styles.emailInput}
            />
          </>
        ) : (
          <>
            <p className={styles.accountEmail}>{email}</p>
            <fieldset className={styles.codeGroup} disabled={busy}>
              <legend className={styles.codeLabel}>Preencha os 6 dígitos do seu código:</legend>
              <div className={styles.digits}>
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(input) => { codeInputs.current[index] = input; }}
                    autoFocus={index === 0} type="text" inputMode="numeric"
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    aria-label={`Dígito ${index + 1} de ${CODE_LENGTH}`}
                    aria-invalid={!!error}
                    aria-describedby={error ? "login-error" : undefined}
                    value={digit}
                    onFocus={(event) => event.currentTarget.select()}
                    onChange={(event) => {
                      const inserted = (event.nativeEvent as InputEvent).data;
                      updateDigits(inserted && /^[0-9]$/.test(inserted) ? inserted : event.target.value, index);
                    }}
                    onKeyDown={(event) => handleCodeKey(event, index)}
                    onPaste={(event) => {
                      event.preventDefault();
                      updateDigits(event.clipboardData.getData("text"), index);
                    }}
                    className={styles.digit}
                  />
                ))}
              </div>
            </fieldset>
            <button type="button" disabled={busy}
              onClick={() => { setStep("email"); setDigits(Array(CODE_LENGTH).fill("")); setError(""); }}
              className={styles.changeEmail}
            >Trocar e-mail</button>
          </>
        )}
        {error ? <p id="login-error" role="alert" className={styles.error}>{error}</p> : null}
        <button type="submit" disabled={busy} className={styles.submit}>
          {busy ? <><LoaderCircle aria-hidden="true" className={styles.spinner} />Entrando...</> : step === "email" ? "Continuar" : "Confirmar"}
        </button>
      </div>
    </form>
  );
}

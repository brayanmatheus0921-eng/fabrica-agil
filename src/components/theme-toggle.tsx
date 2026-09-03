"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

function readTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("fabrica-agil-theme-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("fabrica-agil-theme-change", callback);
  };
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light");

  function toggleTheme() {
    const next: Theme = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("fabrica-agil-theme", next);
    window.dispatchEvent(new Event("fabrica-agil-theme-change"));
  }

  const nextLabel = theme === "light" ? "Ativar modo escuro" : "Ativar modo claro";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={nextLabel}
      title={nextLabel}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border bg-surface px-3 text-xs font-semibold text-foreground transition hover:bg-surface-muted"
    >
      {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
      {compact ? null : <span className="hidden sm:inline">{theme === "light" ? "Escuro" : "Claro"}</span>}
    </button>
  );
}

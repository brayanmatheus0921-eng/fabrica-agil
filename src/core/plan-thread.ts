export const PLAN_THREAD_PREFIX = "coo-plan-v2-";

export function planThreadId(diagnosticId: string) {
  return `${PLAN_THREAD_PREFIX}${diagnosticId}`;
}

export function isDedicatedPlanThread(threadId: string) {
  return threadId.startsWith(PLAN_THREAD_PREFIX);
}

export function conversationPath(kind: "PLAN" | "COO", threadId?: string) {
  const base = kind === "PLAN" ? "/plano-de-acao/construir" : "/assistente";
  return threadId ? `${base}?chat=${encodeURIComponent(threadId)}` : kind === "PLAN" ? "/plano-de-acao" : base;
}

import "server-only";
const scope = globalThis as typeof globalThis & { cooGenerations?: Map<string, AbortController> };
export const generations = scope.cooGenerations ??= new Map<string, AbortController>();
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return origin === new URL(request.url).origin || new URL(origin).host === request.headers.get("host"); }
  catch { return false; }
}
export function activeGeneration(id: string | null, startedAt: Date | null) {
  return startedAt && Date.now() - startedAt.getTime() < 180000 ? id : null;
}

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Fingerprints only: previously published credentials must never be accepted again.
const RETIRED_CODE_HASHES = new Set(["8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92","03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4"]);
export function isRetiredCode(code: string) {
  return RETIRED_CODE_HASHES.has(createHash("sha256").update(code).digest("hex"));
}

export type AccessConfig = { key: string; credentials: Record<string, string>; revision: string };
export function readAccessConfig(env: Record<string, string | undefined>): AccessConfig | null {
  const key = env.AUTH_SESSION_SECRET;
  if (!key || !/^[a-f0-9]{64}$/i.test(key)) return null;
  try {
    const credentials: unknown = JSON.parse(env.AUTH_ACCESS_CREDENTIALS ?? "");
    if (!credentials || typeof credentials !== "object" || Array.isArray(credentials)) return null;
    const entries = Object.entries(credentials);
    if (!entries.length || entries.some(([email, hash]) =>
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email !== email.trim().toLowerCase() ||
      typeof hash !== "string" || !/^[a-f0-9]{64}$/i.test(hash))) return null;
    const revision = createHash("sha256").update(JSON.stringify(entries.sort(([a], [b]) => a.localeCompare(b)))).digest("hex");
    return { key, credentials: Object.fromEntries(entries), revision };
  } catch { return null; }
}

export function credentialHash(email: string, code: string, key: string) {
  return createHmac("sha256", Buffer.from(key, "hex")).update(JSON.stringify(["access-v2", email, code])).digest("hex");
}

export function verifyAccessCode(config: AccessConfig, email: string, code: string) {
  if (!/^\d{6}$/.test(code) || isRetiredCode(code)) return false;
  const expected = Object.hasOwn(config.credentials, email) ? config.credentials[email] : "0".repeat(64);
  const matches = timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(credentialHash(email, code, config.key), "hex"));
  return Object.hasOwn(config.credentials, email) && matches;
}

export function sessionTokenHash(token: string, config: AccessConfig) {
  // New namespace and keyed hashes invalidate ALL legacy SHA-256 sessions.
  // Rotating the key or credential set also invalidates existing sessions.
  return createHmac("sha256", Buffer.from(config.key, "hex"))
    .update(JSON.stringify(["session-v2", config.revision, token])).digest("hex");
}

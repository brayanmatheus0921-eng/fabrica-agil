import { randomBytes, randomInt } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { credentialHash, isRetiredCode } from "../src/core/access-credentials";

// Input: a private JSON array of existing account emails, through stdin.
// Secrets are written only to an ignored private directory, never stdout.
const emails: unknown = JSON.parse(readFileSync(0, "utf8"));
if (!Array.isArray(emails) || !emails.length || emails.length > 100 ||
  emails.some((email) => typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
  throw new Error("Provide a JSON array of existing account emails through stdin.");
}
const normalized = emails.map((email: string) => email.trim().toLowerCase());
if (new Set(normalized).size !== normalized.length) throw new Error("Duplicate accounts.");
const key = randomBytes(32).toString("hex");
const codes = new Set<string>();
const accounts = normalized.map((email) => {
  let code: string;
  do { code = randomInt(0, 1_000_000).toString().padStart(6, "0"); }
  while (codes.has(code) || isRetiredCode(code));
  codes.add(code);
  return { email, code };
});
const directory = resolve(".artifacts", `access-${Date.now()}`);
mkdirSync(directory, { recursive: true, mode: 0o700 });
const credentials = Object.fromEntries(accounts.map(({ email, code }) => [email, credentialHash(email, code, key)]));
writeFileSync(join(directory, "production.env"),
  `AUTH_SESSION_SECRET=${key}\nAUTH_ACCESS_CREDENTIALS=${JSON.stringify(credentials)}\n`, { mode: 0o600, flag: "wx" });
writeFileSync(join(directory, "private-codes.json"), JSON.stringify(accounts, null, 2), { mode: 0o600, flag: "wx" });
console.log(`Private access files created in ${directory}. Do not commit or share the entire directory.`);

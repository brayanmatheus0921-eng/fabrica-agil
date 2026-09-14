import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { credentialHash, isRetiredCode, readAccessConfig } from "../src/core/access-credentials";

// Local recovery only. Input is a private JSON array of EXISTING emails on stdin.
// A QA admin is isolated in a newly created company. No existing business data is changed.
for (const file of [".env.local", ".env"]) if (existsSync(file)) loadEnvFile(file);
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL missing.");
const url = new URL(connectionString);
if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || url.pathname !== "/fabrica_agil_dev" || process.env.NODE_ENV === "production") {
  throw new Error("This command is restricted to the local fabrica_agil_dev database.");
}
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const envPath = resolve(".env.local");
const originalEnv = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
const withoutAuth = (value: string) => value.split(/\r?\n/).filter(line => !/^\s*(?:export\s+)?AUTH_(SESSION_SECRET|ACCESS_CREDENTIALS)\s*=/.test(line)).join("\n").replace(/\n*$/, "");

function updateLocalEnv(key: string, credentials: Record<string, string>) {
  // Preserve all non-auth entries, including OPENAI_API_KEY.
  const next = `${withoutAuth(originalEnv)}\nAUTH_SESSION_SECRET=${key}\nAUTH_ACCESS_CREDENTIALS='${JSON.stringify(credentials)}'\n`;
  if (withoutAuth(next) !== withoutAuth(originalEnv)) throw new Error("Non-auth environment changed.");
  if (!readAccessConfig({ AUTH_SESSION_SECRET: key, AUTH_ACCESS_CREDENTIALS: JSON.stringify(credentials) })) throw new Error("Invalid auth configuration.");
  const temp = `${envPath}.${randomUUID()}.tmp`;
  writeFileSync(temp, next, { mode: 0o600, flag: "wx" });
  renameSync(temp, envPath);
}

async function removeQa(directory: string) {
  const qa = JSON.parse(readFileSync(join(resolve(directory), "qa-admin.json"), "utf8"));
  if (!/^local-qa-user-[a-f0-9-]{36}$/.test(qa.userId) || !/^local-qa-company-[a-f0-9-]{36}$/.test(qa.companyId)) throw new Error("Invalid QA identity.");
  const config = readAccessConfig(process.env);
  if (!config) throw new Error("Auth configuration missing.");
  const user = await db.user.findUnique({ where: { id: qa.userId }, include: { memberships: { include: { company: { include: { memberships: true } } } } } });
  if (user) {
    const membership = user.memberships[0];
    const data = membership?.company.onboardingData as Record<string, unknown> | null;
    if (user.email !== qa.email || user.memberships.length !== 1 || membership.companyId !== qa.companyId || membership.company.memberships.length !== 1 || data?.localQaId !== qa.qaId) throw new Error("QA isolation could not be verified.");
    await db.$transaction(async tx => {
      await tx.company.delete({ where: { id: qa.companyId } });
      await tx.user.delete({ where: { id: qa.userId } });
    });
  }
  const credentials = { ...config.credentials };
  delete credentials[qa.email];
  updateLocalEnv(config.key, credentials);
  console.log("Isolated QA account and company removed. Existing accounts/data preserved. Restart the local server; all sessions will require login again.");
}

async function main() {
  if (process.argv[2] === "--remove-qa") {
    if (!process.argv[3]) throw new Error("Provide the private access directory.");
    return removeQa(process.argv[3]);
  }
  const emails: unknown = JSON.parse(readFileSync(0, "utf8"));
  if (!Array.isArray(emails) || !emails.length || emails.some(email => typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error("Provide existing emails as private JSON on stdin.");
  const normalized: string[] = emails.map(email => email.trim().toLowerCase());
  if (new Set(normalized).size !== normalized.length) throw new Error("Duplicate emails.");
  const users = await db.user.findMany({ where: { email: { in: normalized } }, include: { memberships: { include: { company: { include: { memberships: true } } } } } });
  if (users.length !== normalized.length || users.some(user => user.memberships.length !== 1 || user.memberships[0].role !== "OWNER" || user.memberships[0].company.memberships.length !== 1) || new Set(users.map(user => user.memberships[0].companyId)).size !== users.length) throw new Error("Every existing account must own its own isolated company. No data was changed.");
  const directory = resolve(".artifacts", `local-access-${Date.now()}`);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (process.platform === "win32") {
    const identity = execFileSync("whoami.exe", { encoding: "utf8" }).trim();
    execFileSync("icacls.exe", [directory, "/inheritance:r", "/grant:r", `${identity}:(OI)(CI)F`, "*S-1-5-18:(OI)(CI)F"], { stdio: "ignore" });
  }
  const key = randomBytes(32).toString("hex");
  const usedCodes = new Set<string>();
  function newCode() { let code: string; do { code = randomInt(0, 1_000_000).toString().padStart(6, "0"); } while (usedCodes.has(code) || isRetiredCode(code)); usedCodes.add(code); return code; }
  const accounts = normalized.map(email => {
    const user = users.find(user => user.email === email)!;
    return { name: user.name, email, code: newCode(), userId: user.id, companyId: user.memberships[0].companyId, onboardingStatus: user.memberships[0].company.onboardingStatus };
  });
  const qaId = randomUUID();
  const qa = { name: "Admin QA temporário", email: `qa-${qaId}@fabrica-agil.local.invalid`, code: newCode(), userId: `local-qa-user-${qaId}`, companyId: `local-qa-company-${qaId}`, qaId };
  const credentials = Object.fromEntries([...accounts, qa].map(account => [account.email, credentialHash(account.email, account.code, key)]));
  await db.company.create({ data: { id: qa.companyId, name: "QA temporário — Fábrica Ágil", onboardingStatus: "COMPLETED", onboardingData: { localQaId: qaId, temporary: true }, memberships: { create: { role: "ADMIN", user: { create: { id: qa.userId, name: qa.name, email: qa.email } } } } } });
  writeFileSync(join(directory, "private-codes.json"), JSON.stringify(accounts, null, 2), { mode: 0o600, flag: "wx" });
  writeFileSync(join(directory, "qa-admin.json"), JSON.stringify(qa, null, 2), { mode: 0o600, flag: "wx" });
  writeFileSync(join(directory, "acessos-locais.txt"), `ACESSOS LOCAIS — FÁBRICA ÁGIL\nEndereço: http://localhost:3000/login\nCada conta possui sua própria empresa e onboarding.\n\n${accounts.map(a => `${a.name}\nE-mail: ${a.email}\nCódigo: ${a.code}`).join("\n\n")}\n\nUse apenas neste computador. Entregue a cada pessoa somente o seu acesso.\n`, { mode: 0o600, flag: "wx" });
  updateLocalEnv(key, credentials);
  console.log(JSON.stringify({ status: "configured", directory, existingAccounts: accounts.length, isolatedCompanies: accounts.length, qaAdminCreated: true, restartRequired: true, nonAuthEnvironmentPreserved: true }));
}
main().catch(error => { console.error(JSON.stringify({ status: "error", name: error instanceof Error ? error.name : "UnknownError" })); process.exitCode = 1; }).finally(() => db.$disconnect());

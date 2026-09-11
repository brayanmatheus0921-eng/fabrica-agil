import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { credentialHash, readAccessConfig, sessionTokenHash, verifyAccessCode } from "./access-credentials";

const key = randomBytes(32).toString("hex");
const alice = "alice@example.invalid";
const bob = "bob@example.invalid";
const credentials = {
  [alice]: credentialHash(alice, "791482", key),
  [bob]: credentialHash(bob, "309671", key),
};
const env = { AUTH_SESSION_SECRET: key, AUTH_ACCESS_CREDENTIALS: JSON.stringify(credentials) };
const config = readAccessConfig(env)!;

test("missing, weak or malformed configuration fails closed", () => {
  for (const bad of [undefined, "", "{}", "[]", "null", "broken", '{"alice@example.invalid":"bad"}']) {
    assert.equal(readAccessConfig({ ...env, AUTH_ACCESS_CREDENTIALS: bad }), null);
  }
  assert.equal(readAccessConfig({ ...env, AUTH_SESSION_SECRET: "weak" }), null);
  assert.equal(readAccessConfig({}), null);
});

test("credentials authenticate only their own account", () => {
  assert.ok(verifyAccessCode(config, alice, "791482"));
  assert.ok(verifyAccessCode(config, bob, "309671"));
  assert.equal(verifyAccessCode(config, bob, "791482"), false);
  assert.equal(verifyAccessCode(config, alice, "309671"), false);
  assert.equal(verifyAccessCode(config, "unknown@example.invalid", "791482"), false);
  assert.equal(verifyAccessCode(config, "toString", "791482"), false);
  assert.equal(verifyAccessCode(config, alice, "7914820"), false);
});

test("legacy sessions and rotated credentials cannot reuse existing sessions", () => {
  const token = randomBytes(32).toString("base64url");
  const current = sessionTokenHash(token, config);
  assert.notEqual(current, createHash("sha256").update(token).digest("hex"));
  assert.equal(current, sessionTokenHash(token, config));
  assert.notEqual(current, sessionTokenHash(token, readAccessConfig({ ...env, AUTH_SESSION_SECRET: randomBytes(32).toString("hex") })!));
  assert.notEqual(current, sessionTokenHash(token, readAccessConfig({ ...env, AUTH_ACCESS_CREDENTIALS: JSON.stringify({ [alice]: credentials[alice] }) })!));
});

test("public configuration and seed contain no shared access mechanism", () => {
  const publicConfig = readFileSync("src/core/auth-config.ts", "utf8");
  const seed = readFileSync("scripts/db-seed.ts", "utf8");
  assert.doesNotMatch(publicConfig, /ACCESS_CODE|process\.env/);
  assert.doesNotMatch(seed, /TEST_ACCOUNTS|test-user-|@faba\.com/);
});

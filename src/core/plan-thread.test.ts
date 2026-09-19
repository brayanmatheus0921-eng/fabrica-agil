import assert from "node:assert/strict";
import test from "node:test";
import { isDedicatedPlanThread, planThreadId } from "./plan-thread";

test("planejamento usa conversa dedicada e não reutiliza o chat legado", () => {
  const id = planThreadId("diagnostico-1");
  assert.equal(id, "coo-plan-v2-diagnostico-1");
  assert.equal(isDedicatedPlanThread(id), true);
  assert.equal(isDedicatedPlanThread("coo-workshop-diagnostico-1"), false);
});

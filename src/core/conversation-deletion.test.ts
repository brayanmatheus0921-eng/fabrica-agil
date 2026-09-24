import assert from "node:assert/strict";
import test from "node:test";
import { confirmedConversationDeletion } from "./conversation-deletion";

test("exclusão exige confirmação explícita do nome atual da conversa", () => {
  assert.equal(confirmedConversationDeletion("Plano de ação", null), false);
  assert.equal(confirmedConversationDeletion("Plano de ação", "Outro plano"), false);
  assert.equal(confirmedConversationDeletion("Plano de ação", "Plano de ação"), true);
});

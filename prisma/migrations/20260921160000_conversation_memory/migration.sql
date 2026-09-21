ALTER TABLE "ConversationThread" ADD COLUMN "conversationMemory" JSONB;
CREATE TYPE "ConversationKind" AS ENUM ('PLAN', 'COO');
ALTER TABLE "ConversationThread" ADD COLUMN "kind" "ConversationKind" NOT NULL DEFAULT 'COO';
UPDATE "ConversationThread" SET "kind" = 'PLAN' WHERE "workflowState" IS NOT NULL AND "workflowState" <> 'null'::jsonb;

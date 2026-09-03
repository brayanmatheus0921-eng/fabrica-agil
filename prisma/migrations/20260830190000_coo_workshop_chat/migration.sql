ALTER TABLE "ConversationThread"
ADD COLUMN "workflowState" JSONB,
ADD COLUMN "generationId" TEXT,
ADD COLUMN "generationStartedAt" TIMESTAMP(3);

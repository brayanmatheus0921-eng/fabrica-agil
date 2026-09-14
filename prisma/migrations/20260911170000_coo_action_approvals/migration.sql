ALTER TABLE "Task" ADD COLUMN "ownerName" TEXT;

CREATE TYPE "CooActionProposalStatus" AS ENUM ('PENDING', 'APPLIED', 'REJECTED', 'EXPIRED', 'STALE');

CREATE TABLE "CooActionProposal" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "sourceMessageId" TEXT NOT NULL,
    "proposedByUserId" TEXT NOT NULL,
    "decidedByUserId" TEXT,
    "action" JSONB NOT NULL,
    "expectedSnapshot" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "dedupeKey" TEXT,
    "status" "CooActionProposalStatus" NOT NULL DEFAULT 'PENDING',
    "result" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CooActionProposal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CooActionProposal_dedupeKey_key" ON "CooActionProposal"("dedupeKey");
CREATE INDEX "CooActionProposal_companyId_threadId_createdAt_idx" ON "CooActionProposal"("companyId", "threadId", "createdAt");
CREATE INDEX "CooActionProposal_companyId_status_expiresAt_idx" ON "CooActionProposal"("companyId", "status", "expiresAt");
ALTER TABLE "CooActionProposal" ADD CONSTRAINT "CooActionProposal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CooActionProposal" ADD CONSTRAINT "CooActionProposal_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ConversationThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

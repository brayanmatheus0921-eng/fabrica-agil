CREATE TABLE "WorkspaceArtifact" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "taskId" TEXT, "threadId" TEXT,
  "title" TEXT NOT NULL, "kind" TEXT NOT NULL, "content" JSONB, "interpretation" JSONB,
  "originalName" TEXT, "mimeType" TEXT, "fileData" BYTEA, "confirmedAt" TIMESTAMP(3),
  "revision" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "WorkspaceArtifact_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WorkspaceArtifact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "WorkspaceArtifact_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "WorkspaceArtifact_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ConversationThread"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "WorkspaceArtifact_companyId_taskId_idx" ON "WorkspaceArtifact"("companyId", "taskId");
CREATE INDEX "WorkspaceArtifact_companyId_threadId_idx" ON "WorkspaceArtifact"("companyId", "threadId");

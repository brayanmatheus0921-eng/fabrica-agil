-- CreateEnum
CREATE TYPE "DiagnosticDomain" AS ENUM ('ENTERPRISE', 'OPERATIONS', 'COMMERCIAL', 'FINANCE');

-- AlterTable
ALTER TABLE "DiagnosticSession" ADD COLUMN     "originSessionId" TEXT;

-- AlterTable
ALTER TABLE "DiagnosticTemplate" ADD COLUMN     "domain" "DiagnosticDomain" NOT NULL DEFAULT 'OPERATIONS';

-- CreateIndex
CREATE INDEX "DiagnosticSession_originSessionId_idx" ON "DiagnosticSession"("originSessionId");

-- AddForeignKey
ALTER TABLE "DiagnosticSession" ADD CONSTRAINT "DiagnosticSession_originSessionId_fkey" FOREIGN KEY ("originSessionId") REFERENCES "DiagnosticSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

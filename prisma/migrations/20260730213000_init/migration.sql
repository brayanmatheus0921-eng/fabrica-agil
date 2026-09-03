-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'MANAGER', 'CONSULTANT', 'ADMIN');

-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DiagnosticStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AnswerType" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'SINGLE_SELECT', 'MULTI_SELECT', 'SCALE');

-- CreateEnum
CREATE TYPE "BottleneckStatus" AS ENUM ('ACTIVE', 'MONITORING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ActionPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('BACKLOG', 'TODO', 'IN_PROGRESS', 'BLOCKED', 'IN_REVIEW', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "LessonProgressStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "CheckinStatus" AS ENUM ('OPEN', 'SUBMITTED', 'REVIEWED');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM', 'TOOL');

-- CreateEnum
CREATE TYPE "MemoryKind" AS ENUM ('FACT', 'DECISION', 'ASSUMPTION', 'OUTCOME', 'PREFERENCE');

-- CreateEnum
CREATE TYPE "MemorySourceType" AS ENUM ('ONBOARDING', 'DIAGNOSTIC', 'CONVERSATION', 'TASK', 'CHECKIN', 'MANUAL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('NOTE', 'NUMBER', 'LINK', 'FILE', 'PHOTO');

-- CreateEnum
CREATE TYPE "MetricDirection" AS ENUM ('INCREASE', 'DECREASE', 'MAINTAIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "sector" TEXT,
    "productionType" TEXT,
    "teamSize" INTEGER,
    "onboardingStatus" "OnboardingStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "onboardingData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyMembership" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'MANAGER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticTemplate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL,
    "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "scoringConfig" JSONB,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagnosticTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticQuestion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "pillar" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "helpText" TEXT,
    "answerType" "AnswerType" NOT NULL,
    "options" JSONB,
    "weight" DECIMAL(7,2) NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagnosticQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticSession" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "status" "DiagnosticStatus" NOT NULL DEFAULT 'DRAFT',
    "overallScore" DECIMAL(7,2),
    "resultSummary" TEXT,
    "resultSnapshot" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagnosticSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticAnswer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "score" DECIMAL(7,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagnosticAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BottleneckAssessment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "diagnosticSessionId" TEXT,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidenceSnapshot" JSONB,
    "impactScore" INTEGER,
    "urgencyScore" INTEGER,
    "confidenceScore" DECIMAL(5,2),
    "status" "BottleneckStatus" NOT NULL DEFAULT 'ACTIVE',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BottleneckAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImprovementMethod" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImprovementMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MethodVersion" (
    "id" TEXT NOT NULL,
    "methodId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "rationale" TEXT,
    "requiredInputs" JSONB,
    "applicabilityRules" JSONB,
    "contraindications" JSONB,
    "steps" JSONB NOT NULL,
    "successCriteria" JSONB,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MethodVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MethodRecommendation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "diagnosticSessionId" TEXT,
    "bottleneckId" TEXT NOT NULL,
    "methodVersionId" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "tradeOffs" JSONB,
    "expectedImpact" JSONB,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'PROPOSED',
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MethodRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionPlan" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "recommendationId" TEXT,
    "title" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "status" "ActionPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "windowDays" INTEGER NOT NULL DEFAULT 7,
    "startsAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "baseline" JSONB,
    "targetOutcome" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "actionPlanId" TEXT NOT NULL,
    "parentTaskId" TEXT,
    "assigneeMembershipId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "expectedOutput" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskDependency" (
    "blockingTaskId" TEXT NOT NULL,
    "blockedTaskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskDependency_pkey" PRIMARY KEY ("blockingTaskId","blockedTaskId")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" JSONB,
    "videoUrl" TEXT,
    "durationMinutes" INTEGER,
    "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MethodLesson" (
    "methodVersionId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "required" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MethodLesson_pkey" PRIMARY KEY ("methodVersionId","lessonId")
);

-- CreateTable
CREATE TABLE "LessonAssignment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "actionPlanId" TEXT,
    "userId" TEXT,
    "status" "LessonProgressStatus" NOT NULL DEFAULT 'ASSIGNED',
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressCheckin" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "actionPlanId" TEXT,
    "submittedByMembershipId" TEXT,
    "status" "CheckinStatus" NOT NULL DEFAULT 'OPEN',
    "summary" TEXT,
    "observedOutcome" TEXT,
    "blockers" TEXT,
    "aiEvaluation" TEXT,
    "nextPriority" TEXT,
    "metricSnapshot" JSONB,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgressCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceOutput" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "taskId" TEXT,
    "checkinId" TEXT,
    "type" "EvidenceType" NOT NULL,
    "label" TEXT NOT NULL,
    "textValue" TEXT,
    "numericValue" DECIMAL(18,4),
    "fileUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceOutput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationThread" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyMemory" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "kind" "MemoryKind" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sourceType" "MemorySourceType" NOT NULL,
    "sourceId" TEXT,
    "confidence" DECIMAL(5,2) NOT NULL DEFAULT 1,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invalidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricDefinition" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL,
    "direction" "MetricDirection" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricMeasurement" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "metricId" TEXT NOT NULL,
    "diagnosticSessionId" TEXT,
    "checkinId" TEXT,
    "value" DECIMAL(18,4) NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "CompanyMembership_userId_idx" ON "CompanyMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyMembership_companyId_userId_key" ON "CompanyMembership"("companyId", "userId");

-- CreateIndex
CREATE INDEX "DiagnosticTemplate_status_idx" ON "DiagnosticTemplate"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosticTemplate_code_version_key" ON "DiagnosticTemplate"("code", "version");

-- CreateIndex
CREATE INDEX "DiagnosticQuestion_templateId_pillar_order_idx" ON "DiagnosticQuestion"("templateId", "pillar", "order");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosticQuestion_templateId_code_key" ON "DiagnosticQuestion"("templateId", "code");

-- CreateIndex
CREATE INDEX "DiagnosticSession_companyId_status_idx" ON "DiagnosticSession"("companyId", "status");

-- CreateIndex
CREATE INDEX "DiagnosticSession_templateId_idx" ON "DiagnosticSession"("templateId");

-- CreateIndex
CREATE INDEX "DiagnosticAnswer_questionId_idx" ON "DiagnosticAnswer"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosticAnswer_sessionId_questionId_key" ON "DiagnosticAnswer"("sessionId", "questionId");

-- CreateIndex
CREATE INDEX "BottleneckAssessment_companyId_status_idx" ON "BottleneckAssessment"("companyId", "status");

-- CreateIndex
CREATE INDEX "BottleneckAssessment_diagnosticSessionId_idx" ON "BottleneckAssessment"("diagnosticSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "ImprovementMethod_code_key" ON "ImprovementMethod"("code");

-- CreateIndex
CREATE UNIQUE INDEX "MethodVersion_methodId_version_key" ON "MethodVersion"("methodId", "version");

-- CreateIndex
CREATE INDEX "MethodRecommendation_companyId_status_idx" ON "MethodRecommendation"("companyId", "status");

-- CreateIndex
CREATE INDEX "MethodRecommendation_bottleneckId_idx" ON "MethodRecommendation"("bottleneckId");

-- CreateIndex
CREATE INDEX "MethodRecommendation_methodVersionId_idx" ON "MethodRecommendation"("methodVersionId");

-- CreateIndex
CREATE INDEX "ActionPlan_companyId_status_idx" ON "ActionPlan"("companyId", "status");

-- CreateIndex
CREATE INDEX "ActionPlan_recommendationId_idx" ON "ActionPlan"("recommendationId");

-- CreateIndex
CREATE INDEX "Task_companyId_status_idx" ON "Task"("companyId", "status");

-- CreateIndex
CREATE INDEX "Task_actionPlanId_sortOrder_idx" ON "Task"("actionPlanId", "sortOrder");

-- CreateIndex
CREATE INDEX "Task_assigneeMembershipId_idx" ON "Task"("assigneeMembershipId");

-- CreateIndex
CREATE INDEX "Task_parentTaskId_idx" ON "Task"("parentTaskId");

-- CreateIndex
CREATE INDEX "TaskDependency_blockedTaskId_idx" ON "TaskDependency"("blockedTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_slug_key" ON "Lesson"("slug");

-- CreateIndex
CREATE INDEX "MethodLesson_lessonId_idx" ON "MethodLesson"("lessonId");

-- CreateIndex
CREATE INDEX "LessonAssignment_companyId_status_idx" ON "LessonAssignment"("companyId", "status");

-- CreateIndex
CREATE INDEX "LessonAssignment_actionPlanId_idx" ON "LessonAssignment"("actionPlanId");

-- CreateIndex
CREATE INDEX "LessonAssignment_userId_idx" ON "LessonAssignment"("userId");

-- CreateIndex
CREATE INDEX "ProgressCheckin_companyId_status_idx" ON "ProgressCheckin"("companyId", "status");

-- CreateIndex
CREATE INDEX "ProgressCheckin_actionPlanId_idx" ON "ProgressCheckin"("actionPlanId");

-- CreateIndex
CREATE INDEX "ProgressCheckin_submittedByMembershipId_idx" ON "ProgressCheckin"("submittedByMembershipId");

-- CreateIndex
CREATE INDEX "EvidenceOutput_companyId_createdAt_idx" ON "EvidenceOutput"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "EvidenceOutput_taskId_idx" ON "EvidenceOutput"("taskId");

-- CreateIndex
CREATE INDEX "EvidenceOutput_checkinId_idx" ON "EvidenceOutput"("checkinId");

-- CreateIndex
CREATE INDEX "ConversationThread_companyId_status_idx" ON "ConversationThread"("companyId", "status");

-- CreateIndex
CREATE INDEX "ConversationMessage_threadId_createdAt_idx" ON "ConversationMessage"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "ConversationMessage_authorUserId_idx" ON "ConversationMessage"("authorUserId");

-- CreateIndex
CREATE INDEX "CompanyMemory_companyId_kind_invalidatedAt_idx" ON "CompanyMemory"("companyId", "kind", "invalidatedAt");

-- CreateIndex
CREATE INDEX "CompanyMemory_sourceType_sourceId_idx" ON "CompanyMemory"("sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "MetricDefinition_companyId_code_key" ON "MetricDefinition"("companyId", "code");

-- CreateIndex
CREATE INDEX "MetricMeasurement_companyId_measuredAt_idx" ON "MetricMeasurement"("companyId", "measuredAt");

-- CreateIndex
CREATE INDEX "MetricMeasurement_metricId_measuredAt_idx" ON "MetricMeasurement"("metricId", "measuredAt");

-- CreateIndex
CREATE INDEX "MetricMeasurement_diagnosticSessionId_idx" ON "MetricMeasurement"("diagnosticSessionId");

-- CreateIndex
CREATE INDEX "MetricMeasurement_checkinId_idx" ON "MetricMeasurement"("checkinId");

-- AddForeignKey
ALTER TABLE "CompanyMembership" ADD CONSTRAINT "CompanyMembership_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMembership" ADD CONSTRAINT "CompanyMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticQuestion" ADD CONSTRAINT "DiagnosticQuestion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DiagnosticTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticSession" ADD CONSTRAINT "DiagnosticSession_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticSession" ADD CONSTRAINT "DiagnosticSession_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DiagnosticTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticAnswer" ADD CONSTRAINT "DiagnosticAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DiagnosticSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticAnswer" ADD CONSTRAINT "DiagnosticAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "DiagnosticQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BottleneckAssessment" ADD CONSTRAINT "BottleneckAssessment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BottleneckAssessment" ADD CONSTRAINT "BottleneckAssessment_diagnosticSessionId_fkey" FOREIGN KEY ("diagnosticSessionId") REFERENCES "DiagnosticSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MethodVersion" ADD CONSTRAINT "MethodVersion_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "ImprovementMethod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MethodRecommendation" ADD CONSTRAINT "MethodRecommendation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MethodRecommendation" ADD CONSTRAINT "MethodRecommendation_diagnosticSessionId_fkey" FOREIGN KEY ("diagnosticSessionId") REFERENCES "DiagnosticSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MethodRecommendation" ADD CONSTRAINT "MethodRecommendation_bottleneckId_fkey" FOREIGN KEY ("bottleneckId") REFERENCES "BottleneckAssessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MethodRecommendation" ADD CONSTRAINT "MethodRecommendation_methodVersionId_fkey" FOREIGN KEY ("methodVersionId") REFERENCES "MethodVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "MethodRecommendation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_actionPlanId_fkey" FOREIGN KEY ("actionPlanId") REFERENCES "ActionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeMembershipId_fkey" FOREIGN KEY ("assigneeMembershipId") REFERENCES "CompanyMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_blockingTaskId_fkey" FOREIGN KEY ("blockingTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_blockedTaskId_fkey" FOREIGN KEY ("blockedTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MethodLesson" ADD CONSTRAINT "MethodLesson_methodVersionId_fkey" FOREIGN KEY ("methodVersionId") REFERENCES "MethodVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MethodLesson" ADD CONSTRAINT "MethodLesson_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonAssignment" ADD CONSTRAINT "LessonAssignment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonAssignment" ADD CONSTRAINT "LessonAssignment_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonAssignment" ADD CONSTRAINT "LessonAssignment_actionPlanId_fkey" FOREIGN KEY ("actionPlanId") REFERENCES "ActionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonAssignment" ADD CONSTRAINT "LessonAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressCheckin" ADD CONSTRAINT "ProgressCheckin_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressCheckin" ADD CONSTRAINT "ProgressCheckin_actionPlanId_fkey" FOREIGN KEY ("actionPlanId") REFERENCES "ActionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressCheckin" ADD CONSTRAINT "ProgressCheckin_submittedByMembershipId_fkey" FOREIGN KEY ("submittedByMembershipId") REFERENCES "CompanyMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceOutput" ADD CONSTRAINT "EvidenceOutput_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceOutput" ADD CONSTRAINT "EvidenceOutput_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceOutput" ADD CONSTRAINT "EvidenceOutput_checkinId_fkey" FOREIGN KEY ("checkinId") REFERENCES "ProgressCheckin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationThread" ADD CONSTRAINT "ConversationThread_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ConversationThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMemory" ADD CONSTRAINT "CompanyMemory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricDefinition" ADD CONSTRAINT "MetricDefinition_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricMeasurement" ADD CONSTRAINT "MetricMeasurement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricMeasurement" ADD CONSTRAINT "MetricMeasurement_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "MetricDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricMeasurement" ADD CONSTRAINT "MetricMeasurement_diagnosticSessionId_fkey" FOREIGN KEY ("diagnosticSessionId") REFERENCES "DiagnosticSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricMeasurement" ADD CONSTRAINT "MetricMeasurement_checkinId_fkey" FOREIGN KEY ("checkinId") REFERENCES "ProgressCheckin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

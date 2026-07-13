-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'COMMERCIAL', 'VIEWER');

-- CreateEnum
CREATE TYPE "ContractForm" AS ENUM ('JCT_ICSUB', 'DOM1', 'BESPOKE', 'SCHEME_DEFAULT');

-- CreateEnum
CREATE TYPE "DayType" AS ENUM ('CALENDAR', 'BUSINESS');

-- CreateEnum
CREATE TYPE "ApplicationDueDateRule" AS ENUM ('FIXED_DAY_OF_MONTH', 'FIXED_DAY_OF_WEEK', 'MILESTONE');

-- CreateEnum
CREATE TYPE "CycleStatus" AS ENUM ('AWAITING_APPLICATION', 'APPLICATION_RECEIVED', 'UNDER_ASSESSMENT', 'NOTICE_SERVED', 'PAY_LESS_SERVED', 'PAID', 'CLOSED');

-- CreateEnum
CREATE TYPE "NoticeType" AS ENUM ('PAYMENT', 'PAY_LESS');

-- CreateEnum
CREATE TYPE "NoticeStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'SERVED');

-- CreateEnum
CREATE TYPE "ServiceMethod" AS ENUM ('EMAIL', 'POST', 'HAND');

-- CreateEnum
CREATE TYPE "VariationStatus" AS ENUM ('PROPOSED', 'INSTRUCTED', 'AGREED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('VALID', 'EXPIRING_SOON', 'EXPIRED', 'MISSING');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('DEADLINE_APPROACHING', 'DEADLINE_BREACHED', 'ESCALATION', 'RETENTION_RELEASE', 'DOCUMENT_EXPIRY', 'DAILY_DIGEST');

-- CreateTable
CREATE TABLE "organisations" (
    "id" TEXT NOT NULL,
    "clerkOrgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "fromEmail" TEXT,
    "fromName" TEXT,
    "requiredDocTypes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_members" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'COMMERCIAL',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "escalationTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reference" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcontractors" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyNumber" TEXT,
    "contactEmails" TEXT[],
    "cisStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subcontractors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcontract_orders" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "subcontractorId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "description" TEXT,
    "contractForm" "ContractForm" NOT NULL DEFAULT 'SCHEME_DEFAULT',
    "contractSum" DECIMAL(14,2) NOT NULL,
    "retentionPct" DECIMAL(5,4) NOT NULL DEFAULT 0.05,
    "retentionCap" DECIMAL(5,4),
    "mcdStartDate" TIMESTAMP(3),
    "mcdEndDate" TIMESTAMP(3),
    "signatory" TEXT,
    "noticeRecipients" TEXT[],
    "inboundEmail" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subcontract_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_schedules" (
    "id" TEXT NOT NULL,
    "subcontractOrderId" TEXT NOT NULL,
    "appDueDateRule" "ApplicationDueDateRule" NOT NULL DEFAULT 'FIXED_DAY_OF_MONTH',
    "appDueDayOfMonth" INTEGER,
    "appDueDayOfWeek" INTEGER,
    "appDueWeekOfMonth" INTEGER,
    "dueDateOffsetDays" INTEGER NOT NULL DEFAULT 7,
    "dueDateOffsetType" "DayType" NOT NULL DEFAULT 'CALENDAR',
    "paymentNoticeDeadlineDays" INTEGER NOT NULL DEFAULT 5,
    "paymentNoticeDeadlineType" "DayType" NOT NULL DEFAULT 'CALENDAR',
    "finalDateOffsetDays" INTEGER NOT NULL DEFAULT 21,
    "finalDateOffsetType" "DayType" NOT NULL DEFAULT 'CALENDAR',
    "payLessDeadlineDays" INTEGER NOT NULL DEFAULT 7,
    "payLessDeadlineType" "DayType" NOT NULL DEFAULT 'CALENDAR',
    "scheduleStartDate" TIMESTAMP(3) NOT NULL,
    "scheduleEndDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_cycles" (
    "id" TEXT NOT NULL,
    "paymentScheduleId" TEXT NOT NULL,
    "cycleNumber" INTEGER NOT NULL,
    "applicationExpectedDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paymentNoticeDeadline" TIMESTAMP(3) NOT NULL,
    "finalDateForPayment" TIMESTAMP(3) NOT NULL,
    "payLessDeadline" TIMESTAMP(3) NOT NULL,
    "status" "CycleStatus" NOT NULL DEFAULT 'AWAITING_APPLICATION',
    "dateDerivation" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "paymentCycleId" TEXT NOT NULL,
    "amountApplied" DECIMAL(14,2) NOT NULL,
    "dateReceived" TIMESTAMP(3) NOT NULL,
    "receivedVia" TEXT,
    "attachmentUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "paymentCycleId" TEXT NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "grossValuation" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "retentionAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "previouslyCert" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "netThisCycle" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "lastSavedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_lines" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "itemRef" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "contractValue" DECIMAL(14,2) NOT NULL,
    "isVariation" BOOLEAN NOT NULL DEFAULT false,
    "variationId" TEXT,
    "qtyOrPctComplete" DECIMAL(8,4),
    "valueToDate" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "previouslyCertified" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "thisCycle" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "overrideCapFlag" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_notices" (
    "id" TEXT NOT NULL,
    "paymentCycleId" TEXT NOT NULL,
    "status" "NoticeStatus" NOT NULL DEFAULT 'DRAFT',
    "sumDue" DECIMAL(14,2) NOT NULL,
    "basis" TEXT,
    "pdfUrl" TEXT,
    "servedAt" TIMESTAMP(3),
    "serviceMethod" "ServiceMethod",
    "servedByUserId" TEXT,
    "deliveryLogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pay_less_notices" (
    "id" TEXT NOT NULL,
    "paymentCycleId" TEXT NOT NULL,
    "status" "NoticeStatus" NOT NULL DEFAULT 'DRAFT',
    "sumDue" DECIMAL(14,2) NOT NULL,
    "basis" TEXT,
    "pdfUrl" TEXT,
    "servedAt" TIMESTAMP(3),
    "serviceMethod" "ServiceMethod",
    "servedByUserId" TEXT,
    "deliveryLogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pay_less_notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variations" (
    "id" TEXT NOT NULL,
    "subcontractOrderId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "instructedBy" TEXT,
    "instructionDate" TIMESTAMP(3),
    "status" "VariationStatus" NOT NULL DEFAULT 'PROPOSED',
    "estimatedValue" DECIMAL(14,2),
    "agreedValue" DECIMAL(14,2),
    "attachmentUrls" TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "variations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retention_ledgers" (
    "id" TEXT NOT NULL,
    "subcontractOrderId" TEXT NOT NULL,
    "totalHeld" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "pcReleaseDate" TIMESTAMP(3),
    "pcReleaseAmount" DECIMAL(14,2),
    "pcReleasedAt" TIMESTAMP(3),
    "mcdReleaseDate" TIMESTAMP(3),
    "mcdReleaseAmount" DECIMAL(14,2),
    "mcdReleasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retention_ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_documents" (
    "id" TEXT NOT NULL,
    "subcontractorId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileUrl" TEXT,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "status" "DocumentStatus" NOT NULL DEFAULT 'MISSING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_configs" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "alertType" "AlertType" NOT NULL,
    "offsetDays" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "subcontractOrderId" TEXT,
    "paymentCycleId" TEXT,
    "userId" TEXT,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organisations_clerkOrgId_key" ON "organisations"("clerkOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "org_members_clerkUserId_organisationId_key" ON "org_members"("clerkUserId", "organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "subcontract_orders_inboundEmail_key" ON "subcontract_orders"("inboundEmail");

-- CreateIndex
CREATE UNIQUE INDEX "payment_schedules_subcontractOrderId_key" ON "payment_schedules"("subcontractOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_cycles_paymentScheduleId_cycleNumber_key" ON "payment_cycles"("paymentScheduleId", "cycleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "applications_paymentCycleId_key" ON "applications"("paymentCycleId");

-- CreateIndex
CREATE UNIQUE INDEX "assessments_paymentCycleId_key" ON "assessments"("paymentCycleId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_notices_paymentCycleId_key" ON "payment_notices"("paymentCycleId");

-- CreateIndex
CREATE UNIQUE INDEX "pay_less_notices_paymentCycleId_key" ON "pay_less_notices"("paymentCycleId");

-- CreateIndex
CREATE UNIQUE INDEX "retention_ledgers_subcontractOrderId_key" ON "retention_ledgers"("subcontractOrderId");

-- CreateIndex
CREATE INDEX "audit_events_organisationId_createdAt_idx" ON "audit_events"("organisationId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_events_subcontractOrderId_idx" ON "audit_events"("subcontractOrderId");

-- CreateIndex
CREATE INDEX "audit_events_paymentCycleId_idx" ON "audit_events"("paymentCycleId");

-- AddForeignKey
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontractors" ADD CONSTRAINT "subcontractors_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontract_orders" ADD CONSTRAINT "subcontract_orders_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontract_orders" ADD CONSTRAINT "subcontract_orders_subcontractorId_fkey" FOREIGN KEY ("subcontractorId") REFERENCES "subcontractors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_schedules" ADD CONSTRAINT "payment_schedules_subcontractOrderId_fkey" FOREIGN KEY ("subcontractOrderId") REFERENCES "subcontract_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_cycles" ADD CONSTRAINT "payment_cycles_paymentScheduleId_fkey" FOREIGN KEY ("paymentScheduleId") REFERENCES "payment_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_paymentCycleId_fkey" FOREIGN KEY ("paymentCycleId") REFERENCES "payment_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_paymentCycleId_fkey" FOREIGN KEY ("paymentCycleId") REFERENCES "payment_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_lines" ADD CONSTRAINT "assessment_lines_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_notices" ADD CONSTRAINT "payment_notices_paymentCycleId_fkey" FOREIGN KEY ("paymentCycleId") REFERENCES "payment_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_less_notices" ADD CONSTRAINT "pay_less_notices_paymentCycleId_fkey" FOREIGN KEY ("paymentCycleId") REFERENCES "payment_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variations" ADD CONSTRAINT "variations_subcontractOrderId_fkey" FOREIGN KEY ("subcontractOrderId") REFERENCES "subcontract_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retention_ledgers" ADD CONSTRAINT "retention_ledgers_subcontractOrderId_fkey" FOREIGN KEY ("subcontractOrderId") REFERENCES "subcontract_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_documents" ADD CONSTRAINT "compliance_documents_subcontractorId_fkey" FOREIGN KEY ("subcontractorId") REFERENCES "subcontractors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_configs" ADD CONSTRAINT "alert_configs_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_subcontractOrderId_fkey" FOREIGN KEY ("subcontractOrderId") REFERENCES "subcontract_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

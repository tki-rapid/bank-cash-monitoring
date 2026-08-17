-- CreateEnum
CREATE TYPE "AppRole" AS ENUM ('CEO', 'FINANCE');

-- CreateEnum
CREATE TYPE "BankRunStatus" AS ENUM ('requested', 'awaiting_user_login', 'awaiting_captcha', 'extracting', 'succeeded', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "BalanceSource" AS ENUM ('computer_use', 'manual');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('payroll', 'vendors', 'infrastructure', 'taxes', 'employee_bonus', 'other');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('submitted', 'approved', 'paid');

-- CreateEnum
CREATE TYPE "ExpenseRecurrence" AS ENUM ('one_time', 'monthly', 'quarterly', 'annual');

-- CreateEnum
CREATE TYPE "ForecastScenario" AS ENUM ('base', 'optimistic', 'conservative');

-- CreateEnum
CREATE TYPE "CashFlowDirection" AS ENUM ('inflow', 'outflow');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "AppRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankInstitution" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "portalKey" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankInstitution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "bankInstitutionId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastAvailableBalance" BIGINT,
    "lastCapturedAt" TIMESTAMP(3),
    "lastBalanceSource" "BalanceSource",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankRetrievalRun" (
    "id" TEXT NOT NULL,
    "bankInstitutionId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "status" "BankRunStatus" NOT NULL,
    "userAction" TEXT,
    "errorCode" TEXT,
    "connectorVersion" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "BankRetrievalRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BalanceSnapshot" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "retrievalRunId" TEXT,
    "enteredById" TEXT,
    "source" "BalanceSource" NOT NULL,
    "availableBalance" BIGINT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "accountNumberAtCapture" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "BalanceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpensePlan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "amount" BIGINT NOT NULL,
    "recurrence" "ExpenseRecurrence" NOT NULL,
    "plannedDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'submitted',
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpensePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForecastInput" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "direction" "CashFlowDirection" NOT NULL,
    "amount" BIGINT NOT NULL,
    "scenario" "ForecastScenario" NOT NULL,
    "recurrence" "ExpenseRecurrence" NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForecastInput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "BankInstitution_code_key" ON "BankInstitution"("code");

-- CreateIndex
CREATE UNIQUE INDEX "BankInstitution_portalKey_key" ON "BankInstitution"("portalKey");

-- CreateIndex
CREATE INDEX "BankAccount_bankInstitutionId_active_idx" ON "BankAccount"("bankInstitutionId", "active");

-- CreateIndex
CREATE INDEX "BankRetrievalRun_bankAccountId_requestedAt_idx" ON "BankRetrievalRun"("bankAccountId", "requestedAt");

-- CreateIndex
CREATE INDEX "BankRetrievalRun_status_requestedAt_idx" ON "BankRetrievalRun"("status", "requestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BalanceSnapshot_retrievalRunId_key" ON "BalanceSnapshot"("retrievalRunId");

-- CreateIndex
CREATE INDEX "BalanceSnapshot_bankAccountId_capturedAt_idx" ON "BalanceSnapshot"("bankAccountId", "capturedAt");

-- CreateIndex
CREATE INDEX "BalanceSnapshot_source_capturedAt_idx" ON "BalanceSnapshot"("source", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExpensePlan_code_key" ON "ExpensePlan"("code");

-- CreateIndex
CREATE INDEX "ExpensePlan_plannedDate_status_idx" ON "ExpensePlan"("plannedDate", "status");

-- CreateIndex
CREATE INDEX "ExpensePlan_category_plannedDate_idx" ON "ExpensePlan"("category", "plannedDate");

-- CreateIndex
CREATE INDEX "ForecastInput_scenario_effectiveDate_active_idx" ON "ForecastInput"("scenario", "effectiveDate", "active");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_bankInstitutionId_fkey" FOREIGN KEY ("bankInstitutionId") REFERENCES "BankInstitution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankRetrievalRun" ADD CONSTRAINT "BankRetrievalRun_bankInstitutionId_fkey" FOREIGN KEY ("bankInstitutionId") REFERENCES "BankInstitution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankRetrievalRun" ADD CONSTRAINT "BankRetrievalRun_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankRetrievalRun" ADD CONSTRAINT "BankRetrievalRun_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceSnapshot" ADD CONSTRAINT "BalanceSnapshot_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceSnapshot" ADD CONSTRAINT "BalanceSnapshot_retrievalRunId_fkey" FOREIGN KEY ("retrievalRunId") REFERENCES "BankRetrievalRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceSnapshot" ADD CONSTRAINT "BalanceSnapshot_enteredById_fkey" FOREIGN KEY ("enteredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpensePlan" ADD CONSTRAINT "ExpensePlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpensePlan" ADD CONSTRAINT "ExpensePlan_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForecastInput" ADD CONSTRAINT "ForecastInput_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

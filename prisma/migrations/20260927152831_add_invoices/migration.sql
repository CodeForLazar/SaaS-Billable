-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'VOID');

-- AlterTable
ALTER TABLE "time_entry" ADD COLUMN     "invoiceLineId" TEXT;

-- CreateTable
CREATE TABLE "invoice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "number" TEXT,
    "currency" TEXT NOT NULL,
    "issueDate" DATE,
    "dueDate" DATE,
    "paymentTermsDays" INTEGER NOT NULL,
    "taxRateBasisPoints" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "subtotalCents" INTEGER NOT NULL DEFAULT 0,
    "taxCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "fromName" TEXT,
    "fromEmail" TEXT,
    "fromAddress" TEXT,
    "billToName" TEXT,
    "billToEmail" TEXT,
    "billToAddress" TEXT,
    "publicToken" TEXT,
    "sentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_line" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantityHundredths" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_settings" (
    "organizationId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "businessName" TEXT,
    "businessEmail" TEXT,
    "businessAddress" TEXT,
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV-',
    "nextInvoiceNumber" INTEGER NOT NULL DEFAULT 1,
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 14,
    "taxRateBasisPoints" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_settings_pkey" PRIMARY KEY ("organizationId")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoice_publicToken_key" ON "invoice"("publicToken");

-- CreateIndex
CREATE INDEX "invoice_organizationId_status_idx" ON "invoice"("organizationId", "status");

-- CreateIndex
CREATE INDEX "invoice_clientId_idx" ON "invoice"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_id_organizationId_key" ON "invoice"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_organizationId_number_key" ON "invoice"("organizationId", "number");

-- CreateIndex
CREATE INDEX "invoice_line_invoiceId_position_idx" ON "invoice_line"("invoiceId", "position");

-- CreateIndex
CREATE INDEX "time_entry_invoiceLineId_idx" ON "time_entry"("invoiceLineId");

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_clientId_organizationId_fkey" FOREIGN KEY ("clientId", "organizationId") REFERENCES "client"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line" ADD CONSTRAINT "invoice_line_invoiceId_organizationId_fkey" FOREIGN KEY ("invoiceId", "organizationId") REFERENCES "invoice"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entry" ADD CONSTRAINT "time_entry_invoiceLineId_fkey" FOREIGN KEY ("invoiceLineId") REFERENCES "invoice_line"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_settings" ADD CONSTRAINT "workspace_settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Added by hand (Prisma's schema can't express CHECK constraints; migrate ignores them).
-- A draft has no number; anything issued has a number, a public link and its dates.
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_draft_has_no_number" CHECK ("status" <> 'DRAFT' OR "number" IS NULL);
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_issued_is_complete" CHECK ("status" = 'DRAFT' OR ("number" IS NOT NULL AND "publicToken" IS NOT NULL AND "issueDate" IS NOT NULL AND "dueDate" IS NOT NULL AND "sentAt" IS NOT NULL));
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_paid_has_date" CHECK ("status" <> 'PAID' OR "paidAt" IS NOT NULL);
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_void_has_date" CHECK ("status" <> 'VOID' OR "voidedAt" IS NOT NULL);
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_totals_add_up" CHECK ("subtotalCents" >= 0 AND "taxCents" >= 0 AND "totalCents" = "subtotalCents" + "taxCents");
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_tax_rate_range" CHECK ("taxRateBasisPoints" BETWEEN 0 AND 10000);
ALTER TABLE "invoice_line" ADD CONSTRAINT "invoice_line_amounts" CHECK ("quantityHundredths" > 0 AND "unitPriceCents" >= 0 AND "amountCents" >= 0);
ALTER TABLE "workspace_settings" ADD CONSTRAINT "workspace_settings_ranges" CHECK ("nextInvoiceNumber" >= 1 AND "paymentTermsDays" BETWEEN 0 AND 365 AND "taxRateBasisPoints" BETWEEN 0 AND 10000);

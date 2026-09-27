-- CreateTable
CREATE TABLE "payment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "stripeCheckoutSessionId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_stripeCheckoutSessionId_key" ON "payment"("stripeCheckoutSessionId");

-- CreateIndex
CREATE INDEX "payment_invoiceId_idx" ON "payment"("invoiceId");

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_invoiceId_organizationId_fkey" FOREIGN KEY ("invoiceId", "organizationId") REFERENCES "invoice"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;


-- Added by hand: an amount received is positive.
ALTER TABLE "payment" ADD CONSTRAINT "payment_amount_positive" CHECK ("amountCents" > 0);

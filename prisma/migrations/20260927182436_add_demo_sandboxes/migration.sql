-- CreateTable
CREATE TABLE "demo_sandbox" (
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demo_sandbox_pkey" PRIMARY KEY ("organizationId")
);

-- CreateIndex
CREATE UNIQUE INDEX "demo_sandbox_key_key" ON "demo_sandbox"("key");

-- CreateIndex
CREATE INDEX "demo_sandbox_expiresAt_idx" ON "demo_sandbox"("expiresAt");

-- CreateIndex
CREATE INDEX "demo_sandbox_createdAt_idx" ON "demo_sandbox"("createdAt");

-- AddForeignKey
ALTER TABLE "demo_sandbox" ADD CONSTRAINT "demo_sandbox_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;


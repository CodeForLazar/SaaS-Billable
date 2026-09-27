-- CreateTable
CREATE TABLE "time_entry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "description" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "durationSec" INTEGER,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "time_entry_organizationId_startedAt_idx" ON "time_entry"("organizationId", "startedAt");

-- CreateIndex
CREATE INDEX "time_entry_userId_startedAt_idx" ON "time_entry"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "time_entry_projectId_idx" ON "time_entry"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "time_entry_one_running_timer_per_user" ON "time_entry"("userId") WHERE ("endedAt" IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "project_id_organizationId_key" ON "project"("id", "organizationId");

-- AddForeignKey
ALTER TABLE "time_entry" ADD CONSTRAINT "time_entry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entry" ADD CONSTRAINT "time_entry_projectId_organizationId_fkey" FOREIGN KEY ("projectId", "organizationId") REFERENCES "project"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entry" ADD CONSTRAINT "time_entry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Added by hand (Prisma's schema can't express CHECK constraints; migrate ignores them):
-- a finished entry can't end before it started, and the duration is stored exactly when it ended.
ALTER TABLE "time_entry" ADD CONSTRAINT "time_entry_ends_after_start" CHECK ("endedAt" IS NULL OR "endedAt" >= "startedAt");
ALTER TABLE "time_entry" ADD CONSTRAINT "time_entry_duration_when_ended" CHECK (("endedAt" IS NULL) = ("durationSec" IS NULL) AND ("durationSec" IS NULL OR "durationSec" >= 0));

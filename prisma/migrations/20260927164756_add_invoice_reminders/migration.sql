-- AlterTable
ALTER TABLE "invoice" ADD COLUMN     "lastReminderAt" TIMESTAMP(3),
ADD COLUMN     "reminderCount" INTEGER NOT NULL DEFAULT 0;


-- Hand-written (Prisma doesn't model CHECK constraints): the count and the date go together.
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_reminders_consistent"
  CHECK ("reminderCount" >= 0 AND ("reminderCount" = 0) = ("lastReminderAt" IS NULL));

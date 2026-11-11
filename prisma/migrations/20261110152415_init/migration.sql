-- CreateEnum
CREATE TYPE "HabitType" AS ENUM ('CHECK', 'QUANTITY');

-- CreateEnum
CREATE TYPE "StreakMode" AS ENUM ('DAILY', 'WEEKDAYS', 'WEEKENDS', 'CUSTOM');

-- CreateTable
CREATE TABLE "Habit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "HabitType" NOT NULL,
    "unit" TEXT,
    "streakMode" "StreakMode" NOT NULL DEFAULT 'DAILY',
    "customDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Habit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitLog" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "logDate" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "value" INTEGER,
    "note" TEXT,
    "checkKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HabitLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Habit_archivedAt_sortOrder_idx" ON "Habit"("archivedAt", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "HabitLog_checkKey_key" ON "HabitLog"("checkKey");

-- CreateIndex
CREATE INDEX "HabitLog_habitId_logDate_idx" ON "HabitLog"("habitId", "logDate");

-- CreateIndex
CREATE INDEX "HabitLog_logDate_idx" ON "HabitLog"("logDate");

-- AddForeignKey
ALTER TABLE "HabitLog" ADD CONSTRAINT "HabitLog_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

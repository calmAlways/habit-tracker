import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { todayShanghai } from "@/lib/date";
import { CreateHabitSchema } from "@/lib/validation";
import { HabitType } from "@prisma/client";

const habitOrderBy = [
  { sortOrder: "asc" as const },
  { createdAt: "asc" as const },
  { id: "asc" as const },
];

function isCounted(date: string, mode: string, customDays: number[]): boolean {
  const wd = new Date(`${date}T00:00:00Z`).getUTCDay();
  switch (mode) {
    case "DAILY":
      return true;
    case "WEEKDAYS":
      return wd >= 1 && wd <= 5;
    case "WEEKENDS":
      return wd === 0 || wd === 6;
    case "CUSTOM":
      return customDays.includes(wd);
    default:
      return true;
  }
}

function validateHabitFields(type: HabitType, streakMode: string, customDays: number[]): string | null {
  if (type === "CHECK" && streakMode === "CUSTOM" && customDays.length === 0) {
    return "CUSTOM mode requires at least one day";
  }
  if (type === "QUANTITY" && streakMode === "CUSTOM") {
    return "QUANTITY habit cannot use CUSTOM streak mode";
  }
  if (streakMode !== "CUSTOM" && customDays.length > 0) {
    return "customDays must be empty for non-CUSTOM modes";
  }
  return null;
}

export async function GET(request: NextRequest) {
  const includeArchived = request.nextUrl.searchParams.get("archived") === "1";
  const where = includeArchived ? {} : { archivedAt: null };
  const habits = await prisma.habit.findMany({ where, orderBy: habitOrderBy });
  const today = todayShanghai();
  const habitIds = habits.map((h) => h.id);
  const logs = await prisma.habitLog.findMany({
    where: { habitId: { in: habitIds }, logDate: today },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
  });

  const grouped = new Map<string, typeof logs>();
  for (const log of logs) {
    if (!grouped.has(log.habitId)) grouped.set(log.habitId, []);
    grouped.get(log.habitId)!.push(log);
  }

  const items = habits.map((h) => {
    const habitLogs = grouped.get(h.id) ?? [];
    const checkLogId = h.type === "CHECK" ? (habitLogs.find((l) => l.value === null)?.id ?? null) : null;
    const quantityLogs = h.type === "QUANTITY" ? habitLogs : [];
    const quantityTotal = quantityLogs.reduce((sum, l) => sum + (l.value ?? 0), 0);
    return {
      ...h,
      isCountedToday: h.type === "CHECK" && isCounted(today, h.streakMode, h.customDays),
      today: {
        checkLogId,
        quantityTotal,
        quantityCount: quantityLogs.length,
        quantityLogs: quantityLogs.map((l) => ({
          id: l.id,
          occurredAt: l.occurredAt.toISOString(),
          value: l.value,
          note: l.note,
        })),
      },
    };
  });

  return NextResponse.json({ date: today, items });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid JSON" } }, { status: 400 });
  }

  const parsed = CreateHabitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid input" } }, { status: 400 });
  }

  const { name, type, streakMode, customDays } = parsed.data;
  let unit = parsed.data.unit ?? null;
  if (type === "CHECK") unit = null;
  if (type === "QUANTITY" && !unit) unit = "分钟";

  const validationError = validateHabitFields(type, streakMode, customDays);
  if (validationError) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: validationError } }, { status: 400 });
  }

  const last = await prisma.habit.findFirst({ where: {}, orderBy: [{ sortOrder: "desc" }, { createdAt: "desc" }] });
  const sortOrder = (last?.sortOrder ?? -1) + 1;

  const habit = await prisma.habit.create({
    data: { name, type, unit, streakMode, customDays, sortOrder },
  });
  return NextResponse.json(habit, { status: 201 });
}

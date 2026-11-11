import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { todayShanghai, addDays, formatDurationMinutes } from "@/lib/date";
import { calculateStreak } from "@/lib/streak";

const VALID_WINDOWS = new Set(["7", "30", "90", "365", "all"]);

function dateRangeInclusive(start: string, end: string): string[] {
  const days: string[] = [];
  let current = start;
  while (current <= end) {
    days.push(current);
    current = addDays(current, 1);
  }
  return days;
}

export async function GET(request: NextRequest) {
  const window = request.nextUrl.searchParams.get("window") ?? "30";
  if (!VALID_WINDOWS.has(window)) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid window" } }, { status: 400 });
  }
  const includeArchived = request.nextUrl.searchParams.get("includeArchived") === "1";
  const today = todayShanghai();
  const endDate = today;
  const startDate = window === "all" ? null : addDays(today, -(Number(window) - 1));

  const habits = await prisma.habit.findMany({
    where: includeArchived ? {} : { archivedAt: null },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const habitIds = habits.map((h) => h.id);
  const allLogs = await prisma.habitLog.findMany({
    where: { habitId: { in: habitIds } },
    select: { id: true, habitId: true, logDate: true, occurredAt: true, value: true },
  });

  const logsByHabit = new Map<string, typeof allLogs>();
  for (const log of allLogs) {
    if (!logsByHabit.has(log.habitId)) logsByHabit.set(log.habitId, []);
    logsByHabit.get(log.habitId)!.push(log);
  }

  const items = habits.map((h) => {
    const logs = logsByHabit.get(h.id) ?? [];
    const windowLogs = startDate
      ? logs.filter((l) => l.logDate >= startDate && l.logDate <= endDate)
      : logs.filter((l) => l.logDate <= endDate);

    if (h.type === "CHECK") {
      const logDates = new Set(logs.filter((l) => l.logDate <= today).map((l) => l.logDate));
      const lastLog = logs.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())[0];
      return {
        habit: h,
        check: {
          streak: calculateStreak(h.streakMode, h.customDays, logDates, today),
          lastOccurredAt: lastLog?.occurredAt.toISOString() ?? null,
          count: windowLogs.length,
        },
        quantity: null,
      };
    } else {
      const totalValue = windowLogs.reduce((sum, l) => sum + (l.value ?? 0), 0);
      const trendDays = startDate ? dateRangeInclusive(startDate, endDate) : [];
      const earliestLogDate = logs.length > 0 ? logs.reduce((min, l) => (l.logDate < min ? l.logDate : min), logs[0].logDate) : null;
      const allDays = startDate ? trendDays : earliestLogDate ? dateRangeInclusive(earliestLogDate, endDate) : [];
      const byDay = new Map<string, number>();
      for (const log of windowLogs) {
        byDay.set(log.logDate, (byDay.get(log.logDate) ?? 0) + (log.value ?? 0));
      }
      const trend = allDays.map((d) => ({ logDate: d, value: byDay.get(d) ?? 0 }));
      return {
        habit: h,
        check: null,
        quantity: {
          totalValue,
          count: windowLogs.length,
          unit: h.unit ?? "分钟",
          displayTotal: (h.unit ?? "分钟") === "分钟" ? formatDurationMinutes(totalValue) : `${totalValue} ${h.unit}`,
          trend,
        },
      };
    }
  });

  return NextResponse.json({ window, startDate, endDate, items });
}

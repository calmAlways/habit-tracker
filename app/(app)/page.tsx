import { prisma } from "@/lib/prisma";
import { todayShanghai } from "@/lib/date";
import { HabitRow } from "@/components/HabitRow";
import { Card, CardContent } from "@/components/ui/card";

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

export default async function TodayPage() {
  const today = todayShanghai();
  const habits = await prisma.habit.findMany({
    where: { archivedAt: null },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const logs = await prisma.habitLog.findMany({
    where: { habitId: { in: habits.map((h) => h.id) }, logDate: today },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
  });

  const grouped = new Map<string, typeof logs>();
  for (const log of logs) {
    if (!grouped.has(log.habitId)) grouped.set(log.habitId, []);
    grouped.get(log.habitId)!.push(log);
  }

  const dueHabits = habits.filter((h) => h.type === "CHECK" && isCounted(today, h.streakMode, h.customDays));
  const dueCompleted = dueHabits.filter((h) => {
    const list = grouped.get(h.id) ?? [];
    return list.some((l) => l.value === null);
  }).length;

  const offDayHabits = habits.filter((h) => h.type === "CHECK" && !isCounted(today, h.streakMode, h.customDays));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">今天</h1>
          <p className="text-muted-foreground text-sm">{today}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">已完成 / 应打卡</p>
          <p className="text-2xl font-semibold tabular-nums">
            {dueCompleted} / {dueHabits.length}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {habits
          .filter((h) => isCounted(today, h.streakMode, h.customDays) || h.type === "QUANTITY")
          .map((h) => (
            <HabitRow key={h.id} habit={h} logs={grouped.get(h.id) ?? []} />
          ))}
      </div>

      {offDayHabits.length > 0 && (
        <Card className="border-dashed">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-muted-foreground mb-2">今天不用记</p>
            <div className="space-y-2">
              {offDayHabits.map((h) => (
                <HabitRow key={h.id} habit={h} logs={grouped.get(h.id) ?? []} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

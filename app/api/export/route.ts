import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function sanitizeFormula(value: string): string {
  const trimmed = value.trimStart();
  if (/^[+=\-@]/.test(trimmed)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  const habits = await prisma.habit.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  const habitMap = new Map(habits.map((h) => [h.id, h]));
  const logs = await prisma.habitLog.findMany({
    orderBy: [{ logDate: "asc" }, { occurredAt: "asc" }],
  });

  const header = ["习惯名", "类型", "logDate", "occurredAt", "value", "note"];
  const lines = [header.map(csvEscape).join(",")];

  for (const log of logs) {
    const habit = habitMap.get(log.habitId);
    if (!habit) continue;
    const row = [
      sanitizeFormula(habit.name),
      habit.type,
      log.logDate,
      log.occurredAt.toISOString(),
      log.value?.toString() ?? "",
      log.note ? csvEscape(log.note) : "",
    ];
    lines.push(row.map(csvEscape).join(","));
  }

  const csv = "\uFEFF" + lines.join("\r\n");
  const filename = `habit-export-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

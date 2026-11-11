import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ReorderHabitsSchema } from "@/lib/validation";

export async function PUT(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid JSON" } }, { status: 400 });
  }

  const parsed = ReorderHabitsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid input" } }, { status: 400 });
  }

  const ids = parsed.data.ids;
  const active = await prisma.habit.findMany({ where: { archivedAt: null }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  const activeIds = active.map((h) => h.id);
  if (ids.length !== activeIds.length || !ids.every((id) => activeIds.includes(id))) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "ids must contain exactly all active habits" } },
      { status: 400 }
    );
  }

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.habit.update({ where: { id }, data: { sortOrder: index } })
    )
  );

  return NextResponse.json({ ok: true });
}

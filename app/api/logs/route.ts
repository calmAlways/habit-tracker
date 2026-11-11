import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseOccurredAt, toDateString, todayShanghai } from "@/lib/date";
import { CreateLogSchema } from "@/lib/validation";
import { Prisma } from "@prisma/client";

function normalizeNote(note: string | null | undefined): string | null {
  if (!note) return null;
  const trimmed = note.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid JSON" } }, { status: 400 });
  }

  const parsed = CreateLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid input" } }, { status: 400 });
  }

  const { habitId, value, note } = parsed.data;
  const habit = await prisma.habit.findUnique({ where: { id: habitId } });
  if (!habit) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Habit not found" } }, { status: 404 });
  }

  let occurredAt: Date;
  try {
    occurredAt = parseOccurredAt(parsed.data.occurredAt);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid occurredAt";
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message } }, { status: 400 });
  }

  const logDate = toDateString(occurredAt);
  const today = todayShanghai();
  if (logDate > today) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "logDate cannot be in the future" } }, { status: 400 });
  }

  if (habit.type === "CHECK") {
    if (value !== undefined && value !== null) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "CHECK log cannot have value" } }, { status: 400 });
    }
    try {
      const log = await prisma.habitLog.create({
        data: {
          habitId,
          occurredAt,
          logDate,
          checkKey: `${habitId}:${logDate}`,
          note: normalizeNote(note),
        },
      });
      return NextResponse.json(log, { status: 201 });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return NextResponse.json({ error: { code: "CONFLICT", message: "Already checked in today" } }, { status: 409 });
      }
      throw err;
    }
  } else {
    if (value === undefined || value === null) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "QUANTITY log requires value" } }, { status: 400 });
    }
    const log = await prisma.habitLog.create({
      data: {
        habitId,
        occurredAt,
        logDate,
        value,
        note: normalizeNote(note),
      },
    });
    return NextResponse.json(log, { status: 201 });
  }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Missing id" } }, { status: 400 });
  }
  const existing = await prisma.habitLog.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Log not found" } }, { status: 404 });
  }
  await prisma.habitLog.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}

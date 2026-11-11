import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdateHabitSchema } from "@/lib/validation";
import { HabitType } from "@prisma/client";

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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await prisma.habit.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Habit not found" } }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid JSON" } }, { status: 400 });
  }

  const parsed = UpdateHabitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid input" } }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.unit !== undefined) data.unit = parsed.data.unit;
  if (parsed.data.streakMode !== undefined) data.streakMode = parsed.data.streakMode;
  if (parsed.data.customDays !== undefined) data.customDays = parsed.data.customDays;
  if (parsed.data.archived !== undefined) {
    data.archivedAt = parsed.data.archived ? new Date() : null;
  }

  const type = existing.type;
  const streakMode = (data.streakMode as string) ?? existing.streakMode;
  const customDays = (data.customDays as number[]) ?? existing.customDays;
  const validationError = validateHabitFields(type, streakMode, customDays);
  if (validationError) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: validationError } }, { status: 400 });
  }

  if (type === "CHECK" && data.unit !== undefined) {
    data.unit = null;
  }

  const habit = await prisma.habit.update({ where: { id }, data });
  return NextResponse.json(habit);
}

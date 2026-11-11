import { z } from "zod";
import { HabitType, StreakMode } from "@prisma/client";

export const LoginBodySchema = z.object({
  password: z.string().min(1).max(200),
});

const trimmed = z.string().transform((s) => s.trim());

export const CreateHabitSchema = z.object({
  name: trimmed.pipe(z.string().min(1).max(50)),
  type: z.enum([HabitType.CHECK, HabitType.QUANTITY]),
  unit: z.string().trim().max(20).optional().nullable(),
  streakMode: z.enum([StreakMode.DAILY, StreakMode.WEEKDAYS, StreakMode.WEEKENDS, StreakMode.CUSTOM]).default(StreakMode.DAILY),
  customDays: z.array(z.number().int().min(0).max(6)).default([]),
});

export const UpdateHabitSchema = z.object({
  name: trimmed.pipe(z.string().min(1).max(50)).optional(),
  unit: z.string().trim().max(20).optional().nullable(),
  streakMode: z.enum([StreakMode.DAILY, StreakMode.WEEKDAYS, StreakMode.WEEKENDS, StreakMode.CUSTOM]).optional(),
  customDays: z.array(z.number().int().min(0).max(6)).optional(),
  archived: z.boolean().optional(),
});

export const ReorderHabitsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export const CreateLogSchema = z.object({
  habitId: z.string().min(1),
  occurredAt: z.string().optional().nullable(),
  value: z.number().int().min(1).max(100000).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
});

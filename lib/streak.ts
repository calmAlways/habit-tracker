import { weekdayOf } from "./date";
import type { StreakMode } from "@prisma/client";

export function isCountedDay(
  dateStr: string,
  streakMode: StreakMode,
  customDays: number[]
): boolean {
  const wd = weekdayOf(dateStr);
  switch (streakMode) {
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

export function calculateStreak(
  streakMode: StreakMode,
  customDays: number[],
  logDates: Set<string>,
  today: string
): number {
  if (logDates.size === 0) return 0;
  let start = today;
  if (!(isCountedDay(today, streakMode, customDays) && logDates.has(today))) {
    start = addDay(start, -1);
  }
  let count = 0;
  let current = start;
  const visited = new Set<string>();
  while (true) {
    if (visited.has(current)) break;
    visited.add(current);
    if (isCountedDay(current, streakMode, customDays)) {
      if (logDates.has(current)) {
        count++;
      } else {
        break;
      }
    }
    current = addDay(current, -1);
  }
  return count;
}

function addDay(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + delta);
  const yy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

import { describe, it, expect } from "vitest";
import {
  toDateString,
  todayShanghai,
  weekdayOf,
  addDays,
  diffDays,
  parseOccurredAt,
  formatDurationMinutes,
} from "@/lib/date";

describe("date", () => {
  it("converts Shanghai date", () => {
    const d = new Date("2026-01-01T00:00:00+08:00");
    expect(toDateString(d)).toBe("2026-01-01");
  });

  it("handles date near midnight", () => {
    const d = new Date("2025-12-31T23:00:00+08:00");
    expect(toDateString(d)).toBe("2025-12-31");
    const d2 = new Date("2025-12-31T23:59:00+00:00");
    expect(toDateString(d2)).toBe("2026-01-01");
  });

  it("weekday", () => {
    expect(weekdayOf("2026-01-01")).toBe(4); // Thursday
    expect(weekdayOf("2026-01-04")).toBe(0); // Sunday
  });

  it("adds days across month", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2024-02-29", 1)).toBe("2024-03-01");
  });

  it("diffDays", () => {
    expect(diffDays("2026-01-03", "2026-01-01")).toBe(2);
  });

  it("rejects invalid occurredAt", () => {
    expect(() => parseOccurredAt("not-a-date")).toThrow();
    expect(() => parseOccurredAt("2026-01-01")).toThrow();
  });

  it("rejects too far future", () => {
    const far = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    expect(() => parseOccurredAt(far)).toThrow();
  });

  it("formats duration", () => {
    expect(formatDurationMinutes(45)).toBe("45 分钟");
    expect(formatDurationMinutes(60)).toBe("1 小时");
    expect(formatDurationMinutes(75)).toBe("1 小时 15 分钟");
  });
});

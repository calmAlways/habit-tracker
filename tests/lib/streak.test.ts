import { describe, it, expect } from "vitest";
import { calculateStreak, isCountedDay } from "@/lib/streak";

describe("streak", () => {
  it("DAILY normal", () => {
    const logs = new Set(["2026-01-01", "2026-01-02", "2026-01-03"]);
    expect(calculateStreak("DAILY", [], logs, "2026-01-03")).toBe(3);
  });

  it("today not logged keeps yesterday streak", () => {
    const logs = new Set(["2026-01-01", "2026-01-02"]);
    expect(calculateStreak("DAILY", [], logs, "2026-01-03")).toBe(2);
  });

  it("breaks on missing day", () => {
    const logs = new Set(["2026-01-01", "2026-01-03"]);
    expect(calculateStreak("DAILY", [], logs, "2026-01-03")).toBe(1);
  });

  it("WEEKDAYS skips weekends", () => {
    const logs = new Set(["2026-01-02", "2026-01-05"]);
    expect(calculateStreak("WEEKDAYS", [], logs, "2026-01-05")).toBe(2);
  });

  it("WEEKENDS", () => {
    const logs = new Set(["2026-01-03", "2026-01-04", "2026-01-10"]);
    expect(calculateStreak("WEEKENDS", [], logs, "2026-01-11")).toBe(2);
  });

  it("CUSTOM non adjacent", () => {
    const logs = new Set(["2026-01-05", "2026-01-07"]);
    expect(calculateStreak("CUSTOM", [1, 3], logs, "2026-01-07")).toBe(2);
  });

  it("zero when no logs", () => {
    expect(calculateStreak("DAILY", [], new Set(), "2026-01-01")).toBe(0);
  });

  it("off-day logs do not increase streak", () => {
    const logs = new Set(["2026-01-03", "2026-01-05"]);
    expect(calculateStreak("WEEKDAYS", [], logs, "2026-01-05")).toBe(1);
  });
});

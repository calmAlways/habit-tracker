export const TIMEZONE = "Asia/Shanghai";

export function now(): Date {
  return new Date();
}

export function getShanghaiParts(d: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}

export function toDateString(d: Date): string {
  const { year, month, day } = getShanghaiParts(d);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function todayShanghai(): string {
  return toDateString(now());
}

export function parseDateString(dateStr: string): { year: number; month: number; day: number } {
  const m = /^\d{4}-\d{2}-\d{2}$/.exec(dateStr);
  if (!m) throw new Error(`Invalid date string: ${dateStr}`);
  const [year, month, day] = dateStr.split("-").map(Number);
  return { year, month, day };
}

export function weekdayOf(dateStr: string): number {
  const { year, month, day } = parseDateString(dateStr);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function addDays(dateStr: string, days: number): string {
  const { year, month, day } = parseDateString(dateStr);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + days);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function diffDays(a: string, b: string): number {
  const da = parseDateString(a);
  const db = parseDateString(b);
  const ua = Date.UTC(da.year, da.month - 1, da.day);
  const ub = Date.UTC(db.year, db.month - 1, db.day);
  return Math.round((ua - ub) / 86_400_000);
}

const ISO_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

export function parseOccurredAt(value: unknown): Date {
  if (value === undefined || value === null) return now();
  if (typeof value !== "string") throw new Error("occurredAt must be a string");
  if (!ISO_RE.test(value)) throw new Error("occurredAt must be an ISO 8601 string with timezone");
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error("occurredAt is not a valid date");
  const maxFuture = 5 * 60 * 1000;
  if (d.getTime() > now().getTime() + maxFuture) {
    throw new Error("occurredAt cannot be more than 5 minutes in the future");
  }
  return d;
}

export function formatDurationMinutes(total: number): string {
  if (total <= 0) return "0 分钟";
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours > 0 && mins === 0) return `${hours} 小时`;
  if (hours > 0) return `${hours} 小时 ${mins} 分钟`;
  return `${mins} 分钟`;
}

export function formatDateTimeShanghai(d: Date): string {
  const { year, month, day, hour, minute } = getShanghaiParts(d);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${String(
    hour
  ).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

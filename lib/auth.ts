import { timingSafeEqual, createHmac } from "crypto";
import { APP_PASSWORD } from "./env";
import {
  createSession,
  serializeSessionCookie,
  clearSessionCookie,
} from "./session";

const MAX_FAILED = 5;
const WINDOW_MS = 15 * 60 * 1000;

const failures = new Map<string, { count: number; resetAt: number }>();

function cleanFailures() {
  const now = Date.now();
  for (const [ip, data] of failures.entries()) {
    if (data.resetAt <= now) failures.delete(ip);
  }
}

export function isRateLimited(ip: string): boolean {
  const data = failures.get(ip);
  if (!data) return false;
  if (Date.now() >= data.resetAt) {
    failures.delete(ip);
    return false;
  }
  return data.count >= MAX_FAILED;
}

export function recordFailed(ip: string) {
  cleanFailures();
  const data = failures.get(ip);
  const now = Date.now();
  if (!data || now >= data.resetAt) {
    failures.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    data.count++;
  }
}

export function resetFailed(ip: string) {
  failures.delete(ip);
}

export async function comparePassword(input: string): Promise<boolean> {
  const expected = APP_PASSWORD();
  const inputHash = createHmac("sha256", "salt").update(input).digest();
  const expectedHash = createHmac("sha256", "salt").update(expected).digest();
  if (inputHash.length !== expectedHash.length) return false;
  return timingSafeEqual(inputHash, expectedHash);
}

export {
  createSession,
  serializeSessionCookie,
  clearSessionCookie,
};

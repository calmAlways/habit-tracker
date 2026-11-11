import { NextRequest, NextResponse } from "next/server";
import { APP_ORIGIN } from "@/lib/env";
import { comparePassword, createSession, serializeSessionCookie, isRateLimited, recordFailed, resetFailed } from "@/lib/auth";
import { getClientIP } from "@/lib/ip";
import { LoginBodySchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin !== APP_ORIGIN()) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Invalid origin" } }, { status: 403 });
  }

  const ip = getClientIP(request);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many failed attempts" } },
      { status: 429, headers: { "Retry-After": "900" } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid JSON" } }, { status: 400 });
  }

  const parsed = LoginBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid input" } }, { status: 400 });
  }

  const ok = await comparePassword(parsed.data.password);
  if (!ok) {
    recordFailed(ip);
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Invalid password" } }, { status: 401 });
  }

  resetFailed(ip);
  const token = await createSession();
  const headers = new Headers();
  headers.append("Set-Cookie", serializeSessionCookie(token));
  return NextResponse.json({ ok: true }, { headers });
}

import { NextRequest, NextResponse } from "next/server";
import { APP_ORIGIN } from "@/lib/env";
import { clearSessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin !== APP_ORIGIN()) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Invalid origin" } }, { status: 403 });
  }
  const headers = new Headers();
  headers.append("Set-Cookie", clearSessionCookie());
  return NextResponse.json({ ok: true }, { headers });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const timestamp = new Date().toISOString();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", timestamp });
  } catch {
    return NextResponse.json({ status: "error", timestamp }, { status: 503 });
  }
}

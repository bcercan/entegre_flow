import { NextResponse } from "next/server";

/** Web health gate for Coolify. Static — does not touch backend dependencies. */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok" });
}

import { NextResponse } from "next/server";
import { qualifyAllLeads } from "@/lib/qualify";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { limit?: number; force?: boolean };
    const limit = Math.max(1, Math.min(Number(body.limit ?? 3), 8));
    const summary = await qualifyAllLeads(limit, body.force === true);
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

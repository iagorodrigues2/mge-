import { NextResponse } from "next/server";
import { registerReply } from "@/lib/dispatch";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const positive = body.positive !== false;
  const lead = await registerReply(id, positive);
  if (!lead) return NextResponse.json({ ok: false, error: "lead não encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true, stage: lead.stage });
}

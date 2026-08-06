import { NextResponse } from "next/server";
import { deleteLeadsBySource } from "@/lib/db";

export const runtime = "nodejs";

// Remove leads por origem (ex.: "scout_busca", "scout_gerado"). Manutenção —
// resetar a base de prospecção sem tocar em propostas/negócios.
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { source?: string };
    const source = String(body.source ?? "").trim();
    if (!source) return NextResponse.json({ ok: false, error: "informe a origem (source)" }, { status: 400 });
    const removed = await deleteLeadsBySource(source);
    return NextResponse.json({ ok: true, removed, source });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { deleteLeadsBySource, deleteLeadById } from "@/lib/db";

export const runtime = "nodejs";

// Remove leads por origem (ex.: "scout_busca") OU por id específico. Manutenção —
// resetar a base de prospecção (ou remover 1 lead avulso) sem tocar em
// propostas/negócios.
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { source?: string; id?: string };
    const id = String(body.id ?? "").trim();
    if (id) {
      const removed = await deleteLeadById(id);
      return NextResponse.json({ ok: true, removed, id });
    }
    const source = String(body.source ?? "").trim();
    if (!source) return NextResponse.json({ ok: false, error: "informe a origem (source) ou o id" }, { status: 400 });
    const removed = await deleteLeadsBySource(source);
    return NextResponse.json({ ok: true, removed, source });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

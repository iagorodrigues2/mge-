import { NextResponse } from "next/server";
import { scoutByNiche } from "@/lib/scout";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const segmento = String(body.segmento ?? "").trim();
    const regiao = body.regiao ? String(body.regiao).trim() : undefined;
    const quantidade = Number(body.quantidade ?? 8);
    const perfil = body.perfil ? String(body.perfil).trim() : undefined;
    if (!segmento) return NextResponse.json({ error: "informe o segmento" }, { status: 400 });

    const { mode, leads } = await scoutByNiche(segmento, regiao, quantidade, perfil);
    return NextResponse.json({
      ok: true,
      mode,
      count: leads.length,
      leads: leads.map((l) => ({ id: l.id, empresa: l.empresa, score: l.score?.total, classe: l.score?.potential })),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

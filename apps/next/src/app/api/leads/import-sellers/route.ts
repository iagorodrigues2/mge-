import { NextResponse } from "next/server";
import { upsertLead } from "@/lib/db";
import { scoreSeller } from "@/lib/seller";
import type { Lead, SellerMetrics } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface SellerItem extends Partial<SellerMetrics> { nome?: string; segmento?: string }

// Importa sellers de marketplace (JoomPulse) como leads, com métricas e score
// de oportunidade. id determinístico pelo mlId → reimportar não duplica.
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { sellers?: SellerItem[]; segmento?: string };
    const items = Array.isArray(body.sellers) ? body.sellers : [];
    if (!items.length) return NextResponse.json({ ok: false, error: "envie sellers: [{nome, mlId, receitaMes, ...}]" }, { status: 400 });

    const now = new Date().toISOString();
    let created = 0;
    for (const it of items) {
      const nome = (it.nome || "").trim();
      if (!nome) continue;
      const mlId = (it.mlId || "").toString().trim();
      const seller: SellerMetrics = {
        mlId,
        receitaMes: Number(it.receitaMes ?? 0),
        vendasMes: Number(it.vendasMes ?? 0),
        vendasTotal: Number(it.vendasTotal ?? 0),
        produtos: Number(it.produtos ?? 0),
        ticket: Number(it.ticket ?? 0),
        rating: Number(it.rating ?? 0),
        trend: Number(it.trend ?? 0),
        registrado: it.registrado,
        marcas: it.marcas != null ? Number(it.marcas) : undefined,
        ownBrand: it.ownBrand,
      };
      const lead: Lead = {
        id: "lead_ml_" + (mlId || nome.replace(/[^a-z0-9]+/gi, "_")).toLowerCase(),
        empresa: nome,
        segmento: (it.segmento || body.segmento || "Organização de casa").trim(),
        website: mlId ? `https://www.mercadolivre.com.br/perfil/${encodeURIComponent(nome)}` : undefined,
        canal_ou_categoria: it.segmento || body.segmento || "Organização de casa",
        marketplace_presence: { mercado_livre: true },
        marketplace_quality: "boa",
        seller,
        source: "joompulse",
        stage: "pesquisado",
        approved: false,
        opt_out: false,
        attempts: [],
        createdAt: now,
        updatedAt: now,
      };
      lead.score = scoreSeller(lead);
      const pot = lead.score.potential;
      if (pot === "NAO_ABORDAR") lead.stage = "nao_abordar";
      else if (pot === "NUTRIR") lead.stage = "nutrir";
      await upsertLead(lead);
      created++;
    }
    return NextResponse.json({ ok: true, created });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

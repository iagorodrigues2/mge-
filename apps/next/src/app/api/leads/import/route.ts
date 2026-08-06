import { NextResponse } from "next/server";
import { upsertLead } from "@/lib/db";
import type { Lead } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ImportItem { empresa?: string; website?: string; cidade?: string; uf?: string; segmento?: string }

function hostOf(url: string): string | null {
  try { return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "").toLowerCase(); }
  catch { return null; }
}

// Importa leads curados (empresas reais) para depois passarem pela qualificação.
// id determinístico por domínio → reimportar não duplica.
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { leads?: ImportItem[] };
    const items = Array.isArray(body.leads) ? body.leads : [];
    if (!items.length) return NextResponse.json({ ok: false, error: "envie leads: [{empresa, website}]" }, { status: 400 });

    const now = new Date().toISOString();
    let created = 0;
    const skipped: string[] = [];
    for (const it of items) {
      const host = it.website ? hostOf(it.website) : null;
      if (!host) { skipped.push(it.empresa ?? it.website ?? "?"); continue; }
      const lead: Lead = {
        id: "lead_dom_" + host.replace(/[^a-z0-9]+/g, "_").replace(/_+$/g, ""),
        empresa: it.empresa?.trim() || host,
        segmento: it.segmento?.trim() || "Casa, móveis e decoração",
        cidade: it.cidade?.trim() || undefined,
        uf: it.uf?.trim() || undefined,
        website: `https://${host}`,
        has_website: true,
        has_physical_product: true,
        canal_ou_categoria: it.segmento?.trim() || "Casa, móveis e decoração",
        source: "scout_busca",
        stage: "pesquisado",
        approved: false,
        opt_out: false,
        attempts: [],
        createdAt: now,
        updatedAt: now,
      };
      await upsertLead(lead);
      created++;
    }
    return NextResponse.json({ ok: true, created, skipped });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

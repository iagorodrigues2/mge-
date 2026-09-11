import { NextResponse } from "next/server";
import { getLead, upsertLead } from "@/lib/db";
import type { Lead } from "@/lib/types";

export const runtime = "nodejs";

// Cadastro manual de lead — com telefone, que é o que faltava.
//
// O /api/leads/import só aceita empresa/site/segmento, então todo lead com
// número dependia do minerador. Isso travou o primeiro teste real: cadastrar
// duas lojas do Brás exigia acesso ao banco.
//
// `teste: true` marca o lead como cobaia — passa por cima do corte de score no
// disparo e fica registrado como teste, para nunca virar estatística do piloto.
function soDigitos(v?: string): string {
  return (v ?? "").replace(/\D/g, "");
}

// 10-11 dígitos = número BR sem DDI. Sem o 55 a Meta recusa — e no template
// recusa em silêncio.
function normalizarBR(bruto?: string): string | null {
  const d = soDigitos(bruto);
  if (!d) return null;
  if (d.length === 10 || d.length === 11) return `55${d}`;
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) return d;
  return null;
}

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as {
    empresa?: string; whatsapp?: string; segmento?: string; website?: string;
    contato_nome?: string; email?: string; teste?: boolean; fonte?: string;
  };

  const empresa = (b.empresa ?? "").trim();
  if (!empresa) return NextResponse.json({ ok: false, error: "informe a empresa" }, { status: 400 });

  const whatsapp = normalizarBR(b.whatsapp);
  if (b.whatsapp && !whatsapp) {
    return NextResponse.json({ ok: false, error: "WhatsApp inválido — use DDD + número (ex: 11 98765-4321)" }, { status: 400 });
  }
  if (!whatsapp && !b.email) {
    return NextResponse.json({ ok: false, error: "informe ao menos WhatsApp ou e-mail" }, { status: 400 });
  }

  // id pelo número: cadastrar duas vezes atualiza em vez de duplicar.
  const id = whatsapp ? `lead_wa_${whatsapp}` : `lead_man_${empresa.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
  const existente = await getLead(id);
  const agora = new Date().toISOString();

  const lead = {
    ...(existente ?? {
      id,
      source: b.teste ? "teste_manual" : "cadastro_manual",
      stage: "pesquisado",
      approved: false,
      opt_out: false,
      attempts: [],
      createdAt: agora,
    }),
    id,
    empresa,
    segmento: (b.segmento ?? "").trim() || existente?.segmento || "Não informado",
    canal_ou_categoria: (b.segmento ?? "").trim() || existente?.canal_ou_categoria,
    website: (b.website ?? "").trim() || existente?.website,
    contato_nome: (b.contato_nome ?? "").trim() || existente?.contato_nome,
    email: (b.email ?? "").trim() || existente?.email,
    whatsapp: whatsapp ?? existente?.whatsapp,
    whatsapp_fonte: b.fonte ?? existente?.whatsapp_fonte ?? "cadastro manual",
    whatsapp_at: whatsapp ? agora : existente?.whatsapp_at,
    teste: b.teste === true ? true : existente?.teste,
    has_website: !!((b.website ?? "").trim() || existente?.website),
    updatedAt: agora,
  } as Lead;

  await upsertLead(lead);
  return NextResponse.json({ ok: true, id, empresa, whatsapp: lead.whatsapp, teste: !!lead.teste, atualizado: !!existente });
}

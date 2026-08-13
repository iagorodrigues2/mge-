import { NextResponse } from "next/server";
import { listLeads, upsertLead } from "@/lib/db";
import { descobrirWhatsapp } from "@/lib/whatsapp-finder";

export const runtime = "nodejs";
export const maxDuration = 60;

// Minera o WhatsApp comercial publicado no site das empresas.
// É o gargalo do outbound: sem celular não existe conversa — os telefones da
// Receita são PABX fixo. Roda em lote pequeno por causa do limite de 60s da
// Vercel Hobby; chame várias vezes até `restantes` chegar a zero.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { limite?: number; refazer?: boolean };
  const limite = Math.min(Math.max(body.limite ?? 8, 1), 15);
  const refazer = body.refazer === true;

  const leads = await listLeads();
  const candidatos = leads.filter((l) => {
    if (!refazer && l.whatsapp) return false; // já tem
    if (l.opt_out) return false;
    const site = l.website ?? "";
    // perfil de marketplace não é site da empresa — não publica WhatsApp
    return !!site && !/mercadolivre|mercadolibre|amazon\.|shopee|ficticio|exemplo/i.test(site);
  });

  const lote = candidatos.slice(0, limite);
  let encontrados = 0;
  const achados: { empresa: string; whatsapp: string; fonte: string }[] = [];

  // sequencial de propósito: sites lentos + orçamento de 60s da serverless
  for (const lead of lote) {
    const r = await descobrirWhatsapp(lead.website!, { timeoutMs: 4000, budgetMs: 9000 });
    if (r) {
      lead.whatsapp = r.numero;
      lead.whatsapp_fonte = `${r.fonte} — ${r.origem}`;
      lead.whatsapp_at = new Date().toISOString();
      lead.updatedAt = lead.whatsapp_at;
      await upsertLead(lead);
      encontrados++;
      achados.push({ empresa: lead.empresa, whatsapp: r.numero, fonte: r.fonte });
    }
  }

  // relê a base: os leads deste lote já foram salvos, então somar seria contar
  // duas vezes
  const comWhatsappNaBase = (await listLeads()).filter((l) => l.whatsapp).length;

  return NextResponse.json({
    ok: true,
    verificados: lote.length,
    encontrados,
    achados,
    restantes: Math.max(0, candidatos.length - lote.length),
    comWhatsappNaBase,
  });
}

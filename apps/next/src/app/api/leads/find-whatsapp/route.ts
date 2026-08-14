import { NextResponse } from "next/server";
import { listLeads, upsertLead } from "@/lib/db";
import { descobrirWhatsappDetalhado } from "@/lib/whatsapp-finder";

export const runtime = "nodejs";
export const maxDuration = 60;

// Minera o WhatsApp comercial publicado no site das empresas.
// É o gargalo do outbound: sem celular não existe conversa — os telefones da
// Receita são PABX fixo. Roda em lote pequeno por causa do limite de 60s da
// Vercel Hobby; chame várias vezes até `restantes` chegar a zero.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    limite?: number; refazer?: boolean; repescar?: boolean;
  };
  const limite = Math.min(Math.max(body.limite ?? 8, 1), 15);
  const refazer = body.refazer === true;
  // Repescagem: sites que falharam por rede/timeout merecem nova chance — a
  // falha foi do momento, não significa que a empresa não publica WhatsApp.
  const repescar = body.repescar === true;

  const leads = await listLeads();
  const candidatos = leads.filter((l) => {
    if (l.opt_out) return false;
    // Perfil de marketplace NÃO é site da empresa e nunca publica WhatsApp de
    // seller — este filtro vale SEMPRE, inclusive na repescagem (senão a fila
    // engole os 600 perfis do ML e nunca chega nas empresas de verdade).
    const site = l.website ?? "";
    if (!site || /mercadolivre|mercadolibre|amazon\.|shopee|ficticio|exemplo/i.test(site)) return false;

    if (l.whatsapp) return refazer; // já tem número
    if (repescar) return true; // falhou antes: merece nova chance
    return refazer || !l.whatsapp_tentado_at; // a fila precisa ANDAR
  });

  const lote = candidatos.slice(0, limite);
  let encontrados = 0;
  const achados: { empresa: string; whatsapp: string; fonte: string }[] = [];
  const diagnostico: Record<string, number> = {};

  // sequencial de propósito: sites lentos + orçamento de 60s da serverless
  for (const lead of lote) {
    const r = await descobrirWhatsappDetalhado(lead.website!, { timeoutMs: 4000, budgetMs: 9000 });
    const agora = new Date().toISOString();
    lead.whatsapp_tentado_at = agora; // marca SEMPRE, achando ou não
    diagnostico[r.motivo] = (diagnostico[r.motivo] ?? 0) + 1;
    if (r.achado) {
      lead.whatsapp = r.achado.numero;
      lead.whatsapp_fonte = `${r.achado.fonte} — ${r.achado.origem}`;
      lead.whatsapp_at = agora;
      encontrados++;
      achados.push({ empresa: lead.empresa, whatsapp: r.achado.numero, fonte: r.achado.fonte });
    }
    lead.updatedAt = agora;
    await upsertLead(lead);
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
    // "bloqueado" em massa = o IP do servidor está barrado (Cloudflare);
    // "ok" sem achado = o site realmente não publica WhatsApp.
    diagnostico,
  });
}

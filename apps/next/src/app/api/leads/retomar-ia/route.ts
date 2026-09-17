import { NextResponse } from "next/server";
import { listLeads, upsertLead } from "@/lib/db";
import { applySdrTurn, notificarPorteiro, sdrRespond } from "@/lib/ai-sdr";
import { avisarLeadDaReuniao } from "@/lib/reuniao";
import { sendTemplate, sendWhatsApp, whatsappConfigurado } from "@/lib/whatsapp";
import { janelaAberta, renderTemplate, templateParaEtapa } from "@/lib/wa-templates";
import { conferirTemplates } from "@/lib/wa-waba";
import { planejarBaloes } from "@/lib/ritmo";
import type { Lead, ConversationMsg } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

// RETOMADA DE CONVERSA PARADA.
//
// Quando a IA falha ao responder (crédito da Anthropic zerado, queda da API),
// o webhook já devolveu 200 pra Meta e ela não reenvia: o lead escreveu, a
// máquina registrou "IA não respondeu" e a conversa morre em silêncio — o pior
// jeito de perder um lead que acabou de responder. Foi o que aconteceu em
// 15/09/2026 às 16h com 29 tentativas.
//
// Aqui a máquina acha essas conversas e retoma:
//  - janela de 24h ABERTA (o lead falou há menos de um dia): o Rafael responde
//    à última mensagem dele agora, texto livre, como se nada tivesse acontecido;
//  - janela FECHADA: só template aprovado passa na Meta → sai a
//    `retomada_sem_resposta`; quando o lead responder, o webhook segue normal.
//
// Duas etapas, igual ao disparo: sem `confirmar: true` é prévia.

function ultimaDoLead(l: Lead): ConversationMsg | undefined {
  return [...(l.conversation ?? [])].reverse().find((m) => m.role === "lead");
}

// Conversa parada = a ÚLTIMA mensagem é do lead E a última tentativa da IA,
// depois dela, foi bloqueada por "IA não respondeu".
function parada(l: Lead): { texto: string; quando: string } | null {
  if (l.opt_out || l.stage === "opt_out") return null;
  const conv = l.conversation ?? [];
  const ultima = conv[conv.length - 1];
  if (!ultima || ultima.role !== "lead") return null;
  const falha = [...(l.attempts ?? [])].reverse().find((a) => a.step === "resposta_ia" && a.at >= ultima.at);
  if (!falha || falha.status !== "bloqueado" || !(falha.detail ?? "").startsWith("IA não respondeu")) return null;
  return { texto: ultima.text, quando: ultima.at };
}

function dormir(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { confirmar?: boolean; ids?: string[] };
  const confirmar = body.confirmar === true;

  const leads = await listLeads();
  const candidatos = leads
    .map((l) => ({ l, p: parada(l) }))
    .filter((x): x is { l: Lead; p: { texto: string; quando: string } } => !!x.p)
    .filter((x) => (body.ids?.length ? body.ids.includes(x.l.id) : true))
    .sort((a, b) => b.p.quando.localeCompare(a.p.quando));

  if (!confirmar) {
    return NextResponse.json({
      ok: true,
      previa: true,
      paradas: candidatos.length,
      leads: candidatos.map(({ l, p }) => ({
        id: l.id,
        empresa: l.empresa,
        teste: !!l.teste,
        quando: p.quando,
        ultimaMsg: p.texto.slice(0, 120),
        modo: janelaAberta(l) ? "ia" : "template",
        template: janelaAberta(l) ? null : templateParaEtapa("followup_1", l)?.name ?? null,
      })),
    });
  }

  let aprovados: Set<string> | undefined;
  if (whatsappConfigurado()) {
    const check = await conferirTemplates();
    aprovados = new Set(check.conferencia.filter((c) => c.pronto).map((c) => c.usadoPeloCodigo));
  }

  const resultados: { empresa: string; modo: string; ok: boolean; detalhe?: string }[] = [];

  for (const { l: lead, p } of candidatos) {
    const numero = lead.whatsapp ?? lead.telefone;
    if (!numero) { resultados.push({ empresa: lead.empresa, modo: "—", ok: false, detalhe: "sem WhatsApp" }); continue; }
    const agora = new Date().toISOString();

    if (janelaAberta(lead)) {
      // Janela aberta: a IA responde à última mensagem do lead. É o mesmo
      // caminho do webhook — só que disparado daqui.
      const turn = await sdrRespond(lead, p.texto);
      if (!turn.ok || !turn.reply) {
        lead.attempts = [...(lead.attempts ?? []), { step: "resposta_ia", channel: "whatsapp", message: p.texto, status: "bloqueado", detail: `IA não respondeu: ${turn.error ?? "erro desconhecido"}`, at: agora }];
        await upsertLead(lead);
        resultados.push({ empresa: lead.empresa, modo: "ia", ok: false, detalhe: turn.error ?? "IA sem resposta" });
        continue;
      }
      applySdrTurn(lead, p.texto, turn);
      const baloes = planejarBaloes(turn.reply);
      const res: string[] = [];
      let algumEnviado = false;
      for (const b of baloes) {
        await dormir(Math.min(b.esperaMs, 4000));
        const wa = await sendWhatsApp(numero, b.texto);
        res.push(wa.status === "enviado" ? "✓" : `✗ ${wa.detail}`);
        if (wa.status === "enviado") algumEnviado = true; else break;
      }
      lead.attempts = [...(lead.attempts ?? []), { step: "resposta_ia", channel: "whatsapp", message: turn.reply, status: algumEnviado ? "enviado" : "bloqueado", detail: `retomada · ${baloes.length} balão(ões): ${res.join(" · ")}`, at: agora }];
      if (turn.reuniao) await avisarLeadDaReuniao(lead);
      await notificarPorteiro(lead, turn);
      await upsertLead(lead);
      resultados.push({ empresa: lead.empresa, modo: "ia", ok: algumEnviado, detalhe: res.join(" · ") });
      continue;
    }

    // Janela fechada: template de retomada. Quando o lead responder, o webhook
    // segue a conversa de onde parou (o histórico está todo no lead).
    const tpl = templateParaEtapa("followup_1", lead, aprovados);
    if (!tpl) { resultados.push({ empresa: lead.empresa, modo: "template", ok: false, detalhe: "sem template de retomada aprovado" }); continue; }
    const r = await sendTemplate(numero, tpl.name, tpl.variaveis(lead), tpl.lang);
    const texto = renderTemplate(tpl, lead);
    lead.attempts = [...(lead.attempts ?? []), { step: "retomada_ia", channel: "whatsapp", message: texto, status: r.status === "enviado" ? "enviado" : "bloqueado", detail: `${tpl.name} · ${r.detail}`, at: agora }];
    if (r.status === "enviado") {
      lead.conversation = [...(lead.conversation ?? []), { role: "ia", text: texto, at: agora }];
    }
    lead.updatedAt = agora;
    await upsertLead(lead);
    resultados.push({ empresa: lead.empresa, modo: "template", ok: r.status === "enviado", detalhe: r.detail });
  }

  return NextResponse.json({ ok: true, retomadas: resultados.filter((r) => r.ok).length, resultados });
}

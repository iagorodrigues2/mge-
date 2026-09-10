// Avisos da reunião marcada pela IA — para o LEAD (o Porteiro cuida do Iago).
//
// Duas coisas que a call precisa e que não existiam: o lead receber a
// confirmação com o link do Meet, e um lembrete pouco antes da hora. Reunião
// marcada por robô e esquecida pelo lead é no-show, e no-show é o custo mais
// caro do funil — o horário do Iago já foi bloqueado.
//
// A service account não consegue CONVIDAR o lead pelo Google (precisaria de
// Workspace), então o convite sai pelo nosso próprio SMTP, que já é real.
import { listLeads, upsertLead } from "./db";
import { sendEmail } from "./email";
import { sendTemplate, sendWhatsApp, whatsappConfigurado } from "./whatsapp";
import { janelaAberta, LEMBRETE_REUNIAO } from "./wa-templates";
import type { Lead } from "./types";

// A janela de 24h de texto livre é aberta pelo LEAD. Uma call marcada para
// daqui a três dias tem a janela FECHADA na hora de lembrar — e aí texto livre
// é recusado pela Meta. Com a janela aberta manda texto (grátis); fechada,
// manda o template aprovado (pago, mas chega).
async function avisarWhats(lead: Lead, textoLivre: string) {
  const numero = lead.whatsapp ?? lead.telefone;
  if (!numero) return undefined;
  if (janelaAberta(lead)) return (await sendWhatsApp(numero, textoLivre)).status;
  if (!whatsappConfigurado()) return (await sendWhatsApp(numero, textoLivre)).status;
  const r = await sendTemplate(numero, LEMBRETE_REUNIAO.name, LEMBRETE_REUNIAO.variaveis(lead), LEMBRETE_REUNIAO.lang);
  return r.status;
}

function quandoTexto(lead: Lead): string {
  return lead.reuniao?.rotulo ?? "";
}

function linhasDaCall(lead: Lead): string[] {
  const r = lead.reuniao!;
  return [
    `Quando: ${r.rotulo} (horário de Brasília)`,
    r.meet ? `Link da call: ${r.meet}` : "A call será por WhatsApp — o Iago te chama no horário.",
  ];
}

// Confirmação logo depois de marcar.
export async function avisarLeadDaReuniao(lead: Lead): Promise<{ email?: string; whatsapp?: string } | null> {
  const r = lead.reuniao;
  if (!r || r.avisoLeadEnviado) return null;

  const resultado: { email?: string; whatsapp?: string } = {};
  const corpo = [
    `Olá${lead.contato_nome ? `, ${lead.contato_nome}` : ""}!`,
    "",
    "Sua conversa com o Iago Rodrigues está confirmada.",
    "",
    ...linhasDaCall(lead),
    "",
    "Se precisar remarcar, é só responder por aqui.",
  ].join("\n");

  if (lead.email) {
    const em = await sendEmail(lead.email, `Conversa confirmada — ${quandoTexto(lead)}`, corpo);
    resultado.email = em.status;
  }

  // O WhatsApp só sai se a janela de 24h estiver aberta — e ela está, porque o
  // lead acabou de conversar. Best-effort: falhar aqui não pode desmarcar nada.
  if (lead.whatsapp ?? lead.telefone) {
    const texto = [
      `Confirmado! ${r.rotulo}.`,
      r.meet ? `Link da call: ${r.meet}` : "",
      "Se precisar remarcar, é só me avisar por aqui.",
    ].filter(Boolean).join("\n");
    resultado.whatsapp = await avisarWhats(lead, texto);
  }

  if (resultado.email === "enviado" || resultado.whatsapp === "enviado") {
    lead.reuniao = { ...r, avisoLeadEnviado: new Date().toISOString() };
  }
  return resultado;
}

// Lembrete antes da call. A janela é de 20 a 45 minutos antes: quem dispara
// isto é um cron externo, e a janela larga evita que um atraso do agendador
// faça o lembrete simplesmente não sair. `lembreteEnviado` garante que rodar
// duas vezes não manda duas mensagens.
const LEMBRETE_MIN = 20;   // minutos antes: piso da janela do lembrete
const LEMBRETE_MAX = 45;   // teto — o cron roda de 15 em 15, cabe folga
const VESPERA_MIN = 22 * 60; // 22h antes
const VESPERA_MAX = 26 * 60; // 26h antes

export interface LinhaAviso {
  empresa: string;
  quando: string;
  tipo: "vespera" | "lembrete";
  whatsapp?: string;
  email?: string;
}

// Chamado pelo pinger a cada 15 minutos. Faz DOIS trabalhos:
//
// 1. VÉSPERA (~24h antes) — a confirmação que o Iago pediu. É ela que dá ao
//    lead a chance de responder; e a resposta dele REABRE a janela de 24h, o
//    que faz o lembrete seguinte sair como texto livre, de graça.
// 2. LEMBRETE (~30 min antes) — a última chamada antes da call.
//
// Idempotente pelos carimbos: rodar de novo não manda de novo.
export async function enviarLembretes(agora = new Date()): Promise<{
  enviados: number;
  resultados: LinhaAviso[];
}> {
  const leads = await listLeads();
  const resultados: LinhaAviso[] = [];

  for (const lead of leads) {
    const r = lead.reuniao;
    if (!r || lead.opt_out) continue;
    const faltamMin = (new Date(r.inicio).getTime() - agora.getTime()) / 60000;

    const ehVespera = !r.confirmacao24hEnviada && faltamMin >= VESPERA_MIN && faltamMin <= VESPERA_MAX;
    const ehLembrete = !r.lembreteEnviado && faltamMin >= LEMBRETE_MIN && faltamMin <= LEMBRETE_MAX;
    if (!ehVespera && !ehLembrete) continue;

    const tipo: "vespera" | "lembrete" = ehVespera ? "vespera" : "lembrete";
    const linha: LinhaAviso = { empresa: lead.empresa, quando: r.rotulo, tipo };

    const textoLivre = tipo === "vespera"
      ? [
          `Passando pra confirmar nossa conversa de amanhã — ${r.rotulo}.`,
          r.meet ? `Link da call: ${r.meet}` : "",
          "Continua de pé pra você?",
        ].filter(Boolean).join("\n")
      : [
          `Nossa conversa é daqui a pouco — ${r.rotulo}.`,
          r.meet ? `Link: ${r.meet}` : "",
          "Consegue estar disponível?",
        ].filter(Boolean).join("\n");

    linha.whatsapp = await avisarWhats(lead, textoLivre);

    if (lead.email) {
      const assunto = tipo === "vespera" ? `Confirmação — conversa ${r.rotulo}` : `Lembrete — conversa ${r.rotulo}`;
      const corpo = [
        tipo === "vespera" ? `Sua conversa com o Iago é amanhã, ${r.rotulo}.` : `Sua conversa com o Iago é daqui a pouco, ${r.rotulo}.`,
        "",
        ...linhasDaCall(lead),
      ].join("\n");
      linha.email = (await sendEmail(lead.email, assunto, corpo)).status;
    }

    // Só carimba se ALGO saiu de verdade; senão o aviso se perderia para
    // sempre por causa de uma falha momentânea de rede.
    if (linha.whatsapp === "enviado" || linha.email === "enviado") {
      const carimbo = new Date().toISOString();
      lead.reuniao = tipo === "vespera"
        ? { ...r, confirmacao24hEnviada: carimbo }
        : { ...r, lembreteEnviado: carimbo };
      await upsertLead(lead);
    }
    resultados.push(linha);
  }

  return {
    enviados: resultados.filter((x) => x.whatsapp === "enviado" || x.email === "enviado").length,
    resultados,
  };
}

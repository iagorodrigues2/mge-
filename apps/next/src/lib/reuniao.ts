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
import { sendWhatsApp } from "./whatsapp";
import type { Lead } from "./types";

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
  const numero = lead.whatsapp ?? lead.telefone;
  if (numero) {
    const texto = [
      `Confirmado! ${r.rotulo}.`,
      r.meet ? `Link da call: ${r.meet}` : "",
      "Se precisar remarcar, é só me avisar por aqui.",
    ].filter(Boolean).join("\n");
    const wa = await sendWhatsApp(numero, texto);
    resultado.whatsapp = wa.status;
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
const JANELA_MIN = 20;
const JANELA_MAX = 45;

export async function enviarLembretes(agora = new Date()): Promise<{
  enviados: number;
  resultados: { empresa: string; quando: string; whatsapp?: string; email?: string }[];
}> {
  const leads = await listLeads();
  const resultados: { empresa: string; quando: string; whatsapp?: string; email?: string }[] = [];

  for (const lead of leads) {
    const r = lead.reuniao;
    if (!r || r.lembreteEnviado || lead.opt_out) continue;
    const faltamMin = (new Date(r.inicio).getTime() - agora.getTime()) / 60000;
    if (faltamMin < JANELA_MIN || faltamMin > JANELA_MAX) continue;

    const linha: { empresa: string; quando: string; whatsapp?: string; email?: string } = {
      empresa: lead.empresa,
      quando: r.rotulo,
    };

    const numero = lead.whatsapp ?? lead.telefone;
    if (numero) {
      const texto = [
        `Passando pra confirmar nossa conversa daqui a pouco — ${r.rotulo}.`,
        r.meet ? `Link: ${r.meet}` : "",
        "Consegue estar disponível?",
      ].filter(Boolean).join("\n");
      linha.whatsapp = (await sendWhatsApp(numero, texto)).status;
    }
    if (lead.email) {
      const corpo = [`Lembrete: sua conversa com o Iago é ${r.rotulo}.`, "", ...linhasDaCall(lead)].join("\n");
      linha.email = (await sendEmail(lead.email, `Lembrete — conversa ${r.rotulo}`, corpo)).status;
    }

    // Só marca como enviado se ALGO saiu de verdade; senão o lembrete se
    // perderia para sempre por causa de uma falha momentânea.
    if (linha.whatsapp === "enviado" || linha.email === "enviado") {
      lead.reuniao = { ...r, lembreteEnviado: new Date().toISOString() };
      await upsertLead(lead);
    }
    resultados.push(linha);
  }

  return { enviados: resultados.filter((r) => r.whatsapp === "enviado" || r.email === "enviado").length, resultados };
}

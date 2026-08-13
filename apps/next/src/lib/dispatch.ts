// Orquestra o envio de qualquer etapa da cadência.
// A APROVAÇÃO humana (ou o clique de "enviar próximo follow-up") é o gatilho e
// o "clique humano" exigido pela compliance.
// Ao enviar: checa compliance → formula a mensagem → lint → envia WhatsApp
// (e e-mail, se houver) → registra a tentativa e move o estágio.
import { getLead, upsertLead } from "./db";
import { checkOutbound } from "./compliance";
import { buildMessage } from "./copywriter";
import { sendWhatsApp } from "./whatsapp";
import { sendEmail } from "./email";
import type { Lead, OutreachAttempt } from "./types";

export interface DispatchResult {
  ok: boolean;
  lead?: Lead;
  step?: string;
  attempts: OutreachAttempt[];
  blocked?: string[];
  waLink?: string;
}

// Envia uma etapa específica para um lead já carregado. Não persiste stage aqui
// além de anexar as tentativas — o chamador decide o stage.
export async function dispatchStep(lead: Lead, step: string): Promise<DispatchResult> {
  const compliance = await checkOutbound(lead);
  if (!compliance.allowed) return { ok: false, lead, step, attempts: [], blocked: compliance.reasons };

  const { text, lint } = buildMessage(step, lead);
  if (!lint.ok) return { ok: false, lead, step, attempts: [], blocked: lint.problems };

  const attempts: OutreachAttempt[] = [];
  let waLink: string | undefined;
  const now = new Date().toISOString();

  // O celular minerado do site tem WhatsApp; o telefone da Receita costuma ser
  // PABX fixo, que não tem. Preferir sempre o celular.
  const numeroWhatsapp = lead.whatsapp ?? lead.telefone;
  if (numeroWhatsapp) {
    const wa = await sendWhatsApp(numeroWhatsapp, text);
    const status = wa.status === "enviado" ? "enviado" : wa.status === "assistido" ? "assistido" : "bloqueado";
    if (wa.status === "assistido") waLink = wa.detail;
    attempts.push({ step, channel: "whatsapp", message: text, status, detail: wa.detail, at: now });
  }
  if (lead.email) {
    const subject = `Oportunidade em marketplace — ${lead.empresa}`;
    const em = await sendEmail(lead.email, subject, text);
    attempts.push({ step, channel: "email", message: text, status: em.status === "enviado" ? "enviado" : "rascunho", detail: em.detail, at: now });
  }

  lead.attempts.push(...attempts);
  const sent = attempts.some((a) => a.status === "enviado" || a.status === "assistido");
  return { ok: sent, lead, step, attempts, waLink };
}

// Etapa 4: aprovar → enviar contato inicial.
export async function approveAndSend(id: string, step = "contato_inicial"): Promise<DispatchResult> {
  const lead = await getLead(id);
  if (!lead) return { ok: false, attempts: [], blocked: ["lead não encontrado"] };
  lead.approved = true;

  const res = await dispatchStep(lead, step);
  lead.stage = res.ok ? "contatado" : "aprovado";
  await upsertLead(lead);
  return res;
}

// Registrar resposta do lead → para a cadência e move para "em conversa".
export async function registerReply(id: string, positive = true): Promise<Lead | undefined> {
  const lead = await getLead(id);
  if (!lead) return undefined;
  lead.stage = positive ? "em_conversa" : "nutrir";
  await upsertLead(lead);
  return lead;
}

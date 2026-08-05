// Envio de e-mail via SMTP (nodemailer). Se SMTP_* não estiver configurado,
// devolve o rascunho (não perde a mensagem).
import type { Transporter } from "nodemailer";

export interface EmailResult {
  status: "enviado" | "rascunho" | "bloqueado";
  detail: string;
}

let transporter: Transporter | null = null;

async function getTransporter(): Promise<Transporter | null> {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  const nodemailer = await import("nodemailer");
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    secure: Number(SMTP_PORT ?? 587) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

export async function sendEmail(to: string, subject: string, body: string): Promise<EmailResult> {
  if (!to) return { status: "bloqueado", detail: "sem e-mail" };
  const t = await getTransporter();
  if (!t) return { status: "rascunho", detail: "SMTP não configurado — rascunho salvo" };
  try {
    const from = process.env.SMTP_FROM ?? process.env.SMTP_USER!;
    const info = await t.sendMail({ from, to, subject, text: body });
    return { status: "enviado", detail: `messageId ${info.messageId}` };
  } catch (e) {
    return { status: "bloqueado", detail: `falha SMTP: ${(e as Error).message}` };
  }
}

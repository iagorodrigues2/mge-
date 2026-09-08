// Agente PORTEIRO — avisa o Iago quando a IA escala um lead.
//
// Sem isso o handoff só marcava um campo no banco: a IA decidia "chama o Iago"
// e ninguém ficava sabendo. O lead esfriava esperando.
//
// O e-mail não é um alerta seco: é o briefing da call — empresa, nível,
// oferta que a conversa está apontando, riscos e as últimas mensagens — para
// o Iago entrar na conversa já sabendo do que se trata. Como o CLAUDE V3 não
// tem mais slots de descoberta estruturados, o "o que já sei" vem direto do
// histórico da conversa em vez de um formulário preenchido pela máquina.

import { sendEmail } from "./email";
import { sendWhatsApp } from "./whatsapp";
import { listPackages } from "./db";
import type { EmailResult } from "./email";
import type { Lead, SdrState } from "./types";

// Para quem avisar: IAGO_EMAIL, senão a própria conta do SMTP.
function destinatario(): string | null {
  return process.env.IAGO_EMAIL || process.env.SMTP_USER || null;
}

// Número pessoal do Iago (não o número de teste do bot) — se configurado, o
// Porteiro manda um aviso curto por WhatsApp além do e-mail. Best-effort: se
// a janela de 24h estiver fechada ou não tiver credencial, isso falha
// silenciosamente e o e-mail continua sendo o canal confiável.
function whatsappIago(): string | null {
  return process.env.IAGO_WHATSAPP || null;
}

function urlBase(): string {
  return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3100";
}

export type MotivoPorteiro = "handoff_fechamento" | "agendar" | "reuniao_imediata" | "duvida_lead";

const ASSUNTO: Record<MotivoPorteiro, string> = {
  handoff_fechamento: "🔥 PRONTO PRA FECHAR",
  agendar: "📅 Quer reunião",
  reuniao_imediata: "⚡ QUER FALAR AGORA",
  duvida_lead: "❓ Lead esperando sua resposta",
};

function linha(rotulo: string, valor?: string): string {
  return valor ? `${rotulo}: ${valor}` : "";
}

const NIVEL_LABEL: Record<SdrState["nivel"], string> = {
  iniciante: "iniciante",
  operador: "operador",
  avancado: "avançado",
  desconhecida: "não caracterizado ainda",
};

// Monta o briefing. Só inclui o que é VERDADE — nada de campo inventado.
export async function montarBriefing(lead: Lead, state: SdrState, motivo: MotivoPorteiro): Promise<string> {
  const pacotes = await listPackages();

  const empresa = [
    linha("Empresa", lead.nome_fantasia || lead.empresa),
    linha("Segmento", lead.segmento),
    linha("Cidade/UF", [lead.cidade, lead.uf].filter(Boolean).join("/") || undefined),
    linha("WhatsApp", lead.whatsapp || lead.telefone),
    linha("Site", lead.website),
    linha("CNPJ", lead.cnpj),
  ].filter(Boolean).join("\n");

  const ofertaPkg = state.ofertaSugerida ? pacotes.find((p) => p.code === state.ofertaSugerida) : undefined;

  const comercial = [
    `Segmentação: ${NIVEL_LABEL[state.nivel]}`,
    state.score ? `Interesse: ${state.score.interesse}${state.score.motivo ? ` — ${state.score.motivo}` : ""}` : "",
    state.ofertaSugerida
      ? `Oferta que a conversa está apontando: ${ofertaPkg ? ofertaPkg.nome : state.ofertaSugerida}${state.ofertaMotivo ? ` — ${state.ofertaMotivo}` : ""}`
      : "Oferta: ainda não caracterizada",
  ].filter(Boolean).join("\n");

  const riscos = (state.riscos ?? []).length
    ? `\n⚠ RISCOS (o Iago pode preferir NÃO fechar):\n${state.riscos!.map((r) => `• ${r}`).join("\n")}`
    : "";

  const intencao = (state.sinaisIntencao ?? []).length
    ? `\n⚡ ${state.sinaisIntencao!.join("\n⚡ ")}`
    : "";

  const pergunta = motivo === "duvida_lead" && state.perguntaPendenteIago
    ? `\n❓ PERGUNTA QUE O LEAD ESTÁ AGUARDANDO:\n${state.perguntaPendenteIago}\n(a IA já disse a ele que ia confirmar isso com você e retornar — responda aqui ou direto no lead pra ela seguir a conversa)`
    : "";

  const conversa = (lead.conversation ?? [])
    .slice(-10)
    .map((c) => `${c.role === "lead" ? "LEAD" : "IA  "}: ${c.text}`)
    .join("\n\n");

  return `${ASSUNTO[motivo]} — ${lead.nome_fantasia || lead.empresa}

POR QUE ESCALEI
${lead.handoff_reason || state.ofertaMotivo || "(sem motivo registrado)"}${intencao}${pergunta}${riscos}

EMPRESA
${empresa}

COMERCIAL
${comercial}

ÚLTIMAS MENSAGENS
${conversa || "(sem conversa registrada)"}

--
Máquina de Vendas — agente Porteiro`;
}

export interface AvisoResult extends EmailResult {
  para?: string;
  // Resultado do envio por WhatsApp — só informativo (não decide dedup/
  // "avisado", que continua sendo o e-mail). undefined = IAGO_WHATSAPP não
  // configurado, então nem tentou.
  whatsapp?: { status: string; detail?: string };
}

// Mensagem curta pro WhatsApp pessoal do Iago — o e-mail tem o briefing
// completo, aqui é só o suficiente pra ele decidir se para o que está fazendo
// e olha agora.
function avisoWhatsApp(lead: Lead, state: SdrState, motivo: MotivoPorteiro): string {
  const empresa = lead.nome_fantasia || lead.empresa;
  const linkLead = `${urlBase()}/leads/${lead.id}`;
  const corpo = motivo === "duvida_lead"
    ? state.perguntaPendenteIago ?? ""
    : lead.handoff_reason || state.ofertaMotivo || "";
  return [`${ASSUNTO[motivo]} — ${empresa}`, corpo, linkLead].filter(Boolean).join("\n\n");
}

// Avisa o Iago. Nunca lança: falhar o aviso não pode derrubar a conversa.
// E-mail é o canal confiável (define o retorno/dedup — "enviado" aqui é
// sempre o status do e-mail); WhatsApp é melhor-esforço além dele — pode
// falhar (janela de 24h fechada, número não autorizado, IAGO_WHATSAPP
// ausente) sem impedir o e-mail de valer como "avisado". O resultado dele
// vem só informativo em `whatsapp`, pra dar pra diagnosticar.
export async function avisarIago(
  lead: Lead,
  state: SdrState,
  motivo: MotivoPorteiro,
): Promise<AvisoResult> {
  const numeroIago = whatsappIago();
  const whatsapp = numeroIago
    ? await sendWhatsApp(numeroIago, avisoWhatsApp(lead, state, motivo)).catch((e: Error) => ({ status: "bloqueado", detail: e.message }))
    : undefined;

  const para = destinatario();
  if (!para) return { status: "rascunho", detail: "IAGO_EMAIL/SMTP_USER não configurado", whatsapp };
  try {
    const corpo = await montarBriefing(lead, state, motivo);
    const assunto = `${ASSUNTO[motivo]} — ${lead.nome_fantasia || lead.empresa}`;
    const r = await sendEmail(para, assunto, corpo);
    return { ...r, para, whatsapp };
  } catch (e) {
    return { status: "bloqueado", detail: (e as Error).message, para, whatsapp };
  }
}

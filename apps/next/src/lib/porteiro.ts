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
import { listPackages } from "./db";
import type { EmailResult } from "./email";
import type { Lead, SdrState } from "./types";

// Para quem avisar: IAGO_EMAIL, senão a própria conta do SMTP.
function destinatario(): string | null {
  return process.env.IAGO_EMAIL || process.env.SMTP_USER || null;
}

export type MotivoPorteiro = "handoff_fechamento" | "agendar" | "reuniao_imediata";

const ASSUNTO: Record<MotivoPorteiro, string> = {
  handoff_fechamento: "🔥 PRONTO PRA FECHAR",
  agendar: "📅 Quer reunião",
  reuniao_imediata: "⚡ QUER FALAR AGORA",
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

  const conversa = (lead.conversation ?? [])
    .slice(-10)
    .map((c) => `${c.role === "lead" ? "LEAD" : "IA  "}: ${c.text}`)
    .join("\n\n");

  return `${ASSUNTO[motivo]} — ${lead.nome_fantasia || lead.empresa}

POR QUE ESCALEI
${lead.handoff_reason || state.ofertaMotivo || "(sem motivo registrado)"}${intencao}${riscos}

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
}

// Avisa o Iago. Nunca lança: falhar o aviso não pode derrubar a conversa.
export async function avisarIago(
  lead: Lead,
  state: SdrState,
  motivo: MotivoPorteiro,
): Promise<AvisoResult> {
  const para = destinatario();
  if (!para) return { status: "rascunho", detail: "IAGO_EMAIL/SMTP_USER não configurado" };
  try {
    const corpo = await montarBriefing(lead, state, motivo);
    const assunto = `${ASSUNTO[motivo]} — ${lead.nome_fantasia || lead.empresa}`;
    const r = await sendEmail(para, assunto, corpo);
    return { ...r, para };
  } catch (e) {
    return { status: "bloqueado", detail: (e as Error).message, para };
  }
}

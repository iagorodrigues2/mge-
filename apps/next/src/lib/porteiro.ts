// Agente PORTEIRO — avisa o Iago quando a IA escala um lead.
//
// Sem isso o handoff só marcava um campo no banco: a IA decidia "chama o Iago"
// e ninguém ficava sabendo. O lead esfriava esperando.
//
// O e-mail não é um alerta seco: é o BRIEFING DA CALL que o Prompt Mestre §30
// exige — empresa, dor, decisão, comercial e as perguntas ainda em aberto —
// para o Iago entrar na conversa já sabendo do que se trata.

import { sendEmail } from "./email";
import { known } from "./sdr-state";
import type { EmailResult } from "./email";
import type { DiscoverySlot, Lead, SdrState } from "./types";
import { DISCOVERY_ORDER, SLOTS_DO_CHAT } from "./types";

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

// Monta o briefing (§30). Só inclui o que é VERDADE — nada de campo inventado.
export function montarBriefing(lead: Lead, state: SdrState, motivo: MotivoPorteiro): string {
  const d = state.discovery;
  const sig = state.signals;
  const sc = state.score;

  const empresa = [
    linha("Empresa", lead.nome_fantasia || lead.empresa),
    linha("Segmento", lead.segmento),
    linha("Cidade/UF", [lead.cidade, lead.uf].filter(Boolean).join("/") || undefined),
    linha("WhatsApp", lead.whatsapp || lead.telefone),
    linha("Site", lead.website),
    linha("CNPJ", lead.cnpj),
  ].filter(Boolean).join("\n");

  const descoberto = SLOTS_DO_CHAT
    .filter((s: DiscoverySlot) => known(d[s]))
    .map((s: DiscoverySlot) => `• ${s}: ${d[s].valor ?? "(sem detalhe)"}`)
    .join("\n") || "• (nada confirmado ainda)";

  const espontaneo = DISCOVERY_ORDER
    .filter((s) => !SLOTS_DO_CHAT.includes(s) && known(d[s]))
    .map((s) => `• ${s}: ${d[s].valor ?? ""}`)
    .join("\n");

  const emAberto = DISCOVERY_ORDER
    .filter((s) => !known(d[s]))
    .map((s) => `• ${s}`)
    .join("\n") || "• (nada)";

  const comercial = [
    sc ? `Score: ${sc.total}/70${sc.provisorio ? " (provisório)" : ""} — fit ${sc.fit}, dor ${sc.dor}, impacto ${sc.impacto}, urgência ${sc.urgencia}, autoridade ${sc.autoridade}, capacidade ${sc.capacidade}, confiança ${sc.confianca}` : "",
    sig.faixaVolume && sig.faixaVolume !== "desconhecida" ? `Volume de compra: ${sig.faixaVolume.replace(/_/g, " ")}` : "",
    state.ofertaRecomendada ? `Oferta indicada: ${state.ofertaRecomendada} — ${state.ofertaMotivo ?? ""}` : "Oferta: ainda não liberada (diagnóstico incompleto)",
    sig.ehDecisor === true ? "É o decisor." : "",
    state.businessCase?.impactoMensalEstimado ? `Impacto estimado: R$ ${state.businessCase.impactoMensalEstimado.toLocaleString("pt-BR")}/mês` : "",
  ].filter(Boolean).join("\n");

  const riscos = (state.riscos ?? []).length
    ? `\n⚠ RISCOS (o Iago pode preferir NÃO fechar):\n${state.riscos!.map((r) => `• ${r}`).join("\n")}`
    : "";

  const intencao = (state.sinaisIntencao ?? []).length
    ? `\n⚡ ${state.sinaisIntencao!.join("\n⚡ ")}`
    : "";

  const conversa = (lead.conversation ?? [])
    .slice(-8)
    .map((c) => `${c.role === "lead" ? "LEAD" : "IA  "}: ${c.text}`)
    .join("\n\n");

  return `${ASSUNTO[motivo]} — ${lead.nome_fantasia || lead.empresa}

POR QUE ESCALEI
${lead.handoff_reason || state.ofertaMotivo || "(sem motivo registrado)"}${intencao}${riscos}

EMPRESA
${empresa}

O QUE JÁ SEI
${descoberto}${espontaneo ? `\n\nQUE ELE CONTOU POR CONTA PRÓPRIA (era pra ser da reunião)\n${espontaneo}` : ""}

COMERCIAL
${comercial}

AINDA EM ABERTO (descobrir na conversa)
${emAberto}

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
    const corpo = montarBriefing(lead, state, motivo);
    const assunto = `${ASSUNTO[motivo]} — ${lead.nome_fantasia || lead.empresa}`;
    const r = await sendEmail(para, assunto, corpo);
    return { ...r, para };
  } catch (e) {
    return { status: "bloqueado", detail: (e as Error).message, para };
  }
}

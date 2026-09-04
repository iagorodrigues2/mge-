// Estado do agente Vendedor — CLAUDE V3.
//
// V3 é deliberadamente mais leve que o Prompt Mestre antigo que este arquivo
// tinha antes: sem fases rígidas, sem slots de descoberta obrigatórios, sem
// gate de preço (V3 §18: responde a tabela na hora quando perguntado) e sem
// conta de payback. A decisão de qual produto indicar e quando avançar fica
// com o julgamento da IA, guiado pelo texto do prompt (ai-sdr.ts) — este
// arquivo só guarda o estado leve que sobra (segmentação, oferta que a
// conversa está apontando agora, sinais pro Porteiro) e valida que a oferta
// citada é um code real do catálogo.

import type { Lead, NivelLead, SdrState, ServicePackage } from "./types";

export function emptyState(origem: "inbound" | "outbound" = "outbound"): SdrState {
  return {
    origem,
    nivel: "desconhecida",
    perguntasFeitas: 0,
    updatedAt: new Date().toISOString(),
  };
}

// Garante que um lead ganhe um estado coerente. Leads com estado no formato
// ANTIGO (Prompt Mestre — tinha `discovery`/`phase`, não tem `nivel`) são
// tratados como estado novo: a matriz de produtos mudou inteira, então não dá
// pra migrar o diagnóstico antigo — a conversa recomeça o raciocínio comercial
// do zero (o histórico de mensagens em si, esse continua intacto).
export function stateOf(lead: Lead): SdrState {
  if (!lead.sdr || !("nivel" in lead.sdr)) return emptyState(lead.inbound ? "inbound" : "outbound");
  return lead.sdr;
}

// O code que o modelo mandou é um pacote de verdade, ativo no catálogo? Se
// não for, a oferta é descartada (vira null) em vez de propagar um código
// inventado pro resto do app (proposta, financeiro, painel do Porteiro).
export function validarOferta(code: string | null | undefined, pacotes: ServicePackage[]): string | null {
  if (!code) return null;
  const pkg = pacotes.find((p) => p.code === code && p.ativo);
  return pkg ? pkg.code : null;
}

// Resumo curto do estado pro prompt e pro painel de teste.
export function resumoEstado(s: SdrState, pacotes: ServicePackage[]): string {
  const NIVEL_LABEL: Record<NivelLead, string> = {
    iniciante: "iniciante — ainda não vende / nunca importou / pouco histórico",
    operador: "operador — já vende em marketplace, sente gargalo operacional",
    avancado: "avançado — já importa/opera volume relevante/tem equipe",
    desconhecida: "ainda não caracterizado",
  };
  const linhas = [`Segmentação atual do lead: ${NIVEL_LABEL[s.nivel]}.`];
  if (s.ofertaSugerida) {
    const p = pacotes.find((x) => x.code === s.ofertaSugerida);
    linhas.push(`Oferta que a conversa está apontando agora: ${p ? p.nome : s.ofertaSugerida}${s.ofertaMotivo ? ` — ${s.ofertaMotivo}` : ""}. Isso pode mudar a qualquer turno conforme o lead fala mais.`);
  }
  if (s.riscos?.length) linhas.push(`⚠ Riscos sinalizados: ${s.riscos.join("; ")}.`);
  linhas.push(`Perguntas de descoberta feitas até agora: ${s.perguntasFeitas} (V3 §9 — pergunte menos e melhor; não é um limite rígido).`);
  return linhas.join("\n");
}

// Máquina de diagnóstico do agente Vendedor — a LÓGICA DE DECISÃO.
//
// Regra que este arquivo existe para garantir (Prompt Mestre §5, §15, §21):
// a IA NÃO pode encaixar produto nem falar preço porque "achou uma dor".
// Ela precisa, nesta ordem: entender a situação → nomear o problema →
// achar a causa → QUANTIFICAR o impacto → montar a conta de retorno com os
// números do próprio lead → e só então escolher UMA oferta (ou nenhuma).
//
// Quem decide a fase e a oferta é este código, não o texto do modelo. O modelo
// só REPORTA o que apurou; aqui a gente valida, calcula e libera (ou barra).

import type {
  BusinessCase, CapacidadeExecucao, DiscoveryFact, DiscoverySlot, Lead,
  NecessidadeTipo, SdrCommercialScore, SdrPhase, SdrSignals, SdrState, ServicePackage,
} from "./types";
import { DISCOVERY_ORDER } from "./types";

// Horizonte padrão do payback (§15: R$20.000 ÷ 6 ≈ R$3.333/mês).
export const MESES_PAYBACK_PADRAO = Number(process.env.SDR_MESES_PAYBACK || 6);

export function emptyState(origem: "inbound" | "outbound" = "outbound"): SdrState {
  const now = new Date().toISOString();
  const discovery = {} as Record<DiscoverySlot, DiscoveryFact>;
  for (const slot of DISCOVERY_ORDER) discovery[slot] = { status: "desconhecido" };
  return {
    origem,
    phase: "abertura",
    discovery,
    signals: { necessidade: "desconhecida", capacidadeExecucao: "desconhecida" },
    leadPediuPreco: 0,
    precoRevelado: false,
    updatedAt: now,
  };
}

// Garante que um lead antigo (sem estado) ganhe um estado coerente.
export function stateOf(lead: Lead): SdrState {
  if (lead.sdr) return lead.sdr;
  return emptyState(lead.inbound ? "inbound" : "outbound");
}

const RANK: Record<DiscoveryFact["status"], number> = { desconhecido: 0, hipotese: 1, confirmado: 2 };

export function known(f: DiscoveryFact): boolean { return f.status !== "desconhecido"; }
export function confirmed(f: DiscoveryFact): boolean { return f.status === "confirmado"; }

// Mescla o que a IA reportou. Nunca REBAIXA um fato confirmado para hipótese
// (§38: o que o lead já respondeu não volta a ser dúvida), e nunca promove a
// confirmado sem valor textual — confirmação exige conteúdo.
export function mergeDiscovery(
  state: SdrState,
  updates: Partial<Record<DiscoverySlot, { status?: string; valor?: string }>> | undefined,
): SdrState {
  if (!updates) return state;
  const now = new Date().toISOString();
  for (const slot of DISCOVERY_ORDER) {
    const up = updates[slot];
    if (!up) continue;
    const cur = state.discovery[slot];
    let status = (["desconhecido", "hipotese", "confirmado"] as const).includes(up.status as never)
      ? (up.status as DiscoveryFact["status"])
      : cur.status;
    const valor = (up.valor ?? cur.valor ?? "").trim() || undefined;
    if (status === "confirmado" && !valor) status = "hipotese"; // sem conteúdo não é fato
    if (RANK[status] < RANK[cur.status]) continue; // não regride
    if (RANK[status] === RANK[cur.status] && valor === cur.valor) continue;
    state.discovery[slot] = { status, valor, at: now };
  }
  return state;
}

// ---- Gates ------------------------------------------------------------------

// Só existe business case quando sabemos o que dói, por que dói e QUANTO custa.
export function podeMontarBusinessCase(s: SdrState): boolean {
  const d = s.discovery;
  return confirmed(d.situacao) && confirmed(d.problema) && known(d.causa) && confirmed(d.impacto);
}

// Gate da OFERTA (§21): além do diagnóstico, precisamos saber se é prioridade
// agora e se a empresa tem capacidade de executar — senão a recomendação é chute.
export function podeRecomendarOferta(s: SdrState): boolean {
  return podeMontarBusinessCase(s) && !!s.businessCase && known(s.discovery.prioridade) && known(s.discovery.capacidade);
}

// Gate do HANDOFF: só chama o Iago sabendo quem decide (§24, §30).
export function podeEscalarFechamento(s: SdrState): boolean {
  return podeRecomendarOferta(s) && !!s.ofertaRecomendada && known(s.discovery.decisao);
}

// Como o preço pode aparecer nesta mensagem.
// - "bloqueado": o catálogo nem entra no contexto do modelo.
// - "referencia_com_conta": o lead PERGUNTOU preço antes da hora (§22) — pode
//   dar o valor de referência, mas obrigatoriamente amarrado à conta do §15.
// - "liberado": diagnóstico pronto, escolhe UMA oferta e informa o valor.
export type PrecoModo = "bloqueado" | "referencia_com_conta" | "liberado";

export function precoModo(s: SdrState): PrecoModo {
  if (podeRecomendarOferta(s)) return "liberado";
  if ((s.leadPediuPreco ?? 0) > 0) return "referencia_com_conta";
  return "bloqueado";
}

// ---- Fase (derivada, nunca informada pelo modelo) ---------------------------

export function computePhase(s: SdrState): SdrPhase {
  const d = s.discovery;
  if (!known(d.situacao) && !known(d.problema)) return "abertura";
  if (!confirmed(d.situacao) || !confirmed(d.problema)) return "descoberta";
  if (!known(d.causa) || !confirmed(d.impacto)) return "diagnostico";
  if (!podeRecomendarOferta(s)) return "business_case";
  if (!s.ofertaRecomendada) return "recomendacao";
  return "fechamento";
}

// A ÚNICA coisa que falta descobrir agora (§39: uma pergunta por vez).
export function proximoSlot(s: SdrState): DiscoverySlot | null {
  for (const slot of DISCOVERY_ORDER) {
    if (!confirmed(s.discovery[slot])) {
      // causa aceita hipótese (§6) — se já temos hipótese, seguimos pro impacto
      if (slot === "causa" && known(s.discovery.causa)) continue;
      // prioridade/capacidade/decisão/critério não precisam de prova documental
      if (["prioridade", "capacidade", "decisao", "criterio"].includes(slot) && known(s.discovery[slot])) continue;
      return slot;
    }
  }
  return null;
}

// Duas redações do mesmo slot: uma é INSTRUÇÃO pro modelo (3ª pessoa), a outra
// é a pergunta que pode ser dita AO LEAD (2ª pessoa). Misturar as duas fazia a
// resposta de segurança sair com "…com os números deles" na cara do cliente.
export const PERGUNTA_DO_SLOT: Record<DiscoverySlot, string> = {
  situacao: "o que vocês vendem hoje, por onde vendem e qual é o tamanho aproximado da operação",
  problema: "o que especificamente não está funcionando — onde a operação trava",
  causa: "o que está provocando isso (não basta 'está ruim')",
  impacto: "quanto isso custa por mês em dinheiro, margem, estoque ou caixa — com os números do próprio lead",
  prioridade: "se resolver isso é prioridade para agora ou para o segundo semestre",
  capacidade: "quem executaria internamente e se há capital/equipe para tocar o projeto",
  decisao: "quem decide, quem influencia e quem pode barrar",
  criterio: "o que vai pesar na decisão: retorno, prazo, risco ou confiança em quem executa",
};

// Como perguntar isso AO LEAD, na segunda pessoa.
export const PERGUNTA_AO_LEAD: Record<DiscoverySlot, string> = {
  situacao: "o que vocês vendem hoje e por onde vendem?",
  problema: "o que especificamente não está funcionando aí — onde a operação trava?",
  causa: "o que você acha que está provocando isso?",
  impacto: "quanto isso custa por mês pra vocês, em margem, estoque parado ou venda que deixa de acontecer?",
  prioridade: "resolver isso é prioridade pra agora ou é assunto do segundo semestre?",
  capacidade: "quem tocaria isso internamente hoje?",
  decisao: "além de você, quem mais entra nessa decisão?",
  criterio: "o que vai pesar mais na decisão: retorno, prazo, risco ou confiança em quem executa?",
};

// ---- Business case (§15) ----------------------------------------------------

// A conta é aritmética feita AQUI. O modelo não inventa número: ele recebe
// pronto quanto o projeto precisa gerar/preservar por mês para se pagar.
export function buildBusinessCase(
  valorProjeto: number,
  base: string,
  impactoMensalEstimado?: number,
  meses = MESES_PAYBACK_PADRAO,
): BusinessCase {
  const ganhoMensalNecessario = Math.round(valorProjeto / meses);
  const bc: BusinessCase = {
    valorProjeto,
    mesesPayback: meses,
    ganhoMensalNecessario,
    base,
    at: new Date().toISOString(),
  };
  if (typeof impactoMensalEstimado === "number" && impactoMensalEstimado > 0) {
    bc.impactoMensalEstimado = Math.round(impactoMensalEstimado);
    bc.viavel = bc.impactoMensalEstimado >= ganhoMensalNecessario;
  }
  return bc;
}

// ---- Escolha da oferta (determinística) -------------------------------------

// Mapa necessidade → código do pacote. É a tradução do §20/§21: o produto é
// CONSEQUÊNCIA do diagnóstico, não o ponto de partida.
const NECESSIDADE_PARA_CODE: Record<NecessidadeTipo, string | null> = {
  clareza: "diagnostico",
  direcao: "mentoria_90",
  montar_operacao: "implantacao_90",
  escala_continua: "programa_anual",
  nenhuma: null,
  desconhecida: null,
};

export interface EscolhaOferta {
  code: string | null; // null = nenhum produto atual (§21) → sem_fit
  motivo: string;
  ajustado: boolean; // o código mudou o que o modelo sugeriu?
}

// Escolhe UMA oferta a partir dos sinais + da conta. Regras, nesta ordem:
// 1. sem diagnóstico completo não há oferta;
// 2. a necessidade define o candidato;
// 3. quem não tem equipe não recebe mentoria (mentoria pressupõe executor);
// 4. se a conta não fecha, o projeto grande é rebaixado — nunca empurrado.
export function escolherOferta(s: SdrState, pacotes: ServicePackage[]): EscolhaOferta {
  if (!podeRecomendarOferta(s)) {
    return { code: null, motivo: "diagnóstico incompleto — ainda não há base para recomendar", ajustado: false };
  }
  const ativos = pacotes.filter((p) => p.ativo);
  const has = (c: string) => ativos.some((p) => p.code === c);
  const { necessidade, capacidadeExecucao } = s.signals;

  let code = NECESSIDADE_PARA_CODE[necessidade];
  let motivo = `necessidade apurada: ${necessidade}`;
  let ajustado = false;

  if (necessidade === "nenhuma") {
    return { code: null, motivo: "nenhum programa resolve o que foi diagnosticado (§21)", ajustado: false };
  }
  if (!code) {
    return { code: null, motivo: "necessidade ainda não caracterizada", ajustado: false };
  }

  // §20: mentoria só para quem TEM executor. Sem equipe, direção não vira execução.
  if (code === "mentoria_90" && capacidadeExecucao === "sem_equipe") {
    code = "implantacao_90";
    motivo = "precisa de direção, mas não tem quem execute → implantação, não mentoria";
    ajustado = true;
  }
  // §20: programa anual pressupõe operação com alguma maturidade.
  if (code === "programa_anual" && capacidadeExecucao === "sem_equipe") {
    code = "implantacao_90";
    motivo = "quer escala contínua sem estrutura interna → primeiro estruturar";
    ajustado = true;
  }

  // A CONTA MANDA (§15/§21): se o impacto mensal não cobre o payback, o projeto
  // maior não se justifica. Rebaixa para o diagnóstico — ou recomenda não vender.
  const bc = s.businessCase;
  if (bc && bc.viavel === false && code !== "diagnostico") {
    const diag = ativos.find((p) => p.code === "diagnostico");
    const cabeDiagnostico = diag ? (bc.impactoMensalEstimado ?? 0) * bc.mesesPayback >= diag.precoRef : false;
    if (has("diagnostico") && cabeDiagnostico) {
      code = "diagnostico";
      motivo = `o impacto apurado (~R$ ${bc.impactoMensalEstimado?.toLocaleString("pt-BR")}/mês) não paga um projeto de R$ ${bc.valorProjeto.toLocaleString("pt-BR")} em ${bc.mesesPayback} meses → começar pelo diagnóstico`;
    } else {
      return {
        code: null,
        motivo: `a conta não fecha: o impacto apurado não justifica o investimento. Recomendar NÃO contratar agora (§15/§34)`,
        ajustado: true,
      };
    }
    ajustado = true;
  }

  if (!has(code)) {
    return { code: null, motivo: `pacote ${code} não está ativo no catálogo`, ajustado: true };
  }
  return { code, motivo, ajustado };
}

// ---- Score comercial vivo (§35) ---------------------------------------------

export function scoreFromState(s: SdrState, lead?: Lead): SdrCommercialScore {
  const d = s.discovery;
  const pts = (f: DiscoveryFact, hip = 4, conf = 8) => (f.status === "confirmado" ? conf : f.status === "hipotese" ? hip : 0);
  const txt = (f: DiscoveryFact) => (f.valor ?? "").toLowerCase();

  // Fit: perfil ICP do lead + situação apurada.
  let fit = pts(d.situacao, 3, 6);
  const icpTotal = lead?.score && "total" in lead.score ? lead.score.total : undefined;
  if (typeof icpTotal === "number") fit += icpTotal >= 70 ? 4 : icpTotal >= 50 ? 2 : 0;

  const dor = pts(d.problema) + (known(d.causa) ? 2 : 0);

  // Impacto pontua de verdade quando está QUANTIFICADO.
  let impacto = pts(d.impacto, 3, 7);
  if (s.businessCase?.impactoMensalEstimado) impacto += 3;

  const urgTxt = txt(d.prioridade);
  const urgencia = !known(d.prioridade) ? 0
    : /agora|urgente|imediat|este m[êe]s|j[áa]/.test(urgTxt) ? 9
    : /semestre|ano que vem|depois|futuro|mais pra frente/.test(urgTxt) ? 3 : 6;

  const decTxt = txt(d.decisao);
  const autoridade = !known(d.decisao) ? 0
    : /sou (o |a )?(dono|s[óo]cio|ceo|respons[áa]vel)|eu decido|decis[ãa]o [ée] minha/.test(decTxt) ? 10
    : /s[óo]cio|diretor|conselho|aprova/.test(decTxt) ? 6 : 4;

  const capMap: Record<CapacidadeExecucao, number> = { tem_equipe: 9, parcial: 6, sem_equipe: 3, desconhecida: 0 };
  let capacidade = capMap[s.signals.capacidadeExecucao];
  if (s.businessCase?.viavel === true) capacidade = Math.min(10, capacidade + 1);
  if (s.businessCase?.viavel === false) capacidade = Math.max(0, capacidade - 3);

  // Confiança cresce com a conversa e cai com risco detectado (§34).
  const turnos = lead?.conversation?.length ?? 0;
  let confianca = Math.min(7, Math.floor(turnos / 2));
  if (known(d.criterio)) confianca += 2;
  confianca = Math.max(0, confianca - (s.riscos?.length ?? 0));

  const clamp = (n: number) => Math.max(0, Math.min(10, Math.round(n)));
  const sc = {
    fit: clamp(fit), dor: clamp(dor), impacto: clamp(impacto), urgencia: clamp(urgencia),
    autoridade: clamp(autoridade), capacidade: clamp(capacidade), confianca: clamp(confianca),
  };
  return { ...sc, total: Object.values(sc).reduce((a, b) => a + b, 0) };
}

// ---- Resumo legível (usado no prompt e no painel) ---------------------------

export function resumoEstado(s: SdrState): string {
  const linhas: string[] = [];
  for (const slot of DISCOVERY_ORDER) {
    const f = s.discovery[slot];
    const marca = f.status === "confirmado" ? "✔ CONFIRMADO" : f.status === "hipotese" ? "~ HIPÓTESE" : "✗ desconhecido";
    linhas.push(`- ${slot}: ${marca}${f.valor ? ` — ${f.valor}` : ""}`);
  }
  return linhas.join("\n");
}

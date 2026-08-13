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
import { DISCOVERY_ORDER, SLOTS_DO_CHAT } from "./types";

// Horizonte padrão do payback (§15 do Prompt Mestre: R$20.000 ÷ 6 ≈ R$3.333/mês).
export const MESES_PAYBACK_PADRAO = Number(process.env.SDR_MESES_PAYBACK || 6);

// Orçamento de perguntas do chat (Correção §3): 3 a 6 perguntas relevantes
// antes de decidir se vale sugerir reunião. Não é rígido — é o ponto em que a
// máquina para de investigar e passa a conduzir para o próximo passo.
export const PERGUNTAS_MIN = 3;
export const PERGUNTAS_MAX = 6;

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
    perguntasFeitas: 0,
    percepcaoEntregue: false,
    turnosSoPergunta: 0,
    updatedAt: now,
  };
}

// Garante que um lead antigo (sem estado) ganhe um estado coerente.
export function stateOf(lead: Lead): SdrState {
  if (!lead.sdr) return emptyState(lead.inbound ? "inbound" : "outbound");
  // estados gravados antes do orçamento de perguntas existir
  const s = lead.sdr;
  s.perguntasFeitas ??= 0;
  s.percepcaoEntregue ??= false;
  s.turnosSoPergunta ??= 0;
  for (const slot of DISCOVERY_ORDER) s.discovery[slot] ??= { status: "desconhecido" };
  return s;
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

// ---- Reunião: o alvo real do chat (Correção §1, §16) ------------------------

// §16 — para marcar reunião basta: problema real, alguma aderência, vontade de
// resolver e possibilidade razoável de contratação. NÃO exige causa, impacto
// quantificado, capacidade, decisor nem critério: isso é assunto da reunião.
export function podeAgendar(s: SdrState): boolean {
  const d = s.discovery;
  const sig = s.signals;
  const problemaReal = confirmed(d.problema) || sig.problemaReal === true;
  const aderencia = sig.aderencia !== false; // só barra se explicitamente sem aderência
  const vontade = known(d.prioridade) || sig.vontadeResolver === true;
  const possivel = sig.possibilidadeContratacao !== false;
  // O volume é a ÚNICA variável que pode matar o fit por completo: quem compra
  // R$3 mil/mês não justifica ocupar a agenda do Iago. Uma pergunta só, com
  // faixas — não vira interrogatório e protege a agenda.
  const volumeOk = known(d.volume) || (!!sig.faixaVolume && sig.faixaVolume !== "desconhecida");
  return problemaReal && aderencia && vontade && possivel && volumeOk && s.percepcaoEntregue;
}

// Volume tão baixo que a implantação tradicional não se sustenta.
export function volumeInviavel(s: SdrState): boolean {
  return s.signals.faixaVolume === "ate_20k";
}

// O chat já colheu o que precisava? (as 4 camadas da §4)
export function camadasDoChatCompletas(s: SdrState): boolean {
  return SLOTS_DO_CHAT.every((slot) => known(s.discovery[slot]));
}

// Estourou o orçamento de perguntas (§3) ou o lead cansou (§9)? Nos dois casos
// a máquina para de investigar e vai para o próximo passo.
export function deveEncerrarDescoberta(s: SdrState): boolean {
  return s.fadigaDetectada === true || s.perguntasFeitas >= PERGUNTAS_MAX;
}

// ---- Fase (derivada, nunca informada pelo modelo) ---------------------------

export function computePhase(s: SdrState): SdrPhase {
  const d = s.discovery;
  // O lead puxou preço/oferta: sai do trilho do chat.
  if (podeRecomendarOferta(s)) return s.ofertaRecomendada ? "recomendacao" : "diagnostico_profundo";

  // Cansou ou estourou o orçamento → conduzir ao próximo passo, sem mais roteiro.
  if (deveEncerrarDescoberta(s)) return "proximo_passo";
  if (podeAgendar(s)) return "proximo_passo";

  if (!known(d.motivo) && !known(d.problema)) return "abertura";
  if (!known(d.motivo)) return "motivo";
  if (!confirmed(d.problema)) return "dor";
  if (!known(d.situacao)) return "contexto";
  if (!s.percepcaoEntregue) return "percepcao"; // §7/§18: uma leitura útil ANTES do convite
  return "fit";
}

// A ÚNICA coisa que falta descobrir agora (uma pergunta por vez).
// §17 (princípio de compressão): se dá pra conduzir sem saber, não pergunta —
// por isso só perseguimos os slots do CHAT. O resto fica pra reunião.
export function proximoSlot(s: SdrState): DiscoverySlot | null {
  if (deveEncerrarDescoberta(s)) return null;
  for (const slot of SLOTS_DO_CHAT) {
    if (slot === "problema" ? !confirmed(s.discovery[slot]) : !known(s.discovery[slot])) return slot;
  }
  return null;
}

// Duas redações do mesmo slot: uma é INSTRUÇÃO pro modelo (3ª pessoa), a outra
// é a pergunta que pode ser dita AO LEAD (2ª pessoa). Misturar as duas fazia a
// resposta de segurança sair com "…com os números deles" na cara do cliente.
export const PERGUNTA_DO_SLOT: Record<DiscoverySlot, string> = {
  motivo: "o que fez o lead procurar a gente (a intenção real por trás do contato)",
  problema: "qual é a dor PRINCIPAL — uma só, a que mais incomoda hoje",
  situacao: "contexto leve: já vende? em quais canais? está sozinho ou tem equipe?",
  prioridade: "se ele quer resolver isso agora",
  volume: "quanto ele compra de mercadoria por mês (ofereça faixas) — protege a agenda do Iago",
  causa: "o que está provocando isso — NA REUNIÃO, não no chat",
  impacto: "quanto custa — só se o número mudar a decisão (§13); senão, fica pra reunião",
  capacidade: "quem executa — assunto de reunião",
  decisao: "quem decide — assunto de reunião",
  criterio: "o que pesa na decisão — assunto de reunião",
};

// Como perguntar isso AO LEAD, na segunda pessoa.
export const PERGUNTA_AO_LEAD: Record<DiscoverySlot, string> = {
  motivo: "o que te fez procurar a gente?",
  problema: "o que hoje mais está te incomodando nessa operação?",
  situacao: "hoje você já vende em algum canal, e está tocando isso sozinho ou tem equipe?",
  prioridade: "isso é algo que vocês querem resolver agora?",
  volume: "só pra eu não te colocar numa conversa que depois não faça sentido: hoje vocês compram aproximadamente quanto de mercadoria por mês? Menos de R$20 mil, entre R$20 e R$50 mil, R$50 a R$100 mil ou acima disso?",
  causa: "o que você acha que está provocando isso?",
  impacto: "quanto isso pesa hoje pra vocês?",
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

// O score mede PROBABILIDADE E QUALIDADE DA OPORTUNIDADE, não quantos campos do
// questionário foram preenchidos. Princípio: **dado que falta vale nota
// provisória do meio (4), não zero** — desconhecido não é o mesmo que ruim.
// Um lead com marketplace ativo, dor econômica declarada e pedido de reunião
// imediata é comercialmente quente MESMO sem sabermos volume e autoridade.
const BASE_PROVISORIA = 4;

export function scoreFromState(s: SdrState, lead?: Lead): SdrCommercialScore {
  const d = s.discovery;
  const sig = s.signals;
  const txt = (f: DiscoveryFact) => (f.valor ?? "").toLowerCase();
  const aConfirmar: string[] = [];

  // --- FIT: já vende em marketplace? o problema é do tipo que o Iago resolve?
  let fit = BASE_PROVISORIA;
  const mp = lead?.marketplace_presence;
  const canais = [mp?.mercado_livre, mp?.amazon, mp?.shopee].filter(Boolean).length;
  if (canais >= 2) fit += 3; else if (canais === 1) fit += 2;
  if (lead?.seller) fit += 1;
  if (/marketplace|mercado livre|amazon|shopee/i.test(txt(d.situacao))) fit += 2;
  if (sig.aderencia === true) fit += 2;
  if (sig.aderencia === false) fit = 1;
  const icpTotal = lead?.score && "total" in lead.score ? lead.score.total : undefined;
  if (typeof icpTotal === "number" && icpTotal >= 70) fit += 1;

  // --- DOR: declarada já vale muito; econômica vale mais.
  let dor = d.problema.status === "confirmado" ? 8 : d.problema.status === "hipotese" ? 5 : BASE_PROVISORIA;
  if (sig.problemaEconomico === true) dor += 2;
  if (known(d.causa)) dor += 1;

  // --- IMPACTO: quantificado é o ideal, mas problema econômico DECLARADO já
  // pontua — exigir número aqui foi o que jogava leads quentes para 25/70.
  let impacto = BASE_PROVISORIA;
  if (sig.problemaEconomico === true) impacto += 2;
  if (confirmed(d.impacto)) impacto += 2;
  if (s.businessCase?.impactoMensalEstimado) impacto = 9;
  if (s.businessCase?.viavel === false) impacto = Math.min(impacto, 4);

  // --- URGÊNCIA: pedir reunião imediata é o sinal mais forte que existe.
  const urgTxt = txt(d.prioridade);
  let urgencia = BASE_PROVISORIA;
  if (known(d.prioridade)) {
    urgencia = /agora|urgente|imediat|este m[êe]s|j[áa]|90 dias|pr[óo]ximos meses/.test(urgTxt) ? 8
      : /semestre|ano que vem|depois|futuro|mais pra frente|sem pressa/.test(urgTxt) ? 3 : 6;
  }
  if (sig.vontadeResolver === true) urgencia = Math.max(urgencia, 6);
  if (sig.aceitouReuniao === true) urgencia = Math.max(urgencia, 8);
  if (sig.reuniaoImediata === true) urgencia = 10; // "consegue daqui a 30 min?"

  // --- AUTORIDADE: desconhecida é provisória, não zero.
  const decTxt = txt(d.decisao);
  let autoridade = BASE_PROVISORIA;
  if (sig.ehDecisor === true) autoridade = 10;
  else if (known(d.decisao)) {
    autoridade = /sou (o |a )?(dono|s[óo]cio|ceo|respons[áa]vel)|eu decido|decis[ãa]o [ée] minha|empres[áa]rio/.test(decTxt) ? 10
      : /s[óo]cio|diretor|conselho|aprova/.test(decTxt) ? 6 : 4;
  } else aConfirmar.push("quem decide");

  // --- CAPACIDADE: o volume de compra manda aqui.
  const porFaixa: Record<string, number> = { ate_20k: 3, "20k_50k": 6, "50k_100k": 8, acima_100k: 10 };
  let capacidade = BASE_PROVISORIA;
  if (sig.faixaVolume && sig.faixaVolume !== "desconhecida") capacidade = porFaixa[sig.faixaVolume] ?? BASE_PROVISORIA;
  else aConfirmar.push("volume de compra mensal");
  const capMap: Record<CapacidadeExecucao, number> = { tem_equipe: 2, parcial: 1, sem_equipe: -1, desconhecida: 0 };
  capacidade += capMap[sig.capacidadeExecucao];
  if (sig.possibilidadeContratacao === false) capacidade = Math.min(capacidade, 2);

  // --- CONFIANÇA: engajamento real da conversa.
  const turnosLead = (lead?.conversation ?? []).filter((c) => c.role === "lead").length;
  let confianca = BASE_PROVISORIA + Math.min(3, Math.floor(turnosLead / 2));
  if (s.percepcaoEntregue) confianca += 1;
  if (sig.aceitouReuniao === true) confianca += 2;
  if (s.fadigaDetectada) confianca -= 2;
  confianca -= s.riscos?.length ?? 0;

  const clamp = (n: number) => Math.max(0, Math.min(10, Math.round(n)));
  const sc = {
    fit: clamp(fit), dor: clamp(dor), impacto: clamp(impacto), urgencia: clamp(urgencia),
    autoridade: clamp(autoridade), capacidade: clamp(capacidade), confianca: clamp(confianca),
  };
  // "Provisório" é condicionado à confirmação de VOLUME e AUTORIDADE — não ao
  // impacto em R$, que a gente deliberadamente não persegue no chat. Se isso
  // contasse, o score seria provisório para sempre.
  return {
    ...sc,
    total: Object.values(sc).reduce((a, b) => a + b, 0),
    provisorio: aConfirmar.length > 0,
    aConfirmar,
  };
}

// ---- Resumo legível (usado no prompt e no painel) ---------------------------

export function resumoEstado(s: SdrState): string {
  const linhas: string[] = ["CAMADAS DO CHAT (o que você precisa aqui):"];
  const render = (slot: DiscoverySlot) => {
    const f = s.discovery[slot];
    const marca = f.status === "confirmado" ? "✔ CONFIRMADO" : f.status === "hipotese" ? "~ HIPÓTESE" : "✗ desconhecido";
    return `- ${slot}: ${marca}${f.valor ? ` — ${f.valor}` : ""}`;
  };
  for (const slot of SLOTS_DO_CHAT) linhas.push(render(slot));
  const daReuniao = DISCOVERY_ORDER.filter((x) => !SLOTS_DO_CHAT.includes(x) && known(s.discovery[x]));
  if (daReuniao.length) {
    linhas.push("O lead ofereceu espontaneamente (não persiga o resto — é da reunião):");
    for (const slot of daReuniao) linhas.push(render(slot));
  }
  linhas.push(
    `ORÇAMENTO: ${s.perguntasFeitas} pergunta(s) de descoberta feitas (alvo: ${PERGUNTAS_MIN}-${PERGUNTAS_MAX}).` +
    ` Percepção útil entregue: ${s.percepcaoEntregue ? "SIM" : "AINDA NÃO"}.` +
    (s.fadigaDetectada ? " ⚠ O LEAD DEU SINAL DE CANSAÇO." : ""),
  );
  return linhas.join("\n");
}

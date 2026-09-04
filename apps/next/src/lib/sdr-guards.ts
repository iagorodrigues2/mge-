// Guardas de saída do agente Vendedor — o que o modelo escreveu passa por aqui
// ANTES de virar mensagem. CLAUDE V3 é mais permissivo que o Prompt Mestre
// antigo (sem gate de preço, sem fases rígidas) — o que sobra aqui são as
// regras que o próprio V3 marca como INEGOCIÁVEIS (identidade, honestidade,
// opt-out) mais a hard rule anti-invenção que já existia e não conflita com
// nada do V3.

import type { ConversationMsg, ServicePackage } from "./types";

// V3 §16: nunca dizer "Iago toca tudo" nem "a equipe toca tudo" ao se
// apresentar COMO ele — mesma razão de sempre: quem apresenta o Iago não pode
// ser o próprio Iago, senão o handoff do fechamento fica incoerente.
const SE_PASSA_POR_IAGO: RegExp[] = [
  /\b(sou|aqui (é|e)) o iago\b/i,
  /\bsou iago\b/i,
  /\bmeu nome (é|e) iago\b/i,
  /\b(eu )?me chamo iago\b/i,
  /\bfala(ndo)? com o iago aqui\b/i,
];

// ===== OPT-OUT (V3 §11) — lista literal do documento, mais variações óbvias.
// São frases INTEIRAS: podem aparecer em qualquer ponto da mensagem porque não
// têm outro sentido possível. Diferente de uma palavra solta ("parar", "sair"),
// que só conta como opt-out se for quase a mensagem inteira — senão uma
// objeção comprida que comece por acaso com "não quero..." dispara opt-out à
// toa (foi o bug real do webhook em 2026-09-03: mensagem longa vs frase curta).
const OPT_OUT_INEQUIVOCO: RegExp[] = [
  /n[ãa]o ten(?:ho|ho mais) interesse/i,
  /n[ãa]o quero (?:mais )?(?:receber )?mensage(?:m|ns)/i,
  /pare de me (?:chamar|mandar(?: (?:mensagem|msg))?|procurar|contatar|escrever)/i,
  /n[ãa]o me procure/i,
];
const OPT_OUT_PALAVRA_ISOLADA = /^(sair|parar|remover|descadastrar|stop|me tira(?:\s+da lista)?)\.?$/i;

export function pediuParaParar(texto: string): boolean {
  const t = texto.trim();
  if (OPT_OUT_INEQUIVOCO.some((re) => re.test(t))) return true;
  const palavras = t.split(/\s+/).filter(Boolean);
  return palavras.length > 0 && palavras.length <= 4 && OPT_OUT_PALAVRA_ISOLADA.test(t);
}

// Hipótese apresentada como certeza (§4: "nunca transforme uma hipótese em
// certeza" — o próprio exemplo do documento é "o problema é margem" dito sem
// ter olhado os números).
const SOLUCAO_AFIRMATIVA: RegExp[] = [
  /(normalmente |geralmente )?o (caminho|problema) (que )?(abre|traz|gera|[ée]) (mais margem|X)/i,
  /(a|o) \w+ (direta|direto) (vai|irá) (resolver|abrir|aumentar)/i,
  /a solu[çc][ãa]o (aqui )?[ée]/i,
  /o problema [ée] (margem|caixa|estoque|giro|log[íi]stica)\b(?!.*pode ser)/i,
  /com certeza (vai|irá) (resolver|funcionar|dar certo)/i,
];

// §23 — agenda: "vou verificar e já volto" só é aceitável sem integração real.
const PROMETEU_VERIFICAR: RegExp[] = [
  /vou (verificar|checar|ver) (a )?(agenda|disponibilidade)[^.?!]{0,30}(e (te )?(retorno|aviso|falo)|depois)/i,
  /(te )?(retorno|aviso|confirmo) (depois|mais tarde|em seguida|assim que)/i,
];
export const AGENDA_INTEGRADA = !!process.env.GOOGLE_CALENDAR_TOKEN || !!process.env.AGENDA_URL;

// "Tudo bem?" é saudação, não pergunta de descoberta — não conta pra "uma
// pergunta por vez" (§9 do documento antigo, mantido: senão o padrão de
// abertura recomendado pelo próprio V3 — "Boa tarde! Tudo bem?" — se puniria
// sozinho).
const SAUDACOES_INTERROGATIVAS = /\b(tudo bem|tudo certo|tudo joia|como vai|como voc[êe] est[áa]|beleza|td bem)\s*\?/gi;
export function semSaudacoes(texto: string): string {
  return texto.replace(SAUDACOES_INTERROGATIVAS, "");
}
export function contaPerguntas(texto: string): number {
  return (semSaudacoes(texto).match(/\?/g) || []).length;
}

// ===== HARD RULE (mantida do sistema antigo — não conflita com nada do V3):
// nunca afirmar que viu/analisou/acompanhou algo que não está no CRM. Isso
// já causou incidente real ("acompanhamos o perfil de vocês no Instagram" pra
// lead sem Instagram cadastrado — confiança quebrada em 20 segundos).
const VERBO_OBSERVACAO = String.raw`(vi|olhei|analis(?:ei|amos)|acompanh(?:ei|amos|ando)|repar(?:ei|amos)|not(?:ei|amos)|pesquis(?:ei|amos)|conferi|dei uma olhada|estive olhando|andei vendo|observ(?:ei|amos))`;
const CANAIS_OBSERVAVEIS: { chave: "instagram" | "website" | "marketplace"; re: RegExp; nome: string }[] = [
  { chave: "instagram", re: new RegExp(String.raw`${VERBO_OBSERVACAO}[^.?!]{0,80}(instagram|insta\b|perfil de voc[êe]s|perfil da)`, "i"), nome: "Instagram" },
  { chave: "website", re: new RegExp(String.raw`${VERBO_OBSERVACAO}[^.?!]{0,80}(site|website|loja virtual|p[áa]gina de voc[êe]s)`, "i"), nome: "site" },
  { chave: "marketplace", re: new RegExp(String.raw`${VERBO_OBSERVACAO}[^.?!]{0,80}(mercado livre|amazon|shopee|marketplace|an[úu]ncios de voc[êe]s|sua loja no)`, "i"), nome: "marketplace" },
];
const PESQUISA_GENERICA = new RegExp(
  String.raw`${VERBO_OBSERVACAO}[^.?!]{0,60}(a (opera[çc][ãa]o|empresa|loja|marca) de voc[êe]s|o (neg[óo]cio|trabalho) de voc[êe]s)`, "i",
);

export interface FatosDoLead {
  instagram: boolean;
  website: boolean;
  marketplace: boolean;
  qualquerDado: boolean;
}

// §14/§24 — nunca inventar case, número de mercado ou promessa de resultado.
const BENCHMARK_INVENTADO: RegExp[] = [
  /normalmente,? (as )?empresas/i,
  /empresas (como a sua|desse (tipo|porte)|do seu segmento)/i,
  /(em|na) m[ée]dia,? (o|a|as|os)? ?(mercado|setor|empresas)/i,
  /a m[ée]dia do (mercado|setor)/i,
  /costumam? (perder|ganhar|deixar|girar)/i,
  /benchmark/i,
  /geralmente conseguimos/i,
  /normalmente conseguimos/i,
];
const PROMESSA_ROI: RegExp[] = [
  /garanto (um |o )?(retorno|roi|resultado|faturamento)/i,
  /voc[êe] vai (faturar|vender|lucrar) \+?\s*R\$/i,
  /(dobrar|triplicar) (o |seu |suas |as )?(faturamento|vendas|margem)/i,
  /roi (de|garantido)\s*\d/i,
  /vaga limitada|[úu]ltimas vagas|apenas hoje/i, // §24: nunca afirmar urgência/vaga que não existe
];

export interface GuardContext {
  reply: string;
  historico: ConversationMsg[]; // conversa até agora (lead + ia)
  incoming: string; // última fala do lead
  primeiraMensagem: boolean;
  pacotes: ServicePackage[]; // catálogo ativo — os preços "de verdade" que podem ser citados
  fatos: FatosDoLead;
}

export interface GuardResult {
  ok: boolean;
  violacoes: string[];
  bloqueiaEnvio: boolean;
}

export function numerosDoLead(historico: ConversationMsg[], incoming: string): number[] {
  const texto = [...historico.filter((m) => m.role === "lead").map((m) => m.text), incoming].join(" ");
  const out: number[] = [];
  const re = /(\d[\d.\s]*(?:,\d+)?)\s*(mil|k|milh(?:ão|oes|ões))?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto))) {
    const bruto = m[1].replace(/[.\s]/g, "").replace(",", ".");
    let n = Number(bruto);
    if (!isFinite(n)) continue;
    const mult = (m[2] || "").toLowerCase();
    if (mult === "mil" || mult === "k") n *= 1000;
    else if (mult.startsWith("milh")) n *= 1_000_000;
    if (n > 0) out.push(n);
  }
  return out;
}

export function valoresCitados(reply: string): number[] {
  const out: number[] = [];
  const re = /R\$\s*([\d.]+(?:,\d+)?)\s*(mil|milh(?:ão|ões|oes))?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(reply))) {
    let n = Number(m[1].replace(/\./g, "").replace(",", "."));
    const mult = (m[2] || "").toLowerCase();
    if (mult === "mil") n *= 1000;
    else if (mult.startsWith("milh")) n *= 1_000_000;
    if (isFinite(n) && n > 0) out.push(n);
  }
  return out;
}

function percentuaisCitados(reply: string): number[] {
  const out: number[] = [];
  const re = /(\d+(?:[.,]\d+)?)\s*%/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(reply))) out.push(Number(m[1].replace(",", ".")));
  return out;
}

const TOLERANCIA = 0.05;
function derivados(base: number[]): number[] {
  const out = new Set<number>();
  const fatores = [1, 2, 3, 4, 6, 12, 52, 0.5];
  for (const a of base) {
    for (const f of fatores) { out.add(a * f); out.add(a / f); }
    for (const b of base) { out.add(a * b); out.add(a + b); out.add(Math.abs(a - b)); }
  }
  return [...out].filter((n) => isFinite(n) && n > 0);
}
function pertoDe(n: number, permitidos: number[]): boolean {
  const variantes = [n, n * 1000, n / 1000];
  return permitidos.some((p) => variantes.some((v) => Math.abs(v - p) <= Math.max(1, p * TOLERANCIA)));
}

// Todo preço oficial do catálogo (referência, fundador, FOB%, valor de
// crédito) — V3 §18 libera citar isso a qualquer momento, não só depois de um
// gate. O que continua proibido é número que não veio nem do lead nem daqui.
function precosDoCatalogo(pacotes: ServicePackage[]): number[] {
  const out: number[] = [];
  for (const p of pacotes) {
    if (!p.ocultarPreco && p.precoRef) out.push(p.precoRef);
    if (p.precoFundador) out.push(p.precoFundador);
    if (p.percentualFOB) out.push(p.percentualFOB);
    if (p.creditoJanelaDias) out.push(p.creditoJanelaDias);
  }
  return out;
}

export function checarResposta(ctx: GuardContext): GuardResult {
  const v: string[] = [];
  let bloqueia = false;
  const { reply } = ctx;

  for (const canal of CANAIS_OBSERVAVEIS) {
    if (canal.re.test(reply) && !ctx.fatos[canal.chave]) {
      v.push(`OBSERVAÇÃO INVENTADA: afirmou ter visto/analisado o ${canal.nome} do lead, e não temos esse dado no cadastro`);
      bloqueia = true;
    }
  }
  if (PESQUISA_GENERICA.test(reply) && !ctx.fatos.qualquerDado) {
    v.push("OBSERVAÇÃO INVENTADA: afirmou ter analisado a operação do lead sem nenhum dado público confirmado");
    bloqueia = true;
  }

  for (const re of SE_PASSA_POR_IAGO) {
    if (re.test(reply)) {
      v.push("identidade: se apresentou COMO o Iago — você fala em nome dele, não como ele");
      bloqueia = true;
      break;
    }
  }

  for (const re of BENCHMARK_INVENTADO) {
    if (re.test(reply)) { v.push("§14/§24: benchmark/estatística de mercado ou urgência inventada"); bloqueia = true; break; }
  }
  for (const re of PROMESSA_ROI) {
    if (re.test(reply)) { v.push("§24: promessa de retorno/resultado garantido"); bloqueia = true; break; }
  }

  // Dinheiro: catálogo oficial, número que o lead deu, ou conta derivada dos dois.
  const doLead = numerosDoLead(ctx.historico, ctx.incoming);
  const doCatalogo = precosDoCatalogo(ctx.pacotes);
  const permitidos = [...doCatalogo, ...doLead, ...derivados([...doLead, ...doCatalogo])];
  for (const n of valoresCitados(reply)) {
    if (n >= 100 && !pertoDe(n, permitidos)) {
      v.push(`§14: valor R$ ${n.toLocaleString("pt-BR")} não veio do lead nem do catálogo oficial`);
      bloqueia = true;
    }
  }
  const pctLead = new Set(percentuaisCitados([...ctx.historico.filter((m) => m.role === "lead").map((m) => m.text), ctx.incoming].join(" ")));
  const pctCatalogo = new Set(ctx.pacotes.map((p) => p.percentualFOB).filter((n): n is number => !!n));
  for (const p of percentuaisCitados(reply)) {
    if (!pctLead.has(p) && !pctCatalogo.has(p)) { v.push(`§14: percentual ${p}% não veio do lead nem do catálogo`); bloqueia = true; }
  }

  // §6 — preço do Premium é sob consulta; nunca revelar um número pra ele.
  const premium = ctx.pacotes.find((p) => p.code === "premium");
  if (premium?.ocultarPreco && new RegExp(`(premium|acompanhamento estrat[ée]gico)[^.?!]{0,80}R\\$`, "i").test(reply)) {
    v.push("§6: revelou valor do Acompanhamento Estratégico Executivo — esse preço é sob consulta, não divulgar sem autorização do Iago");
    bloqueia = true;
  }

  const perguntas = contaPerguntas(reply);
  if (perguntas > 1) v.push(`§3: ${perguntas} perguntas na mesma mensagem — mande uma só`);

  for (const re of SOLUCAO_AFIRMATIVA) {
    if (re.test(reply)) {
      v.push("§4: apresentou hipótese como certeza — use linguagem de possibilidade (\"pode ser X, Y ou Z\"), nunca afirme antes de olhar os números");
      break;
    }
  }

  if (AGENDA_INTEGRADA) {
    for (const re of PROMETEU_VERIFICAR) {
      if (re.test(reply)) {
        v.push("§23: a integração de agenda está ativa — consulte a disponibilidade AGORA e ofereça horário concreto, não prometa retorno");
        bloqueia = true;
        break;
      }
    }
  }

  const pediuDetalhe = /escopo|proposta|como funciona|quem [ée] (o )?iago|me explica|detalh|programas?( e)? pre[çc]os?/i.test(ctx.incoming);
  if (!pediuDetalhe && reply.length > 700) v.push(`§2: mensagem longa (${reply.length} caracteres) — prefira curta a média`);

  return { ok: v.length === 0, violacoes: v, bloqueiaEnvio: bloqueia };
}

// Último recurso da identidade: substituição literal, não geração.
export function corrigirIdentidade(reply: string): string {
  const trocado = reply
    .replace(/\b(sou|aqui (é|e))\s+o\s+iago\s+rodrigues\b/gi, "trabalho com o Iago Rodrigues")
    .replace(/\b(sou|aqui (é|e))\s+o\s+iago\b/gi, "trabalho com o Iago")
    .replace(/\bsou\s+iago\s+rodrigues\b/gi, "trabalho com o Iago Rodrigues")
    .replace(/\bsou\s+iago\b/gi, "trabalho com o Iago")
    .replace(/\b(meu nome (é|e)|me chamo)\s+iago(\s+rodrigues)?\b/gi, "sou o assistente comercial do Iago Rodrigues");
  return trocado.replace(/(^|[.!?]\s+|\n\s*)([a-zà-ú])/g, (_, antes: string, letra: string) => antes + letra.toUpperCase());
}

// Resposta de emergência: se o modelo insistir em furar um gate bloqueante
// (preço inventado, identidade), a máquina responde sozinha.
export function respostaDeSeguranca(): string {
  return "Deixa eu ser preciso antes de continuar — não quero te passar um número que eu não tenha certeza. Me dá um instante que eu confirmo e te respondo.";
}

// Guardas de saída do agente Vendedor — o que o modelo escreveu passa por aqui
// ANTES de virar mensagem. Regra do Prompt Mestre não obedecida é regra que não
// existe; estas funções transformam as proibições (§7, §9, §15, §38) em código.

import type { ConversationMsg, DiscoverySlot, SdrState } from "./types";
import { DISCOVERY_ORDER } from "./types";
import { confirmed, PERGUNTA_AO_LEAD, PERGUNTAS_MAX, podeAgendar, precoModo, proximoSlot } from "./sdr-state";

// §9 — aberturas que queimam o primeiro contato.
const ABERTURAS_PROIBIDAS: RegExp[] = [
  /^\s*(ol[áa]|oi|bom dia|boa tarde|boa noite)[,!.\s]*(tudo bem|tudo certo|como vai)\s*\??\s*$/im,
  /espero que (esta mensagem )?(te )?encontre bem/i,
  /gostaria de (me )?apresentar/i,
  /somos especialistas/i,
  /tenho uma solu[çc][ãa]o para (a )?sua empresa/i,
  /podemos (agendar|marcar) (uns? )?30 minutos/i,
  /apresentar (os )?nossos servi[çc]os/i,
];

// Identidade: o agente fala EM NOME do Iago, nunca COMO o Iago. Se ele se passa
// pelo Iago, o handoff do fechamento fica incoerente (o Iago apresentando o
// Iago) — e o lead descobre a troca no meio da negociação.
const SE_PASSA_POR_IAGO: RegExp[] = [
  /\b(sou|aqui (é|e)) o iago\b/i,
  /\bsou iago\b/i,
  /\bmeu nome (é|e) iago\b/i,
  /\b(eu )?me chamo iago\b/i,
  /\bfala(ndo)? com o iago aqui\b/i,
];

// Correção §9 — o lead cansou do interrogatório. Quando isso aparece, o roteiro
// PARA: resumir, dar percepção, explicar o próximo passo.
const SINAIS_DE_FADIGA: RegExp[] = [
  /onde (voc[êe] )?quer chegar/i,
  /(quanta|muita)s? pergunta/i,
  /isso (t[áa]|est[áa]) (cansativo|chato|demorado)/i,
  /vai(\s+)?(direto )?ao ponto/i,
  /vamos (direto )?ao ponto/i,
  /sem enrola[çc][ãa]o/i,
  /para que (tanta|essas) pergunta/i,
  /[ée] um question[áa]rio/i,
  /interrogat[óo]rio/i,
];

export function detectaFadiga(texto: string): boolean {
  return SINAIS_DE_FADIGA.some((re) => re.test(texto));
}

// Perguntar "por onde exatamente você chegou?" é informação de MARKETING, não
// prioridade comercial. Ele já chegou — converse com ele.
const PERGUNTA_DE_ATRIBUICAO: RegExp[] = [
  /por onde (exatamente )?(voc[êe] )?(chegou|nos achou|me achou|encontrou)/i,
  /como (voc[êe] )?(chegou at[ée]|nos (achou|encontrou|conheceu)|soube da gente)/i,
  /onde (voc[êe] )?(viu|conheceu) (a gente|o iago|nosso trabalho)/i,
  /qual (canal|rede) (voc[êe] )?(usou|veio)/i,
];

// Solução apresentada como certeza antes de validar volume/estrutura.
// "a importação direta é o caminho que abre mais margem" → afirmativo demais.
const SOLUCAO_AFIRMATIVA: RegExp[] = [
  /(normalmente |geralmente )?o caminho que (abre|traz|gera) mais margem [ée]/i,
  /(a|o) \w+ (direta|direto) (vai|irá) (resolver|abrir|aumentar)/i,
  /(voc[êe] )?precisa (mesmo )?[ée] (de |da |do )/i,
  /a solu[çc][ãa]o (aqui )?[ée]/i,
  /o que (vai|irá) resolver isso [ée]/i,
  /com certeza (vai|irá) (resolver|funcionar|dar certo)/i,
];

// Quando a agenda está integrada, "vou verificar e te retorno" é inaceitável.
const PROMETEU_VERIFICAR: RegExp[] = [
  /vou (verificar|checar|ver) (a )?(agenda|disponibilidade)[^.?!]{0,30}(e (te )?(retorno|aviso|falo)|depois)/i,
  /(te )?(retorno|aviso|confirmo) (depois|mais tarde|em seguida|assim que)/i,
  /vou (falar|alinhar) com o iago e (te )?(retorno|aviso)/i,
];

export const AGENDA_INTEGRADA = !!process.env.GOOGLE_CALENDAR_TOKEN || !!process.env.AGENDA_URL;

// "Tudo bem?" é saudação, não pergunta de descoberta. A própria Correção §10
// prescreve "Boa tarde! Tudo bem? O que te fez procurar o Iago?" — contar isso
// como duas perguntas puniria o comportamento correto.
const SAUDACOES_INTERROGATIVAS = /\b(tudo bem|tudo certo|tudo joia|como vai|como voc[êe] est[áa]|beleza|td bem)\s*\?/gi;

export function semSaudacoes(texto: string): string {
  return texto.replace(SAUDACOES_INTERROGATIVAS, "");
}

// Quantas perguntas DE VERDADE a mensagem faz.
export function contaPerguntas(texto: string): number {
  return (semSaudacoes(texto).match(/\?/g) || []).length;
}

// Correção §2, §8, §12 — minúcia financeira que NÃO se pergunta no chat.
// Estas perguntas pertencem à reunião; no WhatsApp viram auditoria.
const MINUCIA_FINANCEIRA: RegExp[] = [
  /qual (a |sua |o )?(sua )?margem( de contribui[çc][ãa]o)?\s*(hoje|atual|m[ée]dia)?\s*\?/i,
  /qual (o |seu )?custo (unit[áa]rio|do produto|de aquisi[çc][ãa]o)/i,
  /quanto (voc[êe] )?paga de (comiss[ãa]o|imposto|frete)/i,
  /qual (a |o )?(al[íi]quota|comiss[ãa]o|taxa) (do|da|de)/i,
  /qual (o |seu )?(ticket m[ée]dio|cmv|markup)/i,
  /qual (o |seu )?(giro|prazo m[ée]dio|ciclo) (de|do|m[ée]dio)/i,
  /quanto (voc[êe]s? )?(mant[êe]m|t[êe]m) imobilizado/i,
  /qual (o |seu )?capital de giro/i,
];

// ===== HARD RULE: nunca afirmar que viu/analisou/acompanhou algo que não temos
// no CRM. Inventar "acompanhamos o perfil de vocês no Instagram" quando o lead
// nem tem Instagram destrói a confiança em 20 segundos e não tem volta. Esta é a
// regra mais cara de violar em toda a máquina.

// Verbos de observação: "vi", "analisei", "acompanhei", "reparei", "pesquisei"…
const VERBO_OBSERVACAO = String.raw`(vi|olhei|analis(?:ei|amos)|acompanh(?:ei|amos|ando)|repar(?:ei|amos)|not(?:ei|amos)|pesquis(?:ei|amos)|conferi|dei uma olhada|estive olhando|andei vendo|observ(?:ei|amos))`;

// Cada canal só pode ser citado como "observado" se existir no cadastro.
const CANAIS_OBSERVAVEIS: { chave: "instagram" | "website" | "marketplace"; re: RegExp; nome: string }[] = [
  { chave: "instagram", re: new RegExp(String.raw`${VERBO_OBSERVACAO}[^.?!]{0,80}(instagram|insta\b|perfil de voc[êe]s|perfil da)`, "i"), nome: "Instagram" },
  { chave: "website", re: new RegExp(String.raw`${VERBO_OBSERVACAO}[^.?!]{0,80}(site|website|loja virtual|p[áa]gina de voc[êe]s)`, "i"), nome: "site" },
  { chave: "marketplace", re: new RegExp(String.raw`${VERBO_OBSERVACAO}[^.?!]{0,80}(mercado livre|amazon|shopee|marketplace|an[úu]ncios de voc[êe]s|sua loja no)`, "i"), nome: "marketplace" },
];

// Afirmações de pesquisa genérica ("analisamos a operação de vocês").
const PESQUISA_GENERICA = new RegExp(
  String.raw`${VERBO_OBSERVACAO}[^.?!]{0,60}(a (opera[çc][ãa]o|empresa|loja|marca) de voc[êe]s|o (neg[óo]cio|trabalho) de voc[êe]s)`, "i",
);

export interface FatosDoLead {
  instagram: boolean;
  website: boolean;
  marketplace: boolean;
  qualquerDado: boolean; // temos ALGUM dado público confirmado?
}

// §7 e §15 — linguagem de benchmark inventado.
const BENCHMARK_INVENTADO: RegExp[] = [
  /normalmente,? (as )?empresas/i,
  /empresas (como a sua|desse (tipo|porte)|do seu segmento)/i,
  /(em|na) m[ée]dia,? (o|a|as|os)? ?(mercado|setor|empresas)/i,
  /a m[ée]dia do (mercado|setor)/i,
  /costumam? (perder|ganhar|deixar|girar)/i,
  /benchmark/i,
  /o mercado (todo|inteiro) (perde|ganha)/i,
  /geralmente conseguimos/i,
  /normalmente conseguimos/i,
];

// §15 — promessa de retorno.
const PROMESSA_ROI: RegExp[] = [
  /garanto (um |o )?(retorno|roi|resultado)/i,
  /voc[êe] vai (faturar|vender|lucrar) \+?\s*R\$/i,
  /(dobrar|triplicar) (o |seu |suas |as )?(faturamento|vendas|margem)/i,
  /roi (de|garantido)\s*\d/i,
];

export interface GuardContext {
  state: SdrState;
  reply: string;
  historico: ConversationMsg[]; // conversa até agora (lead + ia)
  incoming: string; // última fala do lead
  primeiraMensagem: boolean;
  precosPermitidos: number[]; // valores que PODEM aparecer (pacote candidato + conta do payback)
  soPergunta: boolean; // a resposta é só pergunta, sem reconhecimento nem percepção
  fatos: FatosDoLead; // o que REALMENTE temos no cadastro
}

export interface GuardResult {
  ok: boolean;
  violacoes: string[];
  bloqueiaEnvio: boolean; // true = não dá pra só avisar, tem que reescrever
}

// Todos os números "de dinheiro" que o LEAD já disse — a única base factual
// que a IA tem permissão de citar além do catálogo (§7).
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

// Valores em R$ citados na resposta da IA.
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

// Percentuais citados — só valem se vieram do lead (§7: nada de "8% a 15%").
function percentuaisCitados(reply: string): number[] {
  const out: number[] = [];
  const re = /(\d+(?:[.,]\d+)?)\s*%/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(reply))) out.push(Number(m[1].replace(",", ".")));
  return out;
}

// A IA está perguntando de novo algo que o lead já respondeu? (§38)
const PADRAO_PERGUNTA: Partial<Record<DiscoverySlot, RegExp>> = {
  situacao: /qual (é )?(o )?(seu|o) faturamento|quanto voc[êe]s? fatura|o que voc[êe]s? vende/i,
  problema: /qual (é )?(o )?(seu |o )?(principal )?problema|o que n[ãa]o (est[áa] )?funciona/i,
  prioridade: /(isso )?[ée] (uma )?prioridade/i,
  decisao: /quem (decide|toma a decis[ãa]o)/i,
  capacidade: /voc[êe]s? t[êe]m equipe/i,
};

const TOLERANCIA = 0.05; // 5% — "R$ 3,3 mil" arredonda 3.333

// §15 manda CONSTRUIR A CONTA com os números do lead. Então multiplicar,
// somar e anualizar o que ele disse é permitido — o proibido é número que
// não tem origem nenhuma. Aqui a gente deriva o que seria legítimo.
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
  // compara também trocando de ordem de grandeza (o modelo escreve "R$ 150"
  // querendo dizer "R$ 150 mil" com frequência)
  const variantes = [n, n * 1000, n / 1000];
  return permitidos.some((p) =>
    variantes.some((v) => Math.abs(v - p) <= Math.max(1, p * TOLERANCIA)),
  );
}

export function checarResposta(ctx: GuardContext): GuardResult {
  const v: string[] = [];
  let bloqueia = false;
  const { reply, state } = ctx;
  const modo = precoModo(state);

  if (ctx.primeiraMensagem) {
    for (const re of ABERTURAS_PROIBIDAS) {
      if (re.test(reply)) { v.push(`§9: abertura proibida (${re.source.slice(0, 40)}…)`); bloqueia = true; }
    }
  }

  // HARD RULE — observação inventada. Só pode dizer que viu o que existe no CRM.
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
    if (re.test(reply)) { v.push("§7: benchmark/estatística de mercado sem fonte"); bloqueia = true; break; }
  }
  for (const re of PROMESSA_ROI) {
    if (re.test(reply)) { v.push("§15: promessa de retorno/ROI"); bloqueia = true; break; }
  }

  // Dinheiro: só pode citar valor do catálogo liberado, a conta do payback, ou
  // número que o próprio lead deu.
  const doLead = numerosDoLead(ctx.historico, ctx.incoming);
  const permitidos = [...ctx.precosPermitidos, ...doLead, ...derivados([...doLead, ...ctx.precosPermitidos])];
  for (const n of valoresCitados(reply)) {
    if (n >= 100 && !pertoDe(n, permitidos)) {
      v.push(`§7: valor R$ ${n.toLocaleString("pt-BR")} não veio do lead nem do catálogo`);
      bloqueia = true;
    }
  }

  // Preço antes da hora (§21) — o gate mais importante.
  if (modo === "bloqueado" && valoresCitados(reply).some((n) => n >= 500 && !pertoDe(n, doLead))) {
    v.push("§21: preço/oferta antes do diagnóstico estar pronto");
    bloqueia = true;
  }

  // Percentual que o lead não citou.
  const pctLead = new Set(percentuaisCitados([...ctx.historico.filter((m) => m.role === "lead").map((m) => m.text), ctx.incoming].join(" ")));
  for (const p of percentuaisCitados(reply)) {
    if (!pctLead.has(p)) { v.push(`§7: percentual ${p}% não foi informado pelo lead`); bloqueia = true; }
  }

  // §38: não repetir pergunta já respondida.
  for (const slot of DISCOVERY_ORDER) {
    const re = PADRAO_PERGUNTA[slot];
    if (re && confirmed(state.discovery[slot]) && re.test(reply)) {
      v.push(`§38: perguntou de novo sobre "${slot}" — o lead já respondeu (${state.discovery[slot].valor ?? ""})`);
    }
  }

  // §39/§40: uma pergunta por vez (saudação não conta).
  const perguntas = contaPerguntas(reply);
  if (perguntas > 1) v.push(`§39: ${perguntas} perguntas na mesma mensagem — mande uma só`);

  // ---- Correção Prioritária: o chat não é a consultoria --------------------

  // §9: o lead reclamou. Não dá pra continuar o roteiro nem fazer nova pergunta
  // de descoberta — tem que resumir, dar percepção e propor o próximo passo.
  if (state.fadigaDetectada && perguntas > 0 && !/reuni[ãa]o|conversa com o iago|faz sentido|te chamo|agendar/i.test(reply)) {
    v.push("§9: o lead sinalizou cansaço — pare o roteiro, resuma, dê uma percepção e proponha o próximo passo");
    bloqueia = true;
  }

  // §2/§8/§12: minúcia financeira é assunto de reunião, não de WhatsApp.
  for (const re of MINUCIA_FINANCEIRA) {
    if (re.test(reply)) {
      v.push("§2/§12: pergunta de auditoria financeira (margem/custo/comissão/giro) — isso é da reunião, não do chat");
      bloqueia = true;
      break;
    }
  }

  // §6: pergunta → pergunta → pergunta é robô. Precisa entregar valor no meio.
  if (perguntas > 0 && ctx.soPergunta && state.turnosSoPergunta >= 1) {
    v.push("§6: duas perguntas seguidas sem entregar nada — reconheça o que ele disse e dê uma percepção antes de perguntar");
  }

  // §3/§19: estourou o orçamento e ainda está investigando.
  if (perguntas > 0 && state.perguntasFeitas >= PERGUNTAS_MAX && !podeAgendar(state)) {
    v.push(`§3: ${state.perguntasFeitas} perguntas já feitas — pare de investigar e conduza para o próximo passo`);
  }

  // §7/§18: não convide para a reunião sem ter entregue nenhuma leitura útil.
  // (confere o estado JÁ atualizado com este turno — a percepção pode vir na
  // mesma mensagem do convite, e isso é correto)
  const temPercepcaoAgora = state.percepcaoEntregue || !ctx.soPergunta;
  if (!temPercepcaoAgora && /reuni[ãa]o|conversa com o iago|agendar|marcar (um|uma)/i.test(reply)) {
    v.push("§18: convidou para a reunião sem ter entregue nenhuma percepção útil antes");
  }

  // Atribuição é assunto de marketing, não de venda.
  for (const re of PERGUNTA_DE_ATRIBUICAO) {
    if (re.test(reply)) {
      v.push("atribuição: perguntou por onde o lead chegou — isso é dado de marketing, não prioridade comercial. Ele já chegou; converse com ele");
      bloqueia = true;
      break;
    }
  }

  // Solução afirmada como certeza antes de validar volume e estrutura.
  for (const re of SOLUCAO_AFIRMATIVA) {
    if (re.test(reply)) {
      v.push("hipótese≠certeza: apresentou a solução como fato. Use linguagem de hipótese econômica a validar (\"pode abrir espaço de margem — o ponto é descobrir se o volume e a estrutura justificam\")");
      break;
    }
  }

  // Agenda integrada: consultar agora, não prometer retorno.
  if (AGENDA_INTEGRADA) {
    for (const re of PROMETEU_VERIFICAR) {
      if (re.test(reply)) {
        v.push("agenda: a integração está ativa — consulte a disponibilidade AGORA e ofereça horários concretos, não prometa retorno");
        bloqueia = true;
        break;
      }
    }
  }

  // §40: mensagem de WhatsApp curta, salvo quando o lead pediu explicação.
  const pediuDetalhe = /escopo|proposta|como funciona|quem [ée] (o )?iago|me explica|detalh/i.test(ctx.incoming);
  if (!pediuDetalhe && reply.length > 700) v.push(`§40: mensagem longa (${reply.length} caracteres)`);

  return { ok: v.length === 0, violacoes: v, bloqueiaEnvio: bloqueia };
}

// Último recurso da identidade: se depois da correção o modelo AINDA se
// apresentar como o Iago, a máquina reescreve a frase em vez de deixar passar.
// É substituição literal, não geração — não inventa conteúdo novo.
export function corrigirIdentidade(reply: string): string {
  const trocado = reply
    .replace(/\b(sou|aqui (é|e))\s+o\s+iago\s+rodrigues\b/gi, "trabalho com o Iago Rodrigues")
    .replace(/\b(sou|aqui (é|e))\s+o\s+iago\b/gi, "trabalho com o Iago")
    .replace(/\bsou\s+iago\s+rodrigues\b/gi, "trabalho com o Iago Rodrigues")
    .replace(/\bsou\s+iago\b/gi, "trabalho com o Iago")
    .replace(/\b(meu nome (é|e)|me chamo)\s+iago(\s+rodrigues)?\b/gi, "sou o consultor comercial do Iago Rodrigues");
  // a troca pode deixar minúscula no começo da frase ("Boa tarde. trabalho com…")
  return trocado.replace(/(^|[.!?]\s+|\n\s*)([a-zà-ú])/g, (_, antes: string, letra: string) => antes + letra.toUpperCase());
}

// Resposta de emergência: se o modelo insistir em furar o gate de preço, a
// máquina responde sozinha, no padrão certo — desvia pro diagnóstico (§15/§22).
export function respostaDeSeguranca(state: SdrState): string {
  const slot = (proximoSlot(state) ?? "impacto") as DiscoverySlot;
  return (
    "Antes de falar em valor eu preciso entender melhor a operação — se eu jogar um número agora, " +
    "seria chute, e eu não recomendo projeto que não se pague. " +
    PERGUNTA_AO_LEAD[slot].charAt(0).toUpperCase() + PERGUNTA_AO_LEAD[slot].slice(1)
  );
}

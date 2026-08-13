// Copywriter — porte de packages/agents/copywriter.py (seções 6.4 e 8).
// Cada mensagem precisa carregar um fato real + oportunidade específica.
import type { Lead } from "./types";

// A primeira mensagem vende A PRÓXIMA RESPOSTA, não o programa (§9). Estrutura
// obrigatória do outbound (§8): contexto → observação real → hipótese → UMA
// pergunta curta. Nada de "eu atuo em...", "somos especialistas" ou pedido de
// reunião logo de cara: a autoridade tem que aparecer na qualidade da
// observação, não na autopromoção (§4).
export const TEMPLATES: Record<string, string> = {
  contato_inicial:
    "{nome}, olhei a operação da {empresa} em {canal_ou_categoria} e reparei em " +
    "um ponto: {fato_objetivo}. Isso normalmente tem duas explicações bem " +
    "diferentes — ou é escolha de estratégia, ou é gargalo de operação — e cada " +
    "uma tem um efeito distinto na margem. Qual das duas é o caso de vocês?",
  // Follow-up NUNCA é "passando pra saber se viu" (§27): carrega hipótese nova.
  followup_1:
    "{nome}, continuei pensando na {empresa}. O ponto que mais me chamou atenção " +
    "foi {oportunidade}. A hipótese que eu levantaria é que o gargalo não está no " +
    "anúncio, e sim antes dele — no giro e na reposição. Isso faz sentido na " +
    "realidade de vocês ou estou olhando para o lugar errado?",
  followup_2:
    "{nome}, ficou uma dúvida minha sobre {canal_ou_categoria}: hoje alguém olha " +
    "de forma integrada para vendas, giro, estoque e caixa na {empresa}, ou cada " +
    "área decide separado? Pergunto porque, quando isso está separado, o " +
    "resultado do canal costuma ser decidido fora do canal.",
  encerramento:
    "{nome}, vou encerrar meus contatos por aqui para não ser inconveniente. Se " +
    "essa frente voltar a ser prioridade para a {empresa}, o diagnóstico continua " +
    "fazendo sentido e é só me chamar.",
};

const FORBIDDEN = [
  "somos uma agência",
  "quero apresentar meus serviços",
  "parabéns pelo excelente trabalho",
  "empresa incrível",
  "vamos multiplicar seu faturamento",
  "garanto que vai vender mais",
  "essa é uma oportunidade única",
  "só até hoje",
  "últimas vagas",
  "não perca essa chance",
  // §9 — aberturas que queimam o primeiro contato
  "espero que esta mensagem",
  "espero que esteja bem",
  "gostaria de apresentar",
  "somos especialistas",
  "tenho uma solução para sua empresa",
  "podemos agendar 30 minutos",
  "podemos marcar 30 minutos",
  // §27 — follow-up sem valor
  "passando para saber se viu",
  "passando pra saber se viu",
  "só passando para saber",
  "conseguiu ver minha mensagem",
  "alguma novidade sobre minha mensagem",
];

const MAX_CHARS = 700;

export interface LintResult { ok: boolean; problems: string[]; }

export function lintMessage(text: string, requiresNamedFact = true): LintResult {
  const problems: string[] = [];
  const low = text.toLowerCase();
  for (const p of FORBIDDEN) if (low.includes(p)) problems.push(`contém frase proibida: '${p}'`);
  if (text.length > MAX_CHARS) problems.push(`mensagem longa demais (${text.length}/${MAX_CHARS})`);
  if (text.includes("{") || text.includes("}")) problems.push("template com placeholder não preenchido");
  if (requiresNamedFact && !looksSpecific(text)) problems.push("mensagem parece genérica: sem fato/nome específico");
  return { ok: problems.length === 0, problems };
}

function looksSpecific(text: string): boolean {
  const words = text.replace(/[.,]/g, " ").split(/\s+/);
  const stop = new Set(["mercado", "livre", "amazon", "shopee", "eu"]);
  return words.some((w, i) => i > 0 && /^[A-ZÀ-Ý]/.test(w) && !stop.has(w.toLowerCase()));
}

export function buildMessage(step: string, lead: Lead): { text: string; lint: LintResult } {
  const tpl = TEMPLATES[step];
  if (!tpl) throw new Error(`etapa de cadência desconhecida: ${step}`);
  const fields: Record<string, string> = {
    nome: lead.contato_nome || "tudo bem",
    empresa: lead.empresa,
    canal_ou_categoria: lead.canal_ou_categoria || lead.segmento,
    fato_objetivo: lead.fato_objetivo || "há espaço para estruturar melhor os canais",
    oportunidade: lead.oportunidade || lead.fato_objetivo || "estruturar o canal preservando margem",
  };
  const text = tpl.replace(/\{(\w+)\}/g, (_, k) => fields[k] ?? `{${k}}`);
  return { text, lint: lintMessage(text) };
}

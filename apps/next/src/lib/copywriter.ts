// Copywriter — porte de packages/agents/copywriter.py (seções 6.4 e 8).
// Cada mensagem precisa carregar um fato real + oportunidade específica.
import type { Lead } from "./types";

export const TEMPLATES: Record<string, string> = {
  contato_inicial:
    "Olá, {nome}. Analisei rapidamente a presença digital da {empresa} e " +
    "encontrei uma oportunidade específica em {canal_ou_categoria}. Vocês têm " +
    "um catálogo com boa aderência a marketplace, mas hoje {fato_objetivo}. Eu " +
    "atuo na implantação e escala de Mercado Livre, Amazon e Shopee, olhando " +
    "margem, estoque, logística e operação. Posso te enviar um diagnóstico bem " +
    "curto com os três pontos que identifiquei?",
  followup_1:
    "{nome}, complementando a mensagem anterior: o principal ponto que " +
    "identifiquei foi {oportunidade}. Não estou falando de simplesmente " +
    "cadastrar produtos, mas de estruturar o canal para não perder margem e não " +
    "criar um problema operacional. Faz sentido eu te mandar o diagnóstico?",
  followup_2:
    "Preparei um resumo da {empresa} com os pontos que identifiquei em " +
    "{canal_ou_categoria}: {oportunidade}. Caso marketplace esteja entre as " +
    "prioridades deste semestre, consigo te explicar em uma conversa objetiva " +
    "como eu estruturaria isso.",
  encerramento:
    "{nome}, vou encerrar meu contato para não ser inconveniente. Caso a " +
    "expansão em Mercado Livre, Amazon ou Shopee entre no planejamento da " +
    "{empresa}, fico à disposição para compartilhar o diagnóstico que preparei.",
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

// Agente Scout — busca de leads por nicho (seção 6.1).
//   1. Busca real (SERPER/BRAVE): pesquisa lojas do nicho, FILTRA lixo
//      (listicles/artigos/marketplaces), deduplica por domínio e anexa o CNPJ.
//   2. Gerador (sem chave): candidatos FICTÍCIOS marcados, p/ o fluxo rodar.
// Nunca inventa CNPJ/telefone real. A lacuna de marketplace e o score fino são
// calculados no passo de qualificação (qualify.ts), não aqui.
import { computeScore } from "./score";
import { upsertLead } from "./db";
import { findCnpjInText, probeSite } from "./cnpj-finder";
import { searchWeb } from "./search";
import type { Lead } from "./types";

// Executa `fn` sobre `items` com no máximo `limit` em paralelo.
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

let counter = 0;
function newId(): string {
  counter += 1;
  return `lead_${Date.now().toString(36)}_${counter.toString(36)}`;
}

function cleanCompanyName(title: string): string {
  return title.split(/[|\-–—:]/)[0].trim().slice(0, 60) || title.slice(0, 60);
}

// Nome a partir do domínio (fallback quando o título é descritivo, não a marca).
function nameFromHost(host: string): string {
  const sld = host.replace(/\.(com|net|org|ind|ltda)?\.?(br)?$/i, "").split(".").pop() ?? host;
  return sld.split(/[-_]/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || host;
}

// Título "descritivo" (frase de categoria) em vez de nome de empresa.
function looksDescriptive(title: string): boolean {
  const t = title.trim();
  if (t.split(/\s+/).length > 4) return true;
  return /\b(fabricantes?\s+de|lojas?\s+de|onde comprar|atacado de|comprar|melhores|dist[rí]buidores?\s+de)\b/i.test(t);
}

// domínio registrável (sem www) — usado p/ deduplicar e gerar id determinístico
function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}
function idFromHost(host: string): string {
  return "lead_dom_" + host.replace(/[^a-z0-9]+/g, "_").replace(/_+$/g, "");
}

// Domínios que NÃO são lojas-lead: marketplaces, redes, publishers/diretórios.
const NON_STORE_HOST = /(mercadolivre|mercadolibre|amazon\.|shopee|magazineluiza|magalu|americanas|casasbahia|submarino|shoptime|aliexpress|shein|olx|enjoei|elo7|instagram|facebook|linkedin|youtube|tiktok|twitter|x\.com|pinterest|wikipedia|reclameaqui|tripadvisor|globo\.|g1\.|uol\.|terra\.|ig\.com|r7\.|estadao|folha|exame|catracalivre|gov\.br|google\.|maps\.|guiamais|telelistas|solutudo|apontador|econodata|jusbrasil|indeed|catho|glassdoor|cnpj\.|casadosdados|empresascnpj|cnpjs?\.|escavador|consultasocio|ebc\.|sebrae|blogspot|wordpress\.com|medium\.|pinterest|behance)/i;
// Títulos de artigo/listicle (não é uma loja).
const LISTICLE_TITLE = /(\b\d+\s+(melhores|lojas|marcas|sites|op[çc][õo]es)\b|melhores lojas|as\s+\d+|top\s*\d+|ranking|confira|conhe[çc]a|veja\s|guia\s+d|dicas\s|onde comprar|vale a pena|review)/i;

function isStoreHit(h: { title: string; link: string }): boolean {
  const host = hostOf(h.link);
  if (!host) return false;
  if (NON_STORE_HOST.test(host)) return false;
  if (LISTICLE_TITLE.test(h.title)) return false;
  return true;
}

async function candidatesFromWeb(segmento: string, regiao: string | undefined, n: number, perfil?: string): Promise<Partial<Lead>[]> {
  // Alvo (ICP): fabricante/indústria/distribuidor/importador/atacado com marca
  // própria — não varejo iniciante. `perfil` permite mirar um tipo específico.
  const alvo = perfil ?? "fabricante OR indústria OR distribuidor OR importador";
  const q = `${alvo} ${segmento} atacado marca própria ${regiao ?? "Brasil"}`;
  // pede mais do que precisa porque boa parte é filtrada como lixo
  const hits = await searchWeb(q, Math.min(Math.max(n * 3, 15), 30));

  // filtra lixo e deduplica por domínio
  const seen = new Set<string>();
  const stores = hits.filter(isStoreHit).filter((h) => {
    const host = hostOf(h.link)!;
    if (seen.has(host)) return false;
    seen.add(host);
    return true;
  }).slice(0, n);

  // sonda o site no intake: CNPJ + pista de perfil (fábrica/atacado/importador)
  return mapLimit(stores, 5, async (h) => {
    const host = hostOf(h.link)!;
    const probe = await probeSite(h.link, { timeoutMs: 4500 });
    const cnpj = findCnpjInText(`${h.title} ${h.snippet}`) ?? probe.cnpj;
    const hint = probe.hint;
    // nome: usa o título quando parece marca; senão deriva do domínio
    const empresa = looksDescriptive(h.title) ? nameFromHost(host) : cleanCompanyName(h.title);
    return {
      id: idFromHost(host),
      empresa,
      segmento,
      cidade: regiao,
      website: `https://${host}`,
      has_website: true,
      cnpj,
      perfil_hint: hint,
      has_own_brand: hint === "industria" || hint === "marca_propria" ? true : undefined,
      // inferência conservadora: é uma loja/empresa do segmento → produto físico
      has_physical_product: true,
      canal_ou_categoria: segmento,
      fato_objetivo: "há espaço para estruturar melhor a presença em marketplaces",
      oportunidade: "estruturar o canal preservando margem",
      source: "scout_busca",
    } satisfies Partial<Lead>;
  });
}

// ---- Gerador de candidatos fictícios (marcados) ----
const NOMES_BASE: Record<string, string[]> = {
  casa: ["Casa Bela Utilidades", "Lar & Aconchego", "Móveis Rio Verde", "Decorart Ambientes", "Enxovais Primavera", "Villa Conforto", "Casa Nova Decorações", "Aroma Lar"],
  moda: ["Trama Vestuário", "Estilo Urbano Modas", "Passo Certo Calçados", "Ateliê Costura Viva", "Moda Prime Acessórios"],
  esporte: ["Movimento Fitness", "Trilha Aventura Esportes", "Força Total Suplementos"],
  pet: ["Mundo Pet Feliz", "Patas & Focinhos", "Ração Forte Distribuidora"],
  beleza: ["Essência Beauty", "Toque Natural Cosméticos", "Belíssima Cuidados"],
};
const CIDADES = [["Curitiba", "PR"], ["Goiânia", "GO"], ["Campinas", "SP"], ["Joinville", "SC"], ["Uberlândia", "MG"], ["Fortaleza", "CE"]];
const FATOS = [
  "a marca não aparece no Mercado Livre e na Amazon só há revendedores usando suas fotos",
  "os anúncios existem mas estão sem ficha técnica e com preço desalinhado ao site",
  "há presença só na Shopee, sem estrutura de catálogo no Mercado Livre",
  "o catálogo do site não está espelhado em nenhum marketplace",
];
const OPORTUNIDADES = [
  "estruturar o catálogo no Mercado Livre preservando a margem",
  "recuperar o controle da marca sobre os anúncios na Amazon",
  "padronizar fichas e preço entre site e marketplaces",
];

function pick<T>(arr: T[], i: number): T { return arr[i % arr.length]; }

function segKey(segmento: string): string {
  const s = segmento.toLowerCase();
  if (/(casa|móvel|movel|decor|enxoval|cama|mesa|banho)/.test(s)) return "casa";
  if (/(moda|vestu|calçad|calcad|acess)/.test(s)) return "moda";
  if (/(esporte|fitness|lazer)/.test(s)) return "esporte";
  if (/pet/.test(s)) return "pet";
  if (/(beleza|cosm|cuidado)/.test(s)) return "beleza";
  return "casa";
}

function generateCandidates(segmento: string, regiao: string | undefined, n: number): Partial<Lead>[] {
  const nomes = NOMES_BASE[segKey(segmento)] ?? NOMES_BASE.casa;
  const out: Partial<Lead>[] = [];
  for (let i = 0; i < n; i++) {
    const [cidade, uf] = regiao ? [regiao, ""] : pick(CIDADES, i);
    const skus = [80, 120, 45, 260, 30, 500, 15][i % 7];
    const anos = [6, 4, 9, 2, 12, 3][i % 6];
    const invest = (["alto", "medio", "baixo"] as const)[i % 3];
    const problem = (["alto", "medio", "medio", "baixo"] as const)[i % 4];
    const quality = (["ausente", "fraca", "boa"] as const)[i % 3];
    out.push({
      empresa: `${pick(nomes, i)} (FICTÍCIA)`,
      segmento,
      cidade, uf,
      website: "https://exemplo-ficticio.com.br",
      instagram: "@exemplo_ficticio",
      contato_nome: pick(["Marina", "Paulo", "Renata", "Diego", "Fernanda"], i),
      telefone: `55419${String(90000000 + i * 137).slice(0, 8)}`,
      email: `comercial${i}@exemplo-ficticio.com.br`,
      has_physical_product: true,
      catalog_size: skus,
      has_own_brand: i % 4 !== 0,
      years_active: anos,
      has_website: true,
      has_instagram: i % 3 !== 0,
      marketplace_presence: { mercado_livre: i % 2 === 0 ? false : true, amazon: false, shopee: i % 3 === 0 },
      marketplace_quality: quality,
      investment_signal: invest,
      problem_signal: problem,
      decision_maker_identified: i % 2 === 0,
      public_contact: true,
      canal_ou_categoria: segmento,
      fato_objetivo: pick(FATOS, i),
      oportunidade: pick(OPORTUNIDADES, i),
      source: "scout_gerado",
    });
  }
  return out;
}

export async function scoutByNiche(
  segmento: string,
  regiao: string | undefined,
  quantidade: number,
  perfil?: string,
): Promise<{ mode: "busca" | "gerado"; leads: Lead[] }> {
  const n = Math.max(1, Math.min(quantidade || 8, 30));
  let partials = await candidatesFromWeb(segmento, regiao, n, perfil);
  const mode: "busca" | "gerado" = partials.length ? "busca" : "gerado";
  if (!partials.length) partials = generateCandidates(segmento, regiao, n);

  const now = new Date().toISOString();
  const leads: Lead[] = [];
  for (const p of partials) {
    const base: Lead = {
      id: p.id ?? newId(),
      empresa: p.empresa ?? "Empresa sem nome",
      segmento: p.segmento ?? segmento,
      stage: "pesquisado",
      approved: false,
      opt_out: false,
      source: p.source ?? "scout",
      attempts: [],
      createdAt: now,
      updatedAt: now,
      ...p,
    };
    base.score = computeScore(base);
    // classificação inicial vira o stage sugerido (só p/ o gerador; leads de
    // busca são reclassificados no qualify, então ficam como "pesquisado")
    if (base.source === "scout_gerado") {
      if (base.score.potential === "NAO_ABORDAR") base.stage = "nao_abordar";
      else if (base.score.potential === "NUTRIR") base.stage = "nutrir";
    }
    await upsertLead(base);
    leads.push(base);
  }
  return { mode, leads };
}

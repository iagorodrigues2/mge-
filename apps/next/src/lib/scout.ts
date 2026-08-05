// Agente Scout — busca de leads por nicho (seção 6.1).
// Dois modos:
//   1. Busca real na internet — se SERPER_API_KEY (serper.dev, Google) ou
//      BRAVE_API_KEY estiver setado, pesquisa empresas do nicho de verdade.
//   2. Gerador — sem chave, gera candidatos FICTÍCIOS plausíveis (marcados),
//      para o fluxo funcionar de ponta a ponta sem depender de credencial.
// Nunca inventa CNPJ/telefone real (seção 16). Sinais não confirmados ficam
// como desconhecidos e o score os trata de forma conservadora.
import { computeScore } from "./score";
import { upsertLead } from "./db";
import { findCnpjInText, discoverCnpjFromSite } from "./cnpj-finder";
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

interface WebHit { title: string; link: string; snippet: string; }

async function searchWeb(query: string, n: number): Promise<WebHit[]> {
  const serper = process.env.SERPER_API_KEY;
  if (serper) {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": serper, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, gl: "br", hl: "pt-br", num: n }),
    });
    const data = (await res.json()) as { organic?: WebHit[] };
    return (data.organic ?? []).slice(0, n);
  }
  const brave = process.env.BRAVE_API_KEY;
  if (brave) {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&country=br&count=${n}`;
    const res = await fetch(url, { headers: { "X-Subscription-Token": brave, Accept: "application/json" } });
    const data = (await res.json()) as { web?: { results?: { title: string; url: string; description: string }[] } };
    return (data.web?.results ?? []).slice(0, n).map((r) => ({ title: r.title, link: r.url, snippet: r.description }));
  }
  return [];
}

function cleanCompanyName(title: string): string {
  return title.split(/[|\-–—:]/)[0].trim().slice(0, 60) || title.slice(0, 60);
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

async function candidatesFromWeb(segmento: string, regiao: string | undefined, n: number): Promise<Partial<Lead>[]> {
  const q = `lojas de ${segmento} marca própria ${regiao ?? "Brasil"} contato`;
  const hits = await searchWeb(q, n);
  // Tenta anexar o CNPJ já no intake: primeiro do snippet, senão do site
  // (só a home, com timeout curto — a varredura profunda fica no lote).
  return mapLimit(hits, 5, async (h) => {
    let cnpj = findCnpjInText(`${h.title} ${h.snippet}`) ?? undefined;
    if (!cnpj) cnpj = (await discoverCnpjFromSite(h.link, { timeoutMs: 4000 })) ?? undefined;
    return {
      empresa: cleanCompanyName(h.title),
      segmento,
      cidade: regiao,
      website: h.link,
      has_website: true,
      cnpj,
      canal_ou_categoria: segmento,
      fato_objetivo: "há espaço para estruturar melhor a presença em marketplaces",
      oportunidade: "estruturar o canal preservando margem",
      // sinais não confirmados por busca ficam desconhecidos (score conservador)
      source: "scout_busca",
    } satisfies Partial<Lead>;
  });
}

export async function scoutByNiche(
  segmento: string,
  regiao: string | undefined,
  quantidade: number,
): Promise<{ mode: "busca" | "gerado"; leads: Lead[] }> {
  const n = Math.max(1, Math.min(quantidade || 8, 30));
  let partials = await candidatesFromWeb(segmento, regiao, n);
  const mode: "busca" | "gerado" = partials.length ? "busca" : "gerado";
  if (!partials.length) partials = generateCandidates(segmento, regiao, n);

  const now = new Date().toISOString();
  const leads: Lead[] = [];
  for (const p of partials) {
    const base: Lead = {
      id: newId(),
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
    // classificação inicial vira o stage sugerido
    if (base.score.potential === "NAO_ABORDAR") base.stage = "nao_abordar";
    else if (base.score.potential === "NUTRIR") base.stage = "nutrir";
    await upsertLead(base);
    leads.push(base);
  }
  return { mode, leads };
}

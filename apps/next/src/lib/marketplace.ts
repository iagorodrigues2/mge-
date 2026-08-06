// Mede a LACUNA de marketplace de uma marca — o problema que o Iago resolve.
// Para cada canal (Mercado Livre, Amazon, Shopee), pesquisa a marca com `site:` e
// conta quantos resultados realmente citam a marca (reduz falso-positivo de nome
// genérico). Quanto menor a presença, maior a lacuna → melhor o lead.
import { searchWeb } from "./search";

export interface MarketplaceGap {
  presence: { mercado_livre: boolean; amazon: boolean; shopee: boolean };
  quality: "boa" | "fraca" | "ausente";
  hits: { mercado_livre: number; amazon: number; shopee: number };
}

// tokens significativos da marca (ignora conectores e o marcador (FICTÍCIA))
function brandTokens(brand: string): string[] {
  return brand
    .replace(/\(.*?\)/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9à-ú\s]/gi, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !["loja", "lojas", "com", "ltda", "the", "and", "dos", "das"].includes(t));
}

function countBrandHits(hits: { title: string; snippet: string }[], tokens: string[]): number {
  if (tokens.length === 0) return hits.length;
  return hits.filter((h) => {
    const text = `${h.title} ${h.snippet}`.toLowerCase();
    return tokens.some((t) => text.includes(t));
  }).length;
}

export async function marketplaceGap(brand: string): Promise<MarketplaceGap> {
  const tokens = brandTokens(brand);
  const q = tokens.join(" ") || brand;
  const [ml, am, sh] = await Promise.all([
    searchWeb(`site:mercadolivre.com.br ${q}`, 6),
    searchWeb(`site:amazon.com.br ${q}`, 6),
    searchWeb(`site:shopee.com.br ${q}`, 6),
  ]);
  const hits = {
    mercado_livre: countBrandHits(ml, tokens),
    amazon: countBrandHits(am, tokens),
    shopee: countBrandHits(sh, tokens),
  };
  const presence = {
    mercado_livre: hits.mercado_livre > 0,
    amazon: hits.amazon > 0,
    shopee: hits.shopee > 0,
  };
  const total = hits.mercado_livre + hits.amazon + hits.shopee;
  // ausente = não achou em lugar nenhum (lacuna máxima); fraca = presença rala;
  // boa = presença consistente (marca já roda marketplaces, prioridade menor).
  const quality: MarketplaceGap["quality"] = total === 0 ? "ausente" : total <= 3 ? "fraca" : "boa";
  return { presence, quality, hits };
}

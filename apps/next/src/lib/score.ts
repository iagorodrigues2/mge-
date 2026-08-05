// Motor de score — porte fiel de packages/agents/score.py (seção 6.3).
// Não inventa dados: sinal ausente conta como desconhecido (0 pontos) e
// reduz a confiança, nunca é assumido como positivo.
import type { Lead, ScoreBreakdown, Potential } from "./types";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function computeScore(l: Lead): ScoreBreakdown {
  let unknowns = 0;
  const notes: string[] = [];

  // product fit (0-20)
  let productFit = 0;
  if (l.has_physical_product === true) { productFit += 8; notes.push("produto físico confirmado"); }
  else if (l.has_physical_product == null) unknowns++;
  else notes.push("sem produto físico identificado");
  if (l.catalog_size != null) {
    if (l.catalog_size >= 20 && l.catalog_size <= 500) { productFit += 8; notes.push(`catálogo de ${l.catalog_size} SKUs na faixa ideal`); }
    else if (l.catalog_size > 0) productFit += 3;
  } else unknowns++;
  if (l.has_own_brand === true) { productFit += 4; notes.push("marca própria/fabricação"); }
  else if (l.has_own_brand == null) unknowns++;
  productFit = clamp(productFit, 0, 20);

  // marketplace gap (0-20): quanto maior a lacuna, maior a pontuação
  let gap = 0;
  const presence = l.marketplace_presence ?? {};
  const channels = (["mercado_livre", "amazon", "shopee"] as const).filter((k) => k in presence);
  if (channels.length) {
    const present = channels.filter((k) => presence[k]).length;
    const absent = channels.length - present;
    gap += absent * 5;
    notes.push(`ausente em ${absent}/${channels.length} marketplaces`);
  } else unknowns++;
  if (l.marketplace_quality === "ausente") gap += 5;
  else if (l.marketplace_quality === "fraca") { gap += 3; notes.push("execução fraca no marketplace"); }
  else if (l.marketplace_quality == null) unknowns++;
  gap = clamp(gap, 0, 20);

  // business structure (0-15)
  let biz = 0;
  if (l.years_active != null) {
    if (l.years_active >= 3) { biz += 6; notes.push(`${l.years_active} anos de operação`); }
    else if (l.years_active > 0) biz += 2;
  } else unknowns++;
  if (l.has_website) biz += 5; else if (l.has_website == null) unknowns++;
  if (l.decision_maker_identified) biz += 4;
  biz = clamp(biz, 0, 15);

  // catalog quality (0-15)
  let cat = 0;
  if (l.catalog_size != null) {
    if (l.catalog_size >= 20 && l.catalog_size <= 500) cat += 8;
    else if (l.catalog_size > 0) cat += 3;
  } else unknowns++;
  if (l.has_instagram) cat += 4; else if (l.has_instagram == null) unknowns++;
  if (l.marketplace_quality === "boa") cat += 3;
  cat = clamp(cat, 0, 15);

  // investment signals (0-10)
  const invMap: Record<string, number> = { alto: 10, medio: 6, baixo: 2 };
  const invest = invMap[l.investment_signal ?? ""] ?? 0;
  if (l.investment_signal == null) unknowns++;

  // contactability (0-10)
  let contact = 0;
  if (l.public_contact) { contact += 6; notes.push("contato empresarial público"); }
  else if (l.public_contact == null) unknowns++;
  if (l.decision_maker_identified) contact += 4;
  contact = clamp(contact, 0, 10);

  // problem clarity (0-10)
  const problem = invMap[l.problem_signal ?? ""] ?? 0;
  if (l.problem_signal == null) unknowns++;

  let total = clamp(productFit + gap + biz + cat + invest + contact + problem, 0, 100);

  let potential: Potential;
  if (total >= 80) potential = "A";
  else if (total >= 65) potential = "B";
  else if (total >= 50) potential = "NUTRIR";
  else potential = "NAO_ABORDAR";

  const confidence = unknowns === 0 ? "alto" : unknowns <= 3 ? "medio" : "baixo";
  let rationale = notes.length ? notes.join("; ") : "Poucos sinais confirmados; score conservador.";
  if (unknowns) rationale += ` (${unknowns} sinais desconhecidos não pontuados).`;

  return {
    product_fit: productFit,
    marketplace_gap: gap,
    business_structure: biz,
    catalog_quality: cat,
    investment_signals: invest,
    contactability: contact,
    problem_clarity: problem,
    total,
    potential,
    confidence,
    rationale,
  };
}

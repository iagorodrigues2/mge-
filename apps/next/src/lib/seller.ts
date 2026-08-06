// Score de seller de marketplace (dados JoomPulse). Diferente do ICP de site:
// aqui a empresa JÁ vende no ML — o foco é oportunidade/estruturação. Prioriza
// quem fatura alto (comporta contrato), tem nome de empresa real (indústria/
// atacado) e mostra dor (vendas caindo ou reputação baixa).
import type { Lead, SellerScore, Potential } from "./types";

function nameHint(nome: string): { label: string; pts: number } {
  const n = (nome || "").toUpperCase();
  if (/IND[UÚ]STRIA|INDUSTRIAL|FABRIC/.test(n)) return { label: "indústria", pts: 15 };
  if (/ATACAD|DISTRIBUID/.test(n)) return { label: "atacado/distribuidor", pts: 14 };
  if (/IMPORT/.test(n)) return { label: "importador", pts: 13 };
  if (/COM[EÉ]RCIO|COMERCIAL|\bCIA\b|LTDA|UTILIDADES|PRESENTES/.test(n)) return { label: "comércio", pts: 8 };
  return { label: "seller", pts: 4 };
}

export function scoreSeller(lead: Lead): SellerScore {
  const s = lead.seller;
  if (!s) return { model: "seller", tipo: "Seller ML", total: 0, potential: "NAO_ABORDAR", confidence: "baixo", rationale: "sem métricas" };
  const notes: string[] = [];

  // 1. Porte pelo faturamento (0-30) — comporta contrato R$20-40k?
  const r = s.receitaMes;
  const porte = r >= 150000 ? 30 : r >= 80000 ? 24 : r >= 40000 ? 17 : r >= 15000 ? 10 : 5;
  notes.push(`receita ~R$ ${Math.round(r).toLocaleString("pt-BR")}/mês`);

  // 2. Oportunidade (0-22) — queda de vendas ou nota baixa = dor a resolver
  let op = 7;
  if (s.trend <= -10) { op = 22; notes.push(`vendas caindo ${s.trend.toFixed(0)}% (dor clara)`); }
  else if (s.trend < 0) { op = 16; notes.push(`tendência ${s.trend.toFixed(0)}%`); }
  else if (s.trend > 15) { op = 10; notes.push(`crescendo ${s.trend.toFixed(0)}% (tem verba)`); }
  if (s.rating && s.rating < 4.5) { op = Math.min(22, op + 5); notes.push(`reputação ${s.rating} (melhorável)`); }

  // 3. Perfil / marca própria (0-28) — o CORAÇÃO do ICP: dono de marca ou
  //    fabricante/atacado, NÃO revendedor/dropshipper (muitas marcas aleatórias).
  const h = nameHint(lead.empresa);
  let perfil = h.pts; // base pelo nome (indústria/atacado/importador/comércio)
  if (s.ownBrand) { perfil += 10; notes.push("vende a própria marca (dono de marca)"); }
  if (s.marcas != null) {
    if (s.marcas <= 3) { perfil += 6; notes.push(`catálogo focado (${s.marcas} marca(s))`); }
    else if (s.marcas >= 12) { perfil -= 8; notes.push(`revendedor (${s.marcas} marcas variadas)`); }
  }
  perfil = Math.max(0, Math.min(perfil, 28));

  // 4. Catálogo (0-10)
  const cat = s.produtos >= 50 && s.produtos <= 3000 ? 10 : s.produtos > 0 ? 5 : 0;

  // 5. Reputação (0-10)
  const rep = Math.min(10, Math.round((s.rating || 0) * 2));

  const total = Math.max(0, Math.min(porte + op + perfil + cat + rep, 100));
  const potential: Potential = total >= 70 ? "A" : total >= 55 ? "B" : total >= 42 ? "NUTRIR" : "NAO_ABORDAR";

  const tipoBase = s.ownBrand ? "dono de marca" : h.label;
  return { model: "seller", tipo: `Seller ML — ${tipoBase}`, total, potential, confidence: "medio", rationale: notes.join("; ") };
}

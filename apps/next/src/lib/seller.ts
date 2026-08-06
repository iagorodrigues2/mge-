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
  const h = nameHint(lead.empresa);

  // 1. Perfil / marca própria (0-35) — FILTRO ICP CENTRAL. Poucas marcas = dono
  //    de marca/fabricante (ICP). Dezenas de marcas = revendedor/dropshipper (NÃO).
  const nm = s.marcas ?? 999;
  let perfil: number;
  let tipo: string;
  if (nm <= 5) {
    perfil = s.ownBrand ? 35 : 27;
    tipo = s.ownBrand ? "dono de marca" : "marca focada";
    notes.push(`catálogo focado (${nm} marca(s))${s.ownBrand ? ", vende a própria marca" : ""}`);
  } else if (nm <= 15) {
    perfil = 16; tipo = "multimarca";
    notes.push(`multimarca (${nm} marcas)`);
  } else if (nm <= 40) {
    perfil = 6; tipo = "revendedor";
    notes.push(`revendedor (${nm} marcas)`);
  } else {
    perfil = 0; tipo = "mega-revendedor";
    notes.push(`mega-revendedor/dropshipper (${nm} marcas) — fora do ICP`);
  }
  // nome de empresa real (indústria/atacado/importador) dá um empurrão
  if (h.pts >= 13) { perfil = Math.min(35, perfil + 4); notes.push(`nome sugere ${h.label}`); }

  // 2. Faturamento (0-25) — comporta contrato R$20-40k?
  const r = s.receitaMes;
  const porte = r >= 150000 ? 25 : r >= 80000 ? 20 : r >= 40000 ? 14 : r >= 15000 ? 8 : 4;
  notes.push(`receita ~R$ ${Math.round(r).toLocaleString("pt-BR")}/mês`);

  // 3. Oportunidade (0-22) — queda de vendas ou nota baixa = dor a resolver
  let op = 7;
  if (s.trend <= -10) { op = 22; notes.push(`vendas caindo ${s.trend.toFixed(0)}% (dor clara)`); }
  else if (s.trend < 0) { op = 16; notes.push(`tendência ${s.trend.toFixed(0)}%`); }
  else if (s.trend > 15) { op = 11; notes.push(`crescendo ${s.trend.toFixed(0)}% (tem verba)`); }
  if (s.rating && s.rating < 4.5) { op = Math.min(22, op + 5); notes.push(`reputação ${s.rating} (melhorável)`); }

  // 4. Reputação (0-10)
  const rep = Math.min(10, Math.round((s.rating || 0) * 2));

  // 5. Catálogo (0-8)
  const cat = s.produtos >= 30 && s.produtos <= 3000 ? 8 : s.produtos > 0 ? 4 : 0;

  const total = Math.max(0, Math.min(perfil + porte + op + rep + cat, 100));
  const potential: Potential = total >= 70 ? "A" : total >= 55 ? "B" : total >= 42 ? "NUTRIR" : "NAO_ABORDAR";

  return { model: "seller", tipo: `Seller ML — ${tipo}`, total, potential, confidence: "medio", rationale: notes.join("; ") };
}

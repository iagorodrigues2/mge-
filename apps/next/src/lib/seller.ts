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

  // 1. Porte pelo faturamento (0-35) — comporta contrato R$20-40k?
  const r = s.receitaMes;
  const porte = r >= 150000 ? 35 : r >= 80000 ? 28 : r >= 40000 ? 20 : r >= 15000 ? 12 : 6;
  notes.push(`receita ~R$ ${Math.round(r).toLocaleString("pt-BR")}/mês`);

  // 2. Oportunidade (0-25) — queda de vendas ou nota baixa = dor a resolver
  let op = 8;
  if (s.trend <= -10) { op = 25; notes.push(`vendas caindo ${s.trend.toFixed(0)}% (dor clara)`); }
  else if (s.trend < 0) { op = 18; notes.push(`tendência ${s.trend.toFixed(0)}%`); }
  else if (s.trend > 15) { op = 12; notes.push(`crescendo ${s.trend.toFixed(0)}% (tem verba)`); }
  if (s.rating && s.rating < 4.5) { op = Math.min(25, op + 6); notes.push(`reputação ${s.rating} (melhorável)`); }

  // 3. Catálogo (0-15)
  const cat = s.produtos >= 50 && s.produtos <= 3000 ? 15 : s.produtos > 0 ? 8 : 0;

  // 4. Perfil pelo nome (0-15)
  const h = nameHint(lead.empresa);
  notes.push(`perfil: ${h.label}`);

  // 5. Reputação/consistência (0-10)
  const rep = Math.min(10, Math.round((s.rating || 0) * 2));

  const total = Math.max(0, Math.min(porte + op + cat + h.pts + rep, 100));
  const potential: Potential = total >= 70 ? "A" : total >= 50 ? "B" : total >= 40 ? "NUTRIR" : "NAO_ABORDAR";

  return { model: "seller", tipo: `Seller ML — ${h.label}`, total, potential, confidence: "medio", rationale: notes.join("; ") };
}

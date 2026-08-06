// Score alinhado ao ICP do Iago: fabricante/indústria, distribuidor/atacadista,
// importador, com produto e marca própria mas presença digital deficiente.
// Detecta o TIPO de empresa pelo CNAE da Receita (puxado no enriquecimento) e
// pontua no modelo aprovado: acima de 50 já vira aprovável (B). Presença em
// marketplace NÃO elimina o lead (pode ser o "vende mas não sabe se lucra").
import type { Lead, IcpScore, Potential } from "./types";

// CNAE "SSSSD-DD" → tipo ICP + pontos (0-30). Uso a divisão (2 primeiros dígitos):
//   10–33 = indústria de transformação · 46 = comércio atacadista (distribuidor)
//   47 = comércio varejista.
export function classifyIcp(lead: Lead): { tipo: string; pontos: number; ownBrand: boolean } {
  const cnae = (lead.cnae ?? "").replace(/\D/g, "");
  const div = Number(cnae.slice(0, 2));
  // CNAE da Receita é autoritativo quando existe.
  if (cnae && div >= 10 && div <= 33) return { tipo: "Indústria / fabricante", pontos: 30, ownBrand: true };
  if (cnae && div === 46) return { tipo: "Distribuidor / atacadista", pontos: 25, ownBrand: false };
  if (cnae && div === 47) {
    if (lead.has_own_brand) return { tipo: "Varejo com marca própria", pontos: 18, ownBrand: true };
    return { tipo: "Varejo comum", pontos: 8, ownBrand: false };
  }
  if (cnae) return { tipo: `Outro (CNAE ${cnae.slice(0, 2)})`, pontos: 10, ownBrand: false };
  // Sem CNAE: usa a pista lida no site (um pouco menor, por ser inferência).
  switch (lead.perfil_hint) {
    case "industria": return { tipo: "Indústria / fabricante (pelo site)", pontos: 28, ownBrand: true };
    case "importador": return { tipo: "Importador (pelo site)", pontos: 24, ownBrand: false };
    case "distribuidor": return { tipo: "Distribuidor / atacado (pelo site)", pontos: 24, ownBrand: false };
    case "marca_propria": return { tipo: "Marca própria (pelo site)", pontos: 16, ownBrand: true };
    default: return { tipo: "Sem perfil confirmado", pontos: 0, ownBrand: false };
  }
}

export function scoreIcp(lead: Lead): IcpScore {
  const notes: string[] = [];
  let unknown = 0;

  // 1. Perfil ICP (0-30) — tipo de empresa pelo CNAE
  const { tipo, pontos: perfil_icp, ownBrand } = classifyIcp(lead);
  notes.push(`perfil: ${tipo}`);
  if (!lead.cnae) unknown++;

  // 2. Lacuna de marketplace (0-25) — presença não elimina (checar eficiência)
  let lacuna = 0;
  const q = lead.marketplace_quality;
  if (q === "ausente") { lacuna = 25; notes.push("ausente nos marketplaces (lacuna máxima)"); }
  else if (q === "fraca") { lacuna = 18; notes.push("presença fraca nos marketplaces"); }
  else if (q === "boa") { lacuna = 10; notes.push("já vende em marketplace — checar se lucra"); }
  else unknown++;

  // 3. Porte & tradição (0-15)
  let porte = 0;
  const anos = lead.years_active;
  if (anos != null) { if (anos >= 10) { porte += 6; notes.push(`${anos} anos de operação`); } else if (anos >= 3) porte += 3; }
  else unknown++;
  const p = (lead.porte ?? "").toUpperCase();
  if (p.includes("DEMAIS") || p.includes("GRANDE") || p.includes("MEDIO") || p.includes("MÉDIO")) porte += 6;
  else if (p.includes("PEQUENO")) porte += 4;
  else if (p.includes("MICRO")) porte += 1;
  if (lead.has_website) porte += 3;
  porte = Math.min(porte, 15);

  // 4. Produto & marca própria (0-15)
  let prod = 0;
  if (lead.has_physical_product) prod += 7;
  if (lead.has_own_brand || ownBrand) { prod += 8; notes.push("marca própria/fabricação"); }
  prod = Math.min(prod, 15);

  // 5. Contatabilidade (0-15)
  let contato = 0;
  if (lead.public_contact || lead.telefone || lead.email) { contato += 9; notes.push("contato público"); }
  else unknown++;
  if (lead.decision_maker_identified) contato += 6;
  contato = Math.min(contato, 15);

  const total = Math.max(0, Math.min(perfil_icp + lacuna + porte + prod + contato, 100));

  // Empresa não-ATIVA não deve ser abordada, independente da nota.
  const situ = (lead.situacao_cadastral ?? "").toUpperCase();
  const inativa = Boolean(situ) && situ !== "ATIVA";

  let potential: Potential;
  if (inativa) potential = "NAO_ABORDAR";
  else if (total >= 70) potential = "A";
  else if (total >= 50) potential = "B"; // acima de 50 = aprovável (regra do piloto)
  else if (total >= 40) potential = "NUTRIR";
  else potential = "NAO_ABORDAR";

  const confidence = unknown === 0 ? "alto" : unknown <= 2 ? "medio" : "baixo";
  let rationale = notes.join("; ");
  if (inativa) rationale = `Situação cadastral ${situ} — não abordar. ${rationale}`;
  if (unknown) rationale += ` (${unknown} sinais ainda não confirmados).`;

  return {
    model: "icp",
    perfil_icp, perfil_tipo: tipo,
    lacuna_marketplace: lacuna, porte_tradicao: porte, produto_marca: prod, contatabilidade: contato,
    total, potential, confidence, rationale,
  };
}

// Qualificação do lead (o passo que torna o lead de busca ACIONÁVEL):
//   1. confirma o CNPJ na Receita (perfil pelo CNAE, porte, situação) — via enrich
//   2. mede a lacuna de marketplace (busca a marca no ML/Amazon/Shopee)
//   3. recalcula o score no modelo ICP e define a classe (>50 = aprovável)
// Roda em lote, com limite por chamada para caber no tempo da função serverless.
import { getLead, listLeads, upsertLead } from "./db";
import { applyCnpjToLead } from "./enrich";
import { probeSite } from "./cnpj-finder";
import { marketplaceGap } from "./marketplace";
import { scoreIcp } from "./icp";
import type { Lead } from "./types";

function hasRealSite(l: Lead): boolean {
  return !!l.website && /^https?:\/\//.test(l.website) && !/exemplo-ficticio/.test(l.website);
}

function brandOf(l: Lead): string {
  return (l.nome_fantasia || l.razao_social || l.empresa || "").replace(/\(.*?\)/g, "").trim();
}

export interface QualifyResult { ok: boolean; lead?: Lead; error?: string }

export async function qualifyLead(id: string): Promise<QualifyResult> {
  const lead = await getLead(id);
  if (!lead) return { ok: false, error: "Lead não encontrado." };

  // 1. CNPJ + pista de perfil (usa o do intake ou sonda o site fundo)
  let cnpj = lead.cnpj;
  if ((!cnpj || !lead.perfil_hint) && hasRealSite(lead)) {
    const probe = await probeSite(lead.website!, { deep: true, timeoutMs: 3500, budgetMs: 8000 });
    cnpj = cnpj ?? probe.cnpj;
    if (!lead.perfil_hint && probe.hint) {
      lead.perfil_hint = probe.hint;
      if (probe.hint === "industria" || probe.hint === "marca_propria") lead.has_own_brand = true;
    }
  }
  if (cnpj) {
    try { await applyCnpjToLead(lead, cnpj); } catch { /* segue sem cadastral */ }
  }

  // 2. lacuna de marketplace (a dor que o Iago resolve)
  try {
    const gap = await marketplaceGap(brandOf(lead));
    lead.marketplace_presence = gap.presence;
    lead.marketplace_quality = gap.quality;
  } catch { /* deixa desconhecido — o score trata */ }

  // 3. score ICP + classe
  lead.score = scoreIcp(lead);
  lead.qualified_at = new Date().toISOString();
  const pot = lead.score.potential;
  if (pot === "NAO_ABORDAR") { lead.stage = "nao_abordar"; lead.approved = false; }
  else if (pot === "NUTRIR") lead.stage = "nutrir";
  else lead.stage = "pesquisado"; // A/B ficam prontos p/ aprovar

  await upsertLead(lead);
  return { ok: true, lead };
}

export interface QualifyBatchSummary {
  processados: number;
  aprovaveis: number; // A ou B (>50)
  nutrir: number;
  naoAbordar: number;
  erros: number;
  restantes: number; // leads de busca ainda não qualificados
}

// Qualifica até `limit` leads de busca ainda não qualificados. Chamar em loop
// até restantes === 0. force=true reprocessa os já qualificados.
export async function qualifyAllLeads(limit = 8, force = false): Promise<QualifyBatchSummary> {
  const all = await listLeads();
  const pending = all.filter((l) => l.source === "scout_busca" && (force || !l.qualified_at));
  const batch = pending.slice(0, limit);

  const sum: QualifyBatchSummary = {
    processados: 0, aprovaveis: 0, nutrir: 0, naoAbordar: 0, erros: 0,
    restantes: Math.max(0, pending.length - batch.length),
  };

  for (const l of batch) {
    try {
      const r = await qualifyLead(l.id);
      if (r.ok && r.lead?.score) {
        sum.processados++;
        const p = r.lead.score.potential;
        if (p === "A" || p === "B") sum.aprovaveis++;
        else if (p === "NUTRIR") sum.nutrir++;
        else sum.naoAbordar++;
      } else sum.erros++;
    } catch { sum.erros++; }
  }
  return sum;
}

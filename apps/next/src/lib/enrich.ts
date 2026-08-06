// Enriquecimento cadastral via BrasilAPI (Receita Federal) — grátis, sem chave.
// Recebe um CNPJ, confirma dados públicos oficiais (razão social, CNAE, porte,
// situação cadastral, abertura, telefone/e-mail públicos) e atualiza o lead.
// Nunca inventa dado: só preenche o que a Receita retornar. Empresa não-ATIVA
// (baixada/suspensa) vira "não abordar" — não faz sentido prospectar.
import { getLead, listLeads, upsertLead } from "./db";
import { computeScore } from "./score";
import { discoverCnpjFromSite } from "./cnpj-finder";
import type { Lead } from "./types";

// Resposta parcial do endpoint https://brasilapi.com.br/api/cnpj/v1/{cnpj}
interface CnpjResponse {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  cnae_fiscal?: number;
  cnae_fiscal_descricao?: string;
  porte?: string;
  descricao_situacao_cadastral?: string;
  data_inicio_atividade?: string;
  ddd_telefone_1?: string;
  email?: string;
  municipio?: string;
  uf?: string;
  message?: string; // presente quando a API devolve erro (ex.: CNPJ inexistente)
}

export function normalizeCnpj(raw: string): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  return digits.length === 14 ? digits : null;
}

function toE164(dddTelefone?: string): string | undefined {
  const d = (dddTelefone ?? "").replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) return `55${d}`;
  return undefined;
}

function yearsSince(isoDate?: string): number | undefined {
  if (!isoDate) return undefined;
  const y = Number(isoDate.slice(0, 4));
  if (!y || y < 1900) return undefined;
  return Math.max(0, new Date().getFullYear() - y);
}

export async function fetchCnpj(cnpj: string): Promise<CnpjResponse> {
  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
    headers: {
      Accept: "application/json",
      // BrasilAPI (Cloudflare) devolve 403 para requisições sem User-Agent.
      "User-Agent": "MaquinaDeVendas/1.0 (+https://brasilapi.com.br)",
    },
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as CnpjResponse;
  if (!res.ok) {
    throw new Error(data.message ?? `BrasilAPI respondeu ${res.status} para o CNPJ ${cnpj}`);
  }
  return data;
}

export interface EnrichResult {
  ok: boolean;
  lead?: Lead;
  situacao?: string;
  ativa?: boolean;
  error?: string;
}

// Busca o CNPJ na Receita e escreve os dados cadastrais NO lead (muta em memória,
// não persiste, não pontua). Reaproveitado pelo enriquecimento manual e pela
// qualificação em lote. Retorna a situação cadastral encontrada.
export async function applyCnpjToLead(lead: Lead, cnpjRaw: string): Promise<{ ativa: boolean; situacao?: string }> {
  const cnpj = normalizeCnpj(cnpjRaw);
  if (!cnpj) throw new Error("CNPJ inválido — informe os 14 dígitos.");
  const data = await fetchCnpj(cnpj);

  const razao = data.razao_social?.trim();
  const fantasia = data.nome_fantasia?.trim();
  const situacao = data.descricao_situacao_cadastral?.trim();
  const ativa = (situacao ?? "").toUpperCase() === "ATIVA";
  const telefone = toE164(data.ddd_telefone_1);
  const email = data.email?.trim().toLowerCase() || undefined;
  const anos = yearsSince(data.data_inicio_atividade);
  const nomeReal = fantasia || razao;
  const eraFicticio = /fict[ií]cia/i.test(lead.empresa);

  // Dados oficiais são autoritativos, mas nunca apagam valor existente com vazio.
  lead.cnpj = cnpj;
  lead.razao_social = razao ?? lead.razao_social;
  lead.nome_fantasia = fantasia ?? lead.nome_fantasia;
  lead.cnae = data.cnae_fiscal != null ? String(data.cnae_fiscal) : lead.cnae;
  lead.cnae_descricao = data.cnae_fiscal_descricao ?? lead.cnae_descricao;
  lead.porte = data.porte ?? lead.porte;
  lead.situacao_cadastral = situacao ?? lead.situacao_cadastral;
  lead.data_abertura = data.data_inicio_atividade ?? lead.data_abertura;
  if (nomeReal && eraFicticio) lead.empresa = nomeReal;
  lead.cidade = data.municipio?.trim() || lead.cidade;
  lead.uf = data.uf?.trim() || lead.uf;
  lead.telefone = telefone ?? lead.telefone;
  lead.email = email ?? lead.email;
  lead.years_active = anos ?? lead.years_active;
  if (telefone || email) lead.public_contact = true;
  lead.enriched_at = new Date().toISOString();
  lead.enrich_source = "brasilapi";

  return { ativa, situacao };
}

export async function enrichLeadByCnpj(id: string, cnpjRaw: string): Promise<EnrichResult> {
  if (!normalizeCnpj(cnpjRaw)) return { ok: false, error: "CNPJ inválido — informe os 14 dígitos." };
  const lead = await getLead(id);
  if (!lead) return { ok: false, error: "Lead não encontrado." };

  const { ativa, situacao } = await applyCnpjToLead(lead, cnpjRaw);
  if (!ativa) { lead.stage = "nao_abordar"; lead.approved = false; }
  lead.score = computeScore(lead);
  await upsertLead(lead);

  return { ok: true, lead, situacao, ativa };
}

// Um site "real" (não o placeholder do gerador fictício) do qual vale a pena
// tentar descobrir o CNPJ.
function hasRealSite(l: Lead): boolean {
  return !!l.website && /^https?:\/\//.test(l.website) && !/exemplo-ficticio/.test(l.website);
}

export interface BatchEnrichSummary {
  total: number;
  enriquecidos: number;
  jaEnriquecidos: number;
  semCnpj: number; // sem CNPJ e sem descobrir pelo site
  naoAtiva: number; // enriquecido mas situação != ATIVA
  erros: number;
}

// Enriquece todos os leads pendentes. Para quem não tem CNPJ mas tem site real,
// tenta descobrir o CNPJ no site (varredura profunda). Sequencial e educado com
// a BrasilAPI. force=true reprocessa até os já enriquecidos.
export async function enrichAllLeads(force = false): Promise<BatchEnrichSummary> {
  const leads = await listLeads();
  const sum: BatchEnrichSummary = {
    total: leads.length, enriquecidos: 0, jaEnriquecidos: 0, semCnpj: 0, naoAtiva: 0, erros: 0,
  };

  for (const l of leads) {
    if (l.enriched_at && !force) { sum.jaEnriquecidos++; continue; }

    let cnpj = l.cnpj;
    if (!cnpj && hasRealSite(l)) {
      cnpj = (await discoverCnpjFromSite(l.website!, { deep: true, timeoutMs: 6000 })) ?? undefined;
    }
    if (!cnpj) { sum.semCnpj++; continue; }

    try {
      const r = await enrichLeadByCnpj(l.id, cnpj);
      if (r.ok) { sum.enriquecidos++; if (r.ativa === false) sum.naoAtiva++; }
      else sum.erros++;
    } catch { sum.erros++; }
  }
  return sum;
}

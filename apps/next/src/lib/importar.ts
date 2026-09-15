import { getLead, upsertLead } from "./db";
import type { Lead } from "./types";

// whatsapp/cnpj são opcionais: quando a busca já foi feita fora (máquina
// local, planilha), o lead chega pronto e pula a mineração em prod.
export interface ImportItem { empresa?: string; website?: string; cidade?: string; uf?: string; segmento?: string; whatsapp?: string; cnpj?: string; whatsapp_fonte?: string }

function hostOf(url: string): string | null {
  try { return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "").toLowerCase(); }
  catch { return null; }
}
function soDigitos(v?: string): string { return (v ?? "").replace(/\D/g, ""); }
function whatsappBR(bruto?: string): string | undefined {
  const d = soDigitos(bruto);
  if (d.length === 10 || d.length === 11) return `55${d}`;
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) return d;
  return undefined;
}

// Importa leads curados (empresas reais) para depois passarem pela qualificação.
// id determinístico por domínio → reimportar não duplica. Lead que JÁ existe é
// pulado (não sobrescrito): reimportar não pode apagar histórico nem estágio.
export async function importarLeads(items: ImportItem[]) {
  const now = new Date().toISOString();
  let created = 0;
  const skipped: string[] = [];
  const existentes: string[] = [];
  for (const it of items) {
    const host = it.website ? hostOf(it.website) : null;
    if (!host) { skipped.push(it.empresa ?? it.website ?? "?"); continue; }
    const id = "lead_dom_" + host.replace(/[^a-z0-9]+/g, "_").replace(/_+$/g, "");
    if (await getLead(id)) { existentes.push(it.empresa ?? host); continue; }
    const whatsapp = whatsappBR(it.whatsapp);
    const cnpj = soDigitos(it.cnpj).length === 14 ? soDigitos(it.cnpj) : undefined;
    const lead: Lead = {
      id,
      empresa: it.empresa?.trim() || host,
      segmento: it.segmento?.trim() || "Casa, móveis e decoração",
      cidade: it.cidade?.trim() || undefined,
      uf: it.uf?.trim() || undefined,
      website: `https://${host}`,
      has_website: true,
      has_physical_product: true,
      whatsapp,
      whatsapp_fonte: whatsapp ? (it.whatsapp_fonte ?? "importado") : undefined,
      whatsapp_at: whatsapp ? now : undefined,
      cnpj,
      canal_ou_categoria: it.segmento?.trim() || "Casa, móveis e decoração",
      source: "scout_busca",
      stage: "pesquisado",
      approved: false,
      opt_out: false,
      attempts: [],
      createdAt: now,
      updatedAt: now,
    };
    await upsertLead(lead);
    created++;
  }
  return { created, skipped, existentes };
}

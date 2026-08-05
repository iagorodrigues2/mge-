// Financeiro (etapa 14). Regra dura (seção 12H): "ganho e recebido" só é
// verdade depois da 1ª parcela (entrada) efetivamente confirmada.
import { getDeal, upsertDeal, getLead, upsertLead, listDeals } from "./db";
import type { Deal } from "./types";

export async function markInstallmentPaid(dealId: string, n: number): Promise<{ ok: boolean; deal?: Deal; error?: string }> {
  const deal = await getDeal(dealId);
  if (!deal) return { ok: false, error: "negócio não encontrado" };
  const inst = deal.installments.find((i) => i.n === n);
  if (!inst) return { ok: false, error: "parcela não encontrada" };

  inst.status = "pago";
  inst.paidAt = new Date().toISOString();

  const pagas = deal.installments.filter((i) => i.status === "pago").length;
  const total = deal.installments.length;
  const isEntrada = n === 1;

  if (pagas >= total) deal.status = "quitado";
  else if (isEntrada || deal.status === "aguardando_entrada") deal.status = "entrada_recebida";
  else deal.status = "em_andamento";
  await upsertDeal(deal);

  // a entrada paga marca o lead como GANHO (ganho e recebido)
  if (deal.installments.find((i) => i.n === 1)?.status === "pago") {
    const lead = await getLead(deal.leadId);
    if (lead && lead.stage !== "ganho") { lead.stage = "ganho"; await upsertLead(lead); }
  }
  return { ok: true, deal };
}

export interface RevenueSummary {
  potencial: number; // propostas em aberto (rascunho/enviada) — calculado fora
  contratada: number; // soma dos negócios (proposta aceita)
  recebida: number; // soma das parcelas pagas
  aReceber: number; // contratada - recebida
}

export async function revenueFromDeals(): Promise<{ contratada: number; recebida: number; aReceber: number }> {
  const deals = await listDeals();
  let contratada = 0;
  let recebida = 0;
  for (const d of deals) {
    if (d.status === "cancelado") continue;
    contratada += d.valor;
    recebida += d.installments.filter((i) => i.status === "pago").reduce((s, i) => s + i.valor, 0);
  }
  return { contratada, recebida, aReceber: contratada - recebida };
}

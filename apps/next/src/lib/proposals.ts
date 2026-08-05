// Propostas (etapa 12) e virada para o financeiro (etapa 14).
import { getLead, upsertLead, getPackage, getProposal, upsertProposal, upsertDeal } from "./db";
import { condicaoPagamento, buildInstallments } from "./pricing";
import type { Proposal, Deal } from "./types";

let seq = 0;
const id = (p: string) => `${p}_${Date.now().toString(36)}_${(seq++).toString(36)}`;

export async function createProposal(
  leadId: string,
  packageCode: string,
  valorNegociado?: number,
  diagnostico?: string,
): Promise<{ ok: boolean; proposal?: Proposal; error?: string }> {
  const lead = await getLead(leadId);
  if (!lead) return { ok: false, error: "lead não encontrado" };
  const pkg = await getPackage(packageCode);
  if (!pkg) return { ok: false, error: "pacote não encontrado" };

  const valor = valorNegociado && valorNegociado > 0 ? valorNegociado : pkg.precoRef;
  const now = new Date().toISOString();
  const proposal: Proposal = {
    id: id("prop"),
    leadId,
    empresa: lead.empresa,
    packageCode,
    nome: pkg.nome,
    valor,
    condicaoPagamento: condicaoPagamento(pkg),
    diagnostico: diagnostico || lead.fato_objetivo,
    status: "rascunho",
    createdAt: now,
    updatedAt: now,
  };
  await upsertProposal(proposal);
  return { ok: true, proposal };
}

export async function sendProposal(proposalId: string): Promise<{ ok: boolean; error?: string }> {
  const p = await getProposal(proposalId);
  if (!p) return { ok: false, error: "proposta não encontrada" };
  p.status = "enviada";
  p.sentAt = new Date().toISOString();
  await upsertProposal(p);
  const lead = await getLead(p.leadId);
  if (lead && lead.stage !== "ganho") { lead.stage = "proposta_enviada"; await upsertLead(lead); }
  return { ok: true };
}

// Aceite → cria o negócio no financeiro. "ganho e recebido" só virá quando a
// entrada for efetivamente paga (markInstallmentPaid), não aqui.
export async function acceptProposal(proposalId: string): Promise<{ ok: boolean; deal?: Deal; error?: string }> {
  const p = await getProposal(proposalId);
  if (!p) return { ok: false, error: "proposta não encontrada" };
  const pkg = await getPackage(p.packageCode);
  if (!pkg) return { ok: false, error: "pacote não encontrado" };

  p.status = "aceita";
  p.acceptedAt = new Date().toISOString();
  await upsertProposal(p);

  const now = new Date().toISOString();
  const deal: Deal = {
    id: id("deal"),
    proposalId: p.id,
    leadId: p.leadId,
    empresa: p.empresa,
    packageCode: p.packageCode,
    valor: p.valor,
    installments: buildInstallments(pkg, p.valor),
    status: "aguardando_entrada",
    createdAt: now,
    updatedAt: now,
  };
  await upsertDeal(deal);
  return { ok: true, deal };
}

export async function loseProposal(proposalId: string, reason: string): Promise<{ ok: boolean; error?: string }> {
  const p = await getProposal(proposalId);
  if (!p) return { ok: false, error: "proposta não encontrada" };
  p.status = "perdida";
  p.lostReason = reason;
  await upsertProposal(p);
  const lead = await getLead(p.leadId);
  if (lead) { lead.stage = "perdido"; await upsertLead(lead); }
  return { ok: true };
}

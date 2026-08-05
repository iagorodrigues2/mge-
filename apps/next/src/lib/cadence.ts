// Motor de cadência (seção 8). Não dispara tudo de uma vez: cada etapa exige
// um clique (manual) ou o "processar devidos" (respeitando o intervalo).
// Sem worker/cron, os follow-ups devidos são calculados sob demanda.
import { listLeads, getLead, upsertLead } from "./db";
import { dispatchStep } from "./dispatch";
import type { Lead } from "./types";

export const STEP_ORDER = ["contato_inicial", "followup_1", "followup_2", "encerramento"] as const;
export type Step = (typeof STEP_ORDER)[number];

// dias de espera após a última tentativa, sem resposta, antes de cada etapa
const WAIT_DAYS: Record<Step, number> = {
  contato_inicial: 0,
  followup_1: 2,
  followup_2: 3,
  encerramento: 3,
};

// etapas já enviadas (com sucesso ou assistido) para o lead
function sentSteps(lead: Lead): Set<string> {
  const s = new Set<string>();
  for (const a of lead.attempts) {
    if (a.status === "enviado" || a.status === "assistido") s.add(a.step);
  }
  return s;
}

// próxima etapa a enviar, ou null se a cadência terminou
export function nextStep(lead: Lead): Step | null {
  const done = sentSteps(lead);
  for (const step of STEP_ORDER) {
    if (!done.has(step)) return step;
  }
  return null;
}

// a cadência só roda para leads contatados que ainda não responderam
function inCadence(lead: Lead): boolean {
  return lead.stage === "contatado" && !lead.opt_out;
}

function lastAttemptAt(lead: Lead): number {
  const last = lead.attempts[lead.attempts.length - 1];
  return last ? new Date(last.at).getTime() : 0;
}

// o próximo follow-up está "vencido" (passou o intervalo)?
export function isDue(lead: Lead, now = Date.now()): boolean {
  if (!inCadence(lead)) return false;
  const step = nextStep(lead);
  if (!step || step === "contato_inicial") return false;
  const waitMs = WAIT_DAYS[step] * 24 * 60 * 60 * 1000;
  return now - lastAttemptAt(lead) >= waitMs;
}

export function dueInfo(lead: Lead) {
  const step = nextStep(lead);
  return {
    inCadence: inCadence(lead),
    nextStep: step,
    due: isDue(lead),
  };
}

// Envia a próxima etapa de um lead. force ignora o intervalo (clique manual).
export async function advanceCadence(id: string, force = false) {
  const lead = await getLead(id);
  if (!lead) return { ok: false, blocked: ["lead não encontrado"], attempts: [] };
  if (!inCadence(lead)) return { ok: false, blocked: ["lead fora da cadência (respondeu, opt-out ou não contatado)"], attempts: [] };
  const step = nextStep(lead);
  if (!step) return { ok: false, blocked: ["cadência encerrada"], attempts: [] };
  if (!force && !isDue(lead)) return { ok: false, blocked: [`aguardando intervalo para ${step}`], attempts: [] };

  const res = await dispatchStep(lead, step);
  if (step === "encerramento" && res.ok) lead.stage = "nutrir"; // encerrou respeitosamente
  await upsertLead(lead);
  return { ...res, step };
}

// Processa todos os follow-ups devidos (o "botão" da máquina rodar sozinha).
export async function runDueCadence() {
  const leads = await listLeads();
  const results: { empresa: string; step?: string; ok: boolean; detail?: string }[] = [];
  for (const l of leads) {
    if (!isDue(l)) continue;
    const r = await advanceCadence(l.id, false);
    results.push({ empresa: l.empresa, step: (r as { step?: string }).step, ok: r.ok, detail: r.blocked?.join("; ") });
  }
  return { processed: results.length, results };
}

// Compliance — porte de packages/agents/compliance.py (seção 6.7).
// Regras DURAS, não sugestões. Barra o envio antes de sair.
import { isBlocked, isOptedOut } from "./db";
import type { Lead } from "./types";

const BUSINESS_START = 8; // 08:00
const BUSINESS_END = 20; // 20:00
const TZ = "America/Sao_Paulo";

export interface ComplianceResult { allowed: boolean; reasons: string[]; }

function isBusinessHours(now = new Date()): boolean {
  // avalia hora/dia no fuso comercial (America/Sao_Paulo)
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hour: "2-digit", hour12: false, weekday: "short",
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "";
  const weekend = wd === "Sat" || wd === "Sun";
  return !weekend && hour >= BUSINESS_START && hour < BUSINESS_END;
}

export async function checkOutbound(lead: Lead, opts: { ignoreHours?: boolean } = {}): Promise<ComplianceResult> {
  const reasons: string[] = [];
  if (lead.opt_out) reasons.push("lead marcou opt-out");
  if (await isOptedOut(lead.telefone, lead.email, lead.empresa)) reasons.push("consta na lista de opt-out");
  if (await isBlocked(lead.telefone, lead.email)) reasons.push("consta na blocklist");
  if (!lead.telefone && !lead.email) reasons.push("sem canal de contato (telefone/e-mail)");
  if (!opts.ignoreHours && !isBusinessHours()) reasons.push("fora do horário comercial (08–20h, dias úteis)");
  return { allowed: reasons.length === 0, reasons };
}

export { isBusinessHours };

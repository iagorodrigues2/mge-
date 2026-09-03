// Backend JSON em arquivo — usado no dev local (sem DATABASE_URL).
// Zero dependência nativa. Serverless (Vercel) usa o backend Postgres.
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Db, Lead, ServicePackage, Proposal, Deal } from "./types";
import type { Store } from "./db";
import { DEFAULT_PACKAGES } from "./pricing-defaults";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "mge.json");

const EMPTY: Db = { leads: [], blocklist: [], optOut: [], packages: [], proposals: [], deals: [] };

let cache: Db | null = null;
let writeChain: Promise<void> = Promise.resolve();

async function ensure(): Promise<Db> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    cache = { ...structuredClone(EMPTY), ...JSON.parse(raw) };
  } catch {
    cache = structuredClone(EMPTY);
  }
  // semeia os pacotes de serviço padrão na primeira execução (preços no store)
  if (!cache!.packages || cache!.packages.length === 0) {
    cache!.packages = structuredClone(DEFAULT_PACKAGES);
  }
  await persist();
  return cache!;
}

async function persist(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const snapshot = JSON.stringify(cache ?? EMPTY, null, 2);
  // serializa escritas para evitar corrupção em requisições concorrentes
  writeChain = writeChain.then(() => fs.writeFile(DB_FILE, snapshot, "utf8"));
  return writeChain;
}

export const jsonStore: Store = {
  async getDb() {
    return ensure();
  },

  async listLeads() {
    const db = await ensure();
    return [...db.leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getLead(id) {
    const db = await ensure();
    return db.leads.find((l) => l.id === id);
  },

  async upsertLead(lead) {
    const db = await ensure();
    const i = db.leads.findIndex((l) => l.id === lead.id);
    lead.updatedAt = new Date().toISOString();
    if (i >= 0) db.leads[i] = lead;
    else db.leads.push(lead);
    await persist();
    return lead;
  },

  async addOptOut(key) {
    const db = await ensure();
    const k = key.trim().toLowerCase();
    if (k && !db.optOut.includes(k)) db.optOut.push(k);
    await persist();
  },

  async removeOptOut(key) {
    const db = await ensure();
    const k = key.trim().toLowerCase();
    db.optOut = db.optOut.filter((s) => s.toLowerCase() !== k);
    await persist();
  },

  async isOptedOut(...keys) {
    const db = await ensure();
    const set = new Set(db.optOut.map((s) => s.toLowerCase()));
    return keys.some((k) => k && set.has(k.trim().toLowerCase()));
  },

  async isBlocked(...keys) {
    const db = await ensure();
    const set = new Set(db.blocklist.map((s) => s.toLowerCase()));
    return keys.some((k) => k && set.has(k.trim().toLowerCase()));
  },

  async listPackages() {
    const db = await ensure();
    return db.packages;
  },

  async getPackage(code) {
    const db = await ensure();
    return db.packages.find((p) => p.code === code);
  },

  async upsertPackage(pkg) {
    const db = await ensure();
    const i = db.packages.findIndex((p) => p.code === pkg.code);
    if (i >= 0) db.packages[i] = pkg;
    else db.packages.push(pkg);
    await persist();
    return pkg;
  },

  async listProposals() {
    const db = await ensure();
    return [...db.proposals].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getProposal(id) {
    const db = await ensure();
    return db.proposals.find((p) => p.id === id);
  },

  async upsertProposal(p) {
    const db = await ensure();
    const i = db.proposals.findIndex((x) => x.id === p.id);
    p.updatedAt = new Date().toISOString();
    if (i >= 0) db.proposals[i] = p;
    else db.proposals.push(p);
    await persist();
    return p;
  },

  async listDeals() {
    const db = await ensure();
    return [...db.deals].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getDeal(id) {
    const db = await ensure();
    return db.deals.find((d) => d.id === id);
  },

  async upsertDeal(d) {
    const db = await ensure();
    const i = db.deals.findIndex((x) => x.id === d.id);
    d.updatedAt = new Date().toISOString();
    if (i >= 0) db.deals[i] = d;
    else db.deals.push(d);
    await persist();
    return d;
  },

  async deleteLeadsBySource(source) {
    const db = await ensure();
    const before = db.leads.length;
    db.leads = db.leads.filter((l) => l.source !== source);
    await persist();
    return before - db.leads.length;
  },

  async deleteLeadById(id) {
    const db = await ensure();
    const before = db.leads.length;
    db.leads = db.leads.filter((l) => l.id !== id);
    await persist();
    return before - db.leads.length;
  },
};

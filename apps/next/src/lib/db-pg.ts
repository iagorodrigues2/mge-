// Backend Postgres — usado quando DATABASE_URL (ou POSTGRES_URL) está definido
// (produção/Vercel). Guarda cada entidade como JSONB para preservar exatamente
// os tipos do app; a interface é idêntica ao backend JSON, então o resto do
// código não muda. Funciona com Neon, Supabase, Vercel Postgres ou Postgres puro.
import postgres from "postgres";
import type { Db, Lead, ServicePackage, Proposal, Deal } from "./types";
import type { Store } from "./db";
import { DEFAULT_PACKAGES } from "./pricing-defaults";

let sqlClient: ReturnType<typeof postgres> | null = null;
let ready: Promise<void> | null = null;

function conn() {
  if (sqlClient) return sqlClient;
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL não definido — backend Postgres indisponível.");
  const isLocal = /@(localhost|127\.0\.0\.1)/.test(url);
  sqlClient = postgres(url, {
    // pooler (Neon/Supabase pgbouncer) não suporta prepared statements
    prepare: false,
    ssl: isLocal ? false : "require",
    max: 5,
    idle_timeout: 20,
  });
  return sqlClient;
}

// Cria as tabelas (idempotente) e semeia os pacotes padrão uma única vez.
async function ensure(): Promise<ReturnType<typeof postgres>> {
  const sql = conn();
  if (!ready) {
    ready = (async () => {
      await sql`create table if not exists mge_leads     (id text primary key, data jsonb not null)`;
      await sql`create table if not exists mge_packages  (code text primary key, data jsonb not null)`;
      await sql`create table if not exists mge_proposals (id text primary key, data jsonb not null)`;
      await sql`create table if not exists mge_deals     (id text primary key, data jsonb not null)`;
      await sql`create table if not exists mge_opt_out   (key text primary key)`;
      await sql`create table if not exists mge_blocklist (key text primary key)`;
      const [{ count }] = await sql<{ count: number }[]>`select count(*)::int as count from mge_packages`;
      if (count === 0) {
        for (const p of DEFAULT_PACKAGES) {
          await sql`insert into mge_packages (code, data) values (${p.code}, ${sql.json(p as never)})
                    on conflict (code) do nothing`;
        }
      }
    })().catch((e) => {
      ready = null; // permite nova tentativa numa próxima requisição
      throw e;
    });
  }
  await ready;
  return sql;
}

const byCreatedDesc = (a: { createdAt: string }, b: { createdAt: string }) => b.createdAt.localeCompare(a.createdAt);

export const pgStore: Store = {
  async getDb(): Promise<Db> {
    const sql = await ensure();
    const [leads, packages, proposals, deals, optOut, blocklist] = await Promise.all([
      sql<{ data: Lead }[]>`select data from mge_leads`,
      sql<{ data: ServicePackage }[]>`select data from mge_packages`,
      sql<{ data: Proposal }[]>`select data from mge_proposals`,
      sql<{ data: Deal }[]>`select data from mge_deals`,
      sql<{ key: string }[]>`select key from mge_opt_out`,
      sql<{ key: string }[]>`select key from mge_blocklist`,
    ]);
    return {
      leads: leads.map((r) => r.data),
      packages: packages.map((r) => r.data),
      proposals: proposals.map((r) => r.data),
      deals: deals.map((r) => r.data),
      optOut: optOut.map((r) => r.key),
      blocklist: blocklist.map((r) => r.key),
    };
  },

  async listLeads() {
    const sql = await ensure();
    const rows = await sql<{ data: Lead }[]>`select data from mge_leads`;
    return rows.map((r) => r.data).sort(byCreatedDesc);
  },

  async getLead(id) {
    const sql = await ensure();
    const rows = await sql<{ data: Lead }[]>`select data from mge_leads where id = ${id}`;
    return rows[0]?.data;
  },

  async upsertLead(lead) {
    const sql = await ensure();
    lead.updatedAt = new Date().toISOString();
    await sql`insert into mge_leads (id, data) values (${lead.id}, ${sql.json(lead as never)})
              on conflict (id) do update set data = excluded.data`;
    return lead;
  },

  async addOptOut(key) {
    const sql = await ensure();
    const k = key.trim().toLowerCase();
    if (k) await sql`insert into mge_opt_out (key) values (${k}) on conflict (key) do nothing`;
  },

  async isOptedOut(...keys) {
    const sql = await ensure();
    const norm = keys.filter(Boolean).map((k) => k!.trim().toLowerCase());
    if (norm.length === 0) return false;
    const rows = await sql`select 1 from mge_opt_out where lower(key) = any(${norm}) limit 1`;
    return rows.length > 0;
  },

  async isBlocked(...keys) {
    const sql = await ensure();
    const norm = keys.filter(Boolean).map((k) => k!.trim().toLowerCase());
    if (norm.length === 0) return false;
    const rows = await sql`select 1 from mge_blocklist where lower(key) = any(${norm}) limit 1`;
    return rows.length > 0;
  },

  async listPackages() {
    const sql = await ensure();
    const rows = await sql<{ data: ServicePackage }[]>`select data from mge_packages`;
    return rows.map((r) => r.data);
  },

  async getPackage(code) {
    const sql = await ensure();
    const rows = await sql<{ data: ServicePackage }[]>`select data from mge_packages where code = ${code}`;
    return rows[0]?.data;
  },

  async upsertPackage(pkg) {
    const sql = await ensure();
    await sql`insert into mge_packages (code, data) values (${pkg.code}, ${sql.json(pkg as never)})
              on conflict (code) do update set data = excluded.data`;
    return pkg;
  },

  async listProposals() {
    const sql = await ensure();
    const rows = await sql<{ data: Proposal }[]>`select data from mge_proposals`;
    return rows.map((r) => r.data).sort(byCreatedDesc);
  },

  async getProposal(id) {
    const sql = await ensure();
    const rows = await sql<{ data: Proposal }[]>`select data from mge_proposals where id = ${id}`;
    return rows[0]?.data;
  },

  async upsertProposal(p) {
    const sql = await ensure();
    p.updatedAt = new Date().toISOString();
    await sql`insert into mge_proposals (id, data) values (${p.id}, ${sql.json(p as never)})
              on conflict (id) do update set data = excluded.data`;
    return p;
  },

  async listDeals() {
    const sql = await ensure();
    const rows = await sql<{ data: Deal }[]>`select data from mge_deals`;
    return rows.map((r) => r.data).sort(byCreatedDesc);
  },

  async getDeal(id) {
    const sql = await ensure();
    const rows = await sql<{ data: Deal }[]>`select data from mge_deals where id = ${id}`;
    return rows[0]?.data;
  },

  async upsertDeal(d) {
    const sql = await ensure();
    d.updatedAt = new Date().toISOString();
    await sql`insert into mge_deals (id, data) values (${d.id}, ${sql.json(d as never)})
              on conflict (id) do update set data = excluded.data`;
    return d;
  },
};

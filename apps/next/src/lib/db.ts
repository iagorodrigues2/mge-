// Camada de dados — dispatcher entre dois backends com a MESMA interface:
//   • Postgres (db-pg.ts)  — quando DATABASE_URL/POSTGRES_URL existe (Vercel).
//   • JSON em arquivo (db-json.ts) — dev local, sem banco.
// O resto do app importa só daqui e nunca sabe qual backend está ativo.
import type { Db, Lead, ServicePackage, Proposal, Deal } from "./types";
import { jsonStore } from "./db-json";
import { pgStore } from "./db-pg";

export interface Store {
  getDb(): Promise<Db>;
  listLeads(): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | undefined>;
  upsertLead(lead: Lead): Promise<Lead>;
  addOptOut(key: string): Promise<void>;
  isOptedOut(...keys: (string | undefined)[]): Promise<boolean>;
  isBlocked(...keys: (string | undefined)[]): Promise<boolean>;
  listPackages(): Promise<ServicePackage[]>;
  getPackage(code: string): Promise<ServicePackage | undefined>;
  upsertPackage(pkg: ServicePackage): Promise<ServicePackage>;
  listProposals(): Promise<Proposal[]>;
  getProposal(id: string): Promise<Proposal | undefined>;
  upsertProposal(p: Proposal): Promise<Proposal>;
  listDeals(): Promise<Deal[]>;
  getDeal(id: string): Promise<Deal | undefined>;
  upsertDeal(d: Deal): Promise<Deal>;
  deleteLeadsBySource(source: string): Promise<number>;
  deleteLeadById(id: string): Promise<number>;
}

const usePg = Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);
const store: Store = usePg ? pgStore : jsonStore;

export function activeBackend(): "postgres" | "json" {
  return usePg ? "postgres" : "json";
}

export const getDb = () => store.getDb();
export const listLeads = () => store.listLeads();
export const getLead = (id: string) => store.getLead(id);
export const upsertLead = (lead: Lead) => store.upsertLead(lead);
export const addOptOut = (key: string) => store.addOptOut(key);
export const isOptedOut = (...keys: (string | undefined)[]) => store.isOptedOut(...keys);
export const isBlocked = (...keys: (string | undefined)[]) => store.isBlocked(...keys);
export const listPackages = () => store.listPackages();
export const getPackage = (code: string) => store.getPackage(code);
export const upsertPackage = (pkg: ServicePackage) => store.upsertPackage(pkg);
export const listProposals = () => store.listProposals();
export const getProposal = (id: string) => store.getProposal(id);
export const upsertProposal = (p: Proposal) => store.upsertProposal(p);
export const listDeals = () => store.listDeals();
export const getDeal = (id: string) => store.getDeal(id);
export const upsertDeal = (d: Deal) => store.upsertDeal(d);
export const deleteLeadsBySource = (source: string) => store.deleteLeadsBySource(source);
export const deleteLeadById = (id: string) => store.deleteLeadById(id);

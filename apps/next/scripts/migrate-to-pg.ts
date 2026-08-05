// Migra os dados do arquivo JSON local (data/mge.json) para o Postgres.
// Uso: com DATABASE_URL definido, rode `npm run db:migrate`.
// Idempotente: usa upsert por id/code, pode rodar mais de uma vez.
import { promises as fs } from "node:fs";
import path from "node:path";
import { pgStore } from "../src/lib/db-pg.ts";
import type { Db } from "../src/lib/types.ts";

async function main() {
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    console.error("Defina DATABASE_URL antes de migrar. Nada foi feito.");
    process.exit(1);
  }
  const file = path.join(process.cwd(), "data", "mge.json");
  let db: Db;
  try {
    db = JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    console.error(`Não achei ${file}. Nada para migrar.`);
    process.exit(1);
  }

  for (const p of db.packages ?? []) await pgStore.upsertPackage(p);
  for (const l of db.leads ?? []) await pgStore.upsertLead(l);
  for (const pr of db.proposals ?? []) await pgStore.upsertProposal(pr);
  for (const d of db.deals ?? []) await pgStore.upsertDeal(d);
  for (const k of db.optOut ?? []) await pgStore.addOptOut(k);

  console.log(
    `Migrado → Postgres: ${db.packages?.length ?? 0} pacotes, ${db.leads?.length ?? 0} leads, ` +
      `${db.proposals?.length ?? 0} propostas, ${db.deals?.length ?? 0} negócios, ${db.optOut?.length ?? 0} opt-outs.`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

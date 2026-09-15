#!/usr/bin/env node
// Sobe um lote de leads (exports/leads-lote-*.json) na máquina de PRODUÇÃO.
//
//   APP_SENHA='sua senha do painel' node scripts/subir-leads.mjs ../../exports/leads-lote-2026-09-15.json
//
// A senha vem do ambiente na hora de rodar — não fica em arquivo nenhum.
// Depois de subir, no painel /leads: Enriquecer (lote) → Qualificar → Aprovar/Disparar.
import { readFileSync } from "node:fs";

const PROD = process.env.MGE_URL || "https://mge-steel.vercel.app";
const senha = process.env.APP_SENHA;
const arquivo = process.argv[2];
if (!senha || !arquivo) {
  console.error("uso: APP_SENHA=... node scripts/subir-leads.mjs <lote.json>");
  process.exit(1);
}

const lote = JSON.parse(readFileSync(arquivo, "utf8"));
const leads = (lote.leads ?? lote).map(({ empresa, website, segmento, cidade, uf, whatsapp, whatsapp_fonte, cnpj }) =>
  ({ empresa, website, segmento, cidade, uf, whatsapp, whatsapp_fonte, cnpj }));

const login = await fetch(`${PROD}/api/auth/login`, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ senha }),
});
if (!login.ok) { console.error("login falhou:", login.status, await login.text()); process.exit(1); }
const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0];

const r = await fetch(`${PROD}/api/leads/import`, {
  method: "POST", headers: { "Content-Type": "application/json", cookie }, body: JSON.stringify({ leads }),
});
const d = await r.json();
console.log(JSON.stringify(d, null, 1));
if (!d.ok) process.exit(1);
console.log(`\n${d.created} criados · ${d.existentes?.length ?? 0} já existiam (não tocados) · ${d.skipped?.length ?? 0} sem site`);
console.log(`Agora em ${PROD}/leads: Enriquecer (lote) → Qualificar → conferir score A/B → Disparar 1º contato (lote).`);

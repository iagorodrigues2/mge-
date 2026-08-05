# Deploy — Máquina de Vendas (Vercel + Postgres)

O app é serverless: o filesystem do Vercel é efêmero e read-only, então em
produção os dados vivem em **Postgres**. Localmente, sem `DATABASE_URL`, ele usa
um arquivo JSON (`data/mge.json`) — não precisa de banco para desenvolver.

A escolha do backend é automática (`src/lib/db.ts`): há `DATABASE_URL` → Postgres;
senão → JSON. O esquema é criado sozinho na 1ª query (tabelas `mge_*`, JSONB) e
os 4 pacotes de preço são semeados uma vez.

## 1. Criar o Postgres

Qualquer Postgres serve (Neon, Supabase, Vercel Postgres). Recomendado: **Neon**
(tem plano grátis e integra no Vercel Marketplace).

- Pegue a **connection string com pooler** e `sslmode=require`:
  - Neon: use o host que contém `-pooler`.
  - Supabase: use a porta `6543` (Transaction Pooler).
- (O código já usa `prepare:false`, exigido por poolers/pgbouncer.)

## 2. Deploy no Vercel

1. Suba o repositório no GitHub (o app não é repo git ainda — `git init` na raiz
   `~/Downloads/mge`, commit, push).
2. No Vercel: **New Project** → importe o repo.
3. **Root Directory = `apps/next`** (é um monorepo/workspace). Framework: Next.js
   (detectado). Build/Install: padrão.
4. **Environment Variables** (Production e Preview):
   - `DATABASE_URL` = string do passo 1 (obrigatória)
   - `SERPER_API_KEY` (busca real de leads — opcional)
   - `WHATSAPP_BUSINESS_TOKEN`, `WHATSAPP_BUSINESS_PHONE_ID` (envio WhatsApp — opcional)
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (e-mail — opcional)
5. Deploy. Abra `/configuracoes` e confira **"Banco de dados: Postgres" = LIGADO**.

Alternativa via CLI (sem GitHub): `cd apps/next && npx vercel` (defina o Root e as
envs no fluxo interativo) e `npx vercel --prod`.

## 3. (Opcional) Migrar dados locais → Postgres

Se você já cadastrou leads/propostas no JSON local e quer levá-los:

```bash
cd apps/next
DATABASE_URL="sua-connection-string" npm run db:migrate
```

Idempotente (upsert por id/code) — pode rodar de novo sem duplicar.

## Notas

- Só o **primeiro** deploy cria as tabelas (na 1ª requisição); nada de rodar
  migração de schema à mão.
- `data/mge.json` é ignorado em produção (só o backend JSON o usa).
- Preços continuam no banco (tabela `mge_packages`), nunca no código.

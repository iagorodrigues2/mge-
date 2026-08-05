# Arquitetura

## Decisão original (prompt-mestre, seção 5)

Next.js (App Router) + Vercel + PostgreSQL gerenciado (Neon/Supabase) +
Redis/Upstash para filas + worker separado (Railway/Render/Fly.io) para
automação pesada (Playwright) + storage S3/Vercel Blob.

## O que aconteceu nesta sessão

A sessão de execução rodou numa sandbox cloud isolada. Ao tentar
`npm install` para montar o monorepo Next.js/Prisma, todas as chamadas de
rede para registros de pacote retornaram 403 com a mensagem
`Host not in allowlist`, tanto para `registry.npmjs.org` quanto para
`pypi.org`, `files.pythonhosted.org` e os espelhos do `apt`
(`archive.ubuntu.com`). Ou seja: nada de instalar dependências externas,
em nenhuma linguagem, nesta sandbox específica.

O que a sandbox já tinha pré-instalado, sem precisar de rede:

- **PostgreSQL 16** (binário completo, cluster local) — banco real, não
  simulado.
- **Python 3.11** com Flask, Jinja2, openpyxl, pandas, uvicorn/starlette.
- **Node 22** com React/React-DOM/TypeScript globais, mas **sem** Next.js,
  Express, Prisma ou qualquer bundler.
- **psql**, **playwright** (com Chromium local) para testar/capturar tela.

## Decisão tomada

Construir a mesma arquitetura lógica (schema relacional, agentes de
negócio, painel, exportação) usando o que já funcionava:

| Camada da spec original      | Implementado aqui                          |
|-------------------------------|---------------------------------------------|
| PostgreSQL gerenciado         | PostgreSQL 16 nativo local (mesmo SQL)       |
| Prisma ORM                    | SQL puro + `psql` via subprocess (`db.py`)   |
| Next.js App Router             | Flask + Jinja2 (`apps/web/`)                 |
| `packages/agents` em TS        | Python puro (`packages/agents/*.py`)         |
| Redis/Upstash + worker         | Não implementado (ver "O que falta" abaixo)  |
| Exportação xlsx                | `openpyxl` (igual ao planejado)              |
| Testes (Vitest/Jest/Playwright)| `unittest` + Playwright (só para screenshot) |

O schema (`packages/database/sql/001_init.sql`) é Postgres 100% padrão —
roda sem alteração em Neon ou Supabase. O arquivo
`packages/database/prisma/schema.prisma` modela as mesmas tabelas em
sintaxe Prisma, para quando alguém migrar para Next.js: dá para rodar
`prisma db pull` contra este mesmo banco e comparar, ou usar esse arquivo
como ponto de partida direto.

## O que falta para bater 100% com a seção 5 do prompt-mestre

1. **Deploy real na Vercel** — precisa de conta Vercel + repositório git +
   reescrita da camada de UI em Next.js (a lógica de negócio em
   `packages/agents` é portável quase 1:1 para TypeScript).
2. **Banco gerenciado (Neon/Supabase)** — trocar a `DATABASE_URL`; o schema
   já é compatível.
3. **Redis/Upstash + worker separado** — hoje não há fila. Para o volume do
   piloto (seção 13: 100 empresas, 20 contatos/dia) isso não é bloqueante;
   vira necessário quando o volume crescer.
4. **Storage S3/Vercel Blob** — hoje evidências/anexos ficam como texto/URL
   no banco, não há upload de arquivo binário.
5. **Worker de scraping (`/apps/worker`)** — não foi implementado.
   Deliberadamente: além da sandbox não ter internet liberada para testar
   scraping com segurança, scraping de Google Maps/Instagram/marketplaces em
   escala tem risco real de ToS e exige revisão caso a caso (ver
   `docs/politica-dados.md`). O Agente Scout, por ora, deve ser alimentado
   por importação manual/CSV — fonte explicitamente permitida na seção 6.1
   do prompt-mestre ("informações fornecidas pelo próprio usuário").

## Worker (`/apps/worker`)

Pasta criada como placeholder. Quando o volume justificar automação
assíncrona, o candidato natural é: fila (Redis/Upstash), Playwright para
navegação controlada, e handlers que chamam os mesmos módulos de
`packages/agents` (que já são puros e testáveis) para score/compliance/
copywriter — a lógica de negócio não muda, só o orquestrador.

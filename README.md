# Marketplace Growth Engine

Máquina de vendas e receita para consultoria e implantação de marketplaces
(Iago Rodrigues). Cobre pesquisa de empresas, auditoria de presença em
marketplace, score de qualificação, prospecção assistida, pipeline
comercial, propostas, contratos e financeiro — do lead pesquisado até o
dinheiro efetivamente recebido.

## Nota importante sobre a stack desta entrega

O documento original (`docs/prompt-mestre.md`, se você quiser guardá-lo aqui)
especifica Next.js + Prisma + Vercel + Redis/Upstash. A sessão que construiu
esta primeira versão rodou numa sandbox **sem acesso a registros de pacotes**
(nem npm, nem PyPI, nem espelhos do apt — todos bloqueados por política de
rede do ambiente). Não foi possível instalar Next.js nem o Prisma CLI ali.

Por isso esta entrega usa uma stack equivalente que já vinha pronta na
sandbox e que foi construída, testada e rodada de verdade:

- **Banco:** PostgreSQL 16 nativo, schema em SQL puro
  (`packages/database/sql/001_init.sql`) — Postgres padrão, portável para
  Neon/Supabase sem alterações.
- **Backend + painel:** Flask + Jinja2 (`apps/web/`) em vez de Next.js.
- **Acesso a dados:** `packages/database/db.py` fala com o Postgres via
  `psql` em subprocess (não havia driver Python instalado). Ao migrar para
  um ambiente com internet normal, troque por `psycopg2`/SQLAlchemy ou pelo
  Prisma Client — o `prisma/schema.prisma` incluído já modela o mesmo schema
  e serve de blueprint para essa migração.
- **Excel:** `openpyxl` (já instalado).
- **Testes:** `unittest` da stdlib (não havia `pytest` instalado).

Ver `docs/arquitetura.md` para a decisão completa e o caminho de migração
para a stack original quando você tiver acesso normal à internet (sua
própria máquina, ou um ambiente de CI/Vercel).

## Como rodar localmente

```bash
# 1. Banco (Postgres já deve estar rodando; se não, ajuste para seu ambiente)
psql -f packages/database/sql/001_init.sql "$DATABASE_URL"

# 2. Seed fictício (nunca dados reais — seção 16)
python3 packages/database/seed.py

# 3. Testes unitários dos agentes
python3 -m unittest discover -s tests -v

# 4. Painel web
python3 apps/web/app.py
# abre em http://localhost:8000

# 5. Exportação Excel
python3 packages/export/export_excel.py exports/saida.xlsx
```

Variáveis de ambiente: ver `.env.example`. Em dev local, `packages/database/.env`
já aponta para o Postgres local (`mge` / `mge_local_dev` / banco
`marketplace_growth_engine`) — troque para as credenciais do seu provedor
gerenciado (Neon/Supabase) em produção.

## Estrutura

```
/apps/web            painel Flask (Command Center, Tabela Mestre, Kanban, ...)
/apps/worker         (placeholder — automação pesada/scraping, ver docs/arquitetura.md)
/packages/database   schema SQL + Prisma (blueprint) + seed + acesso a dados
/packages/agents     score, compliance, copywriter (Python) — lógica pura, testável
/packages/export     exportação Excel (14 abas)
/docs                documentação obrigatória (seção 17)
/tests               testes unitários
```

## O que está pronto vs. o que falta

**Pronto e testado nesta sessão:**
- Schema completo (41 tabelas) aplicado a um Postgres real.
- Seed fictício cobrindo os 23 estágios do Kanban.
- Motor de score (0–100), compliance (blocklist/opt-out/horário
  comercial/dedup/dado sensível) e copywriter, com 21 testes unitários
  passando.
- Painel funcional: Command Center, Tabela Mestre, Kanban (mover estágio),
  aprovação de leads, WhatsApp assistido (link com clique humano
  obrigatório), Campanhas, Propostas, Financeiro, Templates de mensagem,
  Compliance, Configurações (preços versionados).
- Exportação Excel com as 14 abas obrigatórias.

**Não incluído nesta sessão (motivo em cada doc):**
- Análise do vídeo do Facebook — requer navegador autenticado na sua conta;
  ver `docs/analise-video.md`.
- Scraping real de CNPJ/Google Maps/Instagram/marketplaces — a sandbox não
  tinha internet liberada para validar isso com segurança; o agente Scout
  está desenhado para receber dados por importação manual/CSV por enquanto
  (fonte explicitamente permitida na seção 6.1).
- Deploy em produção (Vercel + banco gerenciado), WhatsApp Business API
  oficial, assinatura eletrônica, provedor de pagamentos — dependem de
  contas/credenciais que só você pode criar.
- Migração para Next.js/Prisma — o schema e a lógica de negócio já estão
  prontos para isso; falta só reescrever a camada de UI/API num ambiente com
  acesso a npm.

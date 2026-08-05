# Máquina de Vendas — app Next.js (fluxo operacional)

App que roda **de verdade nesta máquina** o fluxo completo: buscar leads por
nicho → pontuar/classificar → aprovar → enviar (WhatsApp + e-mail). Substitui o
painel Flask/Postgres (que exigia Postgres instalado) pelo stack-alvo do
projeto (Next.js), com banco em arquivo JSON para rodar sem serviço externo.

## Rodar

```bash
cd apps/next
npm install
npm run dev            # http://localhost:3100
```

Sem nenhuma variável de ambiente, roda em **modo demonstração**:
- Scout **gera** leads fictícios (marcados “(FICTÍCIA)”) e os pontua.
- Aprovar → WhatsApp devolve um **link wa.me** pronto (envio assistido) e o
  e-mail vira **rascunho**.

## Ligar o envio real (opcional) — `.env.local`

Copie `.env.example` para `.env.local` e preencha o que tiver:

| Recurso | Variáveis | Efeito |
|--------|-----------|--------|
| Busca real de leads | `SERPER_API_KEY` (serper.dev) ou `BRAVE_API_KEY` | Scout pesquisa empresas reais do nicho na internet |
| WhatsApp automático | `WHATSAPP_BUSINESS_TOKEN` + `WHATSAPP_BUSINESS_PHONE_ID` | Aprovar **envia** a mensagem pela Cloud API da Meta |
| E-mail | `SMTP_HOST/PORT/USER/PASS/FROM` | Aprovar envia o e-mail por SMTP |

## Fluxo (do lead pesquisado ao dinheiro recebido)

1. **Command Center** (`/`) — funil ao vivo, receita (potencial → contratada →
   recebida) e botão **Rodar cadência** (envia follow-ups vencidos).
2. **Scout** (`src/lib/scout.ts`) — busca por nicho; real (Serper/Brave) ou gerador.
3. **Score** (`src/lib/score.ts`) — porte fiel do `packages/agents/score.py`
   (0–100 → A/B/Nutrir/Não abordar). Sinal ausente nunca conta a favor.
4. **Leads** (`/leads` + `/leads/[id]`) — só **A e B** liberam **Aprovar e enviar**.
   O detalhe do lead mostra o score, a timeline de mensagens, a cadência e o
   formulário de proposta.
5. **Aprovar** (`src/lib/dispatch.ts`) — a aprovação é o **clique humano**
   exigido pela compliance. Ao aprovar: checa compliance
   (`src/lib/compliance.ts`: opt-out, blocklist, horário comercial) → formula a
   mensagem com os fatos do lead (`src/lib/copywriter.ts`, com lint de frases
   proibidas) → envia WhatsApp + e-mail → registra a tentativa e move o estágio.
6. **Cadência** (`src/lib/cadence.ts`) — contato inicial → follow-up 1 (2d) →
   follow-up 2 (+3d) → encerramento (+3d), respeitando intervalo e horário.
   "Registrar resposta" para a cadência e move para *em conversa*.
7. **Proposta** (`src/lib/proposals.ts`, `/propostas`) — gerada a partir do
   pacote + preço do store (nunca do código). Estados: rascunho → enviada →
   aceita/perdida. Aceite cria o negócio no financeiro.
8. **Financeiro** (`src/lib/financeiro.ts`, `/financeiro`) — plano de parcelas
   (90 dias: 50/25/25; anual: entrada + 11 mensais). **"Ganho e recebido" só
   após a entrada efetivamente paga** (seção 12H) — só então o lead vira *ganho*.
9. **Configurações** (`/configuracoes`) — status das integrações (quais chaves
   estão ativas) e edição dos preços dos pacotes (no store, não no código).

## Compliance (regras duras, não sugestões)

- Nada é enviado sem a sua aprovação (clique humano por lead).
- Só horário comercial (08–20h, dias úteis, America/Sao_Paulo).
- Opt-out e blocklist barram o envio.
- Nunca inventa CNPJ/telefone/faturamento; leads fictícios são marcados.

## Migração para produção

O store JSON (`src/lib/db.ts`) está isolado atrás de funções
(`listLeads/getLead/upsertLead/...`). Para ir a Postgres/Prisma (Vercel/Neon),
basta reimplementar essas funções — o resto do app não muda. Preços continuam
fora do código (a implementar: tabela `service_packages`/`price_versions`).

## Dados

`data/mge.json` (git-ignored). Apague o arquivo para zerar; o app recria vazio.

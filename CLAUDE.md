# CLAUDE.md — instruções para sessões futuras do Claude neste repositório

Este arquivo orienta qualquer sessão futura (Claude Code, Cowork, ou outra)
que continue este projeto.

## Contexto de negócio (não negociável)

- O sistema vende os serviços de **Iago Rodrigues** (marketplace
  consulting/implantação: Mercado Livre, Amazon, Shopee). Não é uma agência
  de tráfego nem um curso.
- Preços e ofertas **nunca são hard-coded**. Vivem na tabela de pacotes
  (`ServicePackage`, editável em `/configuracoes`). Se você for adicionar uma
  tela ou endpoint que mostra preço, leia da tabela — não escreva o valor no
  código.
- Fonte da verdade do COMPORTAMENTO COMERCIAL do agente Vendedor (apps/next):
  `docs/claude-v3-maquina-de-vendas.md` (entregue pelo Iago em 2026-09-04,
  substitui o `docs/prompt-mestre.md` antigo). Antes de mudar tom, catálogo,
  scripts de objeção ou regra de opt-out em `apps/next/src/lib/ai-sdr.ts` /
  `sdr-guards.ts`, leia esse documento primeiro.
- Regras de compliance (`packages/agents/compliance.py`) são obrigatórias,
  não sugestões: sem envio automático de WhatsApp sem clique humano, sem
  contato fora do horário comercial, sem ignorar opt-out/blocklist, sem
  inventar dado de empresa.
- "Ganho e recebido" só é verdade depois da confirmação do primeiro
  pagamento — nunca trate proposta ou contrato assinado como venda
  concluída (seção 12H).

## Contexto técnico desta entrega

A primeira versão foi construída numa sandbox sem acesso a npm/PyPI/apt.
Por isso: Flask em vez de Next.js, SQL puro + `psql` via subprocess em vez
de Prisma Client, `unittest` em vez de `pytest`. Ver `docs/arquitetura.md`
para o raciocínio completo e o caminho de migração.

**Antes de assumir que falta algo, verifique se já não foi implementado
nesta stack alternativa** — a lógica de negócio (score, compliance,
copywriter, schema) é a peça que mais importa preservar; a camada de UI é
a que deve ser trocada quando houver acesso normal à internet.

## Convenções

- Todo texto de UI e commit em português (o usuário e o negócio são
  brasileiros).
- Nunca usar dado real em seed/teste (seção 16). Nomes de empresas fictícias
  devem soltar claramente como fictícios (ex: "Casa Bela Utilidades").
- Toda mudança de estágio no Kanban deve gravar em `stage_history`.
- Toda decisão de aprovação/rejeição/bloqueio de lead deve gravar em
  `lead_approvals`.

## Próximos passos sugeridos (não fazer sem validar com o usuário antes)

1. Validar a oferta manualmente (ver conversa inicial) antes de investir em
   mais automação.
2. Se/quando migrar para Next.js: usar `prisma/schema.prisma` como fonte de
   verdade e `prisma db pull` a partir do Postgres já populado para conferir
   equivalência.
3. WhatsApp Business API oficial e scraping em escala só depois de definido
   com o usuário — ver `docs/implantacao-whatsapp.md` e
   `docs/politica-dados.md`.

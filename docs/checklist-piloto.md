# Checklist do piloto (seção 13)

Trate como metas de validação, não garantia.

## Antes de começar

- [ ] Revisão jurídica/compliance da política de dados (`docs/politica-dados.md`)
- [ ] Número de WhatsApp dedicado para uso comercial (não o pessoal)
- [ ] Rotina de opt-out testada (já implementada em `packages/agents/compliance.py`, testes em `tests/test_agents.py`)
- [ ] Limite diário de campanha configurado (`CampaignBudget` — já no schema)
- [ ] Uma campanha, um segmento (seção 4.1) — comece por Casa/Móveis/Decoração

## Durante o piloto (uma campanha por vez)

- [ ] 100 empresas pesquisadas
- [ ] 40 leads com score acima de 65
- [ ] 20 contatos aprovados manualmente
- [ ] Acompanhar taxa de resposta
- [ ] Acompanhar taxa de resposta positiva
- [ ] Registrar reuniões, propostas, fechamentos
- [ ] Registrar tempo gasto por lead
- [ ] Registrar motivo de perda de cada negócio perdido
- [ ] Registrar taxa de opt-out

## Não aumentar volume até descobrir

- [ ] Qual segmento mais responde
- [ ] Qual mensagem gera conversa
- [ ] Qual perfil fecha
- [ ] Qual é a principal objeção
- [ ] Qual é a capacidade real de entrega de Iago (quantos projetos
      simultâneos ele consegue tocar bem)

## Onde ver os números

- Command Center (`/`) — visão do dia.
- Tabela Mestre (`/leads`) — filtrar por status/segmento/score.
- Exportação Excel (`packages/export/export_excel.py`) — aba "Dashboard"
  tem os indicadores agregados; aba "Motivos de Perda" para o pós-mortem de
  cada campanha piloto.

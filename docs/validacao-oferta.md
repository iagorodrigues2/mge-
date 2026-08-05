# Validação da oferta — playbook do piloto (passo #1)

> Objetivo: **descobrir se a oferta vende antes de investir em automação.**
> Este documento é auto-suficiente. Você (Iago) executa tudo na mão — WhatsApp,
> telefone e uma planilha — sem depender do painel Flask nem do Postgres.
> Fonte das regras: `docs/manual-comercial.md`, `docs/prompt-mestre.md`
> (seções 3, 4, 6.3, 8, 9, 10) e `docs/checklist-piloto.md`.

Onde registrar tudo: **`exports/validacao-piloto.xlsx`** (gerado por
`python3 scripts/gerar_planilha_validacao.py`). Uma linha por empresa.

---

## 1. O que estamos validando (hipóteses)

Não é "vender o máximo". É responder, com dados reais de ~1 campanha:

1. **Segmento** — Casa/Móveis/Decoração responde a essa abordagem?
2. **Mensagem** — o contato inicial gera conversa (não só "obrigado")?
3. **Perfil** — quem realmente fecha? (faturamento, nº de SKUs, quem decide)
4. **Objeção principal** — o que mais trava? (preço, já tem agência, sem tempo)
5. **Capacidade de entrega** — quantos projetos o Iago toca bem ao mesmo tempo?

Enquanto essas 5 não estiverem respondidas, **não aumentar volume** e **não
automatizar** (seção 13 / `checklist-piloto.md`).

## 2. Meta do piloto (uma campanha, um segmento)

Segmento: **Casa, móveis, decoração, cama/mesa/banho** (ordem #1 — o mais
simples de implantar; ver `manual-comercial.md`).

| Etapa                       | Meta   |
|-----------------------------|--------|
| Empresas pesquisadas        | 100    |
| Leads com score ≥ 65        | 40     |
| Contatos aprovados por você  | 20     |
| Conversas iniciadas          | acompanhar |
| Reuniões de diagnóstico      | acompanhar |
| Propostas enviadas           | acompanhar |
| Fechamentos (entrada paga)   | acompanhar |

Tratar como **metas de aprendizado, não garantia**.

## 3. Critérios de decisão (go / no-go) — defina ANTES de começar

Depois das 20 abordagens aprovadas, decida com base no que aconteceu:

- **Escalar** (ir para 2ª campanha / começar a automatizar): ≥ 3 reuniões de
  diagnóstico marcadas **e** ≥ 1 proposta em aberto com fit claro.
- **Ajustar e repetir** (mesmo segmento, nova mensagem/ICP): houve resposta,
  mas nenhuma reunião marcou — o gargalo é mensagem ou timing, não demanda.
- **Trocar de segmento**: taxa de resposta baixíssima (< 5%) e nenhuma
  conversa qualificada — testar segmento #2 (Moda) com o mesmo playbook.
- **Parar e reavaliar oferta/preço**: reuniões acontecem mas todas travam no
  mesmo ponto (ex.: preço) → revisar posicionamento antes de gastar mais tempo.

Anote a decisão e o porquê na aba **Decisão** da planilha.

---

## 4. Onde achar as empresas (prospecção manual permitida)

Fontes públicas, uma empresa por vez (seção 6.1 — importação manual é fonte
explicitamente permitida nesta fase):

- Instagram / Google Maps do segmento na sua região.
- Sites de lojas de casa/decoração com marca própria.
- Feiras e catálogos do setor.
- Indicações e rede do próprio Iago.

Para cada empresa, colete só o que é **público**: nome, cidade/UF, site,
Instagram, telefone/e-mail comercial, ideia do catálogo. **Nunca** dado
sensível, nunca inventar CNPJ ou faturamento (seção 16 / compliance).

### Perfil de cliente ideal (priorizar)

CNPJ ativo, **3+ anos**, marca própria/fabricação/distribuição, catálogo de
**20–500 SKUs**, produto físico com demanda B2C, estoque próprio, presença
digital (site/Instagram), **ausência ou execução ruim em marketplaces**,
margem aparente suficiente, decisor identificável.

**Evitar:** autônomo, sem produto físico, sem estoque, sob encomenda,
ticket/margem mínimos, empresa encerrada/reputação crítica, ou operação já
madura e dominante em marketplace.

---

## 5. Score manual rápido (0–100) — sem precisar do app

Some os pontos com base no que você conseguiu ver publicamente. Se não sabe
um item, **conte como 0** (não chute a favor). Espelha `packages/agents/score.py`.

| Dimensão                | Como pontuar                                                                 | Máx |
|-------------------------|------------------------------------------------------------------------------|-----|
| Product fit             | produto físico (8) + catálogo 20–500 SKUs (8, ou 3 se fora da faixa) + marca própria (4) | 20 |
| Marketplace gap         | 5 por marketplace ausente (ML/Amazon/Shopee) + execução ausente (5)/fraca (3) + preço desalinhado (2) | 20 |
| Business structure      | 3+ anos (6) + tem site (5) + decisor identificado (4)                         | 15 |
| Catalog quality         | catálogo 20–500 SKUs (8) + Instagram ativo (4) + execução boa em mkt (3)      | 15 |
| Investment signals      | capacidade de investir: alto (10) / médio (6) / baixo (2)                     | 10 |
| Contactability          | contato comercial público (6) + decisor identificado (4)                      | 10 |
| Problem clarity         | dor evidente com marketplace: alta (10) / média (6) / baixa (2)               | 10 |

**Classificação:** ≥ 80 = **A** (Implantação 90) · 65–79 = **B** (Mentoria/
Diagnóstico) · 50–64 = **NUTRIR** · < 50 = **NÃO ABORDAR**.

Só aprove abordagem para **A e B**. Registre o total na planilha.

---

## 6. A oferta (posicionamento — regra de ouro 3.5)

**Nunca abra vendendo "mentoria".** Venda a oportunidade / o risco de margem /
o diagnóstico primeiro. O preço só entra depois de entender o estágio da empresa.

| Oferta                            | Referência | Duração | Quando usar |
|-----------------------------------|-----------|---------|-------------|
| Diagnóstico Executivo Marketplace | R$ 2.500  | —       | porta de entrada / lead B ainda frio |
| Mentoria Marketplace 90           | R$ 9.000  | 90 dias | empresa **já tem** equipe de execução |
| **Implantação Marketplace 90**    | **R$ 20.000** | 90 dias | **oferta principal** — precisa estruturar catálogo, preço, operação, logística, canais |
| Programa Anual de Escala          | R$ 40.000 (R$ 30.000 Cliente Fundador, máx. 3) | 12 meses | escala continuada |

Regras duras: sempre mostrar o preço oficial ao lado da condição fundador;
sem falsa urgência; nenhum projeto inicia antes da confirmação da **entrada**;
"ganho e recebido" só depois do 1º pagamento (seção 12H).

---

## 7. Cadência (NÃO disparar tudo de uma vez — clique humano a cada passo)

Cada mensagem precisa carregar **um fato real** e **uma oportunidade
específica** da empresa. Elogio genérico e promessa de resultado são proibidos
(`copywriter.py` faz esse lint). Máx. ~700 caracteres. Fora do horário
comercial não envia.

**Contato inicial**
> Olá, [nome]. Analisei rapidamente a presença digital da [empresa] e encontrei uma oportunidade específica em [canal ou categoria]. Vocês têm um catálogo com boa aderência a marketplace, mas hoje [fato objetivo]. Eu atuo na implantação e escala de Mercado Livre, Amazon e Shopee, olhando margem, estoque, logística e operação. Posso te enviar um diagnóstico bem curto com os três pontos que identifiquei?

**Follow-up 1** (só se não respondeu — novo motivo, não insistência)
> [Nome], complementando a mensagem anterior: o principal ponto que identifiquei foi [oportunidade real]. Não estou falando de simplesmente cadastrar produtos, mas de estruturar o canal para não perder margem e não criar um problema operacional. Faz sentido eu te mandar o diagnóstico?

**Follow-up 2**
> Preparei um resumo da [empresa] com três pontos: [ponto 1], [ponto 2] e [ponto 3]. Caso marketplace esteja entre as prioridades deste semestre, consigo te explicar em uma conversa objetiva como eu estruturaria isso.

**Encerramento respeitoso** (depois disso, não contatar sem novo motivo legítimo)
> [Nome], vou encerrar meu contato para não ser inconveniente. Caso a expansão em Mercado Livre, Amazon ou Shopee entre no planejamento da [empresa], fico à disposição para compartilhar o diagnóstico que preparei.

### Exemplo preenchido (empresa fictícia — Casa Bela Utilidades)
> Olá, Marina. Analisei rapidamente a presença digital da Casa Bela Utilidades e encontrei uma oportunidade específica em cama, mesa e banho. Vocês têm um catálogo com boa aderência a marketplace, mas hoje a marca não aparece no Mercado Livre e no Amazon só há revendedores usando suas fotos. Eu atuo na implantação e escala de Mercado Livre, Amazon e Shopee, olhando margem, estoque, logística e operação. Posso te enviar um diagnóstico bem curto com os três pontos que identifiquei?

---

## 8. Respostas a objeções (seção 9)

- **Demonstrou interesse:** "Perfeito. Antes de marcar, me responda só três pontos para eu não fazer uma conversa genérica: vocês já vendem em algum marketplace, qual parte hoje mais trava o projeto e existe alguém da equipe responsável pela operação digital?"
- **Pergunta preço:** "O investimento depende do nível de implantação. Trabalho com uma mentoria de 90 dias para quem já tem equipe de execução e com uma implantação mais completa para quem precisa estruturar catálogo, preço, operação, logística e canais. Antes de te passar o formato correto, preciso entender em que estágio vocês estão. Consigo fazer isso numa conversa objetiva."
- **Já tem agência:** "Ótimo. Meu trabalho normalmente não concorre com agência de tráfego ou operação de catálogo. Eu entro na estratégia, margem, estoque, logística, integração e decisões do canal. A operação atual já entrega lucro, previsibilidade e escala, ou ainda existem gargalos?"
- **Sem orçamento:** "Entendi. Nesse caso não faz sentido forçar agora. Posso deixar o diagnóstico registrado e, quando o projeto entrar no orçamento, retomamos com os pontos já mapeados."
- **Pede proposta sem reunião:** "Consigo enviar, mas uma proposta sem entender catálogo, margem, estoque e equipe tende a ficar genérica. Prefiro uma conversa curta, identificar o formato certo e depois enviar algo coerente com a realidade de vocês."

---

## 9. Roteiro da reunião de diagnóstico (30–45 min)

1. Faturamento aproximado? 2. Principais produtos? 3. Quantos SKUs?
4. Faixa média de margem bruta? 5. Já vendem em ML/Amazon/Shopee?
6. Quanto esses canais representam? 7. Quem cuida da operação? 8. Qual ERP?
9. Como funciona estoque e emissão fiscal? 10. Repõem produto com velocidade?
11. Já tentaram marketplace antes? 12. O que deu errado?
13. Resultado relevante nos próximos 6 meses? 14. Custo de continuar sem o
canal (ou mal estruturado)? 15. Quem participa da decisão? 16. Existe
orçamento e prioridade para implantação?

**Fechamento:**
> Pelo que você me explicou, o problema não é falta de produto. O gargalo está em [resumo]. O formato que faz sentido é [oferta], porque precisamos atuar em [entregas]. Eu não entraria apenas para orientar anúncios; a proposta é estruturar o canal para funcionar com margem e operação. O investimento é [valor]. Se houver alinhamento, o próximo passo é formalizar o escopo, reunir os acessos e iniciar o diagnóstico detalhado.

---

## 10. Guardrails de compliance (obrigatórios — não são sugestões)

- Sem WhatsApp automático: **cada envio é clique humano**.
- Só horário comercial. Respeitar opt-out/blocklist na hora — quem pediu para
  não receber, sai da lista para sempre.
- Sem dado sensível, sem inventar faturamento/CNPJ.
- Número de WhatsApp **dedicado** ao comercial (não o pessoal).
- Registrar toda decisão de abordar/rejeitar e todo opt-out na planilha.

---

## 11. Rotina semanal sugerida

1. **Seg** — pesquisar ~25 empresas, pontuar, marcar A/B na planilha.
2. **Ter/Qua** — aprovar até 20, enviar contato inicial (clique a clique).
3. **Qui** — follow-ups de quem não respondeu; responder objeções.
4. **Sex** — marcar/rodar reuniões; preencher métricas; revisar go/no-go.

No fim da campanha, preencher a aba **Métricas** e **Motivos de perda** e tomar
a decisão da seção 3.

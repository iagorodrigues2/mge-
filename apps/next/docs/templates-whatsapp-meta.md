# Templates de WhatsApp para submeter à Meta

**Para o Iago:** copie e cole cada bloco no Meta Business Manager →
WhatsApp Manager → **Modelos de mensagem** → Criar modelo.

Reescritos em 2026-09-09 pra bater com o **CLAUDE V3** (a versão antiga só
falava de marketplace; o Iago hoje atua em duas frentes — marketplace e
importação — e isso precisa aparecer já no primeiro contato, senão o
template vende uma coisa e a conversa que abre depois é outra).

## Por que isso existe (a regra que define tudo)

Conversa **iniciada pela empresa** só pode sair como **template aprovado**.
Texto livre é rejeitado pela API. A janela de 24h de conversa livre só abre
**depois que o lead responde** — e é aí que o agente Vendedor assume e conduz
sozinho, com todas as regras do CLAUDE V3 (`docs/claude-v3-maquina-de-vendas.md`).

Consequência prática: **o template não vende nada**. Ele tem um único trabalho —
**ganhar a resposta**. Toda a inteligência (catálogo, preço, diagnóstico) vem
depois, na conversa livre.

## Regras da Meta que os textos abaixo respeitam

- Categoria **MARKETING** (é prospecção; classificar como UTILITY seria motivo de
  reprovação e risco de banimento do número).
- Variáveis `{{1}}`, `{{2}}` não podem abrir nem fechar a mensagem, nem ficar
  coladas uma na outra.
- Nada de promessa de resultado, percentual ou número inventado — a regra de
  honestidade do CLAUDE V3 (§14/§24) e a política da Meta batem no mesmo ponto.
- Toda mensagem de marketing precisa de saída fácil (o opt-out é tratado pelo
  webhook: qualquer variação de "não tenho interesse", "não quero mais
  mensagens", "pare de me chamar", "não me procure", "sair", "parar",
  "descadastrar" ou "stop" encerra na hora — ver `sdr-guards.ts`).
- Sem saudação vazia ("Olá, tudo bem?") — reprovada pela nossa própria regra de
  abertura, não pela Meta.
- Nenhum template cita preço — isso só existe na conversa livre, e só quando o
  lead pergunta (regra nova do V3: nunca soltar valor sem ser perguntado).

---

## ⚠️ v2 — SUBMETER ESTES (a v1 tinha "Bom dia" fixo)

A v1 travava a saudação no corpo aprovado: disparo à tarde mandava "Bom dia", e
o follow-up automático da cadência (que roda em horário que ninguém controla)
mandaria "Bom dia" às 15h. Também dizia "Bom dia, responsável" — e anunciar
"responsável" na primeira linha entrega que é disparo automático.

Na v2 a saudação é **variável calculada no envio** (fuso de São Paulo: até 12h
"bom dia", até 18h "boa tarde", depois "boa noite") e o nome sai. `Olá, {{1}}.`
resolve a regra da Meta de não começar com variável e soa natural.

O código escolhe sozinho a melhor versão aprovada: enquanto a v2 estiver em
análise ele usa a v1; assim que aprovar, passa a usar a v2 sem ninguém mexer.

### `abordagem_geral_v2` · Marketing · Português (BR)
```
Olá, {{1}}. Aqui é o Rafael, consultor comercial do Iago Rodrigues — ele trabalha com implantação e escala de operações de marketplace (Mercado Livre, Amazon, Shopee) e também com importação, para fabricantes, logistas e distribuidores.

Vi que a {{2}} atua com {{3}}. Trabalhamos com empresas nesse perfil na parte de margem, catálogo, estrutura de operação e, quando faz sentido, importação direta.

Faz sentido eu te explicar em duas linhas por que entrei em contato?
```
Exemplos: `{{1}}` = `boa tarde` · `{{2}}` = `Teka` · `{{3}}` = `cama, mesa e banho`

### `abordagem_industria_v2` · Marketing · Português (BR)
```
Olá, {{1}}. Aqui é o Rafael, consultor comercial do Iago Rodrigues.

Ele trabalha com indústrias e distribuidores em duas frentes: estruturação da operação em marketplace (catálogo, margem, estoque, logística) e importação — do diagnóstico de viabilidade até o acompanhamento da operação completa.

Estou entrando em contato com a {{2}} porque o perfil de vocês é o tipo de operação em que ele costuma atuar. Posso te explicar rapidamente o motivo do contato?
```
Exemplos: `{{1}}` = `bom dia` · `{{2}}` = `Probel`

### `retomada_sem_resposta_v2` · Marketing · Português (BR)
```
Olá, {{1}}. Retomando meu contato sobre a operação da {{2}}.

Não quero tomar seu tempo à toa: se não for prioridade agora, é só me dizer que eu encerro por aqui.

Se fizer sentido, me responde e eu explico em dois minutos.
```
Exemplos: `{{1}}` = `boa tarde` · `{{2}}` = `Teka`

---

## Template 1 — `abordagem_geral_v1` (principal)

**Nome:** `abordagem_geral_v1`
**Categoria:** Marketing · **Idioma:** Português (BR)

**Corpo:**
```
Bom dia, {{1}}. Aqui é o consultor comercial do Iago Rodrigues — ele trabalha com implantação e escala de operações de marketplace (Mercado Livre, Amazon, Shopee) e também com importação, para fabricantes e distribuidores.

Vi que a {{2}} atua com {{3}}. Trabalhamos com empresas nesse perfil na parte de margem, catálogo, estrutura de operação e, quando faz sentido, importação direta.

Faz sentido eu te explicar em duas linhas por que entrei em contato?
```

**Variáveis de exemplo (a Meta exige):**
- `{{1}}` = `responsável`
- `{{2}}` = `Teka`
- `{{3}}` = `cama, mesa e banho`

> A última frase é o ponto todo: pede uma resposta barata ("faz sentido?"), não
> uma reunião. A primeira mensagem vende a próxima resposta — nunca um produto
> ou um preço.

---

## Template 2 — `abordagem_industria_v1` (quando temos o CNAE confirmado)

**Nome:** `abordagem_industria_v1`
**Categoria:** Marketing · **Idioma:** Português (BR)

**Corpo:**
```
Bom dia. Aqui é o consultor comercial do Iago Rodrigues.

Ele trabalha com indústrias e distribuidores em duas frentes: estruturação da operação em marketplace (catálogo, margem, estoque, logística) e importação — do diagnóstico de viabilidade até o acompanhamento da operação completa.

Estou entrando em contato com a {{1}} porque o perfil de vocês é o tipo de operação em que ele costuma atuar. Posso te explicar rapidamente o motivo do contato?
```

**Variável de exemplo:**
- `{{1}}` = `Probel`

---

## Template 3 — `retomada_sem_resposta_v1` (follow-up após 24h de silêncio)

**Nome:** `retomada_sem_resposta_v1`
**Categoria:** Marketing · **Idioma:** Português (BR)

**Corpo:**
```
Bom dia, {{1}}. Retomando meu contato sobre a operação da {{2}}.

Não quero tomar seu tempo à toa: se não for prioridade agora, é só me dizer que eu encerro por aqui.

Se fizer sentido, me responde e eu explico em dois minutos.
```

**Variáveis de exemplo:**
- `{{1}}` = `responsável`
- `{{2}}` = `Teka`

> Oferecer a saída aumenta resposta e reduz denúncia — que é o que derruba a
> qualidade do número na Meta. Máximo de 2 retomadas por lead antes de encerrar
> de vez (nutrir).

---

## Como a máquina usa cada template (ligado em 2026-09-10)

`src/lib/wa-templates.ts` liga a cadência do CRM aos modelos aprovados.
`dispatchStep` decide o canal antes de enviar:

| Situação | O que sai |
| --- | --- |
| Janela de 24h **fechada**, etapa `contato_inicial`, lead **com CNAE ou perfil confirmado** | template `abordagem_industria_v1` |
| Janela **fechada**, etapa `contato_inicial`, demais leads | template `abordagem_geral_v1` |
| Janela **fechada**, etapas `followup_1` e `followup_2` | template `retomada_sem_resposta_v1` |
| Janela **fechada**, etapa `encerramento` | **não envia nada** — encerra em silêncio (o lead vai para `nutrir`) |
| Janela **aberta** (lead respondeu nas últimas 24h) | texto livre: o agente Vendedor assume |
| **~24h antes da call** | `lembrete_reuniao_v1` se a janela estiver fechada; texto livre se aberta |
| **~30 min antes da call** | idem — e se o lead respondeu a confirmação da véspera, a janela está aberta e sai de graça |

Por que o `encerramento` não tem template: pagar uma mensagem para avisar que
vamos parar de procurar só gera custo e risco de denúncia.

O corpo dos templates está **copiado** em `wa-templates.ts` — a Meta envia o
dela, a cópia serve para registrar no histórico do lead o que ele recebeu e
para preencher o link `wa.me` no modo assistido. **Mudou o texto na Meta, mude
lá também**, senão o CRM mente sobre o que foi enviado.

Detalhe de horário: os três textos começam com "Bom dia" e o cron roda 09:00
BRT — combina. Se um dia o disparo mudar de horário, os templates precisam ser
reescritos e reaprovados.

### Conferir se está tudo no lugar

`GET /api/whatsapp/templates` compara o que o código pede com o que existe na
WABA de produção e mostra o número ligado ao `phone id`. É o teste que pega o
erro silencioso mais caro: template criado na conta de **teste** enquanto a
produção aponta para a WABA definitiva — no painel da Meta os dois aparecem
"Active", mas o envio volta com "template does not exist".

## Template 4 — `lembrete_reuniao_v1` (confirmação e lembrete da call)

**Nome:** `lembrete_reuniao_v1`
**Categoria:** **Utility** (não é Marketing — é a confirmação de um compromisso
que o próprio lead agendou; Utility também é mais barato) · **Idioma:** Português (BR)

**Corpo:**
```
Olá, {{1}}. Passando para confirmar sua conversa com o Iago Rodrigues.

Quando: {{2}}
Link da call: {{3}}

Se precisar remarcar, é só responder esta mensagem.
```

**Variáveis de exemplo:**
- `{{1}}` = `Rafael`
- `{{2}}` = `sexta (11/09) às 10h`
- `{{3}}` = `https://meet.google.com/qtk-hifp-rnu`

> POR QUE ESTE EXISTE: a janela de 24h de texto livre é aberta pelo LEAD. Uma call
> marcada para daqui a três dias tem a janela FECHADA na hora de lembrar — e a
> maioria das calls é assim, porque a agenda oferece os próximos dias livres. Sem
> este template, o lembrete por WhatsApp simplesmente não sairia.

## Checklist de aprovação

1. Meta Business Manager verificado (documento da empresa) — "Step 3. Business
   verification" no painel do app.
2. Número **dedicado** — já feito em 2026-09-08 (`+55 31 7206-5545`, WABA
   `1096814143280285`). Não pode ser um número que já usa o WhatsApp comum ou
   o Business — uma vez migrado, o app deixa de funcionar nele.
3. Criar os 3 modelos acima e aguardar aprovação (costuma sair em horas; pode
   levar até 48h).
4. Confirmar as variáveis de ambiente na Vercel: `WHATSAPP_BUSINESS_TOKEN`,
   `WHATSAPP_BUSINESS_PHONE_ID` (`1290792064124191`), `WHATSAPP_WABA_ID`
   (`1096814143280285`), `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`.
5. Webhook já cadastrado e a WABA nova já inscrita no app (confirmado via
   `/api/whatsapp/subscribe`).
6. **"Add payment to send business-initiated messages"** — item pendente no
   painel da Meta; sem isso, mensagem de template paga não sai.

## Se um template for reprovado

O motivo mais comum é categoria errada (marcar como Utility o que é Marketing) e
promessa de resultado. Nenhum dos textos acima promete resultado. Se vier
reprovação, o caminho é reescrever mantendo a estrutura — o corpo pode mudar sem
que nada do agente precise mudar, porque o template só serve para ganhar a
resposta.

## Qualidade do número (o que realmente derruba a operação)

A Meta mede bloqueios e denúncias. Dois hábitos protegem o número:
- **respeitar o opt-out na hora** (o webhook já faz isso — ver lista de frases
  em `sdr-guards.ts`);
- **não insistir** — no máximo 2 retomadas por lead, depois encerra.

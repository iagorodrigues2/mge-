# Templates de WhatsApp para submeter à Meta

**Para o Iago:** copie e cole cada bloco no Meta Business Manager →
WhatsApp Manager → **Modelos de mensagem** → Criar modelo.

## Por que isso existe (a regra que define tudo)

Conversa **iniciada pela empresa** só pode sair como **template aprovado**.
Texto livre é rejeitado pela API. A janela de 24h de conversa livre só abre
**depois que o lead responde** — e é aí que o agente Vendedor assume e conduz
sozinho, com todas as regras do Prompt Mestre.

Consequência prática: **o template não vende nada**. Ele tem um único trabalho —
**ganhar a resposta**. Toda a inteligência vem depois.

## Regras da Meta que os textos abaixo respeitam

- Categoria **MARKETING** (é prospecção; classificar como UTILITY seria motivo de
  reprovação e risco de banimento do número).
- Variáveis `{{1}}`, `{{2}}` não podem abrir nem fechar a mensagem, nem ficar
  coladas uma na outra.
- Nada de promessa de resultado, percentual ou número inventado — o §7 do Prompt
  Mestre e a política da Meta batem no mesmo ponto.
- Toda mensagem de marketing precisa de saída fácil (o opt-out é tratado pelo
  webhook: "sair", "parar", "descadastrar" encerram na hora).
- Sem saudação vazia ("Olá, tudo bem?") — reprovada pela nossa própria regra de
  abertura, não pela Meta.

---

## Template 1 — `abordagem_marketplace_v1` (principal)

**Nome:** `abordagem_marketplace_v1`
**Categoria:** Marketing · **Idioma:** Português (BR)

**Corpo:**
```
Bom dia, {{1}}. Aqui é o consultor comercial do Iago Rodrigues, especialista em operação de marketplace para fabricantes e distribuidores.

Vi que a {{2}} atua com {{3}} e vende em marketplace. Trabalhamos com empresas nesse perfil na parte de margem, catálogo e estrutura de operação.

Faz sentido eu te explicar em duas linhas por que entrei em contato?
```

**Variáveis de exemplo (a Meta exige):**
- `{{1}}` = `responsável`
- `{{2}}` = `Teka`
- `{{3}}` = `cama, mesa e banho`

> A última frase é o ponto todo: pede uma resposta barata ("faz sentido?"), não
> uma reunião. A primeira mensagem vende a próxima resposta.

---

## Template 2 — `abordagem_industria_v1` (quando temos o CNAE confirmado)

**Nome:** `abordagem_industria_v1`
**Categoria:** Marketing · **Idioma:** Português (BR)

**Corpo:**
```
Bom dia. Aqui é o consultor comercial do Iago Rodrigues.

Ele trabalha com indústrias e distribuidores na implantação e estruturação de operação em marketplace — conectando catálogo, margem, estoque e logística.

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
Bom dia, {{1}}. Retomando meu contato sobre a operação de marketplace da {{2}}.

Não quero tomar seu tempo à toa: se não for prioridade agora, é só me dizer que eu encerro por aqui.

Se fizer sentido, me responde e eu explico em dois minutos.
```

**Variáveis de exemplo:**
- `{{1}}` = `responsável`
- `{{2}}` = `Teka`

> Respeita o §27 (follow-up com valor, não "passando para saber se viu") e o §28
> (saber encerrar). Oferecer a saída aumenta resposta e reduz denúncia — que é o
> que derruba a qualidade do número na Meta.

---

## Checklist de aprovação

1. Meta Business Manager verificado (documento da empresa).
2. Número **dedicado** — não pode ser um número que já usa o WhatsApp comum ou
   o Business. Uma vez migrado para a API, o app deixa de funcionar nele.
3. Criar os 3 modelos acima e aguardar aprovação (costuma sair em horas; pode
   levar até 48h).
4. Copiar `WHATSAPP_BUSINESS_TOKEN`, `WHATSAPP_BUSINESS_PHONE_ID`,
   `WHATSAPP_VERIFY_TOKEN` (você inventa) e `WHATSAPP_APP_SECRET` para as
   variáveis de ambiente da Vercel.
5. Cadastrar o webhook: `https://mge-steel.vercel.app/api/whatsapp/webhook`,
   assinando o campo **messages**.

## Se um template for reprovado

O motivo mais comum é categoria errada (marcar como Utility o que é Marketing) e
promessa de resultado. Nenhum dos textos acima promete resultado. Se vier
reprovação, o caminho é reescrever mantendo a estrutura — o corpo pode mudar sem
que nada do agente precise mudar, porque o template só serve para ganhar a
resposta.

## Qualidade do número (o que realmente derruba a operação)

A Meta mede bloqueios e denúncias. Dois hábitos protegem o número:
- **respeitar o opt-out na hora** (o webhook já faz: "sair", "parar",
  "descadastrar" encerram e gravam na lista);
- **não insistir** — a cadência tem no máximo 2 retomadas e depois encerra (§28).

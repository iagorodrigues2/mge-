# Agenda no Google Calendar — o agente marca a reunião sozinho

**Para o Iago.** Depois destes passos, quando um lead topar conversar, a IA
consulta a sua agenda de verdade, oferece dois horários livres, e ao aceite dele
cria o evento no seu Google Calendar. Você não toca em nada — só recebe o
briefing e aparece na call.

Custo: **zero**. A API do Google Calendar é gratuita.

## Por que service account e não "entrar com o Google"

Login com Google (OAuth) exige tela de consentimento, app publicado e um token
que expira e derruba a automação sem avisar. A **service account** é uma chave
que não expira: você simplesmente **compartilha sua agenda** com o e-mail dela,
como faria com uma secretária. É o caminho mais curto e o que menos quebra.

Limite conhecido: uma service account sem Google Workspace **não consegue enviar
convite** para o lead. Por isso o evento entra na SUA agenda com os dados do
lead na descrição, e quem avisa o lead é a própria conversa no WhatsApp. Na
prática, não muda nada para você.

---

## Passo 1 — Criar o projeto no Google Cloud

1. Abra **console.cloud.google.com** (logado na conta do Gmail comercial).
2. No topo, no seletor de projetos, clique **Novo projeto**.
3. Nome: `maquina-de-vendas`. Criar.
4. Espere criar e **selecione esse projeto** no seletor do topo (importante:
   os passos seguintes têm que acontecer dentro dele).

## Passo 2 — Ligar a API do Calendar

1. Menu ☰ → **APIs e serviços** → **Biblioteca**.
2. Busque **Google Calendar API** → abrir → **Ativar**.

## Passo 3 — Criar a service account

1. Menu ☰ → **APIs e serviços** → **Credenciais**.
2. **Criar credenciais** → **Conta de serviço**.
3. Nome: `agente-agenda`. **Criar e continuar** → pule as permissões
   (**Continuar**) → **Concluído**.
4. Na lista, **copie o e-mail** dela — algo como
   `agente-agenda@maquina-de-vendas.iam.gserviceaccount.com`.
   **Guarde: é o `GOOGLE_SA_EMAIL`.**

## Passo 4 — Gerar a chave

1. Clique na service account → aba **Chaves**.
2. **Adicionar chave** → **Criar nova chave** → tipo **JSON** → Criar.
3. Um arquivo `.json` baixa no seu computador. Abra num editor de texto.
4. Dentro dele há uma linha `"private_key": "-----BEGIN PRIVATE KEY-----\n..."`.
   **Copie o valor inteiro entre as aspas**, incluindo o `-----BEGIN` e o
   `-----END PRIVATE KEY-----\n` do final. **É o `GOOGLE_SA_PRIVATE_KEY`.**

> Esse arquivo é uma senha. Não mande por WhatsApp, não coloque no GitHub.
> Depois de colar na Vercel, apague o `.json` do computador.

## Passo 5 — Compartilhar a agenda com ela (o passo que faz tudo funcionar)

1. Abra **calendar.google.com**.
2. Na barra da esquerda, passe o mouse na sua agenda principal → **⋮** →
   **Configurações e compartilhamento**.
3. Em **Compartilhar com pessoas específicas** → **Adicionar pessoas**.
4. Cole o **e-mail da service account** (o do passo 3).
5. Em permissão, escolha **"Fazer alterações nos eventos"** — não é "ver
   apenas": ela precisa criar o evento.
6. **Enviar**. (Vai aparecer aviso de que o convite falhou — normal, robô não
   tem caixa de entrada. O compartilhamento vale do mesmo jeito.)

## Passo 6 — Colar as variáveis na Vercel

Projeto **mge** → Settings → **Environment Variables** → ambiente
**Production** (o caminho menos confuso é `⋯ → Edit` numa variável existente
para ver o formato certo; no formulário de Add, o valor vai no campo **Value**,
nunca no "Note"):

| Nome | Valor |
| --- | --- |
| `GOOGLE_SA_EMAIL` | o e-mail da service account |
| `GOOGLE_SA_PRIVATE_KEY` | a chave inteira, do `-----BEGIN` ao `-----END PRIVATE KEY-----\n` |
| `GOOGLE_CALENDAR_ID` | seu e-mail do Google (a agenda principal) |

Depois: **Deployments → ⋯ → Redeploy**. Variável nova só vale depois disso.

## Passo 7 — Conferir

Abra **/api/agenda/testar** no site. O que você quer ver:

```json
{ "ok": true, "proximosLivres": [ { "rotulo": "terça (16/09) às 10h" } ] }
```

Se vier erro dizendo que a agenda **não está acessível**, o passo 5 não pegou —
confira se colou o e-mail certo e se a permissão é "Fazer alterações".

---

## Como a IA usa isso

- A cada resposta, ela recebe os **3 próximos horários livres** de verdade.
- Oferece **no máximo dois por mensagem**, escritos como você leria
  ("terça (16/09) às 10h").
- Não pode oferecer horário fora dessa lista, e a regra §23 **proíbe** ela de
  dizer "vou verificar e te retorno" quando a agenda está ligada.
- Quando o lead aceita, o evento entra na sua agenda com lembrete de 30 min
  (popup) e 1 h (e-mail), e o briefing por e-mail passa a mostrar a hora no topo.
- Se o horário tiver sido ocupado nesse meio-tempo, ela **não confirma nada** —
  diz que vai confirmar e o Porteiro te avisa. Prometer horário que não entrou
  na agenda é pior do que não prometer.

## Regras da grade (ajustáveis por env var)

| Variável | Padrão | O que faz |
| --- | --- | --- |
| `AGENDA_DURACAO_MIN` | 45 | duração da call |
| `AGENDA_HORA_INICIO` | 9 | primeiro horário oferecido |
| `AGENDA_HORA_FIM` | 18 | último horário oferecido |
| `AGENDA_ANTECEDENCIA_H` | 3 | nada é oferecido para daqui a menos de 3h |
| `AGENDA_DIAS` | 7 | até quantos dias à frente procurar |

Fim de semana e o horário de almoço (12h) ficam sempre de fora. Fuso fixo em
America/São_Paulo, calculado a cada consulta — se o horário de verão voltar, a
conta se ajusta sozinha.

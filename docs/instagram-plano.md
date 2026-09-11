# Instagram → Máquina de Vendas — plano operacional (90 dias)

> Documento vivo. Criado em 11/09/2026. O que muda por dado entra aqui, não em conversa solta.
> Referência que originou o plano: funil da Heat Company (`ia.goheatcompany.com.br`) —
> 60 vídeos em 90 dias, quiz que roteia por faturamento. Copiamos a mecânica, não o avatar.

## 0. Diagnóstico de partida (11/09/2026)

| Item | Estado | Ação |
|---|---|---|
| Seguidores / posts | 7.488 / 200 | — |
| Link da bio | Linktree → `iagoecom.com.br` **não resolve (DNS morto)** | trocar por `/diagnostico` |
| Nome | IG "Iago Rodrigues" · Linktree "Iago Marques \| E-commerce" | unificar |
| Bio | "Saia do CLT / comecei com R$300" → atrai aspirante B2C | reescrever pro ICP |
| Cadência | 10 reels em 15–26/set/2025, depois silêncio | 5/semana por 12 semanas |
| Engajamento reels | 8–14 likes, 0–2 comentários | — |
| Post real (container, 02/03/2026) | 55 likes / 11 comentários (4–7x os reels) | bastidor é o ativo |
| Destaques | nomes internos (A trinca, Arautos, Conselheiro…) | renomear |

ICP (de `validacao-oferta.md`): CNPJ 3+ anos, marca própria/fabricação/distribuição,
20–500 SKUs, estoque próprio, presença digital, marketplace ausente ou mal feito.
Segmento #1: casa/móveis/decoração/cama-mesa-banho. #2: moda.
Ofertas vivas: Diagnóstico Marketplace R$5k · Diagnóstico Importação R$5k ·
Importação Completa R$10k+%FOB · Implantação 360 R$30k · Premium sob consulta.

## 1. Quem faz o quê

### Iago (≈ 6h/mês + 15 min/dia)

| Quando | O quê | Tempo |
|---|---|---|
| 1x/mês (segunda) | **Sessão de gravação em lote**: 20 roteiros lidos no teleprompter, celular na vertical, mesma roupa/fundo trocado a cada 5 vídeos | 90 min |
| 1x/mês | Aprovar o lote de roteiros do mês seguinte (marcar o que não fala do seu jeito) | 30 min |
| Todo dia | 3 stories de celular, sem edição: estoque, tela do ML, reunião, container, "resolvi X hoje" | 5 min |
| Todo dia | Responder comentário/DM que o Rafael (SDR IA) escalou; olhar `/metricas` | 10 min |
| Quando acontecer | Mandar material bruto pro banco: foto/vídeo de container, print de resultado de cliente (com autorização), tela de anúncio | 0 (é só encaminhar) |
| Quando o Porteiro chamar | Fechamento com lead que a IA qualificou | variável (é a venda) |

**O que o Iago NÃO faz:** escrever roteiro, legenda, hashtag, calendário, responder
comentário frio, decidir "o que postar hoje". Se estiver fazendo, o sistema falhou.

### Claude (eu)

- 60 roteiros (20 por sessão de gravação), reescritos a cada mês pelo que performou
- Legenda + CTA + hashtags de cada post, calendário de publicação (dia/hora)
- Pauta diária de stories (3 linhas no WhatsApp: "hoje mostra X, Y, Z")
- Leitura semanal dos insights (Iago manda print de Insights → eu devolvo o que cortar/repetir)
- Manutenção do funil: `/diagnostico`, gatilhos de comentário, prompt do SDR, `/metricas` por origem
- Este documento

### Ninguém ainda (o único buraco)

**Edição dos 20 vídeos/mês.** Opções, da mais barata pra mais cara:
1. **Zero edição** — gravar já pronto (teleprompter, uma tomada), legenda automática no CapCut
   do celular: ~5 min/vídeo → 100 min/mês do próprio Iago ou de quem está por perto.
2. Freelancer de corte + legenda: R$15–40/reel no mercado → R$300–800/mês.
3. Avatar IA (o que a Heat vende): não existe versão grátis viável (HeyGen free = 3 vídeos/mês
   com marca d'água). Só faz sentido se o Iago não quiser aparecer — e o dado diz o contrário.

Decisão pendente do Iago: opção 1 ou 2.

## 2. Ferramentas (todas grátis, verificadas em set/2026)

| Função | Ferramenta | Limite que importa |
|---|---|---|
| Teleprompter | app "Teleprompter" (iOS/Android) ou notas no notebook na altura da câmera | — |
| Edição + legenda automática | CapCut (celular/desktop) | 1080p sem marca; legendas com cota mensal |
| Cortar live/podcast/call em reels | quso.ai | 75 min/mês sem marca |
| Agendar posts | Meta Business Suite | — |
| Testar reel com não-seguidores | Trial Reels (nativo) | — |
| Comentário → DM | **webhook do mge** (`/api/instagram/webhook`) | ManyChat free caiu pra 25 contatos/mês |
| Link da bio | **`/diagnostico`** (mge) | — |

## 3. Funil (como o reel vira dinheiro)

```
Reel (5/semana)
  ├─ CTA "comenta DIAGNÓSTICO"  → webhook responde no público + abre DM → Rafael qualifica
  ├─ Link da bio → /diagnostico → 3 perguntas
  │       ├─ fatura <30k e ainda não vende → "nutrir": volta pro perfil (sem gastar máquina)
  │       └─ resto → "prioritário": botão wa.me com mensagem pronta
  │                    → lead abre a janela → Rafael já sabe momento/faturamento/dor
  └─ Story com caixinha/resposta → DM → Rafael
                                          ↓
                          Porteiro escala pro Iago → call → Diagnóstico R$5k → Implantação R$30k
```

Medição: `/metricas` quebra por origem (`instagram_diagnostico`, `instagram_comentario`,
`instagram_dm`, `instagram_story`). Em 30 dias sabemos qual entrada converte.

## 4. Cronograma

| Semana | Marco |
|---|---|
| **1** (até 18/09) | Fase 0: bio/nome/link/destaques/fixados no ar · deploy do `/diagnostico` com `WHATSAPP_COMERCIAL_NUMERO` · Iago aprova roteiros 1–20 · **sessão de gravação #1** |
| 2–5 | 5 reels/semana + 3 stories/dia. Semana 3: 1º relatório de insights |
| 5 | Sessão #2 (roteiros 21–40, já ajustados pelo dado). **Checkpoint 30 dias** |
| 6–9 | Cadência. Testar 2 formatos novos por semana via Trial Reels |
| 9 | Sessão #3 (41–60). **Checkpoint 60 dias** — decidir: manter, mudar segmento ou formato |
| 10–13 | Cadência. **Checkpoint 90 dias** (11/12/2026): go/no-go em escala |

Critério de sucesso em 90 dias não é views. É: **leads `instagram_*` no `/metricas` gerando
reunião de diagnóstico** — pelo menos 3 reuniões/mês vindas do Instagram no mês 3.

## 5. Projeção (honesta)

Ninguém projeta viral. O que se projeta é cadência × taxa. Base: 60 reels em 90 dias.

| | Conservador | Base | Otimista |
|---|---|---|---|
| Views por reel (mediana) | 1–2k | 3–6k | 10k+ |
| "Hits" (>50k views) em 60 reels | 0–1 | 2–3 | 5+ |
| Seguidores em 90 dias | +1–2k | +3–6k | +10k |
| Respostas no `/diagnostico` (mês 3) | 15–25 | 40–80 | 150+ |
| Rota "prioritário" (~40%) | 6–10 | 16–32 | 60+ |
| Conversas reais no WhatsApp (~60% clica) | 4–6 | 10–20 | 35+ |
| Reuniões de diagnóstico (~25%) | 1–2 | 3–5 | 8+ |
| Fechamentos/mês (mês 3) | 0–1 Diagnóstico R$5k | 1–2 Diagnósticos + 1 Implantação a cada 2 meses | 2–3 Diagnósticos + 1 Implantação/mês |
| Receita atribuível no mês 3 | R$0–5k | R$10–35k | R$40–70k |

Onde a projeção **quebra**: se a sessão de gravação não acontecer. Todos os números acima
assumem 60 vídeos publicados. 10 vídeos = zero projeção (é o que aconteceu em set/2025).

Onde ela **sobe**: um único bastidor real (container, resultado de cliente com número) tem
histórico de fazer 4–7x a média do perfil. 1 bastidor forte por semana é o multiplicador.

## 6. Textos prontos (Fase 0)

### Nome
`Iago Rodrigues | Marketplace & Importação` (IG e Linktree iguais — ou apague o Linktree)

### Bio
```
Implanto operações de marketplace pra marcas e fabricantes
ML · Amazon · Shopee · Importação direta da China
+R$ [X] mi vendidos por clientes em 2026
👇 Diagnóstico gratuito da sua operação (1 min)
```
Link: `https://<domínio-do-mge>/diagnostico`

> Preencher o [X] com número real e defensável. Sem número, cortar a linha — não inventar.

### Destaques (nesta ordem)
1. **Resultados** — prints/vídeos de clientes (com autorização), números
2. **Como funciona** — 3–5 stories explicando Diagnóstico → Implantação
3. **Bastidores** — container, estoque, reunião, viagem à China
4. **Diagnóstico** — 2 stories: "é assim" + link
5. **Quem sou** — a história (R$2 mil, 4 filhos, container) como PROVA, não como isca

### 3 posts fixados
1. **Case com número** (reel ou carrossel): "Marca X: de R$0 a R$[Y]/mês no ML em 90 dias — o que fizemos"
2. **O método em 60s** (reel): "Como eu implanto uma operação de marketplace — os 5 blocos"
3. **Quem é o Iago** (reel, script #17 abaixo)

## 7. Roteiros — Sessão de gravação #1 (semanas 1–4)

Formato: vertical, olhando pra câmera, teleprompter. **Hook nos 2 primeiros segundos,
sem "oi gente".** 30–50s. Fecha com CTA curto. Legenda automática. Mix: 12 técnicos (ICP),
5 bastidor/prova, 3 história.

Pedidos de comentário usam palavras que o webhook reconhece: **DIAGNÓSTICO, PLANILHA,
CHECKLIST, GUIA, LISTA**. Para cada CTA de material, precisa existir o material (eu
faço o PDF/planilha; o Rafael entrega no DM).

---

**#1 · Técnico · "A taxa que a marca não vê"**
HOOK: "Sua margem no Mercado Livre não some na comissão. Some aqui."
CORPO: Comissão todo mundo calcula. O que mata é o resto: frete grátis obrigatório acima de R$79 que sai do seu bolso; devolução que volta com a embalagem destruída e vira perda; taxa fixa por unidade em produto abaixo de R$79. Marca que entra sem colocar isso na planilha vende muito e lucra nada. Eu já vi operação faturando R$200 mil no mês com margem negativa.
CTA: "Comenta PLANILHA que eu te mando a de precificação que eu uso com meus clientes."

**#2 · Técnico · "Por que seu anúncio não aparece"**
HOOK: "Seu produto é melhor que o do concorrente. E ele vende mais. Eu explico."
CORPO: O Mercado Livre não rankeia produto — rankeia anúncio. Título com termo que ninguém busca, ficha técnica incompleta, foto de fundo branco genérica e sem variação de cor no mesmo anúncio. O concorrente com produto pior preencheu tudo, tem 40 vendas e reputação verde. O algoritmo entrega pra quem já converte. Sair do zero é o trabalho técnico que a maioria pula.
CTA: "Comenta CHECKLIST que eu te mando os 12 itens do anúncio que converte."

**#3 · Bastidor · "Container chegando"** (gravar de frente pro container/galpão, sem teleprompter)
HOOK: "Isso aqui são 8 meses de trabalho chegando em 40 minutos."
CORPO: Negociação com fábrica, amostra, ajuste de amostra, pagamento, produção, inspeção, embarque, desembaraço. Quem vê a carga não vê o risco: se um item vier errado, é o meu dinheiro parado. Por isso importação direta não é pra quem quer testar — é pra quem já vende e quer margem.
CTA: "Se sua marca já vende e quer importar direto, o link da bio é o diagnóstico."

**#4 · Técnico · "Full ou não Full"**
HOOK: "Mandar tudo pro Full do Mercado Livre pode ser o maior erro da sua operação."
CORPO: Full dá selo, entrega rápida e ranking. Mas cobra armazenagem por item parado, e produto que não gira vira custo mensal. A regra que eu uso: só entra no Full o SKU com giro comprovado nos últimos 60 dias; o resto fica no estoque próprio com Envios. Marca que manda o catálogo inteiro no primeiro mês paga pra ver o produto parado.
CTA: "Comenta DIAGNÓSTICO que eu olho como está sua distribuição de estoque."

**#5 · História · "R$ 2 mil"**
HOOK: "Há 3 anos eu ganhava R$ 2 mil por mês. Com 4 filhos."
CORPO: Não conto isso pra vender sonho — conto porque é a prova de que o método funciona partindo do zero. Comecei com R$ 300 de produto. O que mudou não foi sorte: foi tratar anúncio como engenharia, não como sorteio. Hoje eu implanto isso em marcas que já faturam e travaram no marketplace.
CTA: "Se a sua marca travou, o diagnóstico na bio é grátis."

**#6 · Técnico · "Kit é a jogada"**
HOOK: "O jeito mais rápido de subir ticket no marketplace sem subir preço."
CORPO: Kit. O mesmo produto que vende a R$49 sozinho, em kit de 3 vende a R$129 — ticket maior, frete diluído, taxa fixa diluída, e você sai da guerra de preço porque ninguém compara kit com unidade. Marca de casa e decoração é a que mais desperdiça isso: jogo americano vende em 4, toalha em 2, organizador em 3.
CTA: "Comenta KIT que eu te mando os 5 kits que mais funcionam por categoria." *(criar material)*

**#7 · Técnico · "Reputação é o produto"**
HOOK: "Você não vende produto no Mercado Livre. Você vende reputação."
CORPO: Comprador não lê ficha. Lê a cor do termômetro e as 3 primeiras avaliações. Uma reclamação não respondida em 48h pesa mais que 50 vendas boas. O que eu implanto primeiro em qualquer operação: rotina de resposta em até 2 horas, embalagem que não gera "chegou danificado", e pós-venda que pede avaliação no momento certo.
CTA: "Comenta DIAGNÓSTICO e me diz a cor da sua reputação hoje."

**#8 · Bastidor · "Tela do ML"** (gravação de tela + voz, sem aparecer)
HOOK: "Olha esse anúncio de um cliente antes e depois de 30 dias."
CORPO: Mostrar: título antigo vs novo, fotos, ficha, variações. Visitas subiram de X pra Y, conversão de A% pra B%. Nenhuma mágica: preenchemos o que o algoritmo pede e tiramos o que afastava. (Usar dado real, com autorização. Sem dado real, não gravar.)
CTA: "Quer saber o que mudar no seu? Link da bio."

**#9 · Técnico · "Importar da China: o erro do primeiro pedido"**
HOOK: "O primeiro pedido na China nunca é pra vender. É pra aprender."
CORPO: Quem pede 5 mil unidades no primeiro contato com a fábrica está apostando o caixa em uma amostra que nunca viu. A sequência certa: amostra, pedido-teste pequeno (mesmo com preço pior), validação no marketplace, aí o pedido de escala. Custa mais por unidade no começo e economiza o prejuízo que quebra a maioria.
CTA: "Comenta GUIA que eu te mando o passo a passo do primeiro pedido."

**#10 · Técnico · "Amazon não é Mercado Livre"**
HOOK: "Copiar seu anúncio do Mercado Livre pra Amazon é jogar dinheiro fora."
CORPO: Na Amazon, Buy Box decide tudo; título tem regra; A+ content é o que converte marca; e o FBA tem outra lógica de custo. Marca que entra "porque já está no ML" e não adapta fica invisível. Eu abro Amazon depois do ML redondo — nunca junto, nunca antes.
CTA: "Comenta DIAGNÓSTICO e me diz onde você vende hoje."

**#11 · Bastidor · "Reunião de diagnóstico"** (gravar depois de uma call real, sem citar cliente)
HOOK: "Acabei de sair de um diagnóstico. A marca fatura R$ 400 mil e não vende no marketplace. Adivinha por quê."
CORPO: Medo de canibalizar o site. O mesmo argumento que eu ouvi 20 vezes. O dado mostra o contrário: marketplace traz comprador que nunca ia achar o site. O que canibaliza é preço diferente entre canais — e isso é política, não canal.
CTA: "Se esse é o seu medo, o link da bio."

**#12 · Técnico · "Anúncio catálogo"**
HOOK: "Existe um tipo de anúncio no Mercado Livre onde você ganha ou perde no centavo."
CORPO: Catálogo: vários vendedores no mesmo anúncio, o ML escolhe quem aparece. Preço, reputação, prazo e Full decidem. Marca própria tem uma vantagem que quase ninguém usa: se o produto é seu, você é o único no catálogo — mas precisa cadastrar certo, com EAN e ficha completa. Feito errado, você vira um vendedor a mais no anúncio de outro.
CTA: "Comenta CHECKLIST."

**#13 · História · "O que eu faria diferente"**
HOOK: "Se eu voltasse pro meu primeiro ano vendendo online, faria uma única coisa diferente."
CORPO: Menos produto, mais profundidade. Eu tinha 80 SKUs medianos; devia ter 8 excelentes. Cada SKU custa foto, ficha, estoque, atenção. Os 8 que davam 80% da receita mereciam 100% do esforço. É a primeira coisa que corto numa implantação: catálogo.
CTA: "Salva pra quando for revisar seu catálogo."

**#14 · Técnico · "Precificação reversa"**
HOOK: "Não precifica pelo custo. Precifica pelo lugar que você quer ocupar na busca."
CORPO: Você abre a busca da sua categoria, vê os 10 primeiros, entende a faixa de preço que o comprador aceita, e trabalha de trás pra frente: preço-alvo menos taxas menos frete menos margem = custo máximo que o produto pode ter. Se seu custo não cabe, o problema não é o anúncio — é o sourcing.
CTA: "Comenta PLANILHA."

**#15 · Bastidor · "Estoque"** (galpão/prateleira, celular na mão)
HOOK: "Cada prateleira dessa é uma decisão de caixa."
CORPO: Mostrar o que gira e o que parou. "Esse aqui eu importei 2 mil, vendeu 1.900 em 40 dias. Esse outro, 500 unidades e 3 meses parado — erro meu de leitura de demanda. Operação de marketplace é isso: acertar mais do que erra e cortar o erro rápido."
CTA: "Bastidor real toda semana. Segue."

**#16 · Técnico · "Ads no ML"**
HOOK: "Product Ads no Mercado Livre não é pra vender. É pra ensinar o algoritmo."
CORPO: Anúncio novo não tem histórico; o ML não sabe pra quem mostrar. Ads nos primeiros 30 dias compra as primeiras vendas que destravam o orgânico. Depois, reduz. Quem liga Ads pra sempre virou dependente; quem nunca liga demora 6 meses pra sair do zero.
CTA: "Comenta DIAGNÓSTICO com o que você gasta em Ads hoje."

**#17 · História · "Quem é o Iago"** (fixar)
HOOK: "Eu implanto operações de marketplace pra marcas que já vendem e travaram."
CORPO: Vendo online há [N] anos, importo direto da China, opero minhas próprias marcas no ML, Amazon e Shopee. O que eu faço pra cliente é o que faço pra mim todo dia: catálogo, anúncio, precificação, logística, reputação. Não vendo curso; implanto. Se sua marca fatura e o marketplace não anda, o diagnóstico na bio leva 1 minuto.
CTA: "Link na bio."

**#18 · Técnico · "Shopee: quando entrar"**
HOOK: "Shopee vende muito. E pode ser o pior canal pra sua marca."
CORPO: Ticket baixo, comprador de preço, frete subsidiado que muda de regra. Funciona pra produto de giro alto e custo baixo; destrói marca de posicionamento. Antes de entrar: seu ticket médio é maior que R$80? Se sim, Shopee é o terceiro canal, não o primeiro.
CTA: "Comenta DIAGNÓSTICO e me diz seu ticket médio."

**#19 · Bastidor · "Erro que me custou caro"**
HOOK: "Esse erro me custou R$ [valor real] em um único container."
CORPO: Contar um erro real (inspeção pulada, embalagem errada, NCM errado, etc.) com o número. O que mudou no processo depois. Marca que contrata implantação está comprando exatamente isso: os erros que eu já paguei.
CTA: "Salva. E se importa, comenta GUIA."

**#20 · Técnico · "Os 3 números"**
HOOK: "Se você só olhar 3 números da sua operação, olha esses."
CORPO: Conversão do anúncio (visitas → vendas) — abaixo de 3%, é anúncio. Margem de contribuição por SKU depois de TODAS as taxas — negativa, é precificação ou sourcing. Reputação — amarela ou pior, é operação. Cada um aponta pra um problema diferente. Marca que olha só faturamento nunca sabe qual dos três está quebrado.
CTA: "Comenta DIAGNÓSTICO. É o que a gente olha primeiro."

---

Materiais que precisam existir antes de publicar os CTAs: **PLANILHA** (precificação),
**CHECKLIST** (12 itens do anúncio), **GUIA** (primeiro pedido China), **KIT** (kits por
categoria). Eu produzo os quatro; o Rafael entrega no DM quando a palavra aparecer.

Roteiros 21–60: escritos após o checkpoint de 30 dias, pelo dado (quais dos 20 acima
tiveram mais envios/salvamentos → mais daquilo).

# Política de dados (LGPD) e uso de canais

**Aviso:** este documento é uma orientação operacional para o time, escrita
por um assistente de IA, não uma peça jurídica. A seção 18 do prompt-mestre
exige "revisão jurídica e de compliance" antes do deploy de produção — isso
continua valendo. Considere revisar com um advogado antes de operar em
escala.

## Base legal para prospecção B2B

O sistema coleta apenas dados de pessoa jurídica e de pessoas físicas
atuando em contexto profissional (decisor identificado por cargo, contato
empresarial público) — nunca dado pessoal fora de contexto de negócio. Ainda
assim, quando o dado de contato é vinculado a uma pessoa física (nome do
decisor, e-mail/telefone dele), a LGPD se aplica.

A base legal mais comum para esse tipo de tratamento é o **legítimo
interesse** (art. 10 da LGPD), que exige: finalidade legítima e específica,
necessidade (não coletar mais do que o necessário — já é regra do
prompt-mestre, seção 14), e balanceamento com os direitos do titular
(inclusive o direito de se opor/pedir remoção — por isso opt-out é
obrigatório e não opcional no sistema).

Referência oficial: [Guia Orientativo sobre Legítimo Interesse — ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/copy_of_guia_legitimo_interesse.pdf/@@display-file/file).

## Regras aplicadas no sistema

- Toda empresa/contato tem `Source` registrado (de onde veio o dado, quando).
- `OptOut` bloqueia contato futuro com aquele valor de contato,
  permanentemente, sem exceção manual.
- `Blocklist` bloqueia CNPJ/domínio/telefone/e-mail/grupo econômico
  indicado, com motivo registrado.
- Dado sensível (LGPD art. 5º, II — saúde, religião, opinião política,
  filiação sindical, orientação sexual, dado genético/biométrico) nunca deve
  entrar no texto de mensagens ou notas — `packages/agents/compliance.py::check_sensitive_data`
  faz uma checagem best-effort antes de qualquer texto ir para a fila de
  aprovação, mas não substitui revisão humana.
- CPF nunca deve ser coletado ou armazenado — o sistema só trabalha com CNPJ.

## Canais e seus limites

**WhatsApp:** contato frio e automatizado em volume, sem opt-in prévio,
esbarra na política comercial oficial do WhatsApp e pode levar ao
banimento do número — ver [WhatsApp Business Messaging Policy](https://business.whatsapp.com/policy).
Por isso o sistema só opera em Modo 1 — Assistido (clique humano
obrigatório) até que o Modo 2 — Oficial (WhatsApp Business API, com opt-in
documentado) esteja configurado — ver `docs/implantacao-whatsapp.md`.

**E-mail:** preferir e-mail corporativo público, uma mensagem por vez,
sempre com opção clara de descadastro.

**Instagram/LinkedIn:** uso humano/assistido, nunca automação de conexão em
massa (viola termos de serviço dessas plataformas independentemente da
LGPD).

## Retenção e direitos do titular

- Dado de empresa que virou "Perdido" ou "Bloqueado" permanece no histórico
  para não recontatar por engano, mas não deve ser usado para nova campanha
  sem revisão.
- Pedido de exclusão de dado pessoal (não apenas opt-out de contato) deve
  ser atendido manually por enquanto — não há endpoint de "direito ao
  esquecimento" automatizado nesta versão. Se o volume justificar, isso
  deve ser o próximo item de compliance a construir, não scraping em maior
  escala.

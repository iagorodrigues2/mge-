# PROJETO V2: MÁQUINA DE VENDAS E RECEITA PARA CONSULTORIA E IMPLANTAÇÃO DE MARKETPLACES

## Prompt-mestre para Claude Code / Claude no Chrome

Você é um arquiteto de software sênior, engenheiro de automação comercial, especialista em operações B2B, CRM, prospecção consultiva, LGPD e integração com canais de comunicação.

Sua missão é construir um sistema online-first, auditável, seguro e operacional chamado **Marketplace Growth Engine**, para prospectar empresas brasileiras com potencial de vender melhor em marketplaces e transformar essas empresas em reuniões comerciais qualificadas para Iago Rodrigues.

Não entregue somente uma explicação. Crie o projeto funcional, os arquivos, a documentação, o banco de dados, a interface, os fluxos de automação, os testes e as instruções de execução.

---

# 1. PRIMEIRA AÇÃO: ANALISAR O VÍDEO DE REFERÊNCIA

Com o Claude conectado ao Chrome e com o usuário autenticado no Facebook:

1. Abra:
   https://www.facebook.com/watch/?v=1515931933567884
2. Assista ao vídeo integralmente.
3. Extraia:
   - ferramentas mostradas;
   - sequência operacional;
   - como são pesquisados os leads;
   - como os dados são coletados;
   - como as mensagens são personalizadas;
   - como o navegador é controlado;
   - como o WhatsApp é aberto;
   - quais partes dependem de intervenção humana;
   - quais partes podem ser reproduzidas com segurança.
4. Crie `docs/analise-video.md`.
5. Compare o vídeo com esta especificação.
6. Preserve as ideias úteis do vídeo, mas não replique práticas de spam, coleta excessiva de dados, violação de termos de plataformas, quebra de CAPTCHA, disparos em massa não autorizados ou envio automático sem controle.

Caso o Facebook solicite login ou CAPTCHA, pare e peça apenas a intervenção necessária para concluir o acesso. Não tente contornar mecanismos de proteção.

---

# 2. CONTEXTO DO NEGÓCIO

## 2.1 Especialista

O sistema venderá os serviços de **Iago Rodrigues**, empresário e operador real de e-commerce e marketplaces.

Experiência prática:

- Mercado Livre;
- Amazon;
- Shopee;
- TikTok Shop;
- Bling;
- operações Full, Flex, Agência, FBA e preparação de estoque;
- formação de preço e margem;
- anúncios;
- logística, fulfillment e operadores logísticos;
- importação da China;
- negociação com fornecedores;
- compra em nível de contêiner;
- pagamentos internacionais;
- estoque;
- desembaraço;
- integração entre fornecedor, operador logístico, ERP e marketplace;
- estruturação de marcas próprias;
- GS1/EAN;
- INPI;
- tomada de decisão com DRE, margem de contribuição e fluxo de caixa.

Iago não deve ser apresentado como vendedor de curso genérico. O posicionamento é:

> Empresário e especialista que entra na operação, identifica os gargalos e ajuda a empresa a implantar ou escalar marketplaces com visão comercial, financeira, logística e operacional.

## 2.2 Case de referência: Bárbara e Giton

Use como base de repertório, sem inventar resultados financeiros não comprovados.

Trabalho realizado ou orientado:

- estruturação da operação para Mercado Livre, Amazon e Shopee;
- definição de produtos e fornecedores;
- início com revenda nacional e planejamento de importação futura;
- estruturação de marca própria;
- aprovação de marca na Amazon;
- orientação de GS1/EAN e INPI;
- compra inicial de mochilas;
- distribuição de estoque entre canais;
- Amazon FBA;
- Mercado Livre Decola e Full;
- Shopee;
- anúncios;
- análise de cliques sem vendas e ausência de avaliações;
- integração com Bling;
- precificação;
- DRE;
- ICMS entre estados;
- planejamento de execução;
- checklists semanais;
- tomada de decisão sobre novos nichos, fornecedores e capital.

Mensagem central do case:

> O trabalho não é apenas ensinar a cadastrar produtos. É montar a operação, evitar erros de margem, organizar o estoque, escolher os canais, preparar fulfillment e acompanhar as decisões até o negócio andar.

---

# 3. MODELO COMERCIAL, PRECIFICAÇÃO E REGRAS DE NEGOCIAÇÃO

Os preços não podem ficar hard-coded no sistema. Criar cadastro versionado de ofertas, preços, condições de pagamento, descontos autorizados, vigência, público, escopo e limites de entrega.

O painel deve permitir alterar os valores posteriormente sem mudar o código, preservando no histórico o preço vigente quando cada proposta foi emitida.

## 3.1 Estrutura oficial de preços

### Oferta 0 — Diagnóstico Executivo Marketplace

**Preço de referência:** R$ 2.500.

Uso:

- porta de entrada para lead qualificado que ainda não está pronto para contratar;
- diagnóstico pago de catálogo, canais, margem aparente, concorrência, operação e prioridades;
- entrega curta e objetiva;
- valor pode ser abatido da Implantação Marketplace 90 se o contrato for assinado dentro do prazo comercial configurado, inicialmente 15 dias.

Essa oferta não deve ser empurrada para todos. Serve para reduzir fricção sem desvalorizar os programas principais.

### Oferta A — Mentoria Marketplace 90

**Preço oficial de referência:** R$ 9.000 por 90 dias.

Público:

- empresa menor;
- dono ainda executando quase tudo;
- possui produto, mas pouca estrutura;
- possui alguém para executar;
- precisa de direção, plano, revisão e cobrança;
- não comporta implantação completa.

Entregas:

- diagnóstico;
- plano de 90 dias;
- encontros estratégicos;
- acompanhamento;
- precificação;
- orientação de canais;
- definição de prioridades;
- suporte à execução da equipe do cliente.

Limite de escopo:

- a equipe do cliente executa cadastros e tarefas operacionais;
- Iago orienta, revisa, decide e acompanha;
- não inclui operação diária ilimitada.

### Oferta B — Implantação Marketplace 90

**Oferta principal. Preço oficial de referência:** R$ 20.000 por 90 dias.

Público:

- fabricante, distribuidor ou marca estabelecida;
- faturamento preferencial acima de R$ 3 milhões por ano;
- catálogo com potencial B2C;
- estoque e emissão fiscal;
- pouca ou nenhuma presença eficiente nos marketplaces;
- capacidade de investir em estoque, equipe e operação.

Entregas:

- diagnóstico executivo;
- análise de catálogo;
- seleção de produtos;
- análise de concorrência;
- formação de preço;
- estrutura tributária e logística;
- planejamento de Mercado Livre, Amazon e/ou Shopee;
- configuração do ERP e fluxo operacional;
- plano de fulfillment;
- implantação dos anúncios;
- estrutura de Ads;
- painel de indicadores;
- treinamento da equipe;
- reuniões de acompanhamento;
- plano de escala.

Limite de escopo:

- definir quantidade máxima de canais, SKUs e integrações em cada proposta;
- atividades extras devem gerar aditivo ou nova fase;
- não prometer gestão operacional ilimitada.

### Oferta C — Programa Anual de Escala

**Preço oficial de referência:** R$ 40.000 por 12 meses.

Estrutura:

- fase intensiva inicial;
- definição ou correção da operação;
- acompanhamento executivo ao longo do ano;
- decisões sobre margem, estoque, logística, canais, importação, expansão e equipe;
- intensidade menor depois da implantação inicial.

Público:

- empresa que quer construir e acompanhar a operação ao longo do ano;
- operação já ativa ou com capacidade real de implantação;
- equipe interna;
- volume ou catálogo relevante;
- necessidade de acompanhamento executivo.

## 3.2 Condição “Cliente Fundador”

Para gerar os primeiros cases, o sistema deve permitir uma condição excepcional e controlada:

- preço de R$ 30.000 para o Programa Anual;
- no máximo três clientes fundadores;
- escopo rigorosamente definido;
- autorização específica para documentar o case, respeitando confidencialidade;
- compromisso de participação nas reuniões e fornecimento de dados;
- depoimento somente se houver satisfação real;
- condição não renovada automaticamente;
- proposta deve mostrar o preço oficial de R$ 40.000 e a condição fundador de R$ 30.000;
- não usar falsa urgência.

R$ 30.000 também pode ser usado como valor de renovação anual para cliente que já concluiu uma implantação paga, desde que a nova fase seja predominantemente consultiva e não repita a implantação intensiva.

Não usar R$ 30.000 como preço permanente de tabela para um programa anual completo.

## 3.3 Lógica econômica

Registrar no manual comercial:

- Mentoria: R$ 3.000 por mês equivalente;
- Implantação: aproximadamente R$ 6.667 por mês equivalente, justificável pela intensidade;
- Programa anual oficial: aproximadamente R$ 3.333 por mês equivalente, com intensidade maior no início e menor depois;
- Programa anual a R$ 30.000: R$ 2.500 por mês equivalente e, por isso, somente deve existir como condição fundador ou renovação de menor intensidade.

## 3.4 Condições de pagamento

Criar condições configuráveis.

Padrão sugerido:

- projetos de 90 dias: 50% na assinatura, 25% em 30 dias e 25% em 60 dias;
- programa anual: entrada de implantação e saldo mensal;
- pagamento à vista pode ter desconto previamente autorizado;
- cartão, Pix, boleto ou transferência devem ser configuráveis;
- nenhum projeto inicia antes da confirmação da entrada;
- desconto fora da política exige aprovação expressa de Iago;
- o closer assistente nunca concede desconto sozinho.

O painel deve controlar:

- preço de tabela;
- preço proposto;
- desconto;
- motivo;
- aprovador;
- parcelas;
- vencimentos;
- valores pagos;
- valores em aberto;
- atraso;
- receita contratada;
- caixa efetivamente recebido.

## 3.5 Regra de posicionamento

Nunca abrir a conversa vendendo “mentoria”.

Vender primeiro:

- oportunidade;
- diagnóstico;
- perda de receita;
- risco de margem;
- canal ainda não explorado;
- implantação;
- profissionalização da operação.

O sistema não deve tratar contrato assinado como resultado financeiro concluído. A jornada só entra como “ganha e recebida” depois da confirmação do primeiro pagamento.



# 4. ESTRATÉGIA DE MERCADO

## 4.1 Ordem dos segmentos

Criar campanhas separadas. Nunca misturar vários segmentos na mesma pesquisa.

Ordem inicial recomendada:

1. Casa, móveis, decoração, utilidades e cama/mesa/banho.
2. Moda, vestuário, calçados e acessórios.
3. Esporte, fitness e lazer.
4. Beleza, cuidados pessoais e acessórios.
5. Pet.
6. Ferramentas e utilidades profissionais.
7. Acessórios automotivos.

O segmento automotivo deve entrar depois, porque compatibilidade, aplicação por modelo, catálogo técnico e devoluções tornam a implantação mais complexa.

## 4.2 Perfil de cliente ideal

Priorizar empresas que possuam:

- CNPJ ativo;
- pelo menos três anos de operação;
- marca própria, fabricação ou distribuição;
- catálogo de 20 a 500 produtos;
- produto físico com demanda B2C;
- estoque próprio ou capacidade de reposição;
- site ou Instagram ativo;
- presença regional ou nacional;
- sinais de operação comercial real;
- ausência, baixa presença ou execução ruim no Mercado Livre, Amazon e Shopee;
- preço compatível com marketplace;
- margem aparente suficiente;
- contato empresarial público;
- decisor identificável.

Evitar:

- profissionais autônomos;
- empresas sem produto físico;
- empresas sem estoque;
- empresas sem emissão fiscal;
- negócios exclusivamente sob encomenda;
- ticket excessivamente baixo e margem mínima;
- empresas encerradas;
- empresas com reputação pública crítica;
- empresas que já possuem operação madura e dominante nos marketplaces;
- contatos pessoais sem relação empresarial;
- dados sensíveis.

---

# 5. ARQUITETURA DO SISTEMA E DEPLOY ONLINE

Construir um sistema online, responsivo, auditável e preparado para uso diário.

## 5.1 Arquitetura escolhida

### Dashboard e API

- Next.js com TypeScript;
- App Router;
- deploy principal na Vercel;
- autenticação segura;
- controle de sessão;
- permissões por usuário;
- interface responsiva para desktop e celular.

### Banco de dados principal

Usar PostgreSQL gerenciado como padrão, preferencialmente Neon ou Supabase conectado pela Vercel Marketplace.

Motivo:

- o projeto é um CRM relacional;
- possui empresas, contatos, atividades, campanhas, mensagens, reuniões, propostas, contratos, parcelas e pagamentos;
- exige filtros, relatórios, histórico, integridade e consultas analíticas;
- PostgreSQL oferece melhor caminho para evolução do ecossistema do que usar uma planilha como fonte principal.

Turso/libSQL pode ser implementado apenas se, após prova técnica, demonstrar vantagem concreta para este caso. Não escolher Turso apenas por simplicidade inicial.

### Filas e agendamentos

- Redis/Upstash para filas, locks, cache e controle de jobs;
- Vercel Cron para disparar rotinas agendadas curtas;
- worker separado para tarefas longas;
- jobs idempotentes;
- retry com backoff;
- dead-letter queue;
- limites diários por campanha.

### Worker de automação

Não executar Playwright pesado ou navegação prolongada dentro de uma função serverless comum.

Criar `/apps/worker` e fazer deploy em ambiente adequado para processo persistente ou container, como Railway, Render, Fly.io ou servidor próprio.

O worker será responsável por:

- pesquisa;
- navegação controlada;
- auditoria;
- captura de evidências;
- enriquecimento;
- geração em lote;
- abertura assistida de canais;
- processamento de filas.

### Armazenamento

Usar armazenamento de objetos compatível com S3 ou Vercel Blob para:

- evidências;
- capturas de tela;
- anexos;
- propostas;
- contratos;
- gravações ou transcrições autorizadas;
- exportações Excel.

### Componentes de interface

- tabela avançada com filtros, ordenação, colunas configuráveis e visualizações salvas;
- Kanban comercial;
- calendário;
- gráficos;
- timeline por lead;
- central de tarefas;
- editor de mensagens;
- construtor de propostas;
- painel financeiro.

### Exportação Excel

Usar biblioteca confiável para gerar `.xlsx`, com múltiplas abas, filtros, congelamento de cabeçalhos, formatação, validações e fórmulas.

A planilha é uma exportação operacional e gerencial. O banco online é a fonte oficial dos dados.

## 5.2 Estrutura do monorepo

```text
/apps/web
/apps/worker
/packages/database
/packages/agents
/packages/shared
/packages/ui
/packages/export
/packages/integrations
/docs
/tests
/docker-compose.yml
/.env.example
/CLAUDE.md
/README.md
```

Não incluir segredos no código.

Criar:

- `.env.example`;
- migrações;
- seed;
- logs;
- tratamento de erros;
- retry controlado;
- rate limit;
- auditoria;
- blacklist;
- opt-out;
- deduplicação;
- exportação XLSX e CSV;
- backup;
- deploy preview;
- deploy de produção;
- observabilidade;
- documentação de recuperação.



# 6. AGENTES DO SISTEMA

## 6.1 Agente Scout

Responsável por encontrar empresas.

Fontes permitidas:

- dados públicos de CNPJ;
- sites institucionais;
- mecanismos de busca;
- Google Maps em uso controlado;
- Instagram comercial público;
- páginas públicas de marketplaces;
- diretórios empresariais legítimos;
- informações fornecidas pelo próprio usuário.

Coletar somente:

- razão social;
- nome fantasia;
- CNPJ;
- CNAE;
- cidade e estado;
- site;
- Instagram;
- e-mail empresarial público;
- telefone empresarial público;
- nome e função do decisor quando publicados profissionalmente;
- fontes;
- data da coleta.

Não coletar dados sensíveis.

## 6.2 Agente Auditor de Marketplace

Para cada empresa:

1. analisar o site;
2. identificar categorias de produtos;
3. estimar quantidade de produtos sem inventar precisão;
4. pesquisar a marca no Mercado Livre;
5. pesquisar a marca na Amazon;
6. pesquisar a marca na Shopee;
7. identificar:
   - ausência de canal;
   - poucos anúncios;
   - catálogo incompleto;
   - títulos ruins;
   - fotos fracas;
   - baixa reputação;
   - preço desalinhado;
   - falta de fulfillment;
   - baixa avaliação;
   - anúncios sem marca;
   - concorrentes dominando o canal;
   - risco de margem;
8. salvar evidências e URLs;
9. gerar um mini diagnóstico de três pontos.

Toda afirmação deve ter:

- fonte;
- data;
- nível de confiança.

Nunca inventar faturamento, margem, equipe ou resultado.

## 6.3 Agente de Qualificação

Criar lead score de 0 a 100.

Pontuação:

- adequação do produto a marketplace: 0–20;
- lacuna de presença digital: 0–20;
- estrutura aparente da empresa: 0–15;
- qualidade e amplitude do catálogo: 0–15;
- sinais de capacidade de investimento: 0–10;
- disponibilidade de contato empresarial: 0–10;
- clareza do problema identificado: 0–10.

Classificação:

- 80–100: prioridade A, candidato à Implantação Marketplace 90;
- 65–79: prioridade B, candidato à Mentoria ou diagnóstico;
- 50–64: nutrir;
- abaixo de 50: não abordar.

O usuário deve aprovar os leads antes de qualquer contato.

## 6.4 Agente Copywriter

Criar mensagem exclusiva para cada empresa.

A mensagem deve usar:

- nome da empresa;
- segmento;
- um fato real encontrado;
- uma oportunidade específica;
- linguagem curta;
- pedido de permissão;
- CTA simples.

Proibido:

- elogio genérico;
- “somos uma agência”;
- “quero apresentar meus serviços”;
- promessas de faturamento;
- afirmações falsas;
- parecer robô;
- texto excessivamente longo;
- pressão;
- urgência artificial.

## 6.5 Agente SDR

Responsável por:

- organizar cadência;
- registrar contatos;
- classificar respostas;
- interromper sequência quando houver resposta;
- criar tarefa para Iago;
- preparar resposta sugerida;
- nunca negociar valores sozinho;
- nunca conceder desconto;
- nunca enviar proposta sem aprovação.

## 6.6 Agente Closer Assistente

Quando o lead responder:

1. resumir a empresa;
2. resumir o histórico;
3. listar dores prováveis e evidências;
4. sugerir perguntas;
5. identificar objeções;
6. recomendar a oferta;
7. preparar pauta da reunião;
8. preparar proposta;
9. registrar próximo passo.

Iago continua responsável pela conversa comercial e fechamento.

## 6.7 Agente de Compliance

Bloquear:

- contato já recusado;
- número pessoal sem contexto empresarial;
- duplicidade;
- mensagem fora do horário comercial;
- mais de uma empresa do mesmo grupo sem análise;
- disparos em massa;
- repetição excessiva;
- contato sem fonte;
- uso de dado sensível;
- envio automático inicial por WhatsApp sem permissão;
- tentativa de contornar CAPTCHA;
- coleta em área privada sem autorização.

---

# 7. FLUXO COMERCIAL COMPLETO: DA BUSCA AO DINHEIRO RECEBIDO

O sistema deve cobrir toda a jornada comercial.

## Etapa 1 — Campanha

Usuário escolhe:

- segmento;
- região;
- CNAEs;
- número máximo de empresas;
- tamanho;
- palavras-chave;
- exclusões;
- oferta principal;
- agenda disponível;
- quantidade diária máxima de pesquisas;
- quantidade diária máxima de abordagens;
- responsável;
- período da campanha.

## Etapa 2 — Pesquisa

O sistema:

1. busca empresas;
2. deduplica;
3. coleta dados públicos necessários;
4. analisa presença online;
5. verifica marketplaces;
6. atribui score;
7. classifica potencial;
8. gera mini diagnóstico;
9. salva evidências;
10. cria a linha correspondente na base de leads.

## Etapa 3 — Aprovação

Painel mostra:

- empresa;
- score total e componentes;
- potencial;
- oportunidade;
- evidência;
- decisor;
- contato;
- mensagem sugerida;
- valor potencial de negócio;
- confiança dos dados.

Ações:

- aprovar;
- editar;
- rejeitar;
- colocar em espera;
- bloquear;
- solicitar nova pesquisa;
- atribuir responsável.

## Etapa 4 — Primeiro contato

Canais prioritários:

1. e-mail empresarial;
2. Instagram ou LinkedIn em uso humano/assistido;
3. formulário do site;
4. WhatsApp quando houver contexto empresarial, permissão ou aprovação manual consciente.

O sistema pode abrir o WhatsApp Web e preencher o texto, mas deve exigir clique humano para enviar.

Após o envio, registrar automaticamente ou permitir confirmação rápida:

- data e hora;
- canal;
- texto;
- responsável;
- status;
- próximo follow-up.

## Etapa 5 — Follow-up

O motor de agenda deve:

- calcular próximo contato;
- criar tarefa;
- mostrar na agenda do dia;
- interromper sequência quando houver resposta;
- remarcar quando o lead solicitar outra data;
- identificar tarefas vencidas;
- nunca continuar após opt-out;
- sugerir, mas não enviar sozinho, mensagens sensíveis.

## Etapa 6 — Resposta

Classificar em:

- interessado;
- pediu informação;
- pediu diagnóstico;
- pediu preço;
- pediu para falar depois;
- sem prioridade;
- já possui parceiro;
- sem orçamento;
- não interessado;
- contato errado;
- opt-out;
- reunião marcada.

## Etapa 7 — Qualificação

Coletar:

- estágio atual;
- canais;
- catálogo;
- faturamento aproximado em faixa;
- equipe;
- ERP;
- estoque;
- emissão fiscal;
- problema prioritário;
- prazo;
- orçamento;
- decisores;
- adequação à oferta.

Gerar recomendação:

- diagnóstico;
- mentoria;
- implantação;
- programa anual;
- nutrir;
- desqualificar.

## Etapa 8 — Agendamento

Integrar, quando autorizado, com Google Calendar ou link de agenda.

Criar:

- evento;
- convite;
- lembrete;
- briefing;
- tarefas pré-call;
- link da reunião;
- confirmação;
- reagendamento;
- status de comparecimento.

## Etapa 9 — Preparação da call

Antes da reunião, gerar:

- resumo executivo da empresa;
- histórico de contatos;
- auditoria;
- hipóteses de dor;
- perguntas;
- oferta recomendada;
- faixa de preço;
- objeções prováveis;
- pontos que não podem ser afirmados sem validação.

## Etapa 10 — Call

Criar tela de call com:

- roteiro;
- campos de anotação;
- checklist;
- decisores;
- dores;
- impacto;
- urgência;
- orçamento;
- próximo passo;
- classificação;
- autorização para gravação ou transcrição, quando aplicável.

## Etapa 11 — Pós-call

Gerar:

- resumo;
- tarefas;
- e-mail ou WhatsApp de recapitulação;
- proposta;
- data de follow-up;
- probabilidade;
- valor;
- previsão de fechamento;
- motivo de não avanço.

## Etapa 12 — Proposta

Criar proposta a partir de template com:

- diagnóstico;
- objetivo;
- escopo;
- entregas;
- limites;
- cronograma;
- responsabilidades;
- investimento;
- condição de pagamento;
- validade;
- próximos passos.

Controlar:

- rascunho;
- aprovação;
- envio;
- visualização, quando suportada;
- aceite;
- revisão;
- perda;
- vencimento.

## Etapa 13 — Contrato e assinatura

Permitir:

- geração de contrato;
- anexação;
- integração futura com assinatura eletrônica;
- registro de enviado, visualizado, assinado ou recusado;
- armazenamento da versão assinada.

## Etapa 14 — Cobrança e pagamento

Criar módulo de pagamentos com adaptadores configuráveis.

MVP:

- registro manual de Pix, boleto, transferência ou cartão;
- geração de instrução de pagamento;
- parcelas;
- vencimentos;
- comprovantes;
- confirmação;
- atraso;
- cobrança pendente.

Evolução:

- integração com provedor brasileiro de pagamentos;
- webhook de pagamento;
- conciliação;
- recibo;
- nota fiscal ou tarefa para emissão.

Estados:

- proposta aceita;
- contrato assinado;
- aguardando entrada;
- entrada recebida;
- ganho e recebido;
- parcelas em andamento;
- inadimplente;
- cancelado.

## Etapa 15 — Onboarding

Somente após entrada recebida:

- criar cliente;
- criar projeto;
- checklist de acessos;
- reunião de kickoff;
- cronograma;
- responsáveis;
- entregas;
- próximas cobranças.

O dashboard deve diferenciar claramente:

- receita potencial;
- proposta enviada;
- receita contratada;
- receita faturada;
- dinheiro efetivamente recebido.



# 8. CADÊNCIA DE ABORDAGEM

Não disparar a sequência inteira automaticamente.

## Contato inicial

> Olá, [nome]. Analisei rapidamente a presença digital da [empresa] e encontrei uma oportunidade específica em [canal ou categoria]. Vocês têm um catálogo com boa aderência a marketplace, mas hoje [fato objetivo]. Eu atuo na implantação e escala de Mercado Livre, Amazon e Shopee, olhando margem, estoque, logística e operação. Posso te enviar um diagnóstico bem curto com os três pontos que identifiquei?

## Follow-up 1

> [Nome], complementando a mensagem anterior: o principal ponto que identifiquei foi [oportunidade real]. Não estou falando de simplesmente cadastrar produtos, mas de estruturar o canal para não perder margem e não criar um problema operacional. Faz sentido eu te mandar o diagnóstico?

## Follow-up 2

> Preparei um resumo da [empresa] com três pontos: [ponto 1], [ponto 2] e [ponto 3]. Caso marketplace esteja entre as prioridades deste semestre, consigo te explicar em uma conversa objetiva como eu estruturaria isso.

## Encerramento respeitoso

> [Nome], vou encerrar meu contato para não ser inconveniente. Caso a expansão em Mercado Livre, Amazon ou Shopee entre no planejamento da [empresa], fico à disposição para compartilhar o diagnóstico que preparei.

Depois do encerramento, não contatar novamente sem novo motivo legítimo.

---

# 9. RESPOSTAS COMERCIAIS

## Quando o lead demonstra interesse

> Perfeito. Antes de marcar, me responda só três pontos para eu não fazer uma conversa genérica: vocês já vendem em algum marketplace, qual parte hoje mais trava o projeto e existe alguém da equipe responsável pela operação digital?

## Quando pergunta preço

> O investimento depende do nível de implantação. Hoje trabalho com uma mentoria de 90 dias para empresas que já têm equipe de execução e com uma implantação mais completa para quem precisa estruturar catálogo, preço, operação, logística e canais. Antes de te passar o formato correto, preciso entender em que estágio vocês estão. Consigo fazer isso em uma conversa objetiva.

## Quando diz que já possui agência

> Ótimo. Meu trabalho normalmente não concorre com agência de tráfego ou operação de catálogo. Eu entro na parte de estratégia, margem, estoque, logística, integração e decisões do canal. A pergunta é: a operação atual já entrega lucro, previsibilidade e escala ou ainda existem gargalos?

## Quando diz que não tem orçamento

> Entendi. Nesse caso, não faz sentido forçar uma implantação agora. Posso deixar o diagnóstico registrado e, quando o projeto entrar no orçamento, retomamos a conversa com os pontos já mapeados.

## Quando pede proposta sem reunião

> Consigo enviar, mas uma proposta sem entender catálogo, margem, estoque e equipe tende a ficar genérica. Prefiro fazer uma conversa curta, identificar o formato certo e depois enviar algo coerente com a realidade de vocês.

---

# 10. ROTEIRO DA REUNIÃO DE DIAGNÓSTICO

Duração desejada: 30 a 45 minutos.

Perguntas:

1. Qual é o faturamento aproximado da empresa?
2. Quais são os principais produtos?
3. Quantos SKUs existem?
4. Qual é a faixa média de margem bruta?
5. Já vendem em Mercado Livre, Amazon ou Shopee?
6. Quanto esses canais representam?
7. Quem cuida da operação?
8. Qual ERP utilizam?
9. Como funciona estoque e emissão fiscal?
10. A empresa consegue repor produto com velocidade?
11. Já tentaram marketplace antes?
12. O que deu errado?
13. Qual seria um resultado relevante nos próximos seis meses?
14. Qual é o custo de continuar sem o canal ou com o canal mal estruturado?
15. Quem participa da decisão?
16. Existe orçamento e prioridade para implantação?

Fechamento da reunião:

> Pelo que você me explicou, o problema não é falta de produto. O gargalo está em [resumo]. O formato que faz sentido é [oferta], porque precisamos atuar em [entregas]. Eu não entraria apenas para orientar anúncios; a proposta é estruturar o canal para funcionar com margem e operação. O investimento é [valor]. Se houver alinhamento, o próximo passo é formalizar o escopo, reunir os acessos e iniciar o diagnóstico detalhado.

---

# 11. BANCO DE DADOS

Criar entidades:

- User;
- Campaign;
- Segment;
- Company;
- Contact;
- Source;
- MarketplacePresence;
- AuditFinding;
- LeadScore;
- OutreachMessage;
- OutreachAttempt;
- Conversation;
- ReplyClassification;
- Task;
- Meeting;
- Proposal;
- Offer;
- OptOut;
- Blocklist;
- AuditLog.

Campos essenciais de Company:

- id;
- legalName;
- tradeName;
- cnpj;
- cnaePrimary;
- cnaeSecondary;
- city;
- state;
- website;
- instagram;
- publicBusinessEmail;
- publicBusinessPhone;
- catalogSummary;
- segment;
- status;
- createdAt;
- updatedAt.

Campos essenciais de LeadScore:

- productFit;
- marketplaceGap;
- businessStructure;
- catalogQuality;
- investmentSignals;
- contactability;
- problemClarity;
- total;
- rationale;
- confidence;
- generatedAt.

---

# 12. PAINEL

Criar telas:

1. Dashboard.
2. Campanhas.
3. Empresas encontradas.
4. Fila de auditoria.
5. Aprovação de leads.
6. Kanban comercial.
7. Conversas.
8. Agenda.
9. Propostas.
10. Templates.
11. Métricas.
12. Compliance.
13. Configurações.

Dashboard:

- empresas pesquisadas;
- leads qualificados;
- mensagens aprovadas;
- contatos realizados;
- respostas;
- respostas positivas;
- reuniões;
- propostas;
- fechamentos;
- receita potencial;
- motivos de perda;
- desempenho por segmento;
- desempenho por mensagem;
- desempenho por fonte.

---


# 12A. COMMAND CENTER DIÁRIO

A página inicial deve responder imediatamente:

- o que precisa ser feito hoje;
- quais follow-ups vencem hoje;
- quais estão atrasados;
- quais reuniões existem;
- quais leads responderam;
- quais propostas precisam de ação;
- quais contratos aguardam assinatura;
- quais pagamentos vencem;
- quanto entrou hoje;
- qual é o pipeline atualizado.

Criar blocos:

1. Agenda de hoje.
2. Follow-ups de hoje.
3. Pendências críticas.
4. Respostas novas.
5. Calls agendadas.
6. Propostas em negociação.
7. Contratos aguardando.
8. Pagamentos esperados.
9. Dinheiro recebido.
10. Próximas melhores ações.

Cada item deve permitir:

- concluir;
- remarcar;
- abrir lead;
- abrir conversa;
- gerar mensagem;
- adicionar nota;
- delegar;
- cancelar com motivo.

Timezone padrão: `America/Sao_Paulo`.

# 12B. TABELA MESTRA DE LEADS

Criar uma visão chamada `Tabela Mestre`, com colunas configuráveis:

## Identificação

- ID;
- data de entrada;
- campanha;
- segmento;
- razão social;
- nome fantasia;
- CNPJ;
- CNAE;
- porte;
- cidade;
- UF;
- site;
- Instagram;
- fonte principal;
- data da última validação.

## Contatos

- decisor;
- cargo;
- e-mail empresarial;
- telefone empresarial;
- WhatsApp;
- LinkedIn;
- fonte do contato;
- confiança;
- permissão ou contexto para contato.

## Auditoria

- presença no Mercado Livre;
- presença na Amazon;
- presença na Shopee;
- qualidade do catálogo;
- oportunidade principal;
- três achados;
- concorrentes;
- evidências;
- data da auditoria.

## Qualificação

- score total;
- product fit;
- marketplace gap;
- estrutura;
- catálogo;
- sinais de investimento;
- contactabilidade;
- clareza do problema;
- potencial A, B, C ou nutrir;
- oferta sugerida;
- valor potencial;
- confiança da estimativa.

## Prospecção

- status;
- responsável;
- canal inicial;
- primeira mensagem;
- data do primeiro contato;
- último contato;
- quantidade de tentativas;
- resposta;
- classificação da resposta;
- próximo follow-up;
- tarefa atrasada;
- opt-out.

## Reunião e venda

- reunião marcada;
- compareceu;
- dor principal;
- orçamento;
- decisores;
- oferta apresentada;
- valor proposto;
- desconto;
- probabilidade;
- previsão de fechamento;
- proposta enviada;
- contrato;
- motivo de perda.

## Financeiro

- valor contratado;
- entrada prevista;
- entrada recebida;
- saldo;
- próxima parcela;
- atraso;
- dinheiro recebido;
- data do primeiro recebimento;
- status financeiro.

Recursos da tabela:

- busca;
- filtros;
- ordenação;
- agrupamento;
- colunas salvas;
- edição em massa controlada;
- exportação;
- importação com validação;
- histórico de alterações;
- links para fontes;
- destaque de dados desatualizados.

# 12C. EXPORTAÇÃO EXCEL

Criar exportação `.xlsx` sob demanda e, opcionalmente, snapshot diário.

Abas obrigatórias:

1. `Leads`;
2. `Contatos`;
3. `Auditoria Marketplace`;
4. `Score`;
5. `Abordagens`;
6. `Follow-ups`;
7. `Agenda`;
8. `Reuniões`;
9. `Propostas`;
10. `Contratos`;
11. `Pagamentos`;
12. `Dashboard`;
13. `Motivos de Perda`;
14. `Dicionário de Dados`.

Requisitos:

- cabeçalhos congelados;
- autofiltro;
- largura adequada;
- datas formatadas;
- moeda em real;
- validações;
- links clicáveis;
- IDs estáveis;
- fórmulas de totais;
- aba de indicadores;
- data e hora da exportação;
- fuso horário;
- não perder caracteres em português.

O Excel não substitui o CRM. Ele serve para análise, backup operacional, compartilhamento e conferência.

# 12D. KANBAN E ESTÁGIOS

Estágios padrão:

1. Encontrado;
2. Em auditoria;
3. Qualificado;
4. Aguardando aprovação;
5. Aprovado para contato;
6. Contatado;
7. Follow-up;
8. Respondeu;
9. Qualificação;
10. Reunião marcada;
11. Reunião realizada;
12. Proposta em elaboração;
13. Proposta enviada;
14. Negociação;
15. Contrato enviado;
16. Contrato assinado;
17. Aguardando pagamento;
18. Entrada recebida;
19. Ganho e recebido;
20. Onboarding;
21. Nutrição;
22. Perdido;
23. Bloqueado.

Cada mudança deve registrar:

- usuário;
- data;
- estágio anterior;
- novo estágio;
- motivo;
- próxima ação.

# 12E. DASHBOARD EXECUTIVO

Indicadores:

## Aquisição

- empresas pesquisadas;
- leads qualificados;
- score médio;
- leads A, B e C;
- custo por lead, quando houver;
- origem;
- segmento;
- região.

## Atividade

- contatos por dia;
- contatos por canal;
- follow-ups;
- tarefas concluídas;
- tarefas atrasadas;
- tempo médio até primeiro contato;
- tempo médio de resposta.

## Conversão

- taxa de resposta;
- resposta positiva;
- diagnóstico;
- reunião marcada;
- comparecimento;
- proposta;
- contrato;
- entrada recebida;
- conversão por etapa;
- conversão por segmento;
- conversão por mensagem;
- conversão por responsável.

## Pipeline

- número de oportunidades;
- valor bruto;
- valor ponderado;
- ticket médio;
- previsão mensal;
- negócios parados;
- idade por estágio.

## Financeiro

- valor proposto;
- valor contratado;
- descontos;
- entradas previstas;
- entradas recebidas;
- receita recebida por dia, semana e mês;
- contas em atraso;
- saldo contratado;
- forecast de caixa.

## Qualidade

- opt-outs;
- contatos inválidos;
- duplicidades;
- taxa de dados desatualizados;
- motivos de perda;
- empresas bloqueadas;
- mensagens rejeitadas por compliance.

Criar filtros por:

- data;
- campanha;
- segmento;
- região;
- responsável;
- oferta;
- estágio;
- score;
- canal.

# 12F. AUTOMAÇÃO DA AGENDA

Criar rotinas que:

- montem agenda do dia;
- priorizem tarefas por valor, urgência, score e estágio;
- alertem sobre lead sem próxima ação;
- alertem proposta sem follow-up;
- alertem contrato assinado sem pagamento;
- alertem pagamento vencido;
- criem briefing antes da call;
- criem tarefa pós-call;
- produzam resumo de encerramento do dia;
- preparem agenda do dia seguinte.

Não enviar mensagens externas automaticamente apenas porque uma tarefa venceu. Criar a ação e solicitar aprovação quando necessário.

# 12G. DADOS E ENTIDADES ADICIONAIS

Além das entidades já definidas, criar:

- ServicePackage;
- PriceVersion;
- DiscountPolicy;
- CampaignBudget;
- PipelineStage;
- Deal;
- Activity;
- FollowUpRule;
- DailyAgenda;
- CalendarEvent;
- Call;
- CallNote;
- Qualification;
- ProposalVersion;
- Contract;
- Payment;
- Installment;
- PaymentProof;
- RevenueEvent;
- OnboardingProject;
- DataExport;
- SavedView;
- Notification;
- IntegrationCredential;
- WebhookEvent.

# 12H. CRITÉRIO DE CONCLUSÃO DO NEGÓCIO

O sistema deve evitar uma ilusão comum de CRM: contar proposta ou contrato como venda concluída.

Separar:

- oportunidade;
- proposta;
- aceite;
- contrato;
- faturamento;
- recebimento.

A conversão final principal é:

> Lead pesquisado → contato → resposta → reunião → proposta → contrato → entrada efetivamente recebida.

O indicador principal de resultado não é quantidade de mensagens. É dinheiro recebido de clientes adequados, com escopo sustentável e baixa chance de inadimplência ou cancelamento.


# 13. MÉTRICAS DO PILOTO

Tratar como metas de validação, não como garantia.

Para cada campanha piloto:

- 100 empresas pesquisadas;
- 40 leads com score acima de 65;
- 20 contatos aprovados manualmente;
- acompanhamento da taxa de resposta;
- acompanhamento da taxa de resposta positiva;
- reuniões;
- propostas;
- fechamentos;
- tempo gasto por lead;
- motivo de perda;
- taxa de opt-out.

Não aumentar volume até descobrir:

- segmento que mais responde;
- mensagem que gera conversa;
- perfil que fecha;
- principal objeção;
- capacidade real de entrega de Iago.

---

# 14. REGRAS DE QUALIDADE

- Toda mensagem deve ser individual.
- Nenhum dado pode ser inventado.
- Toda oportunidade deve ter evidência.
- Nenhum envio inicial automático por WhatsApp.
- Todo lead pode ser bloqueado.
- Toda ação deve gerar log.
- Toda campanha deve ter limite diário.
- Não contatar fora de horário comercial.
- Não usar números pessoais sem contexto profissional.
- Não usar dados sensíveis.
- Não coletar mais dados que o necessário.
- Não prometer resultado financeiro.
- Não usar “IA” como argumento principal de venda.
- Não usar automação para parecer que uma pessoa pesquisou algo que não foi pesquisado.
- Quando a confiança da informação for baixa, marcar claramente.
- Quando houver CAPTCHA, parar.
- Quando a plataforma proibir automação, usar modo assistido.

---

# 15. IMPLEMENTAÇÃO DO WHATSAPP

## Modo 1 — Assistido

Obrigatório no MVP.

Fluxo:

1. usuário aprova o lead;
2. sistema gera mensagem;
3. sistema abre `wa.me` ou WhatsApp Web;
4. sistema preenche o texto;
5. sistema aguarda;
6. usuário revisa;
7. usuário clica em enviar;
8. sistema registra o contato.

Não clicar automaticamente em “Enviar”.

## Modo 2 — Oficial

Implementar como módulo opcional.

Usar a WhatsApp Business Platform para:

- contatos com opt-in;
- resposta a mensagens recebidas;
- lembretes autorizados;
- follow-up após conversa;
- templates aprovados;
- agendamento;
- notificações.

Guardar:

- origem do opt-in;
- data;
- finalidade;
- versão do texto autorizado;
- status de revogação.

---

# 16. TESTES

Criar:

- testes unitários do score;
- testes de deduplicação;
- testes de blacklist;
- testes de opt-out;
- testes dos agentes;
- testes da API;
- testes de interface;
- teste Playwright do fluxo de campanha;
- teste de abertura do WhatsApp sem envio;
- teste de interrupção da cadência quando houver resposta;
- teste de bloqueio de dado sensível;
- teste de logging;
- teste de retry.

Criar dados fictícios. Nunca usar dados reais nos testes.

---

# 17. ENTREGÁVEIS OBRIGATÓRIOS

1. Projeto funcional.
2. `README.md`.
3. `CLAUDE.md`.
4. `docs/arquitetura.md`.
5. `docs/analise-video.md`.
6. `docs/politica-dados.md`.
7. `docs/manual-comercial.md`.
8. `docs/implantacao-whatsapp.md`.
9. `docs/checklist-piloto.md`.
10. `.env.example`.
11. Docker Compose.
12. Banco e migrações.
13. Seed fictício.
14. Painel.
15. Workers.
16. Agentes.
17. Testes.
18. Scripts de execução.
19. Exportação CSV.
20. Logs e auditoria.
21. Deploy funcional do dashboard na Vercel.
22. Banco PostgreSQL gerenciado conectado.
23. Worker de automação separado.
24. Tabela Mestre de leads.
25. Exportação Excel completa.
26. Command Center diário.
27. Agenda e motor de follow-up.
28. Kanban de ponta a ponta.
29. Propostas, contratos e pagamentos.
30. Dashboard de dinheiro recebido.
31. Manual de deploy e operação.
32. Plano de rollback e recuperação.

---

# 18. ORDEM DE EXECUÇÃO

Execute sem ficar apenas planejando.

1. Analise o vídeo.
2. Crie a arquitetura.
3. Inicialize o repositório.
4. Crie banco e modelos.
5. Crie painel.
6. Implemente campanha.
7. Implemente coleta controlada.
8. Implemente auditoria de marketplace.
9. Implemente score.
10. Implemente geração de mensagens.
11. Implemente aprovação humana.
12. Implemente Kanban.
13. Implemente WhatsApp assistido.
14. Implemente respostas e tarefas.
15. Implemente métricas.
16. Implemente compliance.
17. Crie testes.
18. Rode testes e corrija falhas.
19. Documente.
20. Faça deploy de produção na Vercel.
21. Conecte o banco gerenciado.
22. Faça deploy do worker.
23. Valide o fluxo completo com dados fictícios: pesquisa → score → aprovação → contato assistido → resposta → agenda → call → proposta → contrato → entrada recebida → onboarding.
24. Gere uma exportação Excel de teste.
25. Apresente um resumo do que foi construído, URLs, comandos, credenciais que ainda precisam ser fornecidas e limitações restantes.

Use versões estáveis das dependências.

Não faça deploy em produção sem:

- testes concluídos;
- aprovação do usuário;
- política de privacidade;
- número empresarial dedicado;
- rotina de opt-out;
- limites de campanha;
- revisão jurídica e de compliance.

---

# 19. DECISÃO ESTRATÉGICA CENTRAL

O sistema não deve tentar substituir completamente a equipe comercial.

Modelo inicial:

- IA = pesquisa, auditoria, score, personalização, CRM e preparação;
- automação = tarefas repetitivas;
- Iago = autoridade, diagnóstico, negociação e fechamento;
- SDR humano = somente depois que o processo produzir volume recorrente;
- closer contratado = somente depois que o discurso e a oferta estiverem validados.

O objetivo não é enviar o maior número de mensagens.

O objetivo é produzir o maior número possível de **conversas qualificadas com empresários que tenham produto, estrutura e capacidade de implantação**.

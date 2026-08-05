# Análise do vídeo de referência

**Status: pendente — precisa de você.**

O prompt-mestre pede, como primeira ação, assistir a um vídeo privado do
Facebook (`https://www.facebook.com/watch/?v=1515931933567884`) com o
usuário autenticado, e documentar aqui a sequência operacional, ferramentas
mostradas, e quais partes são seguras de reproduzir.

Esta sessão não tem um navegador autenticado na sua conta do Facebook — as
ferramentas disponíveis aqui são busca web e leitura/escrita de arquivo, não
um navegador com sua sessão logada. Para completar esta etapa, uma destas
duas opções resolve:

1. **Você assiste e resume:** me diga, em texto, a sequência de ferramentas
   e passos que o vídeo mostra (ex: "usa tal extensão para exportar
   contatos do Instagram", "abre o WhatsApp Web e cola o texto", etc.), e eu
   preencho o restante deste documento com a análise de compliance (o que é
   seguro replicar vs. o que fica de fora por violar termos de serviço,
   seção 1, item 6).
2. **Uma sessão com Claude no Chrome conectado à sua conta** assiste ao
   vídeo diretamente e preenche este arquivo.

## O que já sabemos preservar (independente do vídeo)

Pelas regras da seção 1 e 14, mesmo sem ver o vídeo, estas práticas ficam
de fora de qualquer implementação, não importa o que o vídeo mostre:

- quebra de CAPTCHA;
- disparo de WhatsApp em massa ou automático sem clique humano;
- coleta de dado sensível ou em área privada sem autorização;
- qualquer prática que viole termos de serviço de Facebook/Instagram/
  WhatsApp/marketplaces.

Quando este documento for preenchido, ele deve terminar com uma tabela:
"ideia do vídeo" x "reproduzir como está / adaptar com guardrail / não
reproduzir (motivo)".

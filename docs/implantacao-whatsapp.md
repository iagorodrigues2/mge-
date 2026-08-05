# Implantação WhatsApp

## Modo 1 — Assistido (implementado, obrigatório no MVP)

Fluxo real, em `apps/web/templates/whatsapp_assisted.html` +
`apps/web/app.py::lead_whatsapp`:

1. Lead é aprovado na Tabela Mestre / detalhe da empresa.
2. Sistema já tem uma `OutreachMessage` aprovada (gerada a partir dos
   templates de `packages/agents/copywriter.py`, com lint de compliance de
   conteúdo).
3. Página `/leads/<id>/whatsapp` monta um link `https://wa.me/55<numero>?text=<mensagem>`.
4. O link abre em nova aba — **o sistema nunca clica em enviar.**
5. Depois de enviar manualmente, o usuário volta e clica em "Confirmar que
   enviei", que marca `human_confirmed = TRUE` no `OutreachAttempt` — só aí
   a tentativa conta como enviada de verdade.

Isso é deliberadamente igual ao MVP descrito na seção 15 do prompt-mestre.

## Modo 2 — Oficial (não implementado nesta sessão)

Requer WhatsApp Business Platform (Business API), que por sua vez requer:

- conta Meta Business verificada;
- número de telefone dedicado (não pode ser o WhatsApp pessoal);
- aprovação de templates de mensagem pela Meta;
- registro documentado de opt-in por contato (origem, data, finalidade,
  versão do texto autorizado, status de revogação — campos já reservados em
  `IntegrationCredential`/`WebhookEvent` no schema).

Ver a política oficial: [WhatsApp Business Messaging Policy](https://business.whatsapp.com/policy).
Prospecção fria em volume sem opt-in, mesmo com boa intenção, viola essa
política e pode banir o número — por isso o Modo 2 só deve ser ligado
depois que o Modo 1 já validou a mensagem/oferta e o volume justificar o
custo/esforço de aprovação.

## Quando migrar

Sinal de que vale a pena: taxa de resposta positiva do Modo 1 estável, e
volume de contatos por dia batendo no limite prático de operação manual
(um humano clicando enviar em cada mensagem). Até lá, Modo 1 é
suficiente e mais seguro.

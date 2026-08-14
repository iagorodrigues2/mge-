// Envio de WhatsApp. Dois modos:
//  1. Oficial (Cloud API) — se WHATSAPP_BUSINESS_TOKEN + PHONE_ID setados,
//     envia de verdade.
//  2. Assistido — sem credenciais, devolve um link wa.me pronto (clique humano).
// A aprovação do lead É o clique humano exigido pela seção 6.7.

export interface WhatsResult {
  status: "enviado" | "assistido" | "bloqueado";
  detail: string;
}

function digits(phone: string): string {
  return phone.replace(/\D/g, "");
}

export async function sendWhatsApp(phone: string, message: string): Promise<WhatsResult> {
  const to = digits(phone);
  if (!to) return { status: "bloqueado", detail: "telefone inválido" };

  const token = process.env.WHATSAPP_BUSINESS_TOKEN;
  const phoneId = process.env.WHATSAPP_BUSINESS_PHONE_ID;

  if (token && phoneId) {
    try {
      const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { preview_url: false, body: message },
        }),
      });
      const data = (await res.json()) as { messages?: { id: string }[]; error?: { message: string } };
      if (!res.ok || data.error) {
        return { status: "bloqueado", detail: `API WhatsApp: ${data.error?.message ?? res.status}` };
      }
      return { status: "enviado", detail: `id ${data.messages?.[0]?.id ?? "?"}` };
    } catch (e) {
      return { status: "bloqueado", detail: `falha de rede: ${(e as Error).message}` };
    }
  }

  // modo assistido
  const link = `https://wa.me/${to}?text=${encodeURIComponent(message)}`;
  return { status: "assistido", detail: link };
}

// PRIMEIRA mensagem de outbound frio.
//
// Regra da Meta que define toda a arquitetura: conversa iniciada PELA EMPRESA
// só pode sair como TEMPLATE APROVADO. Texto livre é rejeitado. A janela de 24h
// de mensagem livre só abre DEPOIS que o lead responde — e é aí que o agente
// Vendedor assume e conduz sozinho.
//
// Por isso o template é curto e serve a um único objetivo: ganhar a resposta.
export interface TemplateResult extends WhatsResult {
  janelaAberta?: boolean; // se true, dá pra conversar livre (lead respondeu antes)
}

export async function sendTemplate(
  phone: string,
  templateName: string,
  variaveis: string[] = [],
  lang = "pt_BR",
): Promise<TemplateResult> {
  const to = digits(phone);
  if (!to) return { status: "bloqueado", detail: "telefone inválido" };

  const token = process.env.WHATSAPP_BUSINESS_TOKEN;
  const phoneId = process.env.WHATSAPP_BUSINESS_PHONE_ID;
  if (!token || !phoneId) {
    // sem credenciais: devolve o link assistido com o texto já preenchido
    const preview = variaveis.length ? `[${templateName}] ${variaveis.join(" | ")}` : `[${templateName}]`;
    return { status: "assistido", detail: `https://wa.me/${to}?text=${encodeURIComponent(preview)}` };
  }

  const components = variaveis.length
    ? [{ type: "body", parameters: variaveis.map((v) => ({ type: "text", text: v })) }]
    : undefined;

  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: { name: templateName, language: { code: lang }, ...(components ? { components } : {}) },
      }),
    });
    const data = (await res.json()) as { messages?: { id: string }[]; error?: { message: string; code?: number } };
    if (!res.ok || data.error) {
      return { status: "bloqueado", detail: `API WhatsApp (template): ${data.error?.message ?? res.status}` };
    }
    return { status: "enviado", detail: `id ${data.messages?.[0]?.id ?? "?"}` };
  } catch (e) {
    return { status: "bloqueado", detail: `falha de rede: ${(e as Error).message}` };
  }
}

export function whatsappConfigurado(): boolean {
  return !!process.env.WHATSAPP_BUSINESS_TOKEN && !!process.env.WHATSAPP_BUSINESS_PHONE_ID;
}

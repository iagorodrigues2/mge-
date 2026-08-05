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

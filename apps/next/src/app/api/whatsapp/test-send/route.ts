import { NextResponse } from "next/server";
import { sendTemplate, sendWhatsApp, whatsappConfigurado } from "@/lib/whatsapp";

export const runtime = "nodejs";

// Verificação ponta a ponta do WhatsApp. Não toca no banco nem cria lead.
//
// Por que TEMPLATE e não texto livre: mensagem iniciada pela empresa só sai como
// template aprovado. Texto livre só funciona DEPOIS que o lead responde (janela
// de 24h) — que é exatamente o que este teste quer provar.
export async function POST(req: Request) {
  const { to, modo } = (await req.json().catch(() => ({}))) as {
    to?: string;
    modo?: "template" | "texto";
  };
  if (!whatsappConfigurado()) {
    return NextResponse.json({ ok: false, erro: "WHATSAPP_BUSINESS_TOKEN/PHONE_ID ausentes" });
  }
  if (!to) return NextResponse.json({ ok: false, erro: "informe 'to' (E.164, ex: 5511999999999)" });

  // hello_world é o template que a Meta já deixa aprovado em conta de teste
  const r = modo === "texto"
    ? await sendWhatsApp(to, "Teste da Máquina de Vendas — se você recebeu isto, o envio está funcionando.")
    : await sendTemplate(to, "hello_world", [], "en_US");

  return NextResponse.json({ ok: r.status === "enviado", resultado: r, modo: modo ?? "template" });
}

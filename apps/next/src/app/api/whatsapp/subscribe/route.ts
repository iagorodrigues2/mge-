import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Assinatura da WABA ao app — a peça que falta quando o webhook e' verificado,
// o campo `messages` esta marcado, o app esta publicado... e mesmo assim nada
// chega.
//
// Sao DUAS assinaturas diferentes e o painel so mostra uma:
//   1. campo `messages` no app        -> visivel na UI
//   2. a WABA inscrita NO app         -> so existe via Graph API (subscribed_apps)
// Sem a segunda, a Meta valida a URL e nunca entrega as mensagens daquela conta.

const WABA_ID = process.env.WHATSAPP_WABA_ID || "3411891095649774";

function token(): string | null {
  return process.env.WHATSAPP_BUSINESS_TOKEN || null;
}

// GET = diagnostico: quais apps estao inscritos nesta WABA?
export async function GET() {
  const t = token();
  if (!t) return NextResponse.json({ ok: false, erro: "WHATSAPP_BUSINESS_TOKEN ausente" });
  const r = await fetch(`https://graph.facebook.com/v20.0/${WABA_ID}/subscribed_apps`, {
    headers: { Authorization: `Bearer ${t}` },
  });
  const data = await r.json();
  return NextResponse.json({ ok: r.ok, wabaId: WABA_ID, inscritos: data });
}

// POST = corrige: inscreve o app nesta WABA.
export async function POST() {
  const t = token();
  if (!t) return NextResponse.json({ ok: false, erro: "WHATSAPP_BUSINESS_TOKEN ausente" });
  const r = await fetch(`https://graph.facebook.com/v20.0/${WABA_ID}/subscribed_apps`, {
    method: "POST",
    headers: { Authorization: `Bearer ${t}` },
  });
  const data = await r.json();
  return NextResponse.json({ ok: r.ok, wabaId: WABA_ID, resultado: data });
}

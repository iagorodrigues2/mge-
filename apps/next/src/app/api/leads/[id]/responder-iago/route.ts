import { NextResponse } from "next/server";
import { getLead, upsertLead } from "@/lib/db";
import { responderPendenciaIago } from "@/lib/ai-sdr";

export const runtime = "nodejs";

// O Iago responde uma dúvida que a IA deixou pendente (ver
// SdrState.perguntaPendenteIago). `responderPendenciaIago` reformula a
// resposta no tom do agente, manda pro lead, grava a conversa e salva a
// resposta como conhecimento permanente (vale pra qualquer lead futuro).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { resposta?: string };
  const resposta = (body.resposta ?? "").trim();
  if (!resposta) return NextResponse.json({ ok: false, error: "envie 'resposta'" }, { status: 400 });

  const lead = await getLead(id);
  if (!lead) return NextResponse.json({ ok: false, error: "lead não encontrado" }, { status: 404 });

  const resultado = await responderPendenciaIago(lead, resposta);
  if (resultado.error) return NextResponse.json({ ok: false, error: resultado.error }, { status: 400 });

  await upsertLead(lead);
  return NextResponse.json({ ok: resultado.ok, reply: resultado.reply, envio: resultado.envio });
}

import { NextResponse } from "next/server";
import { getLead, upsertLead } from "@/lib/db";
import { sendWhatsApp } from "@/lib/whatsapp";

export const runtime = "nodejs";

// O Iago responde uma dúvida que a IA deixou pendente (ver
// SdrState.perguntaPendenteIago) — a resposta vai DIRETO pro lead pelo
// WhatsApp, tal como o Iago escreveu, e some da lista de pendências.
// Não passa pelo modelo de novo: é a palavra do Iago, não uma reescrita.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { resposta?: string };
  const resposta = (body.resposta ?? "").trim();
  if (!resposta) return NextResponse.json({ ok: false, error: "envie 'resposta'" }, { status: 400 });

  const lead = await getLead(id);
  if (!lead) return NextResponse.json({ ok: false, error: "lead não encontrado" }, { status: 404 });

  const destino = lead.whatsapp || lead.telefone;
  if (!destino) return NextResponse.json({ ok: false, error: "lead sem WhatsApp/telefone cadastrado" }, { status: 400 });

  const envio = await sendWhatsApp(destino, resposta);

  const now = new Date().toISOString();
  lead.conversation = [...(lead.conversation ?? []), { role: "ia", text: resposta, at: now }];
  if (lead.sdr) delete lead.sdr.perguntaPendenteIago;
  lead.updatedAt = now;
  await upsertLead(lead);

  return NextResponse.json({ ok: envio.status !== "bloqueado", envio });
}

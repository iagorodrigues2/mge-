import { NextResponse } from "next/server";
import { sdrRespond } from "@/lib/ai-sdr";
import { getLead } from "@/lib/db";
import type { Lead, ConversationMsg } from "@/lib/types";

export const runtime = "nodejs";

// Simula um turno do agente Vendedor sem WhatsApp e sem persistir — para
// demonstrar/afinar a IA. Aceita um leadId real OU um lead sintético
// (empresa/segmento) + a mensagem do lead + histórico opcional.
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      leadId?: string;
      empresa?: string;
      segmento?: string;
      message?: string;
      history?: ConversationMsg[];
    };
    const message = (body.message ?? "").trim();
    if (!message) return NextResponse.json({ ok: false, error: "envie 'message' (a fala do lead)" }, { status: 400 });

    let lead: Lead | undefined;
    if (body.leadId) lead = await getLead(body.leadId);
    if (!lead) {
      const now = new Date().toISOString();
      lead = {
        id: "sim",
        empresa: body.empresa || "Empresa Simulada",
        segmento: body.segmento || "Casa, móveis e decoração",
        has_website: true,
        source: "simulacao",
        stage: "em_conversa",
        approved: true,
        opt_out: false,
        attempts: [],
        createdAt: now,
        updatedAt: now,
      };
    }
    if (body.history) lead.conversation = body.history;

    const turn = await sdrRespond(lead, message);
    return NextResponse.json(turn, { status: turn.ok ? 200 : 400 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

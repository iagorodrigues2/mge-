import { NextResponse } from "next/server";
import { sdrRespond } from "@/lib/ai-sdr";
import { getLead } from "@/lib/db";
import type { Lead, ConversationMsg, SdrState } from "@/lib/types";

export const runtime = "nodejs";

// Simula um turno do agente Vendedor sem WhatsApp e sem persistir — para
// demonstrar/afinar a IA. Aceita um leadId real OU um lead sintético
// (empresa/segmento) + a mensagem do lead + histórico opcional.
// O `state` volta na resposta e deve ser reenviado no turno seguinte: é ele que
// carrega o diagnóstico (fase, slots, business case) entre as mensagens.
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      leadId?: string;
      empresa?: string;
      segmento?: string;
      message?: string;
      history?: ConversationMsg[];
      state?: SdrState;
      inbound?: boolean;
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
        inbound: body.inbound === true,
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
    if (body.state) lead.sdr = body.state; // continua o diagnóstico de onde parou

    const turn = await sdrRespond(lead, message);
    return NextResponse.json(turn, { status: turn.ok ? 200 : 400 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

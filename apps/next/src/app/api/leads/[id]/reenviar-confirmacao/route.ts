import { NextResponse } from "next/server";
import { getLead, upsertLead } from "@/lib/db";
import { avisarLeadDaReuniao } from "@/lib/reuniao";

export const runtime = "nodejs";

// Reenvia a confirmação da reunião (horário + link) por e-mail e WhatsApp.
// Existe para o dia em que o lead disser "não recebi o link": em vez de o Iago
// copiar e colar na mão, um clique manda de novo pelos dois canais.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const lead = await getLead(id);
  if (!lead) return NextResponse.json({ ok: false, error: "lead não encontrado" }, { status: 404 });
  if (!lead.reuniao) return NextResponse.json({ ok: false, error: "este lead não tem reunião marcada" }, { status: 400 });

  // Zera o carimbo para o aviso sair de novo — é um reenvio consciente.
  lead.reuniao = { ...lead.reuniao, avisoLeadEnviado: undefined };
  const r = await avisarLeadDaReuniao(lead);
  await upsertLead(lead);
  return NextResponse.json({ ok: true, reuniao: lead.reuniao.rotulo, meet: lead.reuniao.meet ?? null, enviado: r });
}

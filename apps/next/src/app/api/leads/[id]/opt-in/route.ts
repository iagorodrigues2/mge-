import { NextResponse } from "next/server";
import { getLead, removeOptOut, upsertLead } from "@/lib/db";

export const runtime = "nodejs";

// Reverte um opt-out (ex.: falso positivo do gatilho de descadastro no
// webhook — mensagem longa que só começava com "não quero"/"pare de"/etc.).
// Sem isso o lead ficava preso em "ignorado (opt-out)" pra sempre, sem
// nenhuma tela ou botão pra tirar.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) return NextResponse.json({ ok: false, erro: "lead não encontrado" }, { status: 404 });

  const chave = lead.whatsapp ?? lead.telefone;
  if (chave) await removeOptOut(chave);

  lead.opt_out = false;
  if (lead.stage === "opt_out") lead.stage = "em_conversa";
  lead.updatedAt = new Date().toISOString();
  await upsertLead(lead);

  return NextResponse.json({ ok: true, lead });
}

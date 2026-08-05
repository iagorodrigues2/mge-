import { NextResponse } from "next/server";
import { sendProposal, acceptProposal, loseProposal } from "@/lib/proposals";

export const runtime = "nodejs";

// ação via body: { action: "send" | "accept" | "lose", reason? }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = body.action;
  if (action === "send") return NextResponse.json(await sendProposal(id));
  if (action === "accept") return NextResponse.json(await acceptProposal(id));
  if (action === "lose") return NextResponse.json(await loseProposal(id, String(body.reason ?? "não informado")));
  return NextResponse.json({ ok: false, error: "ação inválida" }, { status: 400 });
}

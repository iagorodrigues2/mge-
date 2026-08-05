import { NextResponse } from "next/server";
import { createProposal } from "@/lib/proposals";
import { listProposals } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ proposals: await listProposals() });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { leadId, packageCode, valor, diagnostico } = body;
  if (!leadId || !packageCode) return NextResponse.json({ ok: false, error: "leadId e packageCode obrigatórios" }, { status: 400 });
  const res = await createProposal(leadId, packageCode, valor ? Number(valor) : undefined, diagnostico);
  return NextResponse.json(res, { status: res.ok ? 200 : 400 });
}

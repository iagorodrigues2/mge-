import { NextResponse } from "next/server";
import { markInstallmentPaid } from "@/lib/financeiro";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const n = Number(body.n);
  if (!n) return NextResponse.json({ ok: false, error: "n (número da parcela) obrigatório" }, { status: 400 });
  const res = await markInstallmentPaid(id, n);
  return NextResponse.json(res, { status: res.ok ? 200 : 400 });
}

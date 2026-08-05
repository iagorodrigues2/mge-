import { NextResponse } from "next/server";
import { enrichLeadByCnpj } from "@/lib/enrich";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = (await req.json().catch(() => ({}))) as { cnpj?: string };
    const result = await enrichLeadByCnpj(id, body.cnpj ?? "");
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}

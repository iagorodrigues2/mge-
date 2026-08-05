import { NextResponse } from "next/server";
import { approveAndSend } from "@/lib/dispatch";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const result = await approveAndSend(id);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ ok: false, blocked: [(e as Error).message], attempts: [] }, { status: 500 });
  }
}

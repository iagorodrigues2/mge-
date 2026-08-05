import { NextResponse } from "next/server";
import { advanceCadence } from "@/lib/cadence";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const force = body.force !== false; // clique manual força por padrão
  const res = await advanceCadence(id, force);
  return NextResponse.json(res);
}

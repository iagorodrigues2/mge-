import { NextResponse } from "next/server";
import { runDueCadence } from "@/lib/cadence";

export const runtime = "nodejs";

export async function POST() {
  const res = await runDueCadence();
  return NextResponse.json(res);
}

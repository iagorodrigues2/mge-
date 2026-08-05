import { NextResponse } from "next/server";
import { listLeads } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const leads = await listLeads();
  return NextResponse.json({ count: leads.length, leads });
}

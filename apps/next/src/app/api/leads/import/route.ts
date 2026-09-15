import { NextResponse } from "next/server";
import { importarLeads, type ImportItem } from "@/lib/importar";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { leads?: ImportItem[] };
    const items = Array.isArray(body.leads) ? body.leads : [];
    if (!items.length) return NextResponse.json({ ok: false, error: "envie leads: [{empresa, website}]" }, { status: 400 });
    const r = await importarLeads(items);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

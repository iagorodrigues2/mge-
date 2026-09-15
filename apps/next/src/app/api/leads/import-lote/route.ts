import { NextResponse } from "next/server";
import { importarLeads, type ImportItem } from "@/lib/importar";
import { LOTES } from "@/lotes";

export const runtime = "nodejs";
export const maxDuration = 60;

// Lotes de leads que viajam no deploy (src/lotes/*.json): a busca é feita
// fora (máquina local), o Iago só clica "Importar" no painel — sem senha em
// script, sem terminal.
export async function GET() {
  return NextResponse.json({ ok: true, lotes: Object.keys(LOTES).map((k) => ({ nome: k, leads: LOTES[k].length })) });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { lote?: string };
    const nome = body.lote ?? Object.keys(LOTES).sort().at(-1);
    const items = nome ? LOTES[nome] : undefined;
    if (!items) return NextResponse.json({ ok: false, error: `lote desconhecido: ${nome}` }, { status: 400 });
    const r = await importarLeads(items as ImportItem[]);
    return NextResponse.json({ ok: true, lote: nome, ...r });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

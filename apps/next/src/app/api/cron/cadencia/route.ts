import { NextResponse } from "next/server";
import { runDueCadence } from "@/lib/cadence";
import { isBusinessHours } from "@/lib/compliance";

export const runtime = "nodejs";
export const maxDuration = 60;

// CADÊNCIA AUTOMÁTICA — o follow-up que hoje depende de alguém lembrar de
// clicar "Rodar cadência" no painel. Chamada pelo Vercel Cron (vercel.json).
//
// Só roda em horário comercial: a compliance já barra o disparo fora dele, mas
// deixar o cron rodando de madrugada só encheria o log de bloqueios.
function autorizado(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // não configurado: não trava o piloto
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

async function executar(req: Request) {
  if (!autorizado(req)) return NextResponse.json({ ok: false, error: "não autorizado" }, { status: 401 });

  if (!isBusinessHours()) {
    return NextResponse.json({ ok: true, pulado: "fora do horário comercial", enviados: 0 });
  }

  const r = await runDueCadence();
  return NextResponse.json({ ok: true, ...r, em: new Date().toISOString() });
}

// O Vercel Cron chama via GET; o POST fica para disparo manual.
export async function GET(req: Request) {
  return executar(req);
}
export async function POST(req: Request) {
  return executar(req);
}

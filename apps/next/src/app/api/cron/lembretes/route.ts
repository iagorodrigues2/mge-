import { NextResponse } from "next/server";
import { enviarLembretes } from "@/lib/reuniao";

export const runtime = "nodejs";
export const maxDuration = 60;

// LEMBRETE DE 30 MINUTOS ANTES DA CALL.
//
// Precisa ser chamado a cada 15-30 minutos para funcionar — e é aí que mora o
// problema: o plano Hobby da Vercel só aceita UM cron por dia (agendar mais de
// um horário faz o deploy inteiro falhar). Então esta rota existe pronta e
// idempotente, mas quem a chama de tempos em tempos tem que ser algo de fora
// (um pinger gratuito) ou o plano Pro.
//
// Fica fora do login porque quem chama é máquina; o CRON_SECRET é o portão.
function autorizado(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function executar(req: Request) {
  if (!autorizado(req)) {
    const motivo = process.env.CRON_SECRET ? "não autorizado" : "CRON_SECRET não configurado";
    return NextResponse.json({ ok: false, error: motivo }, { status: 401 });
  }
  const r = await enviarLembretes();
  return NextResponse.json({ ok: true, ...r, em: new Date().toISOString() });
}

export async function GET(req: Request) { return executar(req); }
export async function POST(req: Request) { return executar(req); }

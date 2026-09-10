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
//
// GOTCHA QUE QUEBROU O DEPLOY: o plano Hobby da Vercel só aceita cron UMA VEZ
// POR DIA. Agendar "0 12,18 * * 1-5" faz o deploy FALHAR — e, pior, derruba
// todos os deploys seguintes até alguém perceber. Por isso é "0 12 * * *"
// (09:00 BRT, diário). Só mude para várias vezes ao dia no plano Pro.
// Esta rota fica FORA do login (a Vercel chama sem cookie), então o CRON_SECRET
// é a única coisa que separa o disparo automático de qualquer um na internet
// mandando follow-up em nome do Iago. Sem o segredo definido, ela não roda:
// antes ela liberava, e isso viraria um buraco do tamanho do login que
// acabamos de colocar. A Vercel injeta o header sozinha quando a variável
// CRON_SECRET existe no projeto.
function autorizado(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function executar(req: Request) {
  if (!autorizado(req)) {
    const motivo = process.env.CRON_SECRET ? "não autorizado" : "CRON_SECRET não configurado — defina na Vercel para a cadência automática voltar a rodar";
    return NextResponse.json({ ok: false, error: motivo }, { status: 401 });
  }

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

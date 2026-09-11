import { NextResponse } from "next/server";
import { listLeads } from "@/lib/db";
import { approveAndSend } from "@/lib/dispatch";
import { nextStep } from "@/lib/cadence";
import { templateParaEtapa } from "@/lib/wa-templates";
import { conferirTemplates } from "@/lib/wa-waba";
import { whatsappConfigurado } from "@/lib/whatsapp";
import type { Lead } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// DISPARO EM LOTE do primeiro contato.
//
// Duas etapas de propósito: sem `confirmar: true` isto é uma PRÉVIA — devolve
// quem receberia e por qual template, sem mandar nada. Mensagem iniciada pela
// empresa é paga e o que derruba a qualidade do número é justamente disparo
// errado em volume; um clique acidental não pode virar 12 mensagens.

// Mesma régua da tela de leads: só A e B, sem opt-out, e quem ainda não foi
// contatado. `nextStep` é o guarda contra reenvio — se o contato inicial já
// saiu, o lead não entra no lote de novo.
function elegivel(l: Lead): { ok: boolean; motivo?: string } {
  const pot = l.score?.potential ?? "NAO_ABORDAR";
  // Lead de teste existe justamente para experimentar a máquina sem gastar um
  // lead bom. Ele passa por cima do corte A/B — e continua marcado como teste,
  // então nunca se confunde com resultado de piloto.
  if (!l.teste && pot !== "A" && pot !== "B") return { ok: false, motivo: `classe ${pot} (só A e B)` };
  if (l.opt_out) return { ok: false, motivo: "opt-out" };
  if (l.stage === "nao_abordar") return { ok: false, motivo: "marcado como não abordar" };
  if (!l.whatsapp && !l.email) return { ok: false, motivo: "sem canal de contato" };
  if (nextStep(l) !== "contato_inicial") return { ok: false, motivo: "primeiro contato já enviado" };
  return { ok: true };
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { confirmar?: boolean; limite?: number; ids?: string[] };
  const confirmar = body.confirmar === true;
  const limite = Math.min(Math.max(body.limite ?? 10, 1), 15);

  const leads = await listLeads();
  const candidatos = leads
    .filter((l) => (body.ids?.length ? body.ids.includes(l.id) : true))
    .filter((l) => elegivel(l).ok);

  const lote = candidatos.slice(0, limite);

  // PRÉVIA — mostra o que sairia, para quem, por qual template.
  if (!confirmar) {
    const check = whatsappConfigurado() ? await conferirTemplates() : null;
    return NextResponse.json({
      ok: true,
      previa: true,
      elegiveis: candidatos.length,
      noLote: lote.length,
      restantes: Math.max(candidatos.length - lote.length, 0),
      templatesProntos: check ? check.okOutbound : null,
      diagnosticoTemplates: check?.diagnostico ?? "modo assistido (sem credencial): sai link wa.me, não mensagem",
      leads: lote.map((l) => ({
        id: l.id,
        empresa: l.empresa,
        classe: l.teste ? "TESTE" : l.score?.potential,
        whatsapp: l.whatsapp ?? null,
        email: l.email ?? null,
        template: templateParaEtapa("contato_inicial", l)?.name ?? null,
      })),
    });
  }

  // ENVIO — só chega aqui com confirmação explícita.
  // Se os templates não estiverem APPROVED, parar ANTES: cada tentativa
  // recusada pela Meta vira ruído no histórico do lead e não ensina nada.
  let aprovados: Set<string> | undefined;
  if (whatsappConfigurado()) {
    const check = await conferirTemplates();
    // Quais versões existem APROVADAS agora — é isso que deixa o disparo usar a
    // v2 (saudação certa) assim que a Meta liberar, sem ninguém mexer em nada.
    aprovados = new Set(check.conferencia.filter((c) => c.pronto).map((c) => c.usadoPeloCodigo));
    // Só os templates do PRIMEIRO CONTATO travam o disparo. O lembrete de
    // reunião pode estar em análise sem impedir o piloto.
    if (!check.okOutbound) {
      return NextResponse.json(
        { ok: false, enviados: 0, error: `templates não estão prontos — ${check.diagnostico}`, diagnosticoTemplates: check.diagnostico },
        { status: 409 },
      );
    }
  }

  const resultados: { empresa: string; ok: boolean; canal?: string; status?: string; detalhe?: string }[] = [];
  let enviados = 0;

  // Sequencial de propósito: são poucos leads, e disparar em paralelo esconde
  // qual mensagem causou qual erro da Meta.
  for (const lead of lote) {
    const r = await approveAndSend(lead.id, "contato_inicial", aprovados);
    const wa = r.attempts.find((a) => a.channel === "whatsapp");
    const email = r.attempts.find((a) => a.channel === "email");
    const principal = wa ?? email;
    if (r.ok) enviados++;
    resultados.push({
      empresa: lead.empresa,
      ok: r.ok,
      canal: principal?.channel,
      status: principal?.status,
      detalhe: r.blocked?.join("; ") ?? principal?.detail,
    });
  }

  return NextResponse.json({
    ok: true,
    enviados,
    falhas: resultados.length - enviados,
    restantes: Math.max(candidatos.length - lote.length, 0),
    resultados,
  });
}

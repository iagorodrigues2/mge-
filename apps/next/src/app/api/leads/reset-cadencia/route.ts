import { NextResponse } from "next/server";
import { listLeads, upsertLead } from "@/lib/db";
import type { Lead, OutreachAttempt } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// LIMPEZA: devolve à fila o lead cuja cadência inteira ficou no modo assistido.
//
// "assistido" significa que o sistema gerou o link wa.me e ficou esperando
// alguém clicar. O app Next nunca teve o "confirmar que enviei" que o Flask
// tinha, então o CRM registrou a cadência como cumprida e o `nextStep` passou a
// devolver null — o lead sai de qualquer disparo futuro sem NUNCA ter recebido
// mensagem. Aconteceu com 9 leads A/B em agosto de 2026, antes das credenciais
// da Cloud API existirem.
//
// Só entra aqui quem tem TODAS as tentativas em `assistido`: um único "enviado"
// significa que alguma coisa chegou de verdade, e aí re-contatar seria gerar
// denúncia — que é o que derruba a qualidade do número na Meta.

function nuncaSaiuNada(l: Lead): boolean {
  return l.attempts.length > 0 && l.attempts.every((a) => a.status === "assistido");
}

// Estágios que podem voltar para a fila. `em_conversa`, `ganho` e afins ficam
// de fora: ali existe relação em andamento, independente do que o log diz.
const REVERSIVEIS = new Set(["contatado", "nutrir"]);

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { confirmar?: boolean; ids?: string[] };
  const confirmar = body.confirmar === true;

  const leads = await listLeads();
  const alvos = leads
    .filter((l) => (body.ids?.length ? body.ids.includes(l.id) : true))
    .filter((l) => nuncaSaiuNada(l) && REVERSIVEIS.has(l.stage));

  const resumo = alvos.map((l) => ({
    id: l.id,
    empresa: l.empresa,
    classe: l.score?.potential,
    stage: l.stage,
    tentativasDescartadas: l.attempts.length,
    de: l.attempts[0]?.at?.slice(0, 10),
    ate: l.attempts[l.attempts.length - 1]?.at?.slice(0, 10),
  }));

  if (!confirmar) return NextResponse.json({ ok: true, previa: true, encontrados: alvos.length, leads: resumo });

  for (const lead of alvos) {
    // O histórico não se perde: fica guardado para auditoria de quando o CRM
    // achou que tinha contatado alguém que nunca foi contatado.
    const descartados: OutreachAttempt[] = [...(lead.attempts_descartados ?? []), ...lead.attempts];
    lead.attempts_descartados = descartados;
    lead.attempts = [];
    lead.stage = "pesquisado";
    lead.approved = false;
    await upsertLead(lead);
  }

  return NextResponse.json({ ok: true, resetados: alvos.length, leads: resumo });
}

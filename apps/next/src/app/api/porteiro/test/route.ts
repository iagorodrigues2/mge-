import { NextResponse } from "next/server";
import { avisarIago, montarBriefing } from "@/lib/porteiro";
import { emptyState } from "@/lib/sdr-state";
import type { Lead } from "@/lib/types";

export const runtime = "nodejs";

// Verificação do Porteiro: monta o briefing com um lead de exemplo e, com
// {enviar:true}, manda o e-mail de verdade. Não toca no banco.
export async function POST(req: Request) {
  const { enviar } = (await req.json().catch(() => ({}))) as { enviar?: boolean };
  const now = new Date().toISOString();

  const state = emptyState("inbound");
  state.discovery.motivo = { status: "confirmado", valor: "quer estruturar a operação de marketplace" };
  state.discovery.problema = { status: "confirmado", valor: "margem caindo; custo do fornecedor nacional alto" };
  state.discovery.situacao = { status: "confirmado", valor: "vende em ML e Amazon; equipe pequena" };
  state.discovery.prioridade = { status: "confirmado", valor: "quer resolver nos próximos 90 dias" };
  state.discovery.volume = { status: "confirmado", valor: "acima de R$100 mil/mês" };
  state.signals = {
    necessidade: "montar_operacao", capacidadeExecucao: "parcial",
    problemaEconomico: true, faixaVolume: "acima_100k", ehDecisor: true,
    reuniaoImediata: true, aceitouReuniao: true, problemaReal: true, aderencia: true,
  };
  state.sinaisIntencao = ["Sinal forte de intenção: lead solicitou reunião imediata"];
  state.riscos = ["opera com equipe pequena — checar capacidade de execução"];
  state.score = {
    fit: 8, dor: 10, impacto: 6, urgencia: 10, autoridade: 10, capacidade: 10,
    confianca: 10, total: 64, provisorio: false, aConfirmar: [],
  };

  const lead: Lead = {
    id: "porteiro_test", empresa: "Meias do Igor", segmento: "Meias esportivas",
    cidade: "Curitiba", uf: "PR", whatsapp: "5541999680809", website: "https://exemplo.com.br",
    stage: "em_conversa", approved: true, opt_out: false, source: "teste", attempts: [],
    createdAt: now, updatedAt: now, sdr: state,
    handoff_reason: "Dono, volume acima de R$100 mil/mês, quer resolver em 90 dias e pediu para falar agora.",
    conversation: [
      { role: "lead", text: "minha margem ta baixa demais", at: now },
      { role: "ia", text: "Margem baixa em marketplace tem origens diferentes — pode ser precificação, estrutura de custo ou mix.", at: now },
      { role: "lead", text: "consegue falar comigo daqui a 30 min?", at: now },
    ],
  };

  const briefing = montarBriefing(lead, state, "reuniao_imediata");
  if (!enviar) return NextResponse.json({ ok: true, enviado: false, briefing });
  const resultado = await avisarIago(lead, state, "reuniao_imediata");
  return NextResponse.json({ ok: true, enviado: true, resultado, briefing });
}

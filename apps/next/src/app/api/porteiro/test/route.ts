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
  state.nivel = "operador";
  state.ofertaSugerida = "implantacao_360";
  state.ofertaMotivo = "opera acima de R$100 mil/mês e a margem já caiu — precisa estruturar a operação como um todo, não só um diagnóstico pontual";
  state.reuniaoImediata = true;
  state.sinaisIntencao = ["Sinal forte de intenção: lead solicitou reunião imediata"];
  state.riscos = ["opera com equipe pequena — checar capacidade de execução"];
  state.score = { interesse: "alto", motivo: "margem caindo, volume relevante, pediu falar agora" };
  state.perguntasFeitas = 2;

  const lead: Lead = {
    id: "porteiro_test", empresa: "Meias do Igor", segmento: "Meias esportivas",
    cidade: "Curitiba", uf: "PR", whatsapp: "5541999680809", website: "https://exemplo.com.br",
    stage: "em_conversa", approved: true, opt_out: false, source: "teste", attempts: [],
    createdAt: now, updatedAt: now, sdr: state,
    handoff_reason: "Dono, volume acima de R$100 mil/mês, margem caindo e pediu para falar agora.",
    conversation: [
      { role: "lead", text: "minha margem ta baixa demais", at: now },
      { role: "ia", text: "Margem baixa em marketplace tem origens diferentes — pode ser precificação, estrutura de custo ou mix. Hoje vocês já vendem em quais canais?", at: now },
      { role: "lead", text: "ML e Amazon. consegue falar comigo daqui a 30 min?", at: now },
    ],
  };

  const briefing = await montarBriefing(lead, state, "reuniao_imediata");
  if (!enviar) return NextResponse.json({ ok: true, enviado: false, briefing });
  const resultado = await avisarIago(lead, state, "reuniao_imediata");
  return NextResponse.json({ ok: true, enviado: true, resultado, briefing });
}

// Painel de números do funil.
//
// Até aqui a máquina disparava, conversava e agendava — e ninguém sabia dizer
// quantos responderam. Com um canal dava pra contar no dedo; com WhatsApp e
// Instagram juntos, decidir em qual insistir viraria achismo, e achismo sobre
// canal custa meses.
//
// Tudo é derivado dos dados que já existem (attempts, conversation, stage,
// reuniao): nada de contador paralelo que sai do lugar quando alguém edita um
// lead na mão.
import type { Lead } from "./types";

export interface Funil {
  origem: string;
  contatados: number; // receberam o 1º contato de verdade (status enviado/assistido)
  responderam: number; // o lead escreveu ao menos uma vez
  emConversa: number;
  reunioes: number;
  ganhos: number;
  optOuts: number;
  semFit: number;
  taxaResposta: number | null; // responderam / contatados
  taxaReuniao: number | null; // reuniões / responderam
}

export interface Metricas {
  gerado: string;
  periodoDias: number | null;
  total: Funil;
  porOrigem: Funil[];
  testes: Funil; // cobaias ficam FORA dos números reais, mas visíveis
  base: {
    leads: number;
    comWhatsapp: number;
    aprovaveis: number; // classe A ou B
    prontosParaDisparo: number; // A/B + WhatsApp + ainda não contatados
  };
  mensagens: { enviadas: number; bloqueadas: number; respostasIa: number };
  ultimos: { empresa: string; origem: string; quando: string; oQue: string }[];
}

function dentroDoPeriodo(iso: string | undefined, desde: number | null): boolean {
  if (!desde) return true;
  if (!iso) return false;
  return new Date(iso).getTime() >= desde;
}

// "Contatado" é attempt de primeiro contato que SAIU. Usar o stage seria
// frágil: ele muda por outros motivos (nutrir, não abordar) e apagaria o fato
// de que a mensagem foi enviada.
function foiContatado(l: Lead, desde: number | null): boolean {
  return (l.attempts ?? []).some(
    (a) => a.step === "contato_inicial" && (a.status === "enviado" || a.status === "assistido") && dentroDoPeriodo(a.at, desde),
  );
}

function respondeu(l: Lead): boolean {
  return (l.conversation ?? []).some((c) => c.role === "lead");
}

function vazio(origem: string): Funil {
  return {
    origem, contatados: 0, responderam: 0, emConversa: 0, reunioes: 0,
    ganhos: 0, optOuts: 0, semFit: 0, taxaResposta: null, taxaReuniao: null,
  };
}

function acumular(f: Funil, l: Lead, desde: number | null): void {
  if (foiContatado(l, desde)) f.contatados += 1;
  if (respondeu(l)) f.responderam += 1;
  if (l.stage === "em_conversa") f.emConversa += 1;
  if (l.reuniao) f.reunioes += 1;
  if (l.stage === "ganho") f.ganhos += 1;
  if (l.opt_out) f.optOuts += 1;
  if (l.handoff_reason?.startsWith("sem fit")) f.semFit += 1;
}

function fecharTaxas(f: Funil): Funil {
  f.taxaResposta = f.contatados ? f.responderam / f.contatados : null;
  f.taxaReuniao = f.responderam ? f.reunioes / f.responderam : null;
  return f;
}

export function calcularMetricas(leads: Lead[], periodoDias: number | null = 30): Metricas {
  const desde = periodoDias ? Date.now() - periodoDias * 24 * 3600_000 : null;

  const reais = leads.filter((l) => !l.teste);
  const cobaias = leads.filter((l) => l.teste);

  const total = vazio("todos");
  const mapa = new Map<string, Funil>();
  for (const l of reais) {
    acumular(total, l, desde);
    const origem = l.source || "desconhecida";
    if (!mapa.has(origem)) mapa.set(origem, vazio(origem));
    acumular(mapa.get(origem)!, l, desde);
  }

  const testes = vazio("teste");
  for (const l of cobaias) acumular(testes, l, desde);

  let enviadas = 0, bloqueadas = 0, respostasIa = 0;
  const ultimos: Metricas["ultimos"] = [];
  for (const l of leads) {
    for (const a of l.attempts ?? []) {
      if (!dentroDoPeriodo(a.at, desde)) continue;
      if (a.status === "enviado") enviadas += 1;
      if (a.status === "bloqueado") bloqueadas += 1;
      if (a.step === "resposta_ia") respostasIa += 1;
    }
    const ultima = (l.conversation ?? [])[(l.conversation ?? []).length - 1];
    if (ultima) {
      ultimos.push({
        empresa: l.empresa + (l.teste ? " (teste)" : ""),
        origem: l.source || "—",
        quando: ultima.at,
        oQue: `${ultima.role === "lead" ? "lead" : "Rafael"}: ${ultima.text.slice(0, 80)}`,
      });
    }
  }
  ultimos.sort((a, b) => b.quando.localeCompare(a.quando));

  const comWhatsapp = reais.filter((l) => l.whatsapp).length;
  const aprovaveis = reais.filter((l) => l.score?.potential === "A" || l.score?.potential === "B").length;
  const prontos = reais.filter(
    (l) => (l.score?.potential === "A" || l.score?.potential === "B") && l.whatsapp && !foiContatado(l, null) && !l.opt_out,
  ).length;

  return {
    gerado: new Date().toISOString(),
    periodoDias,
    total: fecharTaxas(total),
    porOrigem: [...mapa.values()].map(fecharTaxas).sort((a, b) => b.contatados - a.contatados),
    testes: fecharTaxas(testes),
    base: { leads: reais.length, comWhatsapp, aprovaveis, prontosParaDisparo: prontos },
    mensagens: { enviadas, bloqueadas, respostasIa },
    ultimos: ultimos.slice(0, 8),
  };
}

export function pct(v: number | null): string {
  return v === null ? "—" : `${Math.round(v * 100)}%`;
}

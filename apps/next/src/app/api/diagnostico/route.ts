import { NextResponse } from "next/server";
import { getLead, upsertLead } from "@/lib/db";
import type { DiagnosticoRespostas, Lead } from "@/lib/types";
import { DORES, FATURAMENTOS, MOMENTOS, decidirRota } from "@/lib/diagnostico";

export const runtime = "nodejs";

// DIAGNÓSTICO PÚBLICO — o link da bio do Instagram.
//
// É o mesmo desenho do funil da Heat Company que o Iago trouxe como referência:
// poucas perguntas, faturamento auto-declarado e uma bifurcação. A diferença é
// que aqui a resposta não vira "um especialista vai te chamar" — vira um lead
// na máquina com o id do WhatsApp dele. Quando ele clica no wa.me e manda a
// primeira mensagem, o webhook do WhatsApp acha o lead pelo número, o SDR já
// sabe momento/faturamento/dor (leadFacts) e a conversa começa do meio.
//
// Regra da bifurcação (§ ANTES_DE_OFERTAR do perfil do vendedor): quem ainda
// não vende e fatura pouco NÃO recebe convite pra conversa — recebe conteúdo.
// Proteger o tempo do Iago vale mais que um lead a mais no painel.

function soDigitos(v?: string): string {
  return (v ?? "").replace(/\D/g, "");
}

// Mesma regra do cadastro manual: sem o 55 a Meta recusa em silêncio.
function normalizarBR(bruto?: string): string | null {
  const d = soDigitos(bruto);
  if (d.length === 10 || d.length === 11) return `55${d}`;
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) return d;
  return null;
}

// Número comercial (o da API do WhatsApp), em E.164 sem símbolos. Sem ele a
// página não consegue montar o wa.me — cai no aviso "vamos te chamar".
function numeroComercial(): string | null {
  const n = soDigitos(process.env.WHATSAPP_COMERCIAL_NUMERO);
  return n.length >= 12 ? n : null;
}

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as {
    nome?: string; empresa?: string; momento?: string; faturamento?: string; dor?: string;
    whatsapp?: string; instagram?: string; site?: string; // "site" é honeypot: humano não vê o campo
  };

  // Bot preenche tudo, inclusive o campo escondido. Responde ok e não grava.
  if ((b.site ?? "").trim()) return NextResponse.json({ ok: true, rota: "nutrir" });

  const nome = (b.nome ?? "").trim().slice(0, 80);
  const empresa = (b.empresa ?? "").trim().slice(0, 120);
  if (!nome || !empresa) return NextResponse.json({ ok: false, error: "informe seu nome e o nome da empresa" }, { status: 400 });

  const momento = (MOMENTOS as readonly string[]).includes(b.momento ?? "") ? b.momento! : null;
  const faturamento = (FATURAMENTOS as readonly string[]).includes(b.faturamento ?? "") ? b.faturamento! : null;
  const dor = (DORES as readonly string[]).includes(b.dor ?? "") ? b.dor! : null;
  if (!momento || !faturamento || !dor) return NextResponse.json({ ok: false, error: "responda as três perguntas" }, { status: 400 });

  const whatsapp = normalizarBR(b.whatsapp);
  if (!whatsapp) return NextResponse.json({ ok: false, error: "WhatsApp inválido — use DDD + número (ex: 11 98765-4321)" }, { status: 400 });

  const igUser = (b.instagram ?? "").trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/.*$/, "").slice(0, 60);
  const rota = decidirRota(momento, faturamento);
  const agora = new Date().toISOString();

  // id pelo número: é como o webhook do WhatsApp vai reconhecer esta pessoa
  // quando ela mandar a primeira mensagem.
  const id = `lead_wa_${whatsapp}`;
  const existente = await getLead(id);

  const diagnostico: DiagnosticoRespostas = { momento, faturamento, dor, rota, respondidoEm: agora };
  const lead = {
    ...(existente ?? {
      id,
      stage: "pesquisado",
      approved: true, // veio até nós: não passa pela aprovação do outbound
      opt_out: false,
      attempts: [],
      createdAt: agora,
    }),
    id,
    empresa,
    segmento: existente?.segmento || "(a descobrir)",
    contato_nome: nome,
    whatsapp,
    whatsapp_fonte: existente?.whatsapp_fonte ?? "diagnóstico no site",
    whatsapp_at: existente?.whatsapp_at ?? agora,
    instagram: igUser ? `https://instagram.com/${igUser}` : existente?.instagram,
    instagram_user: igUser || existente?.instagram_user,
    has_instagram: !!igUser || existente?.has_instagram,
    inbound: true,
    source: existente?.source && !existente.source.startsWith("scout") ? existente.source : "instagram_diagnostico",
    diagnostico,
    updatedAt: agora,
  } as Lead;

  await upsertLead(lead);

  // Mensagem já escrita pro lead só apertar enviar: é ela que abre a janela de
  // 24h — e sem ela a máquina não pode mandar nada (regra da Meta).
  const numero = numeroComercial();
  const texto = `Oi! Fiz o diagnóstico no site. Sou ${nome}, da ${empresa}. Momento: ${momento.toLowerCase()}. Quero entender o que faz sentido pra minha operação.`;
  const wa = numero ? `https://wa.me/${numero}?text=${encodeURIComponent(texto)}` : null;

  return NextResponse.json({ ok: true, rota, wa, nome });
}

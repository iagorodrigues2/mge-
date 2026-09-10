import { NextResponse } from "next/server";
import { TEMPLATES_ESPERADOS } from "@/lib/wa-templates";

export const runtime = "nodejs";

// DIAGNÓSTICO: os templates aprovados estão na MESMA WABA do número que envia?
//
// Template vive por WABA. Se os modelos foram criados na conta de TESTE e a
// produção aponta para a WABA definitiva, o envio volta com "template does not
// exist" — e o painel da Meta não avisa, porque lá está tudo "Active".
//
// Também responde a segunda dúvida cara: qual número está de fato ligado no
// phone id configurado (o de teste da Meta ou o chip dedicado).
const WABA_ID = process.env.WHATSAPP_WABA_ID || "1096814143280285";

function token(): string | null {
  return process.env.WHATSAPP_BUSINESS_TOKEN || null;
}

interface MetaTemplate {
  name: string;
  status: string;
  category: string;
  language: string;
  quality_score?: { score?: string };
}

export async function GET() {
  const t = token();
  if (!t) return NextResponse.json({ ok: false, error: "WHATSAPP_BUSINESS_TOKEN não configurado" }, { status: 400 });

  const auth = { headers: { Authorization: `Bearer ${t}` } };
  const campos = "name,status,category,language,quality_score";

  const [rTpl, rNum] = await Promise.all([
    fetch(`https://graph.facebook.com/v20.0/${WABA_ID}/message_templates?fields=${campos}&limit=100`, auth),
    fetch(`https://graph.facebook.com/v20.0/${WABA_ID}/phone_numbers?fields=display_phone_number,verified_name,quality_rating`, auth),
  ]);

  const dTpl = (await rTpl.json()) as { data?: MetaTemplate[]; error?: { message: string } };
  const dNum = (await rNum.json()) as { data?: unknown[]; error?: { message: string } };

  if (!rTpl.ok || dTpl.error) {
    return NextResponse.json({ ok: false, wabaId: WABA_ID, error: dTpl.error?.message ?? rTpl.status }, { status: 400 });
  }

  const naMeta = dTpl.data ?? [];
  // O que o código realmente pede na hora de disparar vs. o que existe lá.
  const conferencia = TEMPLATES_ESPERADOS.map((esperado) => {
    const achado = naMeta.find((m) => m.name === esperado.name && m.language === esperado.lang);
    return {
      usadoPeloCodigo: esperado.name,
      idioma: esperado.lang,
      existeNaWaba: !!achado,
      status: achado?.status ?? null,
      categoria: achado?.category ?? null,
      qualidade: achado?.quality_score?.score ?? null,
      pronto: achado?.status === "APPROVED",
    };
  });

  // "não está pronto" tem três causas MUITO diferentes e a saída precisa dizer
  // qual é: sumido (conta errada / nome trocado) é problema nosso, PENDING é só
  // esperar a Meta, e REJECTED exige reescrever o texto.
  const ausentes = conferencia.filter((c) => !c.existeNaWaba);
  const emAnalise = conferencia.filter((c) => c.status === "PENDING" || c.status === "IN_APPEAL");
  const reprovados = conferencia.filter((c) => c.status === "REJECTED" || c.status === "DISABLED");

  function resumo(): string {
    if (ausentes.length) {
      return `faltam nesta WABA: ${ausentes.map((f) => f.usadoPeloCodigo).join(", ")} — foram criados em outra conta (a de teste) ou com nome/idioma diferente`;
    }
    if (reprovados.length) {
      return `reprovados pela Meta: ${reprovados.map((f) => f.usadoPeloCodigo).join(", ")} — reescrever o texto e reenviar`;
    }
    if (emAnalise.length) {
      return `em análise na Meta: ${emAnalise.map((f) => f.usadoPeloCodigo).join(", ")} — nome, idioma e categoria estão certos, é só aguardar a aprovação`;
    }
    return "todos os templates que o disparo usa estão APPROVED nesta WABA";
  }

  return NextResponse.json({
    ok: ausentes.length === 0 && emAnalise.length === 0 && reprovados.length === 0,
    podeDisparar: conferencia.every((c) => c.pronto),
    wabaId: WABA_ID,
    phoneIdConfigurado: process.env.WHATSAPP_BUSINESS_PHONE_ID ?? null,
    numeros: dNum.data ?? dNum.error?.message ?? null,
    conferencia,
    diagnostico: resumo(),
    templatesNaWaba: naMeta.map((m) => ({ nome: m.name, status: m.status, idioma: m.language, categoria: m.category })),
  });
}

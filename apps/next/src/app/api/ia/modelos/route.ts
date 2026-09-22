import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// QUAL MODELO GRATUITO AINDA TEM COTA?
//
// O tier gratuito do Gemini dá cotas MUITO diferentes por modelo: o 3.6-flash
// deu 20 requisições/dia (inútil para um agente), enquanto os "lite" costumam
// ser bem mais generosos. A Google tirou essa tabela da documentação e só
// mostra no AI Studio — mas a mensagem de erro entrega o número ("limit: 20").
//
// Então: bate em cada candidato com 1 token e reporta o que respondeu e qual
// limite a Google declarou. Uma chamada por modelo, mínima, para escolher com
// dado em vez de tentativa e erro no escuro.
const CANDIDATOS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
];

interface Resultado {
  modelo: string;
  ok: boolean;
  limiteDeclarado?: number | null;
  erro?: string;
}

export async function GET() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ ok: false, error: "GEMINI_API_KEY não configurada" }, { status: 400 });

  // Uma chamada minúscula, mas VÁLIDA. A primeira versão mandava
  // maxOutputTokens:1 + thinkingConfig e levava "invalid argument" de modelos
  // que na verdade estavam disponíveis — o diagnóstico acusava o modelo por um
  // defeito da sonda.
  async function bater(modelo: string, comThinking: boolean) {
    const generationConfig: Record<string, unknown> = { maxOutputTokens: 16 };
    if (comThinking) generationConfig.thinkingConfig = { thinkingBudget: 0 };
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "diga ok" }] }], generationConfig }),
      },
    );
    const d = (await r.json().catch(() => ({}))) as { error?: { message?: string } };
    return { ok: r.ok && !d.error, msg: d.error?.message ?? String(r.status) };
  }

  const esperar = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));
  const resultados: Resultado[] = [];

  for (const modelo of CANDIDATOS) {
    try {
      // thinkingConfig não existe em todo modelo; se ele reclamar, tenta sem.
      let t = await bater(modelo, true);
      if (!t.ok && /invalid argument|thinking|unknown name/i.test(t.msg)) {
        t = await bater(modelo, false);
      }
      // Congestão é passageira — uma segunda chance evita descartar um modelo bom.
      if (!t.ok && /high demand|overload|unavailable|503/i.test(t.msg)) {
        await esperar(1500);
        t = await bater(modelo, false);
      }

      if (t.ok) {
        resultados.push({ modelo, ok: true });
        continue;
      }
      // "Quota exceeded for metric: ... limit: 20, model: X"
      const limite = /limit:\s*(\d+)/i.exec(t.msg)?.[1];
      resultados.push({ modelo, ok: false, limiteDeclarado: limite ? Number(limite) : null, erro: t.msg.slice(0, 180) });
    } catch (e) {
      resultados.push({ modelo, ok: false, erro: (e as Error).message });
    }
  }

  const disponiveis = resultados.filter((r) => r.ok).map((r) => r.modelo);
  return NextResponse.json({
    ok: disponiveis.length > 0,
    emUso: process.env.GEMINI_MODEL || "gemini-3.6-flash",
    disponiveisAgora: disponiveis,
    recomendado: disponiveis[0] ?? null,
    comoUsar: disponiveis[0]
      ? `Defina GEMINI_MODEL="${disponiveis[0]}" e LLM_BACKEND="gemini" na Vercel, depois Redeploy.`
      : "Nenhum candidato respondeu — todos sem cota ou indisponíveis para esta conta.",
    detalhes: resultados,
  });
}

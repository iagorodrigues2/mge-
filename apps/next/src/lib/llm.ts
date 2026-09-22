// Camada de LLM agnóstica de provedor — o "cérebro" trocável.
// Padrão: Google Gemini (tier gratuito, GEMINI_API_KEY). Se houver
// ANTHROPIC_API_KEY, usa Claude (pago, mais forte). Sem chave: modo demo.
// Trocar de cérebro = trocar a chave no .env — nada mais muda no app.

export type LlmBackend = "gemini" | "anthropic" | "none";

// LLM_BACKEND manda em tudo: "gemini" ou "anthropic". Existe porque a escolha
// por presença de chave obrigava a APAGAR a chave da Claude para usar o Gemini —
// e chave apagada na Vercel não volta (é write-only). Com o interruptor, as duas
// chaves ficam guardadas e a troca é uma variável, nos dois sentidos.
export function activeLlm(): LlmBackend {
  const escolhido = (process.env.LLM_BACKEND || "").trim().toLowerCase();
  if (escolhido === "gemini") return process.env.GEMINI_API_KEY ? "gemini" : "none";
  if (escolhido === "anthropic") return process.env.ANTHROPIC_API_KEY ? "anthropic" : "none";

  // Sem escolha explícita: o que tiver chave, Claude primeiro (comportamento antigo).
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return "none";
}

// Modelo em uso, para diagnóstico e para a tela de configurações.
export function modeloAtivo(): string {
  const b = activeLlm();
  if (b === "gemini") return process.env.GEMINI_MODEL || "gemini-3.6-flash";
  if (b === "anthropic") return process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
  return "—";
}

export interface LlmMessage {
  role: "user" | "assistant";
  content: string;
  // Marca esta mensagem como fim de um trecho reaproveitável (prompt
  // caching da Anthropic; ignorado no Gemini). Como o histórico só CRESCE
  // por append, marcar a penúltima mensagem faz o prefixo (tudo antes da
  // fala nova) ser cobrado a ~10% do preço normal em vez de reenviado
  // inteiro a cada turno.
  cache?: boolean;
}

export interface LlmResult {
  ok: boolean;
  text: string;
  backend: LlmBackend;
  error?: string;
  // Respondeu pela Claude porque o Gemini estava sobrecarregado.
  viaFallback?: boolean;
  // Quanto a chamada demorou, incluindo as tentativas. Medir é o que separa
  // "está lento" de "está lento por causa disto".
  ms?: number;
  tentativas?: number;
  // Tokens de cache da chamada (só Anthropic com cacheSystem/mensagem
  // marcada) — útil pra confirmar que o cache está batendo de verdade.
  cache?: { criados: number; lidos: number; semCache: number };
}

// Gera uma resposta a partir de um system prompt + histórico de mensagens.
// json=true pede saída em JSON (para o agente Vendedor devolver {reply, action}).
// `extra` é texto que muda entre chamadas (ex.: a correção de retry do
// agente Vendedor) e por isso fica FORA do bloco marcado pra cache — juntar
// tudo num texto só faria o bloco cacheado nunca bater (o hash muda junto).
export type LlmSystem = string | { cached: string; extra?: string };

export async function llmChat(
  system: LlmSystem,
  messages: LlmMessage[],
  opts: { json?: boolean; maxTokens?: number; cacheSystem?: boolean } = {},
): Promise<LlmResult> {
  const backend = activeLlm();
  if (backend === "none") {
    return { ok: false, text: "", backend, error: "Nenhuma chave de IA configurada (GEMINI_API_KEY ou ANTHROPIC_API_KEY)." };
  }
  try {
    if (backend === "anthropic") return await callAnthropic(system, messages, opts);

    // O tier gratuito do Gemini fica sobrecarregado ("high demand", 429, 503).
    // Numa conversa de verdade isso significa o lead falando e ninguém
    // respondendo — então vale insistir um pouco antes de desistir.
    const t0 = Date.now();
    let tentativas = 1;
    let ultima = await callGemini(system, messages, opts);
    // Insistir custa TEMPO, e tempo aqui é o lead esperando. Só tenta de novo
    // enquanto couber no orçamento — estourar o limite da função seria pior
    // que responder pelo caminho pago.
    for (let t = 1; t <= 2 && !ultima.ok && sobrecarregado(ultima.error) && Date.now() - t0 < ORCAMENTO_MS; t++) {
      await esperar(t * 900);
      tentativas++;
      ultima = await callGemini(system, messages, opts);
    }
    if (ultima.ok || !sobrecarregado(ultima.error)) return { ...ultima, ms: Date.now() - t0, tentativas };

    // Último recurso: se houver chave da Claude, responder com ela em vez de
    // deixar o lead no vácuo. É raro, e um turno avulso no Haiku custa centavos
    // — muito menos que perder a conversa. LLM_FALLBACK=0 desliga.
    if (process.env.ANTHROPIC_API_KEY && process.env.LLM_FALLBACK !== "0") {
      const socorro = await callAnthropic(system, messages, {
        ...opts,
        modelo: process.env.LLM_FALLBACK_MODEL || "claude-haiku-4-5",
      });
      if (socorro.ok) return { ...socorro, viaFallback: true, ms: Date.now() - t0, tentativas: tentativas + 1 };
    }
    return { ...ultima, ms: Date.now() - t0, tentativas };
  } catch (e) {
    return { ok: false, text: "", backend, error: (e as Error).message };
  }
}

const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Teto para o conjunto chamada+tentativas. A função da Vercel morre em 60s e o
// ritmo humano ainda vai consumir tempo depois disto.
const ORCAMENTO_MS = 20000;

// A Google devolve isso de várias formas: 429, 503, "high demand",
// "overloaded", RESOURCE_EXHAUSTED. Todas significam "tenta de novo".
function sobrecarregado(erro?: string): boolean {
  return /high demand|overload|unavailable|resource_exhausted|rate limit|quota|429|503/i.test(erro ?? "");
}

// --- Google Gemini (tier gratuito) ---
async function callGemini(
  system: LlmSystem,
  messages: LlmMessage[],
  opts: { json?: boolean; maxTokens?: number; cacheSystem?: boolean },
): Promise<LlmResult> {
  const key = process.env.GEMINI_API_KEY!;
  // A Google aposenta modelo rápido: 2.0-flash caiu em 01/06/2026 e o
  // 2.5-flash parou de aceitar conta nova em set/2026 ("no longer available to
  // new users"). Por isso o default é o atual e GEMINI_MODEL existe — quando
  // cair de novo, é variável de ambiente, não deploy.
  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  // Gemini não tem prompt caching neste app ainda — junta tudo (cacheSystem
  // é ignorado aqui, só vale para o backend Anthropic).
  const systemText = typeof system === "string" ? system : `${system.cached}${system.extra ?? ""}`;
  // ARMADILHA DO 2.5: por padrão ele "pensa" antes de responder, e os tokens de
  // raciocínio saem do MESMO orçamento de saída. O agente pede 1200 tokens; com
  // o pensamento comendo boa parte, a resposta chega truncada e o JSON vem
  // quebrado — o sintoma seria "a IA não respondeu", sem erro nenhum da API.
  // thinkingBudget 0 desliga. GEMINI_THINKING=1 religa, se um dia valer o custo
  // de qualidade em troca de latência.
  const pensar = process.env.GEMINI_THINKING === "1";
  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: systemText }] },
    contents,
    generationConfig: {
      maxOutputTokens: opts.maxTokens ?? 700,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
      ...(pensar ? {} : { thinkingConfig: { thinkingBudget: 0 } }),
    },
  };
  let res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  // thinkingConfig não existe em todos os modelos, e quando não existe a Google
  // recusa a chamada inteira. Tentar de novo sem ele é melhor que exigir que
  // alguém descubra isso lendo mensagem de erro.
  if (!res.ok && !pensar) {
    const texto = await res.clone().text().catch(() => "");
    if (/thinking/i.test(texto)) {
      const semPensamento = { ...body, generationConfig: { ...(body.generationConfig as object), thinkingConfig: undefined } };
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(semPensamento),
      });
    }
  }

  const data = (await res.json().catch(() => ({}))) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    error?: { message?: string };
  };
  if (!res.ok || data.error) {
    return { ok: false, text: "", backend: "gemini", error: `Gemini: ${data.error?.message ?? res.status}` };
  }
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  // Resposta vazia com HTTP 200 acontece quando o filtro de segurança corta ou
  // quando o orçamento de saída acabou. Devolver ok:true com texto vazio faria
  // o agente cair no fallback sem ninguém saber por quê.
  if (!text.trim()) {
    const motivo = data.candidates?.[0]?.finishReason ?? "sem texto";
    return { ok: false, text: "", backend: "gemini", error: `Gemini devolveu resposta vazia (${motivo})` };
  }
  return { ok: true, text: text.trim(), backend: "gemini" };
}

// --- Anthropic Claude (opcional; via fetch, sem SDK) ---
async function callAnthropic(
  system: LlmSystem,
  messages: LlmMessage[],
  opts: { json?: boolean; maxTokens?: number; cacheSystem?: boolean; modelo?: string },
): Promise<LlmResult> {
  const key = process.env.ANTHROPIC_API_KEY!;
  const model = opts.modelo || process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
  const cached = typeof system === "string" ? system : system.cached;
  const extra = typeof system === "string" ? "" : (system.extra ?? "");
  const jsonSuffix = opts.json
    ? "\n\nResponda SOMENTE com um objeto JSON válido, sem markdown, sem texto fora do JSON."
    : "";
  // Prompt caching: o system prompt do Vendedor tem ~4 mil tokens e era
  // reenviado inteiro em toda chamada (inclusive nas 2 tentativas do mesmo
  // turno, que usam o MESMO texto-base + a instrução de JSON — por isso as
  // duas ficam DENTRO do bloco cacheado). Só a correção de retry (`extra`),
  // que muda a cada chamada, fica FORA — juntar tudo faria o hash do bloco
  // cacheado mudar e o cache nunca bater. Marcado como cache_control, a
  // Anthropic cobra ~10% do preço normal quando o prefixo bate com o da
  // chamada anterior (janela de ~5min). Mensagens antigas do histórico
  // recebem o mesmo tratamento via LlmMessage.cache (ver ai-sdr.ts).
  const systemField = opts.cacheSystem
    ? [
        { type: "text", text: `${cached}${jsonSuffix}`, cache_control: { type: "ephemeral" } },
        ...(extra ? [{ type: "text", text: extra }] : []),
      ]
    : `${cached}${jsonSuffix}${extra}`;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens ?? 700,
      system: systemField,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.cache ? [{ type: "text", text: m.content, cache_control: { type: "ephemeral" } }] : m.content,
      })),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    content?: { type: string; text?: string }[];
    error?: { message?: string };
    usage?: { cache_creation_input_tokens?: number; cache_read_input_tokens?: number; input_tokens?: number };
  };
  if (!res.ok || data.error) {
    return { ok: false, text: "", backend: "anthropic", error: `Claude: ${data.error?.message ?? res.status}` };
  }
  const text = (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
  return {
    ok: true,
    text: text.trim(),
    backend: "anthropic",
    cache: data.usage
      ? { criados: data.usage.cache_creation_input_tokens ?? 0, lidos: data.usage.cache_read_input_tokens ?? 0, semCache: data.usage.input_tokens ?? 0 }
      : undefined,
  };
}

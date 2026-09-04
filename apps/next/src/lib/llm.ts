// Camada de LLM agnóstica de provedor — o "cérebro" trocável.
// Padrão: Google Gemini (tier gratuito, GEMINI_API_KEY). Se houver
// ANTHROPIC_API_KEY, usa Claude (pago, mais forte). Sem chave: modo demo.
// Trocar de cérebro = trocar a chave no .env — nada mais muda no app.

export type LlmBackend = "gemini" | "anthropic" | "none";

export function activeLlm(): LlmBackend {
  // Claude é o cérebro padrão (pago, mais forte). Gemini é o plano B gratuito,
  // usado só quando não há chave da Claude.
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return "none";
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
    if (backend === "gemini") return await callGemini(system, messages, opts);
    return await callAnthropic(system, messages, opts);
  } catch (e) {
    return { ok: false, text: "", backend, error: (e as Error).message };
  }
}

// --- Google Gemini (tier gratuito) ---
async function callGemini(
  system: LlmSystem,
  messages: LlmMessage[],
  opts: { json?: boolean; maxTokens?: number; cacheSystem?: boolean },
): Promise<LlmResult> {
  const key = process.env.GEMINI_API_KEY!;
  // gemini-2.0-flash (default antigo) foi desligado pela Google em
  // 01/06/2026 — 2.5-flash é o Flash gratuito estável no momento.
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  // Gemini não tem prompt caching neste app ainda — junta tudo (cacheSystem
  // é ignorado aqui, só vale para o backend Anthropic).
  const systemText = typeof system === "string" ? system : `${system.cached}${system.extra ?? ""}`;
  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: systemText }] },
    contents,
    generationConfig: {
      maxOutputTokens: opts.maxTokens ?? 700,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    error?: { message?: string };
  };
  if (!res.ok || data.error) {
    return { ok: false, text: "", backend: "gemini", error: `Gemini: ${data.error?.message ?? res.status}` };
  }
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  return { ok: true, text: text.trim(), backend: "gemini" };
}

// --- Anthropic Claude (opcional; via fetch, sem SDK) ---
async function callAnthropic(
  system: LlmSystem,
  messages: LlmMessage[],
  opts: { json?: boolean; maxTokens?: number; cacheSystem?: boolean },
): Promise<LlmResult> {
  const key = process.env.ANTHROPIC_API_KEY!;
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
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

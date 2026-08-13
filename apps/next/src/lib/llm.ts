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
}

export interface LlmResult {
  ok: boolean;
  text: string;
  backend: LlmBackend;
  error?: string;
}

// Gera uma resposta a partir de um system prompt + histórico de mensagens.
// json=true pede saída em JSON (para o agente Vendedor devolver {reply, action}).
export async function llmChat(
  system: string,
  messages: LlmMessage[],
  opts: { json?: boolean; maxTokens?: number } = {},
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
  system: string,
  messages: LlmMessage[],
  opts: { json?: boolean; maxTokens?: number },
): Promise<LlmResult> {
  const key = process.env.GEMINI_API_KEY!;
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: system }] },
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
  system: string,
  messages: LlmMessage[],
  opts: { json?: boolean; maxTokens?: number },
): Promise<LlmResult> {
  const key = process.env.ANTHROPIC_API_KEY!;
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
  const sys = opts.json
    ? `${system}\n\nResponda SOMENTE com um objeto JSON válido, sem markdown, sem texto fora do JSON.`
    : system;
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
      system: sys,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    content?: { type: string; text?: string }[];
    error?: { message?: string };
  };
  if (!res.ok || data.error) {
    return { ok: false, text: "", backend: "anthropic", error: `Claude: ${data.error?.message ?? res.status}` };
  }
  const text = (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
  return { ok: true, text: text.trim(), backend: "anthropic" };
}

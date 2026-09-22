import { NextResponse } from "next/server";
import { activeLlm, llmChat, modeloAtivo } from "@/lib/llm";

export const runtime = "nodejs";

// Testa a chave da IA CONTRA O PROVEDOR e devolve o erro exato.
// Sem isso, "a IA não responde" não distingue chave ausente, chave inválida,
// crédito acabado ou modelo indisponível — e cada um tem uma correção diferente.
export async function POST() {
  const backend = activeLlm();
  if (backend === "none") {
    return NextResponse.json({
      ok: false,
      backend,
      diagnostico: "sem_chave",
      mensagem: process.env.LLM_BACKEND
        ? `LLM_BACKEND=${process.env.LLM_BACKEND}, mas a chave desse provedor não está configurada (${process.env.LLM_BACKEND === "gemini" ? "GEMINI_API_KEY" : "ANTHROPIC_API_KEY"}).`
        : "Nenhuma chave configurada. Falta GEMINI_API_KEY (ou ANTHROPIC_API_KEY) nas variáveis de ambiente.",
    });
  }

  const r = await llmChat("Responda apenas: ok", [{ role: "user", content: "teste" }], { maxTokens: 12 });

  if (r.ok) {
    return NextResponse.json({
      ok: true,
      backend: r.backend,
      modelo: modeloAtivo(),
      mensagem: "IA respondendo normalmente.",
    });
  }

  const erro = (r.error ?? "").toLowerCase();
  const diagnostico =
    /invalid x-api-key|authentication|401/.test(erro) ? "chave_invalida"
    : /credit|billing|quota|insufficient/.test(erro) ? "sem_credito"
    : /not_found|does not exist|model/.test(erro) ? "modelo_invalido"
    : /overloaded|529|rate/.test(erro) ? "sobrecarregado"
    : "desconhecido";

  const ehGemini = r.backend === "gemini";
  const COMO_RESOLVER: Record<string, string> = {
    chave_invalida: ehGemini
      ? "A chave foi rejeitada. Gere uma nova em aistudio.google.com → Get API key, cole sem espaços nem aspas e faça Redeploy."
      : "A chave foi rejeitada. Gere uma nova em console.anthropic.com → API Keys, cole sem espaços nem aspas e faça Redeploy.",
    sem_credito: ehGemini
      ? "Estourou a cota gratuita do Gemini (por minuto ou por dia). Espere alguns minutos — o tier grátis reseta sozinho."
      : "A chave é válida mas a conta está sem crédito. Adicione saldo em console.anthropic.com → Billing.",
    modelo_invalido: `O modelo "${modeloAtivo()}" não existe ou não está disponível para essa conta. ${ehGemini ? "Use gemini-2.5-flash." : "Use claude-sonnet-4-6."}`,
    sobrecarregado: "O modelo está temporariamente sobrecarregado (erro 529). É passageiro — tente de novo em instantes.",
    desconhecido: "Erro não reconhecido — veja a mensagem original abaixo.",
  };

  return NextResponse.json({
    ok: false,
    backend: r.backend,
    diagnostico,
    mensagem: COMO_RESOLVER[diagnostico],
    erroOriginal: r.error,
  });
}

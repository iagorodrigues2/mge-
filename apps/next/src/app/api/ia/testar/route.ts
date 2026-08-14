import { NextResponse } from "next/server";
import { activeLlm, llmChat } from "@/lib/llm";

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
      mensagem: "Nenhuma chave configurada. Falta ANTHROPIC_API_KEY (ou GEMINI_API_KEY) nas variáveis de ambiente.",
    });
  }

  const r = await llmChat("Responda apenas: ok", [{ role: "user", content: "teste" }], { maxTokens: 12 });

  if (r.ok) {
    return NextResponse.json({
      ok: true,
      backend: r.backend,
      modelo: process.env.ANTHROPIC_MODEL || "(padrão)",
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

  const COMO_RESOLVER: Record<string, string> = {
    chave_invalida: "A chave foi rejeitada. Gere uma nova em console.anthropic.com → API Keys, cole sem espaços nem aspas e faça Redeploy.",
    sem_credito: "A chave é válida mas a conta está sem crédito. Adicione saldo em console.anthropic.com → Billing.",
    modelo_invalido: `O modelo "${process.env.ANTHROPIC_MODEL}" não existe ou não está disponível para essa conta. Use claude-sonnet-4-6.`,
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

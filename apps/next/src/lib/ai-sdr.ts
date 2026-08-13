// Agente Vendedor (AI SDR) — conduz a conversa de WhatsApp de forma autônoma.
// Qualifica (SPIN/GPCT), explica os pacotes com os preços VIVOS do banco,
// rebate objeções e decide quando escalar pro Iago (fechamento) ou agendar.
// O Iago só entra no fechamento — a IA cuida do resto.
import { llmChat, activeLlm, type LlmMessage } from "./llm";
import { listPackages } from "./db";
import type { Lead, ConversationMsg, SdrAction } from "./types";

const AGENDA_URL = process.env.AGENDA_URL || ""; // link de agendamento do Iago, se houver

export interface SdrTurn {
  ok: boolean;
  reply: string; // o que a IA responde ao lead
  action: SdrAction; // o que fazer a seguir
  motivo?: string; // por que decidiu isso (para o handoff/log)
  error?: string;
  backend?: string;
}

// Monta o "briefing" do agente: quem é o Iago, o que vende, como conversar,
// os preços atuais e as regras duras. Preços vêm do banco — nunca do código.
async function buildSystemPrompt(lead: Lead): Promise<string> {
  const pkgs = (await listPackages()).filter((p) => p.ativo);
  const catalogo = pkgs
    .map((p) => {
      const fundador = p.precoFundador ? ` (condição fundador: R$ ${p.precoFundador.toLocaleString("pt-BR")})` : "";
      return `- ${p.nome}: R$ ${p.precoRef.toLocaleString("pt-BR")}${fundador}`;
    })
    .join("\n");

  const empresa = lead.nome_fantasia || lead.empresa;
  const nicho = lead.segmento || lead.canal_ou_categoria || "o segmento da empresa";

  return `Você é o assistente comercial do Iago Rodrigues, consultor de implantação e escala em marketplaces (Mercado Livre, Amazon, Shopee). Você conversa por WhatsApp, em português do Brasil, em nome do Iago.

QUEM É O CLIENTE IDEAL: fabricantes, indústrias, distribuidores, importadores e donos de marca própria — empresas com bom produto mas presença digital deficiente. Você está falando com a ${empresa}, do segmento ${nicho}.

SEU OBJETIVO: qualificar o lead e levá-lo a uma reunião de diagnóstico com o Iago. Você NÃO fecha contrato nem negocia desconto sozinho — quem fecha é o Iago.

COMO CONVERSAR:
- Tom humano, consultivo e direto. Mensagens curtas de WhatsApp (2 a 4 frases). Nada robótico, sem textão.
- Use SPIN/GPCT: entenda a situação (quanto/onde vende hoje em marketplace), o problema (margem, ruptura, operação, presença), a implicação e a necessidade.
- Fale de resultado e oportunidade, não de "features". Não invente dados que você não tem.
- Só cite preço se o lead perguntar ou se fizer sentido no fluxo; ao citar, use os valores abaixo.

PACOTES E PREÇOS ATUAIS (fonte oficial — use exatamente estes valores):
${catalogo || "- (nenhum pacote ativo cadastrado)"}

REGRAS DURAS:
- Só horário comercial e sem insistência abusiva (a plataforma controla os disparos).
- Se o lead pedir para parar / não ter interesse / descadastrar: respeite na hora.
- Nunca prometa preço, prazo ou resultado fora do que está aqui.
${AGENDA_URL ? `- Para agendar, ofereça este link: ${AGENDA_URL}` : "- Para agendar, diga que vai confirmar o melhor horário com o Iago."}

QUANDO ESCALAR PRO IAGO (handoff_fechamento): quando o lead demonstra intenção real de fechar, pede proposta formal, quer negociar valor/condição, ou pede pra falar direto com o Iago.
QUANDO AGENDAR (agendar): quando o lead aceita marcar a reunião de diagnóstico.
QUANDO NUTRIR (nao_interessado): recusa educada, "agora não", sem abertura.
QUANDO OPT-OUT (opt_out): pede explicitamente pra não receber mais mensagens.
CASO CONTRÁRIO: continuar.

FORMATO DA RESPOSTA — responda SOMENTE com um JSON válido, sem markdown:
{"reply": "a mensagem curta que você envia ao lead", "action": "continuar|agendar|handoff_fechamento|nao_interessado|opt_out", "motivo": "1 frase explicando a decisão"}`;
}

const ACTIONS: SdrAction[] = ["continuar", "agendar", "handoff_fechamento", "nao_interessado", "opt_out"];

function parseTurn(raw: string): { reply: string; action: SdrAction; motivo?: string } {
  // tolera cercas de markdown ou texto ao redor do JSON
  const m = raw.match(/\{[\s\S]*\}/);
  const jsonStr = m ? m[0] : raw;
  try {
    const obj = JSON.parse(jsonStr) as { reply?: string; action?: string; motivo?: string };
    const action = (ACTIONS.includes(obj.action as SdrAction) ? obj.action : "continuar") as SdrAction;
    return { reply: (obj.reply ?? "").trim(), action, motivo: obj.motivo };
  } catch {
    // sem JSON válido: trata o texto como a própria resposta e segue conversando
    return { reply: raw.trim(), action: "continuar" };
  }
}

// Processa UMA mensagem recebida do lead e devolve a resposta + decisão da IA.
// NÃO persiste — o chamador (webhook) decide gravar e enviar.
export async function sdrRespond(lead: Lead, incoming: string): Promise<SdrTurn> {
  if (activeLlm() === "none") {
    return { ok: false, reply: "", action: "continuar", error: "IA não configurada (defina GEMINI_API_KEY ou ANTHROPIC_API_KEY)." };
  }
  const system = await buildSystemPrompt(lead);
  const history: LlmMessage[] = (lead.conversation ?? []).map((c) => ({
    role: c.role === "ia" ? "assistant" : "user",
    content: c.text,
  }));
  history.push({ role: "user", content: incoming });

  const r = await llmChat(system, history, { json: true, maxTokens: 500 });
  if (!r.ok) return { ok: false, reply: "", action: "continuar", error: r.error, backend: r.backend };

  const { reply, action, motivo } = parseTurn(r.text);
  return { ok: true, reply, action, motivo, backend: r.backend };
}

// Aplica o turno da IA ao lead (muta em memória): grava a msg do lead + a resposta,
// e move o estágio conforme a decisão. Retorna o lead atualizado.
export function applySdrTurn(lead: Lead, incoming: string, turn: SdrTurn): Lead {
  const now = new Date().toISOString();
  const conv: ConversationMsg[] = lead.conversation ?? [];
  conv.push({ role: "lead", text: incoming, at: now });
  if (turn.reply) conv.push({ role: "ia", text: turn.reply, at: now });
  lead.conversation = conv;

  switch (turn.action) {
    case "agendar":
      lead.stage = "reuniao_marcada";
      break;
    case "handoff_fechamento":
      lead.stage = "em_conversa";
      lead.handoff_reason = turn.motivo || "lead pronto para fechar";
      lead.handoff_at = now;
      break;
    case "nao_interessado":
      lead.stage = "nutrir";
      break;
    case "opt_out":
      lead.stage = "opt_out";
      lead.opt_out = true;
      break;
    default:
      lead.stage = "em_conversa";
  }
  lead.updatedAt = now;
  return lead;
}

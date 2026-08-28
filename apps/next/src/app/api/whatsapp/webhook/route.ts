import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { addOptOut, listLeads, upsertLead } from "@/lib/db";
import { applySdrTurn, notificarPorteiro, sdrRespond } from "@/lib/ai-sdr";
import { sendWhatsApp } from "@/lib/whatsapp";
import type { Lead } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// WEBHOOK INBOUND — é aqui que a conversa autônoma acontece de verdade.
// O lead responde → a Meta chama esta rota → o agente Vendedor decide o que
// dizer → respondemos e, se for o caso, o Porteiro avisa o Iago.
//
// Enquanto o lead não responde, nada disso roda: outbound frio sai por template
// (sendTemplate) e a janela de 24h de texto livre só abre com a resposta dele.

// --- Verificação do webhook (a Meta chama uma vez, no cadastro) -------------
export async function GET(req: Request) {
  const u = new URL(req.url);
  const mode = u.searchParams.get("hub.mode");
  const token = u.searchParams.get("hub.verify_token");
  const challenge = u.searchParams.get("hub.challenge");
  const esperado = process.env.WHATSAPP_VERIFY_TOKEN;

  if (!esperado) return new NextResponse("WHATSAPP_VERIFY_TOKEN não configurado", { status: 500 });
  if (mode === "subscribe" && token === esperado) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("verificação falhou", { status: 403 });
}

// A Meta assina o corpo com o App Secret. Sem conferir, qualquer um poderia
// mandar mensagem falsa e fazer a IA conversar (e gastar crédito) à toa.
function assinaturaValida(body: string, header: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return true; // não configurado: não bloqueia o piloto
  if (!header?.startsWith("sha256=")) return false;
  const esperado = crypto.createHmac("sha256", secret).update(body).digest("hex");
  const recebido = header.slice(7);
  const a = Buffer.from(esperado, "hex");
  const b = Buffer.from(recebido, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

interface MetaMensagem {
  from?: string;
  id?: string;
  type?: string;
  text?: { body?: string };
  button?: { text?: string };
  interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
}

// Extrai o texto de qualquer formato que o lead use (texto, botão, lista).
function textoDaMensagem(m: MetaMensagem): string {
  return (
    m.text?.body ??
    m.button?.text ??
    m.interactive?.button_reply?.title ??
    m.interactive?.list_reply?.title ??
    ""
  ).trim();
}

const so = (s?: string) => (s ?? "").replace(/\D/g, "");

// O número que a Meta manda pode ter o "9" a mais/a menos que o cadastrado.
// Compara pelos últimos 8 dígitos, que não mudam.
function acharLead(leads: Lead[], from: string): Lead | undefined {
  const f = so(from);
  const fim = f.slice(-8);
  return leads.find((l) => {
    const cand = [so(l.whatsapp), so(l.telefone)].filter(Boolean);
    return cand.some((c) => c === f || c.slice(-8) === fim);
  });
}

const PEDIU_PARA_PARAR = /^(sair|parar|remover|descadastrar|stop|nao quero|não quero|pare de|me tira)/i;

export async function POST(req: Request) {
  const raw = await req.text();
  if (!assinaturaValida(raw, req.headers.get("x-hub-signature-256"))) {
    return new NextResponse("assinatura inválida", { status: 401 });
  }

  let body: {
    entry?: { changes?: { value?: { messages?: MetaMensagem[]; contacts?: { profile?: { name?: string } }[] } }[] }[];
  };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: true }); // corpo inesperado: não faz a Meta reenviar
  }

  const processadas: { de: string; acao?: string; erro?: string; envio?: string }[] = [];

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const mensagens = change.value?.messages ?? [];
      const nomePerfil = change.value?.contacts?.[0]?.profile?.name;

      for (const m of mensagens) {
        const from = m.from ?? "";
        const texto = textoDaMensagem(m);
        if (!from || !texto) continue;

        try {
          const leads = await listLeads();
          let lead = acharLead(leads, from);

          // Número desconhecido = inbound puro. Vira lead na hora: perder isso
          // seria perder justamente quem procurou a gente.
          if (!lead) {
            const agora = new Date().toISOString();
            lead = {
              id: `lead_wa_${so(from)}`,
              empresa: nomePerfil || `WhatsApp ${so(from).slice(-4)}`,
              segmento: "(a descobrir)",
              whatsapp: so(from),
              stage: "em_conversa",
              approved: true,
              opt_out: false,
              inbound: true, // muda a abertura do agente (§10: mais direto)
              source: "whatsapp_inbound",
              attempts: [],
              conversation: [],
              createdAt: agora,
              updatedAt: agora,
            };
          }

          // Opt-out tem precedência sobre tudo — nem chama a IA.
          if (PEDIU_PARA_PARAR.test(texto)) {
            lead.opt_out = true;
            lead.stage = "opt_out";
            lead.updatedAt = new Date().toISOString();
            const chave = lead.whatsapp ?? lead.telefone;
            if (chave) await addOptOut(chave);
            await upsertLead(lead);
            await sendWhatsApp(from, "Sem problema, não te procuro mais por aqui. Obrigado pelo retorno.");
            processadas.push({ de: from, acao: "opt_out" });
            continue;
          }
          if (lead.opt_out) {
            processadas.push({ de: from, acao: "ignorado (opt-out)" });
            continue;
          }

          const turn = await sdrRespond(lead, texto);
          if (!turn.ok) {
            // não perde a fala do lead mesmo com a IA fora do ar
            lead.conversation = [...(lead.conversation ?? []), { role: "lead", text: texto, at: new Date().toISOString() }];
            await upsertLead(lead);
            processadas.push({ de: from, erro: turn.error });
            continue;
          }

          applySdrTurn(lead, texto, turn);

          // O envio PRECISA ser registrado. Antes o resultado era descartado:
          // se a Meta recusasse, a IA "respondia" no banco, o lead nunca via
          // nada e ninguém ficava sabendo. Falha silenciosa é o pior modo de
          // falhar numa conversa comercial.
          let envio: string | undefined;
          if (turn.reply) {
            const wa = await sendWhatsApp(from, turn.reply);
            envio = wa.status;
            lead.attempts = [
              ...(lead.attempts ?? []),
              {
                step: "resposta_ia",
                channel: "whatsapp",
                message: turn.reply,
                status: wa.status === "enviado" ? "enviado" : "bloqueado",
                detail: wa.detail,
                at: new Date().toISOString(),
              },
            ];
          }

          await notificarPorteiro(lead, turn); // muta porteiro_avisos
          await upsertLead(lead);
          processadas.push({ de: from, acao: turn.action, envio });
        } catch (e) {
          processadas.push({ de: from, erro: (e as Error).message });
        }
      }
    }
  }

  // 200 sempre: erro nosso não pode fazer a Meta reenviar em loop.
  return NextResponse.json({ ok: true, processadas });
}

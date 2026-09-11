import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { addOptOut, listLeads, upsertLead } from "@/lib/db";
import { applySdrTurn, notificarPorteiro, sdrRespond } from "@/lib/ai-sdr";
import { avisarLeadDaReuniao } from "@/lib/reuniao";
import { pediuParaParar } from "@/lib/sdr-guards";
import {
  comentarioMereceResposta, enviarDM, perfilDoUsuario,
  responderComentarioNoPrivado, responderComentarioPublico,
} from "@/lib/instagram";
import type { Lead } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// WEBHOOK DO INSTAGRAM — a porta de entrada.
//
// Três eventos caem aqui e todos terminam no MESMO agente que já atende o
// WhatsApp: DM direto, resposta de story (chega como mensagem com reply_to) e
// comentário em post.
//
// Nunca sai atrás de ninguém: no Instagram não existe template, então fora da
// janela de resposta não há o que mandar. Quem começa a conversa é sempre o
// lead — o que torna esse lead mais quente que qualquer um da base fria.

export async function GET(req: Request) {
  const u = new URL(req.url);
  const esperado = process.env.IG_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN;
  if (!esperado) return new NextResponse("IG_VERIFY_TOKEN não configurado", { status: 500 });
  if (u.searchParams.get("hub.mode") === "subscribe" && u.searchParams.get("hub.verify_token") === esperado) {
    return new NextResponse(u.searchParams.get("hub.challenge") ?? "", { status: 200 });
  }
  return new NextResponse("verificação falhou", { status: 403 });
}

// Mesma assinatura HMAC do WhatsApp: é o mesmo app da Meta, logo o mesmo
// segredo. Sem conferir, qualquer um faria a IA conversar e gastar crédito.
function assinaturaValida(body: string, header: string | null): boolean {
  const secret = process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET;
  if (!secret) return true;
  if (!header?.startsWith("sha256=")) return false;
  const esperado = crypto.createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(esperado, "hex");
  const b = Buffer.from(header.slice(7), "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function acharOuCriarLead(igsid: string, origem: string): Promise<Lead> {
  const leads = await listLeads();
  const existente = leads.find((l) => l.instagram_id === igsid);
  if (existente) return existente;

  const perfil = await perfilDoUsuario(igsid);
  const agora = new Date().toISOString();
  return {
    id: `lead_ig_${igsid}`,
    empresa: perfil.usuario ? `@${perfil.usuario}` : "Contato do Instagram",
    segmento: "(a descobrir)",
    contato_nome: perfil.nome,
    instagram_id: igsid,
    instagram_user: perfil.usuario,
    instagram: perfil.usuario ? `https://instagram.com/${perfil.usuario}` : undefined,
    inbound: true, // veio até nós: a abertura do agente é outra
    source: origem,
    stage: "em_conversa",
    approved: true,
    opt_out: false,
    attempts: [],
    createdAt: agora,
    updatedAt: agora,
  } as Lead;
}

// Um turno de conversa: o agente decide, a gente responde e registra.
async function conversar(lead: Lead, texto: string, origem: string): Promise<string> {
  if (pediuParaParar(texto)) {
    lead.opt_out = true;
    lead.stage = "opt_out";
    if (lead.instagram_id) await addOptOut(lead.instagram_id);
    await upsertLead(lead);
    return "opt_out";
  }

  const turn = await sdrRespond(lead, texto);
  const agora = new Date().toISOString();

  if (!turn.ok) {
    lead.attempts = [...(lead.attempts ?? []), {
      step: "resposta_ia", channel: "instagram", message: texto,
      status: "bloqueado", detail: `IA não respondeu: ${turn.error ?? "erro"}`, at: agora,
    }];
    await upsertLead(lead);
    return `erro: ${turn.error}`;
  }

  applySdrTurn(lead, texto, turn);

  let envio = "sem resposta";
  if (turn.reply && lead.instagram_id) {
    const r = await enviarDM(lead.instagram_id, turn.reply);
    envio = r.status;
    lead.attempts = [...(lead.attempts ?? []), {
      step: "resposta_ia", channel: "instagram", message: turn.reply,
      status: r.status === "enviado" ? "enviado" : "bloqueado", detail: r.detail, at: agora,
    }];
  }

  if (turn.reuniao) await avisarLeadDaReuniao(lead);
  await notificarPorteiro(lead, turn);
  lead.source = lead.source || origem;
  await upsertLead(lead);
  return envio;
}

interface Entrada {
  messaging?: {
    sender?: { id?: string };
    recipient?: { id?: string };
    message?: { mid?: string; text?: string; is_echo?: boolean; reply_to?: { story?: { id?: string } } };
  }[];
  changes?: { field?: string; value?: { id?: string; text?: string; from?: { id?: string; username?: string }; parent_id?: string } }[];
}

export async function POST(req: Request) {
  const bruto = await req.text();
  if (!assinaturaValida(bruto, req.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ ok: false, error: "assinatura inválida" }, { status: 401 });
  }

  const corpo = JSON.parse(bruto || "{}") as { object?: string; entry?: Entrada[] };
  const processadas: unknown[] = [];
  const meuId = process.env.IG_USER_ID;

  for (const entry of corpo.entry ?? []) {
    // --- 1 e 2: DM direto e resposta de story ---
    for (const m of entry.messaging ?? []) {
      const igsid = m.sender?.id;
      const texto = (m.message?.text ?? "").trim();
      // Eco é a nossa própria mensagem voltando — responder a ela seria a IA
      // conversando sozinha.
      if (!igsid || m.message?.is_echo || igsid === meuId || !texto) continue;

      try {
        const ehStory = !!m.message?.reply_to?.story;
        const origem = ehStory ? "instagram_story" : "instagram_dm";
        const lead = await acharOuCriarLead(igsid, origem);

        // A Meta reenvia o mesmo evento quando não recebe 200 a tempo.
        if (m.message?.mid && lead.ig_ultimo_mid === m.message.mid) {
          processadas.push({ igsid, pulado: "mensagem repetida" });
          continue;
        }
        lead.ig_ultimo_mid = m.message?.mid;

        const entrada = ehStory ? `[respondeu seu story] ${texto}` : texto;
        const envio = await conversar(lead, entrada, origem);
        processadas.push({ igsid, origem, envio });
      } catch (e) {
        processadas.push({ igsid, erro: (e as Error).message });
      }
    }

    // --- 3: comentário em post ---
    for (const c of entry.changes ?? []) {
      if (c.field !== "comments") continue;
      const v = c.value ?? {};
      const commentId = v.id;
      const autor = v.from?.id;
      const texto = (v.text ?? "").trim();
      if (!commentId || !autor || autor === meuId || !texto) continue;

      try {
        // Comentário sem pergunta nem interesse não vira abordagem: responder
        // "🔥🔥" com discurso de vendas é o jeito mais rápido de parecer robô.
        if (!comentarioMereceResposta(texto)) {
          processadas.push({ commentId, pulado: "comentário sem intenção" });
          continue;
        }

        const lead = await acharOuCriarLead(autor, "instagram_comentario");
        const jaRespondidos = lead.ig_comentarios_respondidos ?? [];
        if (jaRespondidos.includes(commentId)) {
          processadas.push({ commentId, pulado: "já respondido" });
          continue;
        }

        // Público curto: quem lê o post vê que houve atendimento.
        const pub = await responderComentarioPublico(commentId, "Te chamei no direct 👊");
        // Privado: abre a conversa de verdade. A Meta permite 1x por comentário.
        const priv = await responderComentarioNoPrivado(
          commentId,
          "Oi! Vi seu comentário por aqui. Sou o Rafael, cuido da parte comercial do Iago Rodrigues. Me conta rapidinho o que você quer resolver que eu te oriento.",
        );

        lead.ig_comentarios_respondidos = [...jaRespondidos, commentId];
        lead.conversation = [
          ...(lead.conversation ?? []),
          { role: "lead", text: `[comentou no post] ${texto}`, at: new Date().toISOString() },
        ];
        lead.attempts = [...(lead.attempts ?? []), {
          step: "comentario_instagram", channel: "instagram",
          message: "resposta pública + DM de abertura",
          status: priv.status === "enviado" ? "enviado" : "bloqueado",
          detail: `público: ${pub.status} · privado: ${priv.detail}`,
          at: new Date().toISOString(),
        }];
        await upsertLead(lead);
        processadas.push({ commentId, publico: pub.status, privado: priv.status });
      } catch (e) {
        processadas.push({ commentId, erro: (e as Error).message });
      }
    }
  }

  // 200 sempre: erro nosso não pode fazer a Meta reenviar em loop.
  return NextResponse.json({ ok: true, processadas });
}

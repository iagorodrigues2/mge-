// Instagram Direct — a porta de ENTRADA.
//
// Diferença dura em relação ao WhatsApp: no Instagram NÃO existe template.
// Fora da janela de resposta não se manda nada. Logo o Direct nunca sai atrás
// de ninguém — ele atende quem chega. Isso é uma limitação boa: lead que vem
// até você já passou pela parte mais cara da venda, que é a confiança.
//
// Três entradas, todas caindo no mesmo agente:
//   1. DM direto
//   2. resposta de story (chega como mensagem, com reply_to.story)
//   3. comentário em post (resposta pública curta + DM privado, 1x por comentário)
const API = "https://graph.facebook.com/v21.0";

function token(): string | null {
  return process.env.IG_PAGE_TOKEN || null;
}

export function instagramConfigurado(): boolean {
  return !!process.env.IG_PAGE_TOKEN && !!process.env.IG_USER_ID;
}

export interface IgResult {
  status: "enviado" | "bloqueado";
  detail: string;
}

async function chamar(path: string, body: unknown): Promise<IgResult> {
  const t = token();
  if (!t) return { status: "bloqueado", detail: "IG_PAGE_TOKEN não configurado" };
  try {
    const r = await fetch(`${API}/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = (await r.json()) as { message_id?: string; id?: string; error?: { message: string; code?: number } };
    if (!r.ok || d.error) return { status: "bloqueado", detail: `Instagram: ${d.error?.message ?? r.status}` };
    return { status: "enviado", detail: `id ${d.message_id ?? d.id ?? "?"}` };
  } catch (e) {
    return { status: "bloqueado", detail: `falha de rede: ${(e as Error).message}` };
  }
}

// Mensagem no Direct para quem já está conversando (dentro da janela).
export async function enviarDM(igsid: string, texto: string): Promise<IgResult> {
  const igUser = process.env.IG_USER_ID;
  if (!igUser) return { status: "bloqueado", detail: "IG_USER_ID não configurado" };
  return chamar(`${igUser}/messages`, { recipient: { id: igsid }, message: { text: texto } });
}

// Resposta PRIVADA a um comentário: abre o Direct com quem comentou. A Meta
// permite uma única vez por comentário — por isso o webhook registra o id do
// comentário antes de tentar de novo.
export async function responderComentarioNoPrivado(commentId: string, texto: string): Promise<IgResult> {
  const igUser = process.env.IG_USER_ID;
  if (!igUser) return { status: "bloqueado", detail: "IG_USER_ID não configurado" };
  return chamar(`${igUser}/messages`, { recipient: { comment_id: commentId }, message: { text: texto } });
}

// Resposta PÚBLICA no próprio comentário. Curta de propósito: quem lê o post
// vê que houve atendimento; a conversa de verdade acontece no Direct.
export async function responderComentarioPublico(commentId: string, texto: string): Promise<IgResult> {
  return chamar(`${commentId}/replies`, { message: texto });
}

// Nome de quem está falando, para o CRM não ficar cheio de "lead_ig_178…".
export async function perfilDoUsuario(igsid: string): Promise<{ nome?: string; usuario?: string }> {
  const t = token();
  if (!t) return {};
  try {
    const r = await fetch(`${API}/${igsid}?fields=name,username`, { headers: { Authorization: `Bearer ${t}` } });
    const d = (await r.json()) as { name?: string; username?: string };
    return { nome: d.name, usuario: d.username };
  } catch {
    return {};
  }
}

// COMENTÁRIO MERECE RESPOSTA? Responder "🔥🔥" com discurso de vendas é o jeito
// mais rápido de parecer robô invasivo — foi o risco que levantei antes de
// construir isto. Só entra quem demonstrou interesse ou perguntou algo.
const INTERESSE = new RegExp(
  [
    "\\?", "quanto", "pre[çc]o", "valor", "invest",
    "quero", "queria", "gostaria", "tenho interesse", "me interessa",
    "como (funciona|faz|fa[çc]o|posso)", "info(rma[çc][õo]es)?", "saber mais",
    "manda(r)? (no )?(direct|dm|privado)", "chama(r)? no", "me chama",
    "consultoria", "mentoria", "ajuda", "dispon[íi]vel", "atende",
  ].join("|"),
  "i",
);

// Elogio puro não é pedido de atendimento.
const SO_ELOGIO = /^(\s*(top|show|massa|bom demais|muito bom|excelente|perfeito|isso|boa|parab[ée]ns|sensacional|👏|🔥|❤️|👍|🙌|💪|✅|\W)+)$/i;

export function comentarioMereceResposta(texto: string): boolean {
  const t = (texto ?? "").trim();
  if (t.length < 3) return false;
  if (SO_ELOGIO.test(t)) return false;
  return INTERESSE.test(t);
}

// Login do painel. O app estava aberto na internet: qualquer um com a URL via
// leads, preços, conversas e podia usar o /sdr-chat, queimando crédito da
// Anthropic. Uma senha só, porque o painel tem um usuário só — o Iago.
//
// Sem biblioteca e sem serviço externo: cookie assinado com HMAC via WebCrypto,
// que funciona tanto no middleware (Edge) quanto nas rotas (Node). Nada de
// sessão em banco — o cookie carrega a validade e a assinatura prova que fomos
// nós que emitimos.
export const COOKIE = "mge_sessao";
const VALIDADE_DIAS = 30;

export function senhaConfigurada(): boolean {
  return !!process.env.APP_SENHA && process.env.APP_SENHA.length >= 8;
}

// O segredo de assinatura pode ser separado, mas derivar da senha evita pedir
// uma segunda variável a quem só quer proteger o painel. Trocar a senha
// invalida as sessões antigas — que é o comportamento certo.
function segredo(): string {
  return process.env.AUTH_SECRET || `mge::${process.env.APP_SENHA ?? ""}`;
}

async function assinar(texto: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(segredo()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(texto));
  return Buffer.from(mac).toString("base64url");
}

export async function criarSessao(): Promise<{ valor: string; maxAge: number }> {
  const expira = Date.now() + VALIDADE_DIAS * 24 * 3600_000;
  const corpo = String(expira);
  return { valor: `${corpo}.${await assinar(corpo)}`, maxAge: VALIDADE_DIAS * 24 * 3600 };
}

export async function sessaoValida(cookie: string | undefined): Promise<boolean> {
  if (!cookie || !senhaConfigurada()) return false;
  const [corpo, mac] = cookie.split(".");
  if (!corpo || !mac) return false;
  const expira = Number(corpo);
  if (!Number.isFinite(expira) || expira < Date.now()) return false;
  return timingSafeEqual(await assinar(corpo), mac);
}

// Comparação de tempo constante: comparar com === vaza, pelo tempo de resposta,
// quantos caracteres do início bateram.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function senhaCorreta(tentativa: string): boolean {
  const real = process.env.APP_SENHA ?? "";
  if (!senhaConfigurada()) return false;
  return timingSafeEqual(tentativa, real);
}

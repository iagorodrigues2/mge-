// Minerador de WhatsApp comercial — o gargalo do outbound.
//
// A base tem 660 leads e ZERO celulares: os telefones da Receita são PABX fixo,
// que não tem WhatsApp. Sem celular não existe conversa autônoma.
//
// O caminho legítimo e automatizável: muita empresa B2B brasileira PUBLICA o
// próprio WhatsApp no site (botão "Fale conosco", link wa.me). É contato
// comercial divulgado pela própria empresa para ser usado — diferente de
// garimpar telefone pessoal.
//
// Aqui lemos o HTML CRU (o cnpj-finder tira as tags, o que destruiria o href do
// link) e validamos que é celular brasileiro de verdade.

export interface WhatsappAchado {
  numero: string; // E.164 sem símbolos: 5511999999999
  origem: string; // URL onde foi encontrado
  fonte: "wa.me" | "api.whatsapp" | "texto"; // como foi encontrado
}

// DDDs que existem no Brasil — evita capturar número quebrado ou estrangeiro.
const DDDS_VALIDOS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19,
  21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55,
  61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79,
  81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

// Celular brasileiro: 55 + DDD (2) + 9 dígitos começando com 9.
// Fixo (8 dígitos, começa com 2-5) NÃO tem WhatsApp e é descartado aqui.
export function normalizarCelular(bruto: string): string | null {
  let d = bruto.replace(/\D/g, "");
  if (d.startsWith("0")) d = d.replace(/^0+/, "");
  if (d.length === 11) d = "55" + d; // DDD + celular, sem país
  if (d.length !== 13 || !d.startsWith("55")) return null;
  const ddd = Number(d.slice(2, 4));
  const numero = d.slice(4);
  if (!DDDS_VALIDOS.has(ddd)) return null;
  if (numero.length !== 9 || !numero.startsWith("9")) return null; // fixo → fora
  if (/^(\d)\1{8}$/.test(numero)) return null; // 999999999 = placeholder
  return d;
}

// Links diretos de WhatsApp publicados no site.
const LINK_RES: { re: RegExp; fonte: WhatsappAchado["fonte"] }[] = [
  { re: /(?:https?:)?\/\/(?:api\.)?wa\.me\/(?:\+?55)?(\d[\d\s\-().]{9,16})/gi, fonte: "wa.me" },
  { re: /(?:api|web)\.whatsapp\.com\/send\?[^"'\s]*phone=(?:\+?55)?(\d[\d\s\-().%2B]{9,16})/gi, fonte: "api.whatsapp" },
];

// Número escrito perto da palavra "WhatsApp" no texto da página.
const TEXTO_RE = /whats\s*app?[^0-9+]{0,40}(\+?\s*(?:55)?\s*\(?\d{2}\)?[\s.-]?9[\s.-]?\d{4}[\s.-]?\d{4})/gi;

// Extrai todos os WhatsApp válidos de um HTML, sem repetir.
export function extrairWhatsapp(html: string, origem = ""): WhatsappAchado[] {
  const achados = new Map<string, WhatsappAchado>();

  for (const { re, fonte } of LINK_RES) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) {
      const n = normalizarCelular(decodeURIComponent(m[1]));
      if (n && !achados.has(n)) achados.set(n, { numero: n, origem, fonte });
    }
  }

  // texto puro (sem tags) para o padrão "WhatsApp: (11) 99999-9999"
  const texto = html.replace(/<[^>]+>/g, " ");
  TEXTO_RE.lastIndex = 0;
  let t: RegExpExecArray | null;
  while ((t = TEXTO_RE.exec(texto))) {
    const n = normalizarCelular(t[1]);
    if (n && !achados.has(n)) achados.set(n, { numero: n, origem, fonte: "texto" });
  }

  return [...achados.values()];
}

// HTML CRU — diferente do cnpj-finder, aqui as tags importam (o href do link).
async function fetchHtml(url: string, timeoutMs: number): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("html") && !ct.includes("text")) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function originOf(url: string): string | null {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).origin;
  } catch {
    return null;
  }
}

// Páginas onde o botão de WhatsApp costuma estar.
const PAGINAS = ["", "/contato", "/fale-conosco", "/sobre", "/atendimento", "/contatos"];

// Varre o site da empresa atrás do WhatsApp comercial publicado.
export async function descobrirWhatsapp(
  site: string,
  opts: { timeoutMs?: number; budgetMs?: number } = {},
): Promise<WhatsappAchado | null> {
  const origin = originOf(site);
  if (!origin) return null;
  const timeoutMs = opts.timeoutMs ?? 4000;
  const budgetMs = opts.budgetMs ?? 12000;
  const started = Date.now();

  for (const path of PAGINAS) {
    if (Date.now() - started > budgetMs) break;
    const html = await fetchHtml(origin + path, timeoutMs);
    if (!html) continue;
    const achados = extrairWhatsapp(html, origin + path);
    // link explícito vale mais que número solto no texto
    const melhor = achados.find((a) => a.fonte !== "texto") ?? achados[0];
    if (melhor) return melhor;
  }
  return null;
}

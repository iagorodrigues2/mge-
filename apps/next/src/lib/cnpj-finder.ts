// Localizador de CNPJ — a busca web (SERPER) devolve nome/site, não CNPJ.
// Aqui extraímos o CNPJ do próprio site da empresa (rodapé/página de contato),
// validando os dígitos verificadores para nunca capturar um número qualquer.
// Sem dependências e sem chave. Tudo com timeout e try/catch: falha vira null.

const CNPJ_RE = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g;

export function isValidCnpj(digits: string): boolean {
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;
  const calc = (len: number): number => {
    let sum = 0;
    let pos = len - 7;
    for (let i = len; i >= 1; i--) {
      sum += Number(digits[len - i]) * pos--;
      if (pos < 2) pos = 9;
    }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(digits[12]) && calc(13) === Number(digits[13]);
}

// Retorna o primeiro CNPJ válido encontrado no texto (ou null).
export function findCnpjInText(text: string): string | null {
  const matches = text.match(CNPJ_RE);
  if (!matches) return null;
  for (const m of matches) {
    const d = m.replace(/\D/g, "");
    if (d.length === 14 && isValidCnpj(d)) return d;
  }
  return null;
}

async function fetchText(url: string, timeoutMs: number): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; MaquinaDeVendas/1.0; +https://brasilapi.com.br)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("html") && !ct.includes("text")) return null;
    const html = await res.text();
    // remove scripts/estilos e tags, deixando o texto onde o CNPJ costuma estar
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ");
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

// Páginas onde o CNPJ costuma aparecer (rodapé institucional).
const DEEP_PATHS = ["/contato", "/sobre", "/quem-somos", "/institucional", "/politica-de-privacidade", "/termos"];

// Procura o CNPJ no site. shallow (padrão): só a home. deep: home + páginas
// institucionais comuns. Para quando acha o primeiro CNPJ válido.
export async function discoverCnpjFromSite(
  url: string,
  opts: { deep?: boolean; timeoutMs?: number } = {},
): Promise<string | null> {
  return (await probeSite(url, opts)).cnpj ?? null;
}

// Pistas de perfil ICP no texto do site (quando o CNAE da Receita não estiver
// disponível). Prioridade: indústria > importador > distribuidor > marca própria.
export type PerfilHint = "industria" | "distribuidor" | "importador" | "marca_propria";
const HINT_RE: [PerfilHint, RegExp][] = [
  ["industria", /f[áa]brica|fabrica[çc][ãa]|ind[úu]stri|fabricamos|somos fabricante|nossa f[áa]brica/i],
  ["importador", /importa[çc][ãa]|importador|importamos|importados/i],
  ["distribuidor", /distribuidor|distribui[çc][ãa]|atacad/i],
  ["marca_propria", /marca pr[óo]pria/i],
];

export interface SiteProbe { cnpj?: string; hint?: PerfilHint; }

// Uma única varredura do site que colhe CNPJ e a pista de perfil de uma vez.
export async function probeSite(url: string, opts: { deep?: boolean; timeoutMs?: number } = {}): Promise<SiteProbe> {
  const origin = originOf(url);
  if (!origin) return {};
  const timeoutMs = opts.timeoutMs ?? 5000;
  const pages = [url, origin, ...(opts.deep ? DEEP_PATHS.map((p) => origin + p) : [])];
  const seen = new Set<string>();
  const out: SiteProbe = {};
  for (const page of pages) {
    if (seen.has(page)) continue;
    seen.add(page);
    const text = await fetchText(page, timeoutMs);
    if (!text) continue;
    if (!out.cnpj) out.cnpj = findCnpjInText(text) ?? undefined;
    if (!out.hint) {
      for (const [hint, re] of HINT_RE) { if (re.test(text)) { out.hint = hint; break; } }
    }
    if (out.cnpj && out.hint) break;
  }
  return out;
}

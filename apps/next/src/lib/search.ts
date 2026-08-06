// Busca web compartilhada (Scout e checagem de marketplace).
// SERPER_API_KEY (serper.dev/Google) ou BRAVE_API_KEY. Sem chave, retorna [].
export interface WebHit { title: string; link: string; snippet: string; }

export function hasSearchProvider(): boolean {
  return Boolean(process.env.SERPER_API_KEY || process.env.BRAVE_API_KEY);
}

export async function searchWeb(query: string, n: number): Promise<WebHit[]> {
  const serper = process.env.SERPER_API_KEY;
  if (serper) {
    try {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "X-API-KEY": serper, "Content-Type": "application/json" },
        body: JSON.stringify({ q: query, gl: "br", hl: "pt-br", num: n }),
      });
      const data = (await res.json()) as { organic?: WebHit[] };
      return (data.organic ?? []).slice(0, n);
    } catch {
      return [];
    }
  }
  const brave = process.env.BRAVE_API_KEY;
  if (brave) {
    try {
      const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&country=br&count=${n}`;
      const res = await fetch(url, { headers: { "X-Subscription-Token": brave, Accept: "application/json" } });
      const data = (await res.json()) as { web?: { results?: { title: string; url: string; description: string }[] } };
      return (data.web?.results ?? []).slice(0, n).map((r) => ({ title: r.title, link: r.url, snippet: r.description }));
    } catch {
      return [];
    }
  }
  return [];
}

// Toda data que aparece na tela passa por aqui.
//
// O bug: `new Date(x).toLocaleString("pt-BR")` define o IDIOMA mas não o FUSO —
// o fuso vira o do servidor, e a Vercel roda em UTC. Resultado: o painel
// mostrava 15:05 quando em São Paulo eram 12:05, e ninguém confia num CRM que
// mente a hora da última mensagem do lead.
//
// A lógica (saudação, horário comercial, agenda) sempre usou America/Sao_Paulo
// explicitamente — era só a apresentação que estava solta.
export const TZ = "America/Sao_Paulo";

export function dataHora(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { timeZone: TZ, dateStyle: "short", timeStyle: "short" });
}

export function data(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { timeZone: TZ });
}

// "quinta-feira, 11/09/2026, 12:05" — para o prompt do agente saber que horas
// são de verdade, em vez de deduzir do nada.
export function agoraPorExtenso(agora = new Date()): string {
  return agora.toLocaleString("pt-BR", {
    timeZone: TZ, weekday: "long", day: "2-digit", month: "2-digit",
    year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

// Agenda do Iago no Google Calendar — o agente Agenda.
//
// AUTENTICAÇÃO POR SERVICE ACCOUNT, não OAuth. Motivo prático: OAuth exige tela
// de consentimento, refresh token que expira e um app publicado; service account
// é uma chave que não expira, e para uma conta Gmail comum basta COMPARTILHAR a
// agenda com o e-mail da service account (docs/agenda-google-calendar.md).
//
// LIMITE CONHECIDO: service account sem Workspace não consegue CONVIDAR
// participantes (a Google recusa sem domain-wide delegation). Por isso o evento
// é criado na agenda do Iago com os dados do lead na descrição, e quem avisa o
// lead é a própria conversa no WhatsApp. Ninguém depende de convite por e-mail.
//
// Custo: zero (a API do Calendar é gratuita) — condição do projeto de manter a
// Claude como único custo pago.
import crypto from "node:crypto";

const TZ = "America/Sao_Paulo";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/calendar/v3";

function cfg() {
  return {
    email: process.env.GOOGLE_SA_EMAIL || "",
    // A chave PEM vem com \n literais quando colada numa env var da Vercel.
    key: (process.env.GOOGLE_SA_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    calendarId: process.env.GOOGLE_CALENDAR_ID || process.env.SMTP_USER || "",
    duracaoMin: Number(process.env.AGENDA_DURACAO_MIN || 45),
    horaInicio: Number(process.env.AGENDA_HORA_INICIO || 9),
    horaFim: Number(process.env.AGENDA_HORA_FIM || 18),
    // Ninguém marca reunião para daqui a 20 minutos: o lead precisa se
    // organizar e o Iago também.
    antecedenciaH: Number(process.env.AGENDA_ANTECEDENCIA_H || 3),
    diasFrente: Number(process.env.AGENDA_DIAS || 7),
  };
}

export function agendaConfigurada(): boolean {
  const c = cfg();
  return !!c.email && !!c.key && !!c.calendarId;
}

// ---- fuso ------------------------------------------------------------------
// O Brasil não tem horário de verão desde 2019, mas calcular o deslocamento em
// vez de fixar -03:00 evita que a agenda erre em silêncio se isso voltar.
function offsetMs(date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p = Object.fromEntries(dtf.formatToParts(date).map((x) => [x.type, x.value])) as Record<string, string>;
  const comoUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return comoUtc - date.getTime();
}

// Instante UTC correspondente a uma hora LOCAL de São Paulo.
function localParaUtc(ano: number, mes: number, dia: number, hora: number, minuto = 0): Date {
  const chute = new Date(Date.UTC(ano, mes, dia, hora, minuto));
  return new Date(chute.getTime() - offsetMs(chute));
}

function partesLocais(d: Date) {
  const dtf = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ, hour12: false, weekday: "long",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
  const p = Object.fromEntries(dtf.formatToParts(d).map((x) => [x.type, x.value])) as Record<string, string>;
  return p;
}

// "terça-feira (16/09) às 10h" — como a IA vai dizer no WhatsApp.
export function rotuloHorario(iso: string): string {
  const p = partesLocais(new Date(iso));
  const dia = p.weekday?.replace("-feira", "");
  const hora = String(Number(p.hour)); // "09" vira "9": é assim que se fala no WhatsApp
  const minuto = p.minute === "00" ? "h" : `h${p.minute}`;
  return `${dia} (${p.day}/${p.month}) às ${hora}${minuto}`;
}

// ---- token -----------------------------------------------------------------
let cacheToken: { token: string; expiraEm: number } | null = null;

async function accessToken(): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const c = cfg();
  if (!c.email || !c.key) return { ok: false, error: "GOOGLE_SA_EMAIL / GOOGLE_SA_PRIVATE_KEY não configurados" };
  if (cacheToken && cacheToken.expiraEm > Date.now() + 60_000) return { ok: true, token: cacheToken.token };

  const agora = Math.floor(Date.now() / 1000);
  const cabecalho = { alg: "RS256", typ: "JWT" };
  const corpo = {
    iss: c.email,
    scope: "https://www.googleapis.com/auth/calendar",
    aud: TOKEN_URL,
    iat: agora,
    exp: agora + 3600,
  };
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const conteudo = `${b64(cabecalho)}.${b64(corpo)}`;

  let assinatura: string;
  try {
    assinatura = crypto.createSign("RSA-SHA256").update(conteudo).sign(c.key, "base64url");
  } catch (e) {
    return { ok: false, error: `chave privada inválida: ${(e as Error).message}` };
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${conteudo}.${assinatura}`,
    }),
  });
  const d = (await res.json()) as { access_token?: string; expires_in?: number; error_description?: string; error?: string };
  if (!res.ok || !d.access_token) {
    return { ok: false, error: `Google recusou a autenticação: ${d.error_description ?? d.error ?? res.status}` };
  }
  cacheToken = { token: d.access_token, expiraEm: Date.now() + (d.expires_in ?? 3600) * 1000 };
  return { ok: true, token: d.access_token };
}

// ---- disponibilidade --------------------------------------------------------
export interface Horario { inicio: string; fim: string; rotulo: string }

export interface Ocupado { start: string; end: string }

async function ocupados(deISO: string, ateISO: string): Promise<{ ok: true; itens: Ocupado[] } | { ok: false; error: string }> {
  const c = cfg();
  const t = await accessToken();
  if (!t.ok) return { ok: false, error: t.error };

  const res = await fetch(`${API}/freeBusy`, {
    method: "POST",
    headers: { Authorization: `Bearer ${t.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ timeMin: deISO, timeMax: ateISO, timeZone: TZ, items: [{ id: c.calendarId }] }),
  });
  const d = (await res.json()) as { calendars?: Record<string, { busy?: Ocupado[]; errors?: { reason: string }[] }>; error?: { message: string } };
  if (!res.ok || d.error) return { ok: false, error: `freeBusy: ${d.error?.message ?? res.status}` };

  const cal = d.calendars?.[c.calendarId];
  if (cal?.errors?.length) {
    // O erro clássico: a agenda não foi compartilhada com a service account.
    return { ok: false, error: `a agenda ${c.calendarId} não está acessível (${cal.errors.map((e) => e.reason).join(", ")}) — compartilhe com ${c.email}` };
  }
  return { ok: true, itens: cal?.busy ?? [] };
}

function conflita(inicio: Date, fim: Date, busy: Ocupado[]): boolean {
  return busy.some((b) => {
    const bi = new Date(b.start).getTime();
    const bf = new Date(b.end).getTime();
    return inicio.getTime() < bf && fim.getTime() > bi;
  });
}

// A grade de horários em si — separada da chamada de rede para poder ser
// conferida sem credencial (ver /api/agenda/testar), que é onde se pega erro
// de fuso antes de ele virar reunião marcada na hora errada.
export function montarHorarios(busy: Ocupado[], quantos = 3, agora = new Date()): Horario[] {
  const c = cfg();
  const de = new Date(agora.getTime() + c.antecedenciaH * 3600_000);
  const horarios: Horario[] = [];
  for (let d = 0; d <= c.diasFrente && horarios.length < quantos; d++) {
    const dia = new Date(agora.getTime() + d * 24 * 3600_000);
    const p = partesLocais(dia);
    const ano = +p.year, mes = +p.month - 1, num = +p.day;
    // dia útil?
    const wd = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(dia);
    if (wd === "Sat" || wd === "Sun") continue;

    for (let h = c.horaInicio; h < c.horaFim && horarios.length < quantos; h++) {
      // 12h é almoço — não oferecer.
      if (h === 12) continue;
      const inicio = localParaUtc(ano, mes, num, h);
      const fim = new Date(inicio.getTime() + c.duracaoMin * 60_000);
      if (inicio < de) continue;
      if (conflita(inicio, fim, busy)) continue;
      horarios.push({ inicio: inicio.toISOString(), fim: fim.toISOString(), rotulo: rotuloHorario(inicio.toISOString()) });
    }
  }
  return horarios;
}

// Próximos horários livres de verdade: a grade acima menos o que já está
// ocupado na agenda do Iago.
export async function proximosHorarios(quantos = 3): Promise<{ ok: true; horarios: Horario[] } | { ok: false; error: string }> {
  const c = cfg();
  if (!agendaConfigurada()) return { ok: false, error: "agenda não configurada" };

  const agora = new Date();
  const de = new Date(agora.getTime() + c.antecedenciaH * 3600_000);
  const ate = new Date(agora.getTime() + c.diasFrente * 24 * 3600_000);

  const oc = await ocupados(de.toISOString(), ate.toISOString());
  if (!oc.ok) return oc;

  return { ok: true, horarios: montarHorarios(oc.itens, quantos, agora) };
}

// O horário AINDA está livre? Um slot oferecido há dois dias pode ter sido
// ocupado nesse meio-tempo — confirmar antes de prometer ao lead.
export async function horarioDisponivel(inicioISO: string): Promise<boolean> {
  const c = cfg();
  const inicio = new Date(inicioISO);
  if (!Number.isFinite(inicio.getTime())) return false;
  if (inicio.getTime() < Date.now() + 30 * 60_000) return false; // passou ou é já-já
  const fim = new Date(inicio.getTime() + c.duracaoMin * 60_000);
  const oc = await ocupados(inicio.toISOString(), fim.toISOString());
  if (!oc.ok) return false;
  return !conflita(inicio, fim, oc.itens);
}

// ---- criação ----------------------------------------------------------------
export interface Reuniao { inicio: string; fim: string; eventoId: string; link?: string; rotulo: string }

export async function criarReuniao(opts: {
  inicioISO: string;
  titulo: string;
  descricao: string;
}): Promise<{ ok: true; reuniao: Reuniao } | { ok: false; error: string }> {
  const c = cfg();
  const t = await accessToken();
  if (!t.ok) return { ok: false, error: t.error };

  const inicio = new Date(opts.inicioISO);
  const fim = new Date(inicio.getTime() + c.duracaoMin * 60_000);

  const res = await fetch(`${API}/calendars/${encodeURIComponent(c.calendarId)}/events`, {
    method: "POST",
    headers: { Authorization: `Bearer ${t.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: opts.titulo,
      description: opts.descricao,
      start: { dateTime: inicio.toISOString(), timeZone: TZ },
      end: { dateTime: fim.toISOString(), timeZone: TZ },
      // Lembrete para o Iago não perder a call marcada pela IA.
      reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 30 }, { method: "email", minutes: 60 }] },
    }),
  });
  const d = (await res.json()) as { id?: string; htmlLink?: string; error?: { message: string } };
  if (!res.ok || d.error || !d.id) return { ok: false, error: `criar evento: ${d.error?.message ?? res.status}` };

  return {
    ok: true,
    reuniao: { inicio: inicio.toISOString(), fim: fim.toISOString(), eventoId: d.id, link: d.htmlLink, rotulo: rotuloHorario(inicio.toISOString()) },
  };
}

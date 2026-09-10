import { NextResponse } from "next/server";
import { agendaConfigurada, apagarEvento, criarReuniao, montarHorarios, proximosHorarios } from "@/lib/google-calendar";

export const runtime = "nodejs";

// Teste da agenda, em duas camadas:
//  - a GRADE (montarHorarios com agenda vazia) roda sem credencial nenhuma e é
//    onde se pega erro de FUSO antes de virar reunião marcada na hora errada;
//  - a disponibilidade REAL só sai com a service account configurada e a agenda
//    compartilhada com ela.
// ?meet=1 responde a única pergunta que a leitura da agenda não responde: esta
// service account consegue criar link do Google Meet? Cria um evento de teste
// fora do horário comercial, olha se veio link, e APAGA em seguida — a resposta
// vale mais do que descobrir no primeiro lead de verdade.
async function testarMeet() {
  const amanha = new Date(Date.now() + 24 * 3600_000);
  amanha.setUTCHours(2, 0, 0, 0); // 23h de Brasília: nunca colide com call real
  const r = await criarReuniao({
    inicioISO: amanha.toISOString(),
    titulo: "[TESTE - pode ignorar] Máquina de Vendas",
    descricao: "Evento de teste criado para verificar se a integração consegue gerar link do Google Meet. É apagado automaticamente.",
  });
  if (!r.ok) return { meetDisponivel: false, erro: r.error, eventoApagado: false };

  const apagou = await apagarEvento(r.reuniao.eventoId);
  return {
    meetDisponivel: !!r.reuniao.meet,
    linkGerado: r.reuniao.meet ?? null,
    eventoApagado: apagou.ok,
    salaFixaConfigurada: !!process.env.MEET_LINK,
    diagnostico: r.reuniao.meet
      ? "a IA vai mandar o link do Meet junto com a confirmação"
      : "esta conta NÃO gera link do Meet (limite de service account fora do Workspace) e não há MEET_LINK configurado — a IA vai dizer que a call é pelo WhatsApp",
  };
}

export async function GET(req: Request) {
  const configurada = agendaConfigurada();
  const querMeet = new URL(req.url).searchParams.get("meet") === "1";
  const grade = montarHorarios([], 5).map((h) => ({ rotulo: h.rotulo, inicio: h.inicio }));

  if (!configurada) {
    return NextResponse.json({
      ok: false,
      configurada: false,
      diagnostico: "faltam GOOGLE_SA_EMAIL, GOOGLE_SA_PRIVATE_KEY ou GOOGLE_CALENDAR_ID — ver docs/agenda-google-calendar.md",
      gradeSemAgenda: grade,
    });
  }

  if (querMeet) return NextResponse.json({ ok: true, teste: "meet", ...(await testarMeet()) });

  const r = await proximosHorarios(5);
  if (!r.ok) {
    return NextResponse.json({
      ok: false,
      configurada: true,
      calendario: process.env.GOOGLE_CALENDAR_ID ?? null,
      serviceAccount: process.env.GOOGLE_SA_EMAIL ?? null,
      erro: r.error,
      gradeSemAgenda: grade,
    });
  }

  return NextResponse.json({
    ok: true,
    configurada: true,
    calendario: process.env.GOOGLE_CALENDAR_ID ?? null,
    serviceAccount: process.env.GOOGLE_SA_EMAIL ?? null,
    duracaoMin: Number(process.env.AGENDA_DURACAO_MIN || 45),
    proximosLivres: r.horarios.map((h) => ({ rotulo: h.rotulo, inicio: h.inicio })),
    diagnostico: r.horarios.length
      ? "a IA vai oferecer estes horários ao lead"
      : "a agenda respondeu, mas não há nenhum horário livre na janela configurada",
  });
}

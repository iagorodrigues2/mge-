import { NextResponse } from "next/server";
import { agendaConfigurada, montarHorarios, proximosHorarios } from "@/lib/google-calendar";

export const runtime = "nodejs";

// Teste da agenda, em duas camadas:
//  - a GRADE (montarHorarios com agenda vazia) roda sem credencial nenhuma e é
//    onde se pega erro de FUSO antes de virar reunião marcada na hora errada;
//  - a disponibilidade REAL só sai com a service account configurada e a agenda
//    compartilhada com ela.
export async function GET() {
  const configurada = agendaConfigurada();
  const grade = montarHorarios([], 5).map((h) => ({ rotulo: h.rotulo, inicio: h.inicio }));

  if (!configurada) {
    return NextResponse.json({
      ok: false,
      configurada: false,
      diagnostico: "faltam GOOGLE_SA_EMAIL, GOOGLE_SA_PRIVATE_KEY ou GOOGLE_CALENDAR_ID — ver docs/agenda-google-calendar.md",
      gradeSemAgenda: grade,
    });
  }

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

import { NextResponse } from "next/server";
import { resetPackages, listPackages } from "@/lib/db";
import { DEFAULT_PACKAGES } from "@/lib/pricing-defaults";

export const runtime = "nodejs";

// Uso único (troca CLAUDE V2 → V3): o seed automático só roda com a tabela
// vazia, e o catálogo antigo (4 produtos) já estava semeado em produção — sem
// isso os 5 produtos novos nunca entrariam sozinhos. GET só mostra o catálogo
// atual (nada muda); POST substitui pelos DEFAULT_PACKAGES de agora.
export async function GET() {
  return NextResponse.json({ ok: true, catalogoAtual: await listPackages() });
}

export async function POST() {
  await resetPackages(DEFAULT_PACKAGES);
  return NextResponse.json({ ok: true, catalogoNovo: await listPackages() });
}

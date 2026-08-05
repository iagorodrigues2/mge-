import { NextResponse } from "next/server";
import { listPackages, getPackage, upsertPackage } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ packages: await listPackages() });
}

// edita preço/estado de um pacote (Configurações) — preço vive no store
export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { code, precoRef, precoFundador, ativo } = body;
  if (!code) return NextResponse.json({ ok: false, error: "code obrigatório" }, { status: 400 });
  const pkg = await getPackage(code);
  if (!pkg) return NextResponse.json({ ok: false, error: "pacote não encontrado" }, { status: 404 });
  if (precoRef != null) pkg.precoRef = Number(precoRef);
  if (precoFundador != null) pkg.precoFundador = Number(precoFundador) || undefined;
  if (ativo != null) pkg.ativo = Boolean(ativo);
  await upsertPackage(pkg);
  return NextResponse.json({ ok: true, package: pkg });
}

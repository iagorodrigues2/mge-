import { NextResponse } from "next/server";
import { conferirPerfil, conferirTemplates } from "@/lib/wa-waba";

export const runtime = "nodejs";

// DIAGNÓSTICO: os templates aprovados estão na MESMA WABA do número que envia?
//
// Template vive por WABA. Se os modelos foram criados na conta de TESTE e a
// produção aponta para a WABA definitiva, o envio volta com "template does not
// exist" — e o painel da Meta não avisa, porque nas duas contas aparece
// "Active". Também responde qual número está ligado ao phone id configurado.
export async function GET() {
  const [c, perfil] = await Promise.all([conferirTemplates(), conferirPerfil()]);
  if (c.erro) return NextResponse.json({ ok: false, wabaId: c.wabaId, error: c.erro }, { status: 400 });

  return NextResponse.json({
    ok: c.ok,
    podeDisparar: c.okOutbound, // o disparo só depende dos 3 do primeiro contato
    wabaId: c.wabaId,
    phoneIdConfigurado: process.env.WHATSAPP_BUSINESS_PHONE_ID ?? null,
    numeros: c.numeros,
    // O que o lead vê antes de ler a mensagem.
    perfilComercial: perfil.erro
      ? { erro: perfil.erro }
      : {
          completo: perfil.ok,
          temFoto: !!perfil.foto,
          foto: perfil.foto,
          descricao: perfil.descricao,
          sobre: perfil.sobre,
          sites: perfil.sites,
          email: perfil.email,
          setor: perfil.setor,
          faltando: perfil.faltando,
        },
    conferencia: c.conferencia,
    diagnostico: c.diagnostico,
    templatesNaWaba: c.templatesNaWaba,
  });
}

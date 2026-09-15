// Registro dos lotes embarcados. Adicionar um lote = copiar o JSON pra cá e
// registrar abaixo; o botão "Importar lote" no /leads oferece o mais recente.
import lote20260915 from "./2026-09-15.json";

export const LOTES: Record<string, unknown[]> = {
  "2026-09-15": lote20260915.leads,
};

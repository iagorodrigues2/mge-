import DiagnosticoQuiz from "@/components/DiagnosticoQuiz";

export const metadata = {
  title: "Diagnóstico da sua operação de marketplace — Iago Rodrigues",
  description: "3 perguntas, 1 minuto. Descubra se sua empresa tem perfil para uma implantação profissional no Mercado Livre, Amazon e Shopee.",
};

// O link da bio do Instagram. Pública (middleware), sem cabeçalho do painel:
// quem chega aqui é cliente em potencial, não operador da máquina.
const INSTAGRAM = "iagorodriguesma";

export default function DiagnosticoPage() {
  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: "28px 18px 60px" }}>
      <p className="hint" style={{ margin: "0 0 18px", letterSpacing: ".06em", textTransform: "uppercase", fontSize: 11 }}>
        Iago Rodrigues · Operações de marketplace
      </p>
      <h1 style={{ fontSize: 26, lineHeight: 1.2, margin: "0 0 8px" }}>
        Sua empresa tem perfil pra vender de verdade em marketplace?
      </h1>
      <p className="sub" style={{ marginBottom: 26 }}>
        3 perguntas, 1 minuto. No fim você sabe se faz sentido conversar — ou o que fazer antes disso.
      </p>
      <DiagnosticoQuiz instagram={INSTAGRAM} />
    </main>
  );
}

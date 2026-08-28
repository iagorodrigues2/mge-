export const metadata = {
  title: "Política de Privacidade — Iago Rodrigues",
  description: "Como tratamos dados de contato comercial no atendimento por WhatsApp.",
};

// Página pública exigida pela Meta para publicar o app do WhatsApp.
// Precisa ser acessível SEM login — por isso vive fora do painel.
export default function PrivacidadePage() {
  const atualizado = "28 de agosto de 2026";
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px", lineHeight: 1.65 }}>
      <h1>Política de Privacidade</h1>
      <p className="sub">Iago Rodrigues — Consultoria em operações de marketplace</p>
      <p className="hint">Última atualização: {atualizado}</p>

      <h2>Quem somos</h2>
      <p>
        Esta política descreve como Iago Rodrigues trata dados pessoais no contato
        comercial com empresas, inclusive no atendimento por WhatsApp.
        Contato: <a href="mailto:comercial.rodriguesimport@gmail.com">comercial.rodriguesimport@gmail.com</a>.
      </p>

      <h2>Quais dados coletamos</h2>
      <ul>
        <li>Dados de contato comercial: nome da empresa, telefone, e-mail e site.</li>
        <li>Dados públicos de empresa: CNPJ, razão social, CNAE e situação cadastral, obtidos de fontes públicas oficiais.</li>
        <li>Conteúdo das mensagens trocadas conosco por WhatsApp ou e-mail.</li>
      </ul>
      <p>
        Não coletamos dados sensíveis, não pedimos senha, dado bancário ou cartão,
        e não usamos os dados para publicidade de terceiros.
      </p>

      <h2>Como usamos</h2>
      <p>
        Exclusivamente para avaliar se há aderência entre a necessidade da empresa e
        os serviços prestados, conduzir a conversa comercial e registrar o andamento
        da negociação. A base legal é o legítimo interesse em prospecção comercial
        entre empresas (LGPD, art. 7º, IX), e o consentimento quando você nos procura
        espontaneamente.
      </p>

      <h2>Atendimento automatizado</h2>
      <p>
        Parte do atendimento inicial no WhatsApp é conduzida por um assistente
        automatizado que responde em nome de Iago Rodrigues. Ele é identificado como
        assistente, não se apresenta como pessoa física, e a negociação é conduzida
        por Iago Rodrigues.
      </p>

      <h2>Com quem compartilhamos</h2>
      <p>
        Não vendemos nem cedemos dados. Utilizamos provedores de infraestrutura para
        hospedagem, banco de dados, envio de e-mail e processamento das mensagens do
        assistente, que tratam os dados apenas para prestar esses serviços.
      </p>

      <h2>Por quanto tempo guardamos</h2>
      <p>
        Mantemos os dados enquanto durar a relação comercial ou o interesse legítimo
        de prospecção. Após o encerramento, ou mediante solicitação, os dados são
        excluídos, salvo obrigação legal de retenção.
      </p>

      <h2>Como parar de receber mensagens</h2>
      <p>
        Basta responder <strong>&quot;sair&quot;</strong>, <strong>&quot;parar&quot;</strong> ou{" "}
        <strong>&quot;descadastrar&quot;</strong> em qualquer mensagem no WhatsApp. O
        encerramento é imediato e o número entra em lista de exclusão para não ser
        contatado novamente.
      </p>

      <h2>Seus direitos</h2>
      <p>
        Você pode solicitar a qualquer momento confirmação, acesso, correção,
        portabilidade ou <strong>exclusão</strong> dos seus dados, além da revogação do
        consentimento, escrevendo para{" "}
        <a href="mailto:comercial.rodriguesimport@gmail.com">comercial.rodriguesimport@gmail.com</a>.
        Respondemos em até 15 dias.
      </p>

      <h2>Exclusão de dados</h2>
      <p>
        Para pedir a exclusão completa dos seus dados, envie um e-mail com o assunto
        &quot;Exclusão de dados&quot; informando o telefone ou e-mail usado no contato.
        A exclusão é feita em até 15 dias e confirmada por e-mail.
      </p>
    </main>
  );
}

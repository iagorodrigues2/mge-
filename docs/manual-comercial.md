# Manual comercial

Fonte de verdade operacional: as tabelas `service_packages` e
`price_versions` no banco (editáveis em **Configurações** no painel, sem
precisar de deploy). Este documento explica a lógica por trás dos números —
não é para copiar valores daqui para código.

## Ofertas

| Código            | Nome                              | Preço de referência | Duração   |
|-------------------|------------------------------------|----------------------|-----------|
| `diagnostico`     | Diagnóstico Executivo Marketplace  | R$ 2.500             | —         |
| `mentoria_90`      | Mentoria Marketplace 90            | R$ 9.000              | 90 dias   |
| `implantacao_90`   | Implantação Marketplace 90 (**oferta principal**) | R$ 20.000 | 90 dias |
| `programa_anual`   | Programa Anual de Escala           | R$ 40.000 (R$ 30.000 condição Cliente Fundador, máx. 3 clientes) | 12 meses |

Regra de posicionamento (seção 3.5): nunca abrir vendendo "mentoria" —
vender a oportunidade/diagnóstico/risco de margem primeiro.

## Lógica econômica (valor por mês equivalente)

- Mentoria: ~R$ 3.000/mês.
- Implantação: ~R$ 6.667/mês (justificado pela intensidade).
- Programa anual oficial: ~R$ 3.333/mês (maior intensidade no início).
- Programa anual a R$ 30.000 (fundador): ~R$ 2.500/mês — só como condição
  fundador ou renovação de menor intensidade, nunca preço de tabela
  permanente.

## Condição Cliente Fundador

- Máximo 3 clientes.
- Escopo rigorosamente definido, autorização específica para documentar o
  case (respeitando confidencialidade), compromisso de participação em
  reuniões e fornecimento de dados.
- Depoimento só se houver satisfação real.
- Não renovada automaticamente.
- Proposta deve sempre mostrar o preço oficial (R$ 40.000) ao lado da
  condição fundador (R$ 30.000) — nunca esconder o preço de tabela.
- Sem falsa urgência.

## Condições de pagamento (padrão sugerido, configurável em `DiscountPolicy`)

- Projetos de 90 dias: 50% na assinatura, 25% em 30 dias, 25% em 60 dias.
- Programa anual: entrada de implantação + saldo mensal.
- Desconto à vista: até 10%, sempre com aprovação (nunca concedido pelo
  closer assistente sozinho — regra dura em `packages/agents/compliance.py`
  não codifica isso ainda como bloqueio automático de UI; hoje é uma regra
  de processo, reforce com o time).
- Nenhum projeto inicia antes da confirmação da entrada.

## Perfil de cliente ideal (priorizar)

CNPJ ativo, 3+ anos de operação, marca própria/fabricação/distribuição,
catálogo de 20–500 produtos, produto físico com demanda B2C, estoque
próprio, presença digital (site/Instagram), ausência ou execução ruim em
marketplaces, margem aparente suficiente, decisor identificável.

**Evitar:** autônomos, sem produto físico, sem estoque, sem emissão fiscal,
sob encomenda, ticket/margem mínimos, empresa encerrada ou com reputação
pública crítica, operação já madura e dominante em marketplaces.

## Ordem de segmentos (nunca misturar numa mesma campanha)

1. Casa, móveis, decoração, cama/mesa/banho
2. Moda, vestuário, calçados e acessórios
3. Esporte, fitness e lazer
4. Beleza e cuidados pessoais
5. Pet
6. Ferramentas e utilidades profissionais
7. Acessórios automotivos (por último — compatibilidade/aplicação por
   modelo tornam a implantação mais complexa)

## Roteiro da reunião de diagnóstico e respostas comerciais

Ver seção 9 e 10 do prompt-mestre original para os scripts completos de
cadência, tratamento de objeções e roteiro de call — foram implementados
literalmente em `packages/agents/copywriter.py` (templates de cadência) e
devem ser seguidos por Iago nas calls (não foram automatizados, são scripts
de apoio humano).

# packages/agents

Lógica de negócio dos agentes descritos na seção 6 do prompt-mestre:
Qualificação (score), Compliance e Copywriter.

**Nota de stack:** o documento original pede TypeScript. Esta sessão de
execução não teve acesso a registradores de pacotes (npm/PyPI/apt bloqueados
na sandbox), então esta camada foi implementada em Python 3 (stdlib +
Flask/openpyxl/pandas, que já vêm instalados). São módulos puros, sem
dependências externas de execução, fáceis de portar para TypeScript depois
(`score.ts`, `compliance.ts`, `copywriter.ts`) — a lógica e os testes servem
como especificação executável para essa portagem.

- `score.py` — motor de lead score (0–100), seção 6.3.
- `compliance.py` — blocklist, opt-out, horário comercial, deduplicação, dado
  sensível, seção 6.7 / 14.
- `copywriter.py` — geração de mensagem personalizada por empresa, seção
  6.4 / 8 / 9.

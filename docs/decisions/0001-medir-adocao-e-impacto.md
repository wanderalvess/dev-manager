# 0001 — Medir adoção e impacto do Hub Manager (Dev e QA)

- **Data:** 2026-10-17
- **Status:** Aceita. Implementação planejada no épico [#11](https://github.com/wanderalvess/dev-manager/issues/11).
- **Decisores:** mantenedor

## Contexto

O Hub Manager nasceu em 02/09/2026 e foi construído em dupla com agentes de IA. Em 16/10/2026 o projeto tinha:

- 304 commits, 7 em cada 10 com coautoria do Claude;
- 54 versões publicadas, da 1.0.0 à 1.37.0;
- 157 tools MCP, que viraram 158 com a `usage_get_summary` desta decisão.

Os módulos de QA estão em construção, então o app vai passar a ser usado por Devs e QAs. Hoje não existe nenhuma medição de uso. Sem dados não dá para:

- mostrar impacto: quantas pessoas usam e quantas horas economizam;
- priorizar o que evoluir;
- recuperar o "antes", ou seja, quanto tempo cada tarefa levava no manual. Esse dado se perde se não for registrado enquanto as pessoas ainda lembram.

Também pesou um motivo de reconhecimento. Avaliamos inscrever o Hub Manager no programa **Gente que Faz 2026**, no valor **IH + IA**. Com 6 semanas de vida e um único usuário, o campo de resultados ficaria fraco. A decisão foi deixar para a **edição de 2027**, com um ano de dados reais. Os detalhes estão na seção [Lembrete](#lembrete-gente-que-faz-2027).

## Decisão

1. **Métricas locais** ([#12](https://github.com/wanderalvess/dev-manager/issues/12)):
   - contadores por módulo, ação e tool MCP, mais as durações;
   - só números, sem conteúdo;
   - ID aleatório por instalação, gravado em arquivo porque o MCP roda em outro processo.
2. **Linha de base e tempo economizado** ([#13](https://github.com/wanderalvess/dev-manager/issues/13)):
   - cada automação tem um tempo manual de referência;
   - economia = execuções com sucesso × (tempo manual − duração real), nunca negativa.
3. **Envio por dois caminhos com o mesmo JSON** ([#14](https://github.com/wanderalvess/dev-manager/issues/14)):
   - **API do Portal Tech V&D:** `POST /api/v1/hub-usage` com `X-Api-Key` de escopo `HUB_USAGE_WRITE`, uma vez por dia, com fila e reenvio;
   - **JSON compartilhado:** exportação manual ou pasta de rede, importado no Portal por um admin.

   Os dois existem porque o Portal está sendo transferido para a infraestrutura da TOTVS e ainda não se sabe se ficará acessível só pela VPN.
4. **Leitura centralizada no Portal Tech:**
   - backend em [agile-space-backend#3](https://github.com/wanderalvess/agile-space-backend/issues/3);
   - página só para admin em [agile-space-frontend#2](https://github.com/wanderalvess/agile-space-frontend/issues/2).
5. **Adoção:**
   - onboarding por papel, Dev ou QA ([#15](https://github.com/wanderalvess/dev-manager/issues/15));
   - feedback e depoimentos com autorização ([#16](https://github.com/wanderalvess/dev-manager/issues/16));
   - preset da Lynn no Assistente IA ([#17](https://github.com/wanderalvess/dev-manager/issues/17)), bloqueado até haver contrato da API.

## Regras que valem para toda a implementação

- **Nunca gravar nem enviar conteúdo.** Ficam de fora SQL, caminhos, schemas, prompts, respostas da IA e credenciais. Só contadores e durações.
- **Envio só depois de configurado** pelo usuário. Ele sempre pode ver o JSON antes e desligar.
- **Nada de URL interna nem chave no código,** porque o repositório é público. A chave do release vem de segredo do CI ou de Configurações.
- **O formato do JSON é contrato com o Portal.** Mudou o formato, sobe o `schemaVersion` e atualiza o backend junto.

## Onde pegar as métricas

| Pergunta | Onde |
|----------|------|
| Quantas pessoas usam por semana, Dev contra QA | Portal Tech, página do Hub Manager (admin) |
| Horas economizadas (equipe) | Portal Tech, mesma página, com exportação CSV |
| Horas economizadas (uma pessoa) | No app, tela "Meu impacto" |
| Dados brutos | `GET /api/hub-usage/summary` no Portal, ou os arquivos `hub-usage-*.json` |
| Depoimentos | Feedbacks com autorização de uso como depoimento ([#16](https://github.com/wanderalvess/dev-manager/issues/16)) |
| Desenvolvimento com IA | Comandos abaixo, rodados na raiz do repositório |

```bash
git log --oneline | wc -l                                                                   # total de commits
git log --format='%B%x00' | tr '\n' ' ' | tr '\0' '\n' | grep -ciE "co-authored-by: claude"   # commits com coautoria de IA
git log --reverse --format='%ad' --date=short | head -1                                     # primeiro commit
grep -c "^## \[" CHANGELOG.md                                                               # versões no changelog
grep -rhoPzo "registerTool\(\s*'[a-z0-9_]+'" src/mcp | tr '\0' '\n' | grep -c registerTool      # tools MCP (inclui src/mcp/tools)
```

## Lembrete: Gente que Faz 2027

- **Valor:** IH + IA (Inteligência Humana mais Inteligência Artificial).
- **Período:** em 2026 as inscrições foram de 28/09 a 16/10, com votação aberta em novembro. A partir de setembro de 2027, acompanhar o TDW e o RH Corporativo (Programas de Gente > Gente que Faz).
- **Formulário:**
  - título sem símbolos: escrever "mais" e "e" por extenso no lugar de "+" e "&";
  - três campos de 400 a 800 caracteres cada: situação, ir além e resultados com números.
- **Coworkers:** são 3 colegas que viram o resultado, e 2 precisam validar. Escolher entre os Devs e QAs que usam o Hub Manager e conferir que estarão disponíveis na semana de validação.
- **Um projeto por valor.** O regulamento recusa a mesma história inscrita em valores diferentes. Em 2026 o Portal Tech foi preparado para o valor Inovar Juntos; o Hub Manager fica para IH + IA.
- **Linha do texto:**
  - **problema:** preparar o ambiente WinThor na mão todos os dias;
  - **IA dos dois lados:** a IA construiu a ferramenta e hoje a opera pelo MCP, com classificação de risco, modo somente leitura, bloqueio de SQL de escrita em produção e RAG local;
  - **resultados:** pessoas usando, horas economizadas e depoimentos, tirados do Portal.

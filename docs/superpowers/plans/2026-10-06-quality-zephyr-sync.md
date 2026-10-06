# Sincronização da Matriz de Homologação com Zephyr Scale Server

Status: **plano, aguardando respostas das perguntas abertas** (seção final). Nada implementado.

## Objetivo
Importar casos de teste do Zephyr Scale Server para a Matriz (página Homologação) e enviar de volta os
resultados (Aprovado / Falha / Bloqueado / Em Teste), por ação explícita do usuário.

Hoje as fontes em Configurações → Qualidade (`QualitySourceConfig`) só são cadastradas; o "teste de conexão"
valida campos localmente (`SettingsPage.tsx`, `handleTestQualityConnection`) e a UI avisa "sem sincronização".

## Arquitetura
Segue o padrão de `TautAutomationService` / `DocSource`: o main process fala com a fonte, o renderer usa IPC.

- `src/main/services/quality/QualitySyncService.ts`: orquestra conexão, importação e envio.
- `src/main/services/quality/QualitySourceAdapter.ts`: interface comum
  (`testConnection`, `listTestCases`, `publishResults`).
- `src/main/services/quality/ZephyrScaleServerAdapter.ts`: primeira implementação.
  Jira, Zephyr Squad e Azure Test Plans entram depois como novos adapters.
- IPC + preload + (opcional) tool MCP seguindo `docs/MCP_TOOLS.md`.
- Autenticação: `Authorization: Bearer <PAT>`; token já criptografado em repouso pelo `ConfigService`.
- Timeouts: 15s conexão / 45s leitura (padrão do `JiraService` do agile-space-backend).
- SSL autoassinado: opção **por fonte**, desligada por padrão (`allowInsecureTls`), nunca trust-all fixo.
  Exige novo campo em `QualitySourceConfig` e o tratamento em `ConfigService` (sanitize/merge).

Endpoints previstos (**a confirmar na instância real**, API `atm/1.0`):

| Uso | Chamada |
|---|---|
| Validar token | `GET /rest/api/2/myself` |
| Buscar casos | `GET /rest/atm/1.0/testcase/search?query=projectKey = "X"` (+ paginação) |
| Criar execução | `POST /rest/atm/1.0/testrun` |
| Publicar resultados | `POST /rest/atm/1.0/testrun/{key}/testresults` |

## Fases

### Fase 1: conexão real (leitura)
- `testConnection` faz chamada autenticada e valida token, URL e `projectKey`.
- Mensagens de erro distintas: 401 (token), 403 (permissão), 404 (projeto/URL), TLS, timeout.
- Substitui a validação local do `handleTestQualityConnection`; remove o texto "validação apenas local".
- Testes: adapter com `fetch`/HTTP mockado, um por categoria de erro.

### Fase 2: importar casos (leitura)
- Mapeia caso Zephyr para `QualityValidationItem`: `id` estável `zephyr-<KEY>`, título, alvo, categoria padrão
  (configurável), chave do caso nas notas.
- Reimportar faz upsert por chave e **não sobrescreve** status nem notas editadas localmente.
- Prévia antes de aplicar: novos / atualizados / ignorados.
- Filtros: `testPlanKey` e `jqlFilter` já existentes em `QualitySourceConfig`.
- UI: botão "Sincronizar" na Homologação; remover os avisos "sem sincronização" quando houver adapter.
- Testes: função pura de merge (upsert sem perder dados locais), mapeamento, paginação.

### Fase 3: enviar resultados (escrita em sistema externo)
- Só por clique explícito; nunca automático após um runner.
- Tela de confirmação listando ciclo de destino e cada resultado a publicar.
- "Pendente" não é enviado. Mapeamento: `passed`→Pass, `failed`→Fail, `blocked`→Blocked,
  `in_progress`→In Progress.
- Falha parcial: reporta quais itens foram e quais não; não reenvia os já publicados.
- Histórico local de envios (data, ciclo, quantidade) para auditoria.
- Validar primeiro em ambiente de teste do Jira antes de apontar para produção.

### Fase 4: acabamento
- `CHANGELOG.md`, `AGENTS.md` e Central de Ajuda atualizados.
- Tool MCP `quality_sync_*` somente se fizer sentido (escrita exige confirmação humana).

## Riscos
- Contrato da API pode diferir por versão do Zephyr Scale Server/DC: validar antes da Fase 2.
- Escrita externa é difícil de desfazer: confirmação obrigatória e ambiente de teste primeiro.
- Token: nunca logar nem retornar em IPC/MCP (usar `hasApiToken`, como hoje).
- Rate limit / Jira lento: paginação com limite e feedback de progresso.

## Perguntas abertas (aguardando respostas)
1. Versão do Jira, versão do Zephyr Scale e URL base da instância.
2. Existe Jira de teste/homologação para validar a Fase 3 antes de produção?
3. Vocês usam ciclos de teste (test cycles) ou só planos? Define o destino do envio.
4. Categoria padrão dos casos importados (`routine`, `service`, `api`, `e2e`) ou mapear por pasta/label?
5. PAT de teste: cadastrar pela tela de Configurações (nunca no chat).

## Decisões já tomadas
- Fonte inicial: Zephyr Scale Server.
- Direção: importar **e** enviar resultados.

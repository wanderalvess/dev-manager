# Database Studio: evolução (Oracle em primeiro lugar)

Decisões: editor **Monaco**; prioridade **Oracle** (WinThor); ordem: bugs, transações, editor, spec da tabela, resultados.

Referências: SQL Developer (Worksheet: `Ctrl+Espaço`, F11 commit, F12 rollback, `DESCRIBE`, arrastar tabela para o editor)
e DBeaver (modo de transação auto/manual, padrão manual em conexões de produção).

## Status (2026-10-06)

| Fase | Estado |
|---|---|
| 0 Bugs | feito (B1-B5); B6 resolvido na Fase 4 (aplicar valida `rowsAffected`); B7 pendente (`listTables` engole erros) |
| 1 Transações | feito: sessão por conexão, auto/manual, commit/rollback, cancelar, modo produção |
| 2 Monaco | feito: autocomplete por contexto, Ctrl+Enter (seleção/comando), F5 (script), F11/F12 |
| 3 Spec da tabela | feito: painel, DDL, árvore de objetos por tipo, F4 |
| 4 Resultados | feito: exportar xlsx/csv-br/csv/json, carregar mais, edição em lote, plano em árvore (Oracle/PostgreSQL). Virtualização já existia. Pendente: ROWID para tabelas sem PK |
| 5 Opcional | não iniciada |

**Validação:** drivers simulados e interface com API simulada, mais o roteiro real abaixo.

### Validação real (2026-10-07)
Roteiro: `databaseReal.oracle.integration.test.ts` (opt-in por `DM_IT_ORACLE_*`; só cria objetos `DM_VALIDATION_*`).
Ambiente: Oracle Free 23ai (`gvenzl/oracle-free:23-slim`, Docker local), driver Thin, usuário de aplicação sem DBA.

| Item | Oracle 23ai | PostgreSQL | MySQL |
|---|---|---|---|
| a SELECT / `truncated` | ok | pendente | pendente |
| b modo manual, rollback, commit, DDL zera pendentes | ok | pendente | pendente |
| c cancelar | ok para SELECT pesado (1,5 s); ver nota | pendente | pendente |
| d `BEGIN ... END;` e `CREATE PROCEDURE` | ok | n/a | n/a |
| e SAVEPOINT por comando | n/a | pendente | n/a |
| f descrever tabela e DDL (PK/FK/índice/trigger, DBMS_METADATA no próprio schema) | ok | pendente | pendente |
| g plano em árvore vs texto cru | ok | pendente | n/a |
| h edição em lote em auto-commit e manual | ok | pendente | pendente |
| i duas sessões independentes | ok (mesmo banco) | pendente | pendente |

Correções: `executeInSession` devolvia `session.running = true` mesmo após terminar (estado montado antes do `finally`).

Notas:
- Cancelar PL/SQL em `DBMS_SESSION.SLEEP`: o `break()` do Thin retorna na hora, mas o servidor só devolve ORA-01013 quando o sleep termina. Observado atrás do NAT do Docker Desktop; provável perda do break fora de banda. Não confirmado em rede sem NAT. O teste c2 exige apenas que o erro chegue e a sessão siga utilizável.
- Não validado: Oracle 11g/12c (exige Thick + Instant Client), DBMS_METADATA sem permissão no schema de outro usuário, PostgreSQL < 11 e MySQL 5.7.

## Fase 0: bugs (antes de qualquer feature)
| # | Problema | Correção |
|---|---|---|
| B1 | `;` final removido: `BEGIN ... END;` vira `END` (ORA-06550) | `normalizeSqlForExecution`: mantém `;` em blocos PL/SQL (`BEGIN`, `DECLARE`, `CREATE PROCEDURE/FUNCTION/PACKAGE/TRIGGER/TYPE`) e remove o `/` terminador |
| B2 | PG/MySQL sem LIMIT/timeout: tabela grande vai inteira para a memória do main | `applyRowLimit` (`LIMIT n+1`), `statement_timeout`/`timeout` de 60s |
| B3 | Sem aviso de truncamento (Oracle nunca passa de `maxRows`) | busca `maxRows+1`, devolve `truncated` e a UI avisa |
| B4 | Timer de ociosidade (30s) fecha a conexão no meio de query longa | contador de execuções ativas; o timer só arma quando zera |
| B5 | Chave do cache ignora senha, modo SID/Service, Thick e SSL | chave inclui esses campos (senha só como hash) |
| B6 | Grid: UPDATE/DELETE sem conferir `rowsAffected` | tratar junto com transações (Fase 1) e edição em lote (Fase 4): depois do auto-commit já é tarde |
| B7 | `listTables` engole erros e devolve `[]` | tratar na Fase 3 (árvore de objetos com erro explícito) |

## Fase 1: transações
- Sessão **dedicada por aba** (hoje: uma conexão compartilhada por UI, MCP, tracer, backup e QA).
- Modo **Auto-commit / Manual** por aba; padrão manual para conexão marcada como produção.
- **Commit (F11)** e **Rollback (F12)**, contador de alterações pendentes, aviso ao fechar aba ou conexão com transação aberta.
- Confirmação para `UPDATE`/`DELETE` sem `WHERE` e para DDL.
- **Cancelar query**: `conn.break()` (Oracle), `pg_cancel_backend` (PG), `KILL QUERY` (MySQL).
- Canais IPC/REST/MCP novos (`db:begin`, `db:commit`, `db:rollback`, `db:cancel`); o MCP continua em auto-commit.

## Fase 2: editor Monaco
- Substituir o `<textarea>` (`SqlEditorSurface.tsx`) por Monaco, com tema do app e destaque de SQL/PL/SQL.
- Autocomplete com colunas enquanto digita: popup no cursor, `alias.coluna`, `schema.tabela`, contexto de `JOIN`,
  funções Oracle, palavras-chave, `Ctrl+Espaço`.
- Executar seleção (`Ctrl+Enter`), executar tudo (`F5`), dividir por `;` e `/` (PL/SQL).
- Abas de query persistidas por conexão; `Ctrl+Shift+F` formatar; `Ctrl+/` comentar; snippets com placeholders.
- Monaco empacotado localmente (sem CDN), carregamento preguiçoso, workers via Vite.

## Fase 3: spec da tabela e navegação
- Painel "Descrever tabela": Colunas, Constraints (PK/FK/UK/Check), Índices, Triggers, DDL (`DBMS_METADATA`), Dados.
- Árvore de objetos: tabelas, views, procedures, functions, packages, sequences, sinônimos, com erro explícito.
- Arrastar tabela para o editor gerando `SELECT`/`INSERT`/`UPDATE`; navegar por FK.
- `owner.tabela` (hoje só o schema do usuário).

## Fase 4: resultados
- Paginação / "carregar mais", virtualização, exportar Excel e JSON, CSV para Excel BR (BOM e `;`).
- Edição do grid em lote (Aplicar/Descartar) integrada à transação manual; uso de ROWID no Oracle.
- Plano de execução em árvore com custo destacado.

## Fase 5: opcional
Histórico persistente com data, favoritos, ER diagram, comparar schema, importar CSV, SSH tunnel.

## Riscos
- Fase 1 muda a arquitetura da conexão: manter compatibilidade com QA/TAUT/backup/tracer, que usam a conexão compartilhada.
- Monaco aumenta o bundle: carregar só na página Database.
- DDL no Oracle faz commit implícito: o modo manual não protege DDL (avisar na UI).

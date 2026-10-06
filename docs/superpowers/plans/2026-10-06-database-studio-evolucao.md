# Database Studio: evolução (Oracle em primeiro lugar)

Decisões: editor **Monaco**; prioridade **Oracle** (WinThor); ordem: bugs, transações, editor, spec da tabela, resultados.

Referências: SQL Developer (Worksheet: `Ctrl+Espaço`, F11 commit, F12 rollback, `DESCRIBE`, arrastar tabela para o editor)
e DBeaver (modo de transação auto/manual, padrão manual em conexões de produção).

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

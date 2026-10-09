import { describe, expect, it } from 'vitest';
import { annotationsFor, classifyTool, getMcpMode, isToolAllowed } from './toolSafety';

describe('classifyTool', () => {
  it('marca como destrutivas as tools que apagam, executam comando livre ou mudam configuração', () => {
    for (const name of [
      'db_execute_query',
      'db_restore_backup',
      'db_run_backup',
      'settings_save',
      'profile_run',
      'env_launch_app',
      'karaf_exec_command',
      'docker_remove_container',
      'logs_clear_file',
      'env_batch_kill_processes'
    ]) {
      expect(classifyTool(name), name).toBe('destructive');
    }
  });

  it('marca como leitura as consultas', () => {
    for (const name of [
      'system_get_info',
      'db_list_tables',
      'db_get_table_columns',
      'db_test_connection',
      'db_explain_plan',
      'karaf_list_bundles',
      'git_get_diff',
      'logs_read_last_lines',
      'apm_get_traces',
      'rag_search_docs',
      'settings_get',
      'taut_list_specs'
    ]) {
      expect(classifyTool(name), name).toBe('read');
    }
  });

  it('trata como escrita (não leitura) o que muda estado sem ser destrutivo', () => {
    for (const name of ['karaf_deploy', 'docker_start_container', 'git_checkout_branch', 'rag_reindex_docs', 'backup_test_webhook', 'qa_fetch_api_payload', 'test_runner_execute']) {
      expect(classifyTool(name), name).toBe('write');
    }
  });
});

describe('annotationsFor', () => {
  it('sempre informa destructiveHint explícito (o padrão do protocolo é true)', () => {
    expect(annotationsFor('system_get_info')).toEqual({ readOnlyHint: true, destructiveHint: false });
    expect(annotationsFor('karaf_deploy')).toEqual({ readOnlyHint: false, destructiveHint: false });
    expect(annotationsFor('db_execute_query')).toEqual({ readOnlyHint: false, destructiveHint: true });
  });
});

describe('modo somente leitura', () => {
  it('só HUB_MCP_MODE=readonly ativa o modo; qualquer outro valor mantém tudo liberado', () => {
    expect(getMcpMode({ HUB_MCP_MODE: 'readonly' })).toBe('readonly');
    expect(getMcpMode({ HUB_MCP_MODE: ' ReadOnly ' })).toBe('readonly');
    expect(getMcpMode({})).toBe('full');
    expect(getMcpMode({ HUB_MCP_MODE: 'full' })).toBe('full');
  });

  it('no modo readonly só as tools de leitura são registradas', () => {
    expect(isToolAllowed('db_list_tables', 'readonly')).toBe(true);
    expect(isToolAllowed('db_execute_query', 'readonly')).toBe(false);
    expect(isToolAllowed('karaf_deploy', 'readonly')).toBe(false);
    expect(isToolAllowed('db_execute_query', 'full')).toBe(true);
  });
});

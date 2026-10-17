import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { MCP_PREFIX_TO_MODULE, TRACKED_USAGE_ACTIONS, USAGE_MODULE_LABELS } from '../shared/usageActions';
import { mcpUsageInfo } from './usageTracking';

describe('mcpUsageInfo', () => {
  it('módulo é o do prefixo e a ação é o nome da tool', () => {
    expect(mcpUsageInfo('karaf_list_bundles')).toEqual({ module: 'karaf', action: 'karaf_list_bundles', risk: 'read' });
  });

  it('prefixos viram o mesmo módulo da interface, para o uso somar', () => {
    expect(mcpUsageInfo('db_run_backup')?.module).toBe('database');
    expect(mcpUsageInfo('env_reset_environment')?.module).toBe('environment');
    expect(mcpUsageInfo('routine801_get_updates')?.module).toBe('routines');
    expect(mcpUsageInfo('taut_run_tests')?.module).toBe('qa');
    expect(mcpUsageInfo('llm_chat')?.module).toBe('assistant');
  });

  it('prefixo desconhecido vira o próprio prefixo', () => {
    expect(mcpUsageInfo('novidade_fazer_algo')?.module).toBe('novidade');
  });

  it('todo módulo da lista de ações e do mapa de prefixos tem rótulo de exibição', () => {
    const modules = new Set([
      ...Object.values(MCP_PREFIX_TO_MODULE),
      ...TRACKED_USAGE_ACTIONS.map((a) => a.module)
    ]);
    expect([...modules].filter((m) => !(m in USAGE_MODULE_LABELS))).toEqual([]);
  });

  it('traz o risco de toolSafety', () => {
    expect(mcpUsageInfo('env_reset_environment')?.risk).toBe('destructive');
    expect(mcpUsageInfo('db_run_backup')?.risk).toBe('destructive'); // aceita comando de backup livre
    expect(mcpUsageInfo('git_create_task_branch')?.risk).toBe('write');
  });

  it('não conta as tools de consulta às próprias métricas', () => {
    expect(mcpUsageInfo('usage_get_summary')).toBeNull();
  });

  it('descarta nome fora do padrão', () => {
    expect(mcpUsageInfo('Tool Com Espaço')).toBeNull();
    expect(mcpUsageInfo('')).toBeNull();
    expect(mcpUsageInfo('a'.repeat(60))).toBeNull();
  });

  it('todas as tools registradas no código viram métrica (nenhum nome é descartado em silêncio)', () => {
    const files = ['index.ts', path.join('tools', 'httpClientTools.ts')].map((f) =>
      fs.readFileSync(path.join(__dirname, f), 'utf-8')
    );
    const names = files.flatMap((src) => Array.from(src.matchAll(/registerTool\(\s*'([a-z0-9_]+)'/g), (m) => m[1]));
    expect(names.length).toBeGreaterThan(150);
    const ignored = names.filter((n) => !n.startsWith('usage_') && mcpUsageInfo(n) === null);
    expect(ignored).toEqual([]);
  });
});

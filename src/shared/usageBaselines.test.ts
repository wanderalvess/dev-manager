import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import {
  MAX_BASELINE_MINUTES,
  MCP_TOOL_TO_BASELINE_KEY,
  USAGE_BASELINE_DEFINITIONS,
  baselineKeyFor,
  normalizeBaselineMinutes,
  resolveBaseline,
  sanitizeBaselineOverrides
} from './usageBaselines';
import { TRACKED_USAGE_ACTIONS, USAGE_MODULE_LABELS } from './usageActions';

describe('definições da linha de base', () => {
  it('chaves únicas, rótulos preenchidos e padrões positivos', () => {
    const keys = USAGE_BASELINE_DEFINITIONS.map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const d of USAGE_BASELINE_DEFINITIONS) {
      expect(d.label.length).toBeGreaterThan(3);
      expect(d.defaultMinutes).toBeGreaterThan(0);
      expect(d.defaultMinutes).toBeLessThanOrEqual(MAX_BASELINE_MINUTES);
      expect(d.key).toBe(`${d.module}/${d.key.split('/')[1]}`);
      expect(d.module in USAGE_MODULE_LABELS).toBe(true);
    }
  });

  it('toda linha de base corresponde a uma ação rastreada de verdade (sem deriva)', () => {
    const tracked = new Set(TRACKED_USAGE_ACTIONS.map((a) => `${a.module}/${a.action}`));
    expect(USAGE_BASELINE_DEFINITIONS.map((d) => d.key).filter((k) => !tracked.has(k))).toEqual([]);
  });

  it('o mapa de tools MCP aponta só para linhas de base existentes', () => {
    const keys = new Set(USAGE_BASELINE_DEFINITIONS.map((d) => d.key));
    expect(Object.values(MCP_TOOL_TO_BASELINE_KEY).filter((k) => !keys.has(k))).toEqual([]);
  });

  it('as tools do mapa existem de fato no servidor MCP (nome digitado errado não passa)', () => {
    const mcpDir = path.resolve(__dirname, '../mcp');
    const toolFiles = fs.readdirSync(path.join(mcpDir, 'tools')).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));
    const sources = [path.join(mcpDir, 'index.ts'), ...toolFiles.map((f) => path.join(mcpDir, 'tools', f))].map((f) =>
      fs.readFileSync(f, 'utf-8')
    );
    const registered = new Set(sources.flatMap((s) => Array.from(s.matchAll(/registerTool\(\s*'([a-z0-9_]+)'/g), (m) => m[1])));
    expect(Object.keys(MCP_TOOL_TO_BASELINE_KEY).filter((tool) => !registered.has(tool))).toEqual([]);
  });
});

describe('normalizeBaselineMinutes', () => {
  it('aceita de 0 a 24 h com uma casa decimal', () => {
    expect(normalizeBaselineMinutes(0)).toBe(0);
    expect(normalizeBaselineMinutes(12.34)).toBe(12.3);
    expect(normalizeBaselineMinutes(MAX_BASELINE_MINUTES)).toBe(MAX_BASELINE_MINUTES);
  });

  it.each([-1, MAX_BASELINE_MINUTES + 1, Number.NaN, Infinity, '10', null, undefined])('recusa %s', (value) => {
    expect(normalizeBaselineMinutes(value)).toBeNull();
  });
});

describe('sanitizeBaselineOverrides', () => {
  it('mantém o válido e descarta chave desconhecida, minutos inválidos e data malformada', () => {
    const result = sanitizeBaselineOverrides({
      'database/backup-run': { minutes: 25, setAt: '2026-10-16' },
      'qa/taut-run-tests': { minutes: 12 },
      'database/restore': { minutes: -3 },
      'git/create-task-branch': { minutes: 4, setAt: 'ontem' },
      'chave/inexistente': { minutes: 5 },
      'environment/reset': 'quinze'
    });
    expect(result).toEqual({
      'database/backup-run': { minutes: 25, setAt: '2026-10-16' },
      'qa/taut-run-tests': { minutes: 12 },
      'git/create-task-branch': { minutes: 4 }
    });
  });

  it('aceita zero (a pessoa pode zerar a linha de base)', () => {
    expect(sanitizeBaselineOverrides({ 'database/backup-run': { minutes: 0 } })).toEqual({
      'database/backup-run': { minutes: 0 }
    });
  });

  it('lixo vira objeto vazio', () => {
    expect(sanitizeBaselineOverrides(null)).toEqual({});
    expect(sanitizeBaselineOverrides('texto')).toEqual({});
    expect(sanitizeBaselineOverrides(42)).toEqual({});
  });
});

describe('baselineKeyFor', () => {
  it('interface e REST usam módulo/ação', () => {
    expect(baselineKeyFor('database', 'backup-run', 'ui')).toBe('database/backup-run');
    expect(baselineKeyFor('database', 'backup-run', 'rest')).toBe('database/backup-run');
  });

  it('tool MCP usa o mapa e cai na mesma chave da interface', () => {
    expect(baselineKeyFor('database', 'db_run_backup', 'mcp')).toBe('database/backup-run');
    expect(baselineKeyFor('environment', 'profile_run', 'mcp')).toBe('environment/pipeline-run');
  });

  it('ação sem equivalente manual não tem linha de base', () => {
    expect(baselineKeyFor('docs', 'search', 'ui')).toBeNull();
    expect(baselineKeyFor('assistant', 'chat', 'rest')).toBeNull();
    expect(baselineKeyFor('system', 'system_get_info', 'mcp')).toBeNull();
  });

  it('um nome de ação MCP não vale como ação da interface', () => {
    expect(baselineKeyFor('database', 'db_run_backup', 'ui')).toBeNull();
  });
});

describe('resolveBaseline', () => {
  it('sem sobrescrita usa o padrão', () => {
    const def = USAGE_BASELINE_DEFINITIONS.find((d) => d.key === 'database/backup-run')!;
    expect(resolveBaseline('database/backup-run', {})).toEqual({ minutes: def.defaultMinutes, source: 'default' });
  });

  it('com sobrescrita usa a da pessoa e a data', () => {
    expect(resolveBaseline('database/backup-run', { 'database/backup-run': { minutes: 40, setAt: '2026-10-16' } })).toEqual({
      minutes: 40,
      source: 'user',
      setAt: '2026-10-16'
    });
  });

  it('zero informado vale (não volta para o padrão)', () => {
    expect(resolveBaseline('database/backup-run', { 'database/backup-run': { minutes: 0 } })?.minutes).toBe(0);
  });

  it('chave sem definição devolve null', () => {
    expect(resolveBaseline('nada/existe', {})).toBeNull();
  });
});

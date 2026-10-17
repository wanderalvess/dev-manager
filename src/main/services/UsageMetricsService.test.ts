import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { UsageMetricsService, type UsageSettingsSource } from './UsageMetricsService';

let dir: string;
const NOW = new Date(2026, 9, 16, 12, 0, 0); // 2026-10-16 local

function makeSettings(enabled: boolean | undefined = undefined) {
  const state: { usageMetricsEnabled?: boolean; usageBaselines?: unknown } = { usageMetricsEnabled: enabled };
  const source: UsageSettingsSource = {
    getSettings: () => ({ usageMetricsEnabled: state.usageMetricsEnabled, usageBaselines: state.usageBaselines as never })
  };
  return { source, state };
}

function makeService(enabled?: boolean) {
  const { source } = makeSettings(enabled);
  return new UsageMetricsService(source, { dir, now: () => NOW, flushDelayMs: 60_000 });
}

const event = (partial: Record<string, unknown> = {}) => ({
  module: 'database',
  action: 'backup-run',
  origin: 'ui' as const,
  ok: true,
  durationMs: 1000,
  ...partial
});

const readFile = () => JSON.parse(fs.readFileSync(path.join(dir, 'usage-metrics.json'), 'utf-8'));

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'usage-metrics-'));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('UsageMetricsService', () => {
  it('grava os contadores do dia no arquivo', () => {
    const service = makeService();
    service.record(event());
    service.record(event({ ok: false, durationMs: 3000 }));
    expect(service.flush()).toBe(true);

    const file = readFile();
    expect(file.schemaVersion).toBe(1);
    expect(file.days['2026-10-16']['database/backup-run/ui']).toEqual({ runs: 2, ok: 1, failed: 1, totalMs: 4000, okMs: 1000 });
  });

  it('não grava nada enquanto não há uso', () => {
    const service = makeService();
    expect(service.flush()).toBe(true);
    expect(fs.existsSync(path.join(dir, 'usage-metrics.json'))).toBe(false);
  });

  it('mantém o mesmo ID de instalação entre instâncias e execuções', () => {
    const first = makeService();
    first.record(event());
    first.flush();
    const id = first.getInstallId();

    const second = makeService();
    second.record(event());
    second.flush();
    expect(second.getInstallId()).toBe(id);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('soma ao que já estava no disco', () => {
    const a = makeService();
    a.record(event());
    a.flush();
    const b = makeService();
    b.record(event({ origin: 'mcp' }));
    b.record(event());
    b.flush();

    const day = readFile().days['2026-10-16'];
    expect(day['database/backup-run/ui'].runs).toBe(2);
    expect(day['database/backup-run/mcp'].runs).toBe(1);
  });

  describe('ligado e desligado', () => {
    it('vem ligado por padrão', () => {
      expect(makeService(undefined).isEnabled()).toBe(true);
    });

    it('desligado não registra nem cria arquivo', () => {
      const service = makeService(false);
      service.record(event());
      expect(service.flush()).toBe(true);
      expect(fs.existsSync(path.join(dir, 'usage-metrics.json'))).toBe(false);
    });

    it('desligar descarta o que ainda não tinha ido para o disco', () => {
      const { source, state } = makeSettings();
      const service = new UsageMetricsService(source, { dir, now: () => NOW, flushDelayMs: 60_000 });
      service.record(event());
      state.usageMetricsEnabled = false; // mudou na tela de Configurações
      service.flush();
      expect(fs.existsSync(path.join(dir, 'usage-metrics.json'))).toBe(false);
    });

    it('a mudança vale na próxima ação, sem esperar cache', () => {
      const { source, state } = makeSettings(false);
      const service = new UsageMetricsService(source, { dir, now: () => NOW, flushDelayMs: 60_000 });
      service.record(event());
      state.usageMetricsEnabled = true;
      service.record(event());
      service.flush();
      expect(readFile().days['2026-10-16']['database/backup-run/ui'].runs).toBe(1);
    });

    it('config ilegível não desliga a contagem', () => {
      const service = new UsageMetricsService(
        {
          getSettings: () => {
            throw new Error('config corrompida');
          }
        },
        { dir, now: () => NOW, flushDelayMs: 60_000 }
      );
      expect(service.isEnabled()).toBe(true);
    });
  });

  describe('privacidade', () => {
    it('descarta evento com conteúdo e não deixa rastro no arquivo', () => {
      const service = makeService();
      service.record(event({ module: 'SELECT * FROM clientes' }));
      service.record(event({ action: 'C:\\Users\\fulano\\projeto' }));
      service.record(event({ action: 'fulano@empresa.com.br' }));
      service.record(event()); // um válido para o arquivo existir
      service.flush();

      const raw = fs.readFileSync(path.join(dir, 'usage-metrics.json'), 'utf-8');
      expect(raw).not.toMatch(/SELECT|clientes|Users|fulano|empresa/i);
      expect(Object.keys(readFile().days['2026-10-16'])).toEqual(['database/backup-run/ui']);
    });
  });

  describe('track', () => {
    it('registra sucesso', async () => {
      const service = makeService();
      const result = await service.track({ module: 'qa', action: 'taut-run-tests', origin: 'ui' }, async () => 'feito');
      expect(result).toBe('feito');
      service.flush();
      expect(readFile().days['2026-10-16']['qa/taut-run-tests/ui']).toMatchObject({ runs: 1, ok: 1, failed: 0 });
    });

    it('conta como falha o retorno { success: false }', async () => {
      const service = makeService();
      await service.track({ module: 'qa', action: 'taut-run-tests', origin: 'ui' }, () => ({ success: false }));
      service.flush();
      expect(readFile().days['2026-10-16']['qa/taut-run-tests/ui']).toMatchObject({ runs: 1, ok: 0, failed: 1 });
    });

    it('conta como falha e relança a exceção', async () => {
      const service = makeService();
      await expect(
        service.track({ module: 'qa', action: 'taut-run-tests', origin: 'ui' }, () => {
          throw new Error('quebrou');
        })
      ).rejects.toThrow('quebrou');
      service.flush();
      expect(readFile().days['2026-10-16']['qa/taut-run-tests/ui']).toMatchObject({ runs: 1, ok: 0, failed: 1 });
    });

    it('guarda o risco da tool MCP', async () => {
      const service = makeService();
      await service.track({ module: 'env', action: 'env_reset_environment', origin: 'mcp', risk: 'destructive' }, () => 1);
      service.flush();
      expect(readFile().days['2026-10-16']['env/env_reset_environment/mcp'].risk).toBe('destructive');
    });
  });

  describe('resumo e apagar', () => {
    it('getSummary inclui o que ainda estava pendente', () => {
      const service = makeService();
      service.record(event());
      const summary = service.getSummary();
      expect(summary.totalRuns).toBe(1);
      expect(summary.enabled).toBe(true);
      expect(summary.installId).toBe(service.getInstallId());
    });

    it('getSummary sem uso cria o ID e devolve zeros', () => {
      const summary = makeService().getSummary();
      expect(summary.totalRuns).toBe(0);
      expect(summary.installId).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('clear apaga o histórico e mantém o ID', () => {
      const service = makeService();
      service.record(event());
      service.flush();
      const id = service.getInstallId();
      service.record(event()); // pendente: também some
      service.clear();

      expect(service.getSummary().totalRuns).toBe(0);
      expect(service.getInstallId()).toBe(id);
    });
  });

  describe('dias e tempo economizado', () => {
    const backup = (durationMs: number, extra: Record<string, unknown> = {}) => event({ durationMs, ...extra });

    it('getDays inclui o que ainda estava pendente', () => {
      const service = makeService();
      service.record(event());
      expect(service.getDays()['2026-10-16']['database/backup-run/ui']).toMatchObject({ runs: 1, ok: 1, okMs: 1000 });
    });

    it('getImpact usa o tempo padrão enquanto a pessoa não informa o dela', () => {
      const service = makeService();
      service.record(backup(60_000));
      service.record(backup(60_000));
      const row = service.getImpact().rows.find((r) => r.key === 'database/backup-run')!;
      expect(row).toMatchObject({ source: 'default', baselineMinutes: 15, okRuns: 2 });
      expect(row.savedMs).toBe((2 * 15 - 2) * 60_000);
      expect(service.getImpact().total.confirmedMs).toBe(0);
    });

    it('getImpact usa a linha de base salva nas configurações, na hora', () => {
      const { source, state } = makeSettings();
      const service = new UsageMetricsService(source, { dir, now: () => NOW, flushDelayMs: 60_000 });
      service.record(backup(60_000));
      service.record(backup(60_000));

      state.usageBaselines = { 'database/backup-run': { minutes: 30, setAt: '2026-10-01' } };
      const impact = service.getImpact();
      expect(impact.rows.find((r) => r.key === 'database/backup-run')).toMatchObject({ source: 'user', setAt: '2026-10-01' });
      expect(impact.total.savedMs).toBe((2 * 30 - 2) * 60_000);
      expect(impact.total.confirmedMs).toBe(impact.total.savedMs);
    });

    it('configuração com lixo nas linhas de base é ignorada, sem quebrar', () => {
      const { source, state } = makeSettings();
      const service = new UsageMetricsService(source, { dir, now: () => NOW, flushDelayMs: 60_000 });
      service.record(backup(60_000));
      state.usageBaselines = 'isto não é um objeto';
      expect(service.getImpact().rows.find((r) => r.key === 'database/backup-run')?.source).toBe('default');
      state.usageBaselines = { 'database/backup-run': { minutes: 'muito' }, 'chave/falsa': { minutes: 5 } };
      expect(service.getImpact().rows.find((r) => r.key === 'database/backup-run')?.source).toBe('default');
    });

    it('config ilegível não impede o cálculo', () => {
      const service = new UsageMetricsService(
        {
          getSettings: () => {
            throw new Error('config corrompida');
          }
        },
        { dir, now: () => NOW, flushDelayMs: 60_000 }
      );
      service.record(backup(60_000));
      expect(service.getImpact().total.savedMs).toBeGreaterThan(0);
    });

    it('falha não gera economia, mesmo gravada no arquivo', () => {
      const service = makeService();
      service.record(backup(60_000, { ok: false }));
      service.flush();
      expect(new UsageMetricsService(makeSettings().source, { dir, now: () => NOW }).getImpact().total.savedMs).toBe(0);
    });
  });

  describe('arquivo e lock', () => {
    it('arquivo corrompido vira backup e um novo é criado', () => {
      fs.writeFileSync(path.join(dir, 'usage-metrics.json'), '{ isto não é json');
      const service = makeService();
      service.record(event());
      expect(service.flush()).toBe(true);

      expect(readFile().days['2026-10-16']['database/backup-run/ui'].runs).toBe(1);
      expect(fs.readdirSync(dir).some((f) => f.startsWith('usage-metrics.invalid-'))).toBe(true);
    });

    it('assume um lock abandonado', () => {
      const lock = path.join(dir, 'usage-metrics.lock');
      fs.writeFileSync(lock, '');
      const old = new Date(Date.now() - 60_000);
      fs.utimesSync(lock, old, old);

      const service = makeService();
      service.record(event());
      expect(service.flush()).toBe(true);
      expect(fs.existsSync(lock)).toBe(false);
    });

    it('com o lock ocupado mantém o pendente e grava depois', () => {
      const lock = path.join(dir, 'usage-metrics.lock');
      fs.writeFileSync(lock, '');

      const service = makeService();
      service.record(event());
      expect(service.flush()).toBe(false);
      expect(fs.existsSync(path.join(dir, 'usage-metrics.json'))).toBe(false);

      fs.unlinkSync(lock);
      expect(service.flush()).toBe(true);
      expect(readFile().days['2026-10-16']['database/backup-run/ui'].runs).toBe(1);
    }, 10_000);

    it('não deixa arquivos temporários nem lock para trás', () => {
      const service = makeService();
      service.record(event());
      service.flush();
      expect(fs.readdirSync(dir)).toEqual(['usage-metrics.json']);
    });
  });

  it('vários processos gravando ao mesmo tempo não perdem contagem', async () => {
    const PROCESSES = 4;
    const PER_PROCESS = 40;
    const script = path.join(dir, 'worker.mts');
    const servicePath = path.resolve(__dirname, 'UsageMetricsService.ts').replace(/\\/g, '/');
    fs.writeFileSync(
      script,
      `import { UsageMetricsService } from '${servicePath}';
const dir = process.argv[2];
const service = new UsageMetricsService(
  { getSettings: () => ({}) },
  { dir, now: () => new Date(2026, 9, 16, 12), flushDelayMs: 1 }
);
for (let i = 0; i < ${PER_PROCESS}; i++) {
  service.record({ module: 'database', action: 'backup-run', origin: 'mcp', ok: true, durationMs: 10 });
  service.flush(); // um flush por registro, para maximizar a disputa pelo lock
}
`
    );

    // `spawn` (assíncrono) lança todos juntos: com `spawnSync` rodariam em fila e não haveria disputa pelo lock.
    const run = () =>
      new Promise<number | null>((resolve, reject) => {
        const child = spawn(process.execPath, ['--import', 'tsx', script, dir], { stdio: 'pipe' });
        let stderr = '';
        child.stderr.on('data', (chunk) => (stderr += String(chunk)));
        child.on('error', reject);
        child.on('close', (code) => {
          if (code !== 0) console.error(stderr);
          resolve(code);
        });
      });

    const codes = await Promise.all(Array.from({ length: PROCESSES }, run));
    expect(codes).toEqual(Array(PROCESSES).fill(0));
    const counter = readFile().days['2026-10-16']['database/backup-run/mcp'];
    expect(counter.runs).toBe(PROCESSES * PER_PROCESS);
    expect(counter.totalMs).toBe(PROCESSES * PER_PROCESS * 10);
  }, 60_000);
});

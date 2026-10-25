import { describe, expect, it } from 'vitest';
import type { IntegrationLayerConfig, IntegrationReadinessResult } from '../../../shared/integrationTypes';
import { deriveLayerStatus, joinUrl, planLayerChecks, resolveEndpoint, summarizeReadiness } from './readinessPlan';

const layer = (overrides: Partial<IntegrationLayerConfig> = {}): IntegrationLayerConfig => ({ layer: 'ch', ...overrides });

describe('readinessPlan', () => {
  it('joinUrl junta base e caminho sem barras duplicadas ou faltando', () => {
    expect(joinUrl('http://localhost:9000/', '/health')).toBe('http://localhost:9000/health');
    expect(joinUrl('http://localhost:9000', 'health')).toBe('http://localhost:9000/health');
    expect(joinUrl('http://localhost:9000///', '')).toBe('http://localhost:9000');
  });

  it('camada sem nada preenchido não gera verificação', () => {
    expect(planLayerChecks(layer())).toEqual([]);
  });

  it('URL com health gera só a verificação HTTP, sem porta redundante', () => {
    const planned = planLayerChecks(layer({ baseUrl: 'http://localhost:9000', healthPath: '/actuator/health' }));
    expect(planned).toEqual([{ kind: 'health', label: 'Health HTTP', url: 'http://localhost:9000/actuator/health' }]);
  });

  it('URL sem health vira aviso e testa a porta derivada da própria URL', () => {
    const planned = planLayerChecks(layer({ baseUrl: 'http://localhost:9000' }));
    expect(planned).toEqual([
      { kind: 'static', label: 'Health HTTP', status: 'skipped', detail: expect.stringContaining('só a porta') },
      { kind: 'port', label: 'Porta 9000', host: '127.0.0.1', port: 9000 }
    ]);
  });

  it('porta explícita vence a da URL e entra mesmo com health', () => {
    const planned = planLayerChecks(layer({ baseUrl: 'https://hub.local', healthPath: '/h', port: 8443 }));
    expect(planned.map((c) => c.kind)).toEqual(['health', 'port']);
    expect(planned[1]).toMatchObject({ host: 'hub.local', port: 8443 });
  });

  it('resolveEndpoint usa 80/443 pelo protocolo e 127.0.0.1 no lugar de localhost', () => {
    expect(resolveEndpoint(layer(), 'https://hub.local')).toEqual({ host: 'hub.local', port: 443 });
    expect(resolveEndpoint(layer(), 'http://localhost')).toEqual({ host: '127.0.0.1', port: 80 });
    expect(resolveEndpoint(layer({ port: 5432 }), undefined)).toEqual({ host: '127.0.0.1', port: 5432 });
  });

  it('URL insegura ou inválida é falha e não gera requisição', () => {
    for (const baseUrl of ['ftp://x', 'localhost:9000', 'http://169.254.169.254/latest']) {
      const planned = planLayerChecks(layer({ baseUrl, healthPath: '/h' }));
      expect(planned).toEqual([{ kind: 'static', label: 'URL base', status: 'failed', detail: expect.any(String) }]);
    }
  });

  it('serviço, processo, conexão e log entram quando preenchidos', () => {
    const planned = planLayerChecks(
      layer({ layer: 'pdv', windowsServiceName: 'PdvSvc', processName: 'pdv.exe', dbConnectionId: 'pg-1', logFilePath: 'C:\\pdv\\pdv.log' })
    );
    expect(planned.map((c) => c.kind)).toEqual(['service', 'process', 'db', 'log']);
  });

  it('log fora do padrão (.log/.out/.txt) é falha, não leitura', () => {
    const planned = planLayerChecks(layer({ logFilePath: 'C:\\app\\config.json' }));
    expect(planned).toEqual([{ kind: 'static', label: 'Arquivo de log', status: 'failed', detail: expect.any(String) }]);
  });

  it('login WinThor só existe na camada winthor com credenciais; sem elas vira aviso', () => {
    const winthor = (auth: IntegrationLayerConfig['auth']) =>
      planLayerChecks({ layer: 'winthor', baseUrl: 'http://localhost:8181', healthPath: '/h', auth });

    expect(winthor({ type: 'winthor', user: 'admin', password: 'x' }).map((c) => c.kind)).toEqual(['health', 'winthor-login']);
    expect(winthor({ type: 'winthor', user: 'admin', password: 'x' })[1]).toMatchObject({
      url: 'http://localhost:8181/winthor/autenticacao/v1/login'
    });
    expect(winthor({ type: 'winthor', user: 'admin' })[1]).toMatchObject({ kind: 'static', status: 'skipped' });
    expect(winthor({ type: 'basic', user: 'a', password: 'b' }).map((c) => c.kind)).toEqual(['health']);
    expect(planLayerChecks(layer({ baseUrl: 'http://localhost:9', healthPath: '/h', auth: { type: 'winthor', user: 'a', password: 'b' } })).map((c) => c.kind)).toEqual(['health']);
  });

  it('deriveLayerStatus: vazio, falha, aviso e ok', () => {
    const check = (status: 'ok' | 'failed' | 'skipped') => ({ label: 'x', status });
    expect(deriveLayerStatus([])).toBe('not-configured');
    expect(deriveLayerStatus([check('ok'), check('skipped')])).toBe('warning');
    expect(deriveLayerStatus([check('ok'), check('skipped'), check('failed')])).toBe('failed');
    expect(deriveLayerStatus([check('ok')])).toBe('ok');
  });

  it('summarizeReadiness só fica pronto com alguma camada verificada e nenhuma falha', () => {
    const result = (...statuses: IntegrationReadinessResult['layers'][number]['status'][]): IntegrationReadinessResult => ({
      checkedAt: 1,
      layers: statuses.map((status, index) => ({ layer: (['winthor', 'wsh', 'ch', 'pdv'] as const)[index], status, checks: [] }))
    });

    expect(summarizeReadiness(result('ok', 'warning', 'not-configured', 'ok'))).toEqual({
      ready: true, configured: 3, ok: 2, warning: 1, failed: 0, notConfigured: 1
    });
    expect(summarizeReadiness(result('ok', 'failed', 'ok', 'ok')).ready).toBe(false);
    expect(summarizeReadiness(result('not-configured', 'not-configured', 'not-configured', 'not-configured')).ready).toBe(false);
  });
});

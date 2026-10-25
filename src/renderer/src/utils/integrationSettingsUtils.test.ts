import { describe, expect, it } from 'vitest';
import type { IntegrationFlowDefinition, IntegrationLayerConfig } from '../../../shared/integrationTypes';
import {
  countConfiguredLayers,
  createFlowDraft,
  ensureAllLayers,
  isHttpUrl,
  parsePortInput,
  patchLayer,
  removeFlowAt,
  updateFlowAt,
  validateFlow,
  validateLayer
} from './integrationSettingsUtils';

const makeFlow = (overrides: Partial<IntegrationFlowDefinition> = {}): IntegrationFlowDefinition => ({
  id: 'venda',
  name: 'Venda',
  chBatchType: 'VENDA',
  evidence: { pdvQuery: 'select 1', pdvWaitSeconds: 60 },
  ...overrides
});

describe('integrationSettingsUtils', () => {
  it('ensureAllLayers devolve as quatro camadas na ordem da cadeia, mantendo as salvas', () => {
    const saved: IntegrationLayerConfig[] = [{ layer: 'pdv', port: 5432 }, { layer: 'wsh', baseUrl: 'http://localhost:8080' }];
    const layers = ensureAllLayers(saved);

    expect(layers.map((l) => l.layer)).toEqual(['winthor', 'wsh', 'ch', 'pdv']);
    expect(layers[1]).toBe(saved[1]);
    expect(layers[3].port).toBe(5432);
    expect(ensureAllLayers(undefined)).toHaveLength(4);
  });

  it('patchLayer altera só a camada pedida e preenche as faltantes', () => {
    const layers = patchLayer(undefined, 'ch', { baseUrl: 'http://localhost:9000' });
    expect(layers).toHaveLength(4);
    expect(layers[2]).toEqual({ layer: 'ch', baseUrl: 'http://localhost:9000' });
    expect(layers[0]).toEqual({ layer: 'winthor' });
  });

  it('countConfiguredLayers conta as camadas com algum meio de acesso ou observação', () => {
    expect(countConfiguredLayers(undefined)).toBe(0);
    expect(countConfiguredLayers([{ layer: 'pdv', dbConnectionId: 'pg' }, { layer: 'ch', baseUrl: ' ' }, { layer: 'wsh', logFilePath: 'C:\\wsh.log' }])).toBe(2);
  });

  it('fluxos: criar, alterar e remover sem mutar a lista original', () => {
    const draft = createFlowDraft(123);
    expect(draft.id).toBe('flow-123');
    expect(validateFlow(draft)).toContain('Informe o tipo de lote no CH.');

    const flows = [draft];
    const updated = updateFlowAt(flows, 0, { name: 'Venda' });
    expect(updated[0].name).toBe('Venda');
    expect(flows[0].name).toBe('Novo fluxo');
    expect(updateFlowAt(flows, 5, { name: 'x' })).toEqual(flows);
    expect(removeFlowAt(flows, 0)).toEqual([]);
    expect(removeFlowAt(undefined, 0)).toEqual([]);
  });

  it('validateFlow aponta cada campo obrigatório e o caminho de disparo sem barra', () => {
    expect(validateFlow(makeFlow())).toEqual([]);
    const issues = validateFlow(makeFlow({ name: ' ', chBatchType: '', evidence: { pdvQuery: '', pdvWaitSeconds: 0 }, trigger: { method: 'GET', path: 'fluxos/venda' } }));
    expect(issues).toEqual([
      'Informe o nome do fluxo.',
      'Informe o tipo de lote no CH.',
      'Informe a consulta de evidência no PDV.',
      'A espera pela descida ao PDV precisa ser maior que zero.',
      'O caminho de disparo no WSH deve começar com "/".'
    ]);
  });

  it('validateLayer aceita campos vazios e rejeita URL, health e porta inválidos', () => {
    expect(validateLayer({ layer: 'ch' })).toEqual([]);
    expect(validateLayer({ layer: 'ch', baseUrl: 'http://localhost:9000', healthPath: '/health', port: 9000 })).toEqual([]);
    expect(validateLayer({ layer: 'ch', baseUrl: 'ftp://x', healthPath: 'health', port: 70000 })).toHaveLength(3);
  });

  it('isHttpUrl e parsePortInput', () => {
    expect(isHttpUrl('https://localhost')).toBe(true);
    expect(isHttpUrl('localhost:9000')).toBe(false);
    expect(isHttpUrl(undefined)).toBe(false);
    expect(parsePortInput('')).toBeUndefined();
    expect(parsePortInput('abc')).toBeUndefined();
    expect(parsePortInput(' 8080 ')).toBe(8080);
  });
});

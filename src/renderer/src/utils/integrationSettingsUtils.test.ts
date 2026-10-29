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
    // Um fluxo novo já é válido: tipo de lote e consulta do PDV são opcionais
    expect(validateFlow(draft)).toEqual([]);

    const flows = [draft];
    const updated = updateFlowAt(flows, 0, { name: 'Venda' });
    expect(updated[0].name).toBe('Venda');
    expect(flows[0].name).toBe('Novo fluxo');
    expect(updateFlowAt(flows, 5, { name: 'x' })).toEqual(flows);
    expect(removeFlowAt(flows, 0)).toEqual([]);
    expect(removeFlowAt(undefined, 0)).toEqual([]);
  });

  it('validateFlow exige só o nome; espera só conta com consulta do PDV; caminho de disparo sem barra é erro', () => {
    expect(validateFlow(makeFlow())).toEqual([]);
    expect(validateFlow(makeFlow({ chBatchType: '', evidence: { pdvQuery: '', pdvWaitSeconds: 0 } }))).toEqual([]);
    const issues = validateFlow(makeFlow({ name: ' ', evidence: { pdvQuery: 'select 1', pdvWaitSeconds: 0 }, trigger: { method: 'GET', path: 'fluxos/venda' } }));
    expect(issues).toEqual([
      'Informe o nome do fluxo.',
      'A espera pela descida ao PDV precisa ser maior que zero.',
      'O caminho de disparo no WSH deve começar com "/".'
    ]);
  });

  it('validateLayer aceita campos vazios e rejeita URL, health e porta inválidos', () => {
    expect(validateLayer({ layer: 'ch' })).toEqual([]);
    expect(validateLayer({ layer: 'ch', baseUrl: 'http://localhost:9000', healthPath: '/health', port: 9000 })).toEqual([]);
    expect(validateLayer({ layer: 'ch', baseUrl: 'ftp://x', healthPath: 'health', port: 70000 })).toHaveLength(3);
  });

  it('a camada CH configurada só com o login do PDVSync conta como configurada', () => {
    expect(countConfiguredLayers([{ layer: 'ch', auth: { type: 'rac-password' } }])).toBe(1);
    expect(countConfiguredLayers([{ layer: 'wsh', auth: { type: 'rac-password' } }])).toBe(0);
  });

  it('validateLayer confere os três endereços do PDVSync, nomeando qual está errado', () => {
    expect(validateLayer({ layer: 'ch', pdvsync: { racUrl: 'https://rac/x', batchStatusUrl: 'https://x/lote', storeStatusUrl: '' } })).toEqual([]);
    expect(validateLayer({ layer: 'ch', pdvsync: { racUrl: 'rac/x', batchStatusUrl: 'ftp://x', storeStatusUrl: 'localhost:9' } })).toEqual([
      'O endereço do login (RAC) precisa começar com http:// ou https://.',
      'O endereço de consulta do lote precisa começar com http:// ou https://.',
      'O endereço do status por loja precisa começar com http:// ou https://.'
    ]);
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

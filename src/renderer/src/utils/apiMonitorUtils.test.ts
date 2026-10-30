import { describe, expect, it } from 'vitest';
import type { HttpProbeResult } from '../../../shared/types';
import {
  API_MONITOR_HISTORY_SIZE,
  formatBytes,
  formatProbeBody,
  normalizeMonitorUrl,
  parseApiMonitorPrefs,
  parseHeaderLines,
  probeTone,
  pushProbeHistory,
  summarizeProbeHistory
} from './apiMonitorUtils';

const makeResult = (overrides: Partial<HttpProbeResult> = {}): HttpProbeResult => ({
  url: 'http://localhost:8080/health',
  method: 'GET',
  ok: true,
  status: 200,
  statusText: 'OK',
  durationMs: 100,
  sizeBytes: 10,
  contentType: 'application/json',
  headers: {},
  bodyPreview: '{"status":"UP"}',
  truncated: false,
  checkedAt: 0,
  ...overrides
});

describe('apiMonitorUtils', () => {
  it('lê cabeçalhos "Nome: valor" e aponta linhas inválidas', () => {
    const { headers, errors } = parseHeaderLines('Authorization: Bearer a:b\n\n# comentário\nsem-dois-pontos\nX-Id:  42 ');
    expect(headers).toEqual({ Authorization: 'Bearer a:b', 'X-Id': '42' });
    expect(errors).toEqual(['Linha 4: use o formato "Nome: valor".']);
  });

  it('completa o protocolo quando falta', () => {
    expect(normalizeMonitorUrl(' localhost:8181/api ')).toBe('http://localhost:8181/api');
    expect(normalizeMonitorUrl('https://x.dev')).toBe('https://x.dev');
    expect(normalizeMonitorUrl('')).toBe('');
  });

  it('classifica a cor do resultado', () => {
    expect(probeTone({ status: 204 })).toBe('success');
    expect(probeTone({ status: 302 })).toBe('warning');
    expect(probeTone({ status: 404 })).toBe('warning');
    expect(probeTone({ status: 503 })).toBe('danger');
    expect(probeTone({ status: 0, error: 'recusada' })).toBe('danger');
  });

  it('resume disponibilidade e latência do histórico', () => {
    const summary = summarizeProbeHistory([
      makeResult({ durationMs: 100 }),
      makeResult({ durationMs: 300, ok: false, status: 500 }),
      makeResult({ durationMs: 200 })
    ]);
    expect(summary).toEqual({ total: 3, okCount: 2, uptimePct: 67, avgMs: 200, maxMs: 300 });
    expect(summarizeProbeHistory([]).total).toBe(0);
  });

  it('mantém o histórico no tamanho máximo, mais novo primeiro', () => {
    let history: HttpProbeResult[] = [];
    for (let i = 0; i < API_MONITOR_HISTORY_SIZE + 5; i++) history = pushProbeHistory(history, makeResult({ checkedAt: i }));
    expect(history).toHaveLength(API_MONITOR_HISTORY_SIZE);
    expect(history[0].checkedAt).toBe(API_MONITOR_HISTORY_SIZE + 4);
  });

  it('indenta JSON e deixa texto ou JSON cortado como veio', () => {
    expect(formatProbeBody(makeResult())).toEqual({ text: '{\n  "status": "UP"\n}', isJson: true });
    expect(formatProbeBody(makeResult({ contentType: 'text/plain', bodyPreview: 'ok' }))).toEqual({ text: 'ok', isJson: false });
    expect(formatProbeBody(makeResult({ bodyPreview: '{"a":', truncated: true })).isJson).toBe(false);
  });

  it('restaura preferências salvas e ignora valores estranhos', () => {
    expect(parseApiMonitorPrefs('{"url":"http://a","method":"HEAD","intervalSeconds":30}')).toEqual({
      url: 'http://a',
      method: 'HEAD',
      intervalSeconds: 30
    });
    expect(parseApiMonitorPrefs('{"method":"DELETE","intervalSeconds":7}')).toEqual({ url: '', method: 'GET', intervalSeconds: 0 });
    expect(parseApiMonitorPrefs('não é json').url).toBe('');
  });

  it('formata tamanhos', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2,0 KB');
  });
});

import { describe, expect, it } from 'vitest';
import type { AuthLockoutCheckResult, AuthLockoutLogEntry } from './authLockoutTypes';
import { formatRunDuration } from './scenarioHistoryTypes';
import { activityToText, buildCurl, evidenceToText, headersToText, reportFileName, safeCurlHeaderValue, TOKEN_PLACEHOLDER } from './scenarioExports';

const at = (time: string) => new Date(`2026-10-30T${time}`).toISOString();

describe('scenarioExports', () => {
  it('passo a passo em texto: hora, mensagem e detalhe recuado; sem as requisições quando o filtro está desligado', () => {
    const entries: AuthLockoutLogEntry[] = [
      { at: at('10:42:01'), level: 'step', message: '▶ Limiar de bloqueio', detail: 'Erra a senha 4 vezes.' },
      { at: at('10:42:02'), level: 'attempt', message: 'POST /login → 401 ✔', asExpected: true },
      { at: at('10:42:03'), level: 'wait', message: 'Aguardando 2s' },
      { at: at('10:42:04'), level: 'result', message: '✔ Passou', status: 'passed' }
    ];
    expect(activityToText(entries)).toBe(
      ['10:42:01 ▶ Limiar de bloqueio', '    Erra a senha 4 vezes.', '10:42:02 POST /login → 401 ✔', '10:42:03 Aguardando 2s', '10:42:04 ✔ Passou'].join('\n')
    );
    expect(activityToText(entries, false)).toBe(['10:42:01 ▶ Limiar de bloqueio', '    Erra a senha 4 vezes.', '10:42:04 ✔ Passou'].join('\n'));
  });

  it('evidências de uma regra com status, como foi testado e a lista', () => {
    const check: AuthLockoutCheckResult = {
      id: 'threshold',
      title: 'Limiar de bloqueio',
      status: 'passed',
      summary: 'Bloqueou na 5ª falha.',
      plan: 'Erra a senha de TESTE_A.',
      evidence: ['falha 1 → 401', 'falha 5 → 423']
    };
    expect(evidenceToText(check)).toBe(
      ['Limiar de bloqueio — OK: Bloqueou na 5ª falha.', '', 'Como foi testado: Erra a senha de TESTE_A.', '', 'Evidências:', '- falha 1 → 401', '- falha 5 → 423'].join('\n')
    );
  });

  it('cURL nunca leva credencial: Authorization, Cookie e Proxy-Authorization viram marcador', () => {
    const secret = 'eyJhbGciOiJIUzI1NiJ9.eyJ1IjoiQSJ9.assinatura';
    const curl = buildCurl({
      method: 'POST',
      url: 'http://wta:81/winthor/x?a=1',
      headers: { Authorization: `Bearer ${secret}`, Cookie: `suukie=${secret}`, 'Proxy-Authorization': `Basic ${secret}`, 'X-Request-Id': 'abc' },
      body: '{"nome":"D\'Ávila"}'
    });
    expect(curl).not.toContain(secret);
    expect(curl).toContain(`-H 'Authorization: Bearer ${TOKEN_PLACEHOLDER}'`);
    expect(curl).toContain(`-H 'Cookie: suukie=${TOKEN_PLACEHOLDER}'`);
    expect(curl).toContain(`-H 'Proxy-Authorization: ${TOKEN_PLACEHOLDER}'`);
    expect(curl).toContain("-H 'X-Request-Id: abc'");
    // Aspas simples no corpo fecham, escapam e reabrem: o shell recebe o texto original
    expect(curl).toContain(`-d '{"nome":"D'\\''Ávila"}'`);
    expect(curl.split(' \\\n')[0]).toBe("curl -X POST 'http://wta:81/winthor/x?a=1'");
    expect(safeCurlHeaderValue('authorization', 'Bearer ***')).toBe(`Bearer ${TOKEN_PLACEHOLDER}`);
  });

  it('cabeçalhos em texto, um por linha', () => {
    expect(headersToText({ 'content-type': 'application/json', 'x-request-id': 'abc' })).toBe('content-type: application/json\nx-request-id: abc');
  });

  it('nome do .md sem acento, espaço nem caractere que o Windows recuse', () => {
    expect(reportFileName('Bloqueio de Login (wand, rod)', at('10:42:00'))).toMatch(/^bloqueio-de-login-wand-rod-2026-10-30-\d{4}\.md$/);
    expect(reportFileName('Exceção: <não mapeada>/*?', at('10:42:00'))).toMatch(/^excecao-nao-mapeada-2026-10-30-\d{4}\.md$/);
    expect(reportFileName('???', 'invalida')).toBe('cenario-sem-data.md');
  });
});

describe('formatRunDuration', () => {
  it('ms abaixo de um segundo, segundos acima', () => {
    expect(formatRunDuration(11)).toBe('11 ms');
    expect(formatRunDuration(12_400)).toBe('12.4s');
  });
});

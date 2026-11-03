import { describe, expect, it } from 'vitest';
import { buildPreflightScript, describePreflight, evaluatePreflight, expectedPorts, parsePreflightOutput } from './infrPreflight';

const OUT = [
  '@@docker',
  'wta-40|0.0.0.0:8040->8080/tcp, :::8040->8080/tcp, 0.0.0.0:8140->8101/tcp',
  'oracle-39|0.0.0.0:1539->1521/tcp',
  '@@ss',
  'LISTEN 0      4096       0.0.0.0:22     0.0.0.0:*',
  'LISTEN 0      4096          [::]:61640     [::]:*',
  '@@disk',
  '/dev/sdc 1056855000 400000000 604000000 40% /',
  '@@mem',
  'MemTotal:       16000000 kB',
  'MemAvailable:    9000000 kB',
  '@@nexus',
  '200 https://nexus.exemplo.com/repository/releases'
].join('\n');

describe('infrPreflight', () => {
  it('as portas da versão seguem a regra do INFR-Docker, e as da tela valem no lugar', () => {
    expect(expectedPorts('40').map((e) => e.port)).toEqual([1540, 8040, 8140, 1040, 61640, 9040]);
    expect(expectedPorts('40', { web: 8888 })[1].port).toBe(8888);
  });

  it('lê portas de docker (inclusive faixa) e da distro, disco e memória em GB, e o Nexus', () => {
    const s = parsePreflightOutput(OUT);
    expect(s.usedPorts).toEqual(
      expect.arrayContaining([
        { port: 8040, by: 'docker:wta-40' },
        { port: 8140, by: 'docker:wta-40' },
        { port: 1539, by: 'docker:oracle-39' },
        { port: 61640, by: 'wsl' }
      ])
    );
    expect(s.diskFreeGb).toBeCloseTo(576.0, 0);
    expect(s.memAvailableGb).toBeCloseTo(8.6, 1);
    expect(s.memTotalGb).toBeCloseTo(15.3, 1);
    expect(s.nexus).toEqual([{ code: '200', url: 'https://nexus.exemplo.com/repository/releases' }]);
  });

  it('porta de programa do Windows ou da distro bloqueia; só de container avisa', () => {
    const s = parsePreflightOutput(OUT);
    const porta = (v: string, win: number[] = []) => evaluatePreflight(v, s, win).find((i) => i.id === 'portas')!;
    expect(porta('40')).toMatchObject({ status: 'block' }); // 61640 está na distro
    expect(porta('41', [1541])).toMatchObject({ status: 'block', detail: expect.stringContaining('programa do Windows') });
    const soDocker = evaluatePreflight('39', { usedPorts: [{ port: 1539, by: 'docker:oracle-39' }] }, []).find((i) => i.id === 'portas')!;
    expect(soDocker.status).toBe('warn');
    expect(soDocker.detail).toContain('pode ignorar');
    expect(porta('42').status).toBe('ok');
  });

  it('pouco disco, pouca memória e Nexus fora do ar avisam; tudo bem aprova', () => {
    const base = { usedPorts: [], diskFreeGb: 8, memAvailableGb: 2, memTotalGb: 4, nexus: [{ code: '000', url: 'https://n' }] };
    const r = evaluatePreflight('41', base, []);
    expect(Object.fromEntries(r.map((i) => [i.id, i.status]))).toEqual({ portas: 'ok', disco: 'warn', memoria: 'warn', rede: 'warn' });
    const ok = evaluatePreflight('41', { ...base, diskFreeGb: 50, memAvailableGb: 12, nexus: [{ code: '200', url: 'https://n' }] }, []);
    expect(ok.every((i) => i.status === 'ok')).toBe(true);
    expect(evaluatePreflight('41', { ...base, nexus: [{ code: '401', url: 'https://n' }] }, []).find((i) => i.id === 'rede')!.detail).toContain('settings.xml');
  });

  it('sem dados de disco, memória ou rede, não inventa pontos', () => {
    expect(evaluatePreflight('41', { usedPorts: [] }, []).map((i) => i.id)).toEqual(['portas']);
  });

  it('o Nexus com credenciais na URL aparece mascarado na coleta', () => {
    const s = parsePreflightOutput('@@nexus' + String.fromCharCode(10) + '200 http://u:p@repo.exemplo.com/nexus');
    expect(s.nexus).toEqual([{ code: '200', url: 'http://***@repo.exemplo.com/nexus' }]);
  });

  it('o script só leva repositórios http válidos, e o registro resume o que foi coletado', () => {
    expect(buildPreflightScript(['https://n.com/r', "https://x'; reboot"])).not.toContain('reboot');
    expect(buildPreflightScript([])).not.toContain('curl');
    expect(describePreflight(parsePreflightOutput(OUT), [1541]).join('\n')).toContain('no Windows: 1541');
  });
});

import { describe, expect, it } from 'vitest';
import { infrCheckCommands, multilineCommand, parseEnvCheckOutput, summarizeEnvCheck, wtaHostPort, type InfrContainerCheck } from './infrEnvCheck';

const OUTPUT = `@@c oracle-suporte_38
running|healthy|0|2026-10-30T20:40:00Z|oracle-winthor:11.2.0.2-xe
@@ports
1521/tcp -> 0.0.0.0:1540
@@logs
DATABASE IS READY TO USE!
@@c wta-suporte_38
running||0|2026-10-30T20:41:00Z|linux-winthor:40-debian
@@ports
8080/tcp -> 0.0.0.0:8087
8080/tcp -> [::]:8087
@@logs
Karaf started
@@c wsh-suporte_38
restarting||4|2026-10-30T20:44:00Z|wsh:1.40
@@ports
@@logs
Validando dependências do WTA...
Versão exigida 1.40.2.1, instalada 1.40.0.1 (winthor-integracao-config)
`;

describe('verificação do ambiente', () => {
  it('lê estado, health, reinícios, portas e log de cada container', () => {
    const cs = parseEnvCheckOutput(OUTPUT, 'suporte_38');
    expect(cs.map((c) => [c.role, c.state, c.health, c.restarts])).toEqual([
      ['oracle', 'running', 'healthy', 0],
      ['wta', 'running', undefined, 0],
      ['wsh', 'restarting', undefined, 4]
    ]);
    expect(wtaHostPort(cs[1].ports)).toBe(8087);
    expect(cs[2].logTail.at(-1)).toContain('Versão exigida');
  });

  it('container que não existe vem como MISSING', () => {
    const cs = parseEnvCheckOutput('@@c oracle-x\nMISSING\n@@ports\n@@logs\n', 'x');
    expect(cs.every((c) => !c.exists)).toBe(true);
    expect(summarizeEnvCheck(cs).status).toBe('missing');
  });

  it('falha aponta o motivo do log (o WSH recusando a versão do WTA)', () => {
    const s = summarizeEnvCheck(parseEnvCheckOutput(OUTPUT, 'suporte_38'), { url: 'http://localhost:8087/', status: 200 });
    expect(s.status).toBe('fail');
    expect(s.title).toBe('Falhou: WSH');
    expect(s.detail).toContain('Versão exigida 1.40.2.1');
  });

  it('no ar só com os três rodando e o WTA respondendo; senão, subindo', () => {
    const ok: InfrContainerCheck[] = ['oracle', 'wta', 'wsh'].map((role) => ({ role: role as any, container: `${role}-a`, exists: true, state: 'running', restarts: 0, ports: [], logTail: [] }));
    expect(summarizeEnvCheck(ok, { url: 'u', status: 302 }).status).toBe('ok');
    const semHttp = summarizeEnvCheck(ok, { url: 'u', error: 'ECONNREFUSED' });
    expect(semHttp.status).toBe('starting');
    expect(semHttp.detail).toContain('WTA ainda não responde (ECONNREFUSED)');
    const semWsh = summarizeEnvCheck([ok[0], ok[1], { ...ok[2], exists: false }], { url: 'u', status: 200 });
    expect(semWsh).toMatchObject({ status: 'starting', title: 'Subindo: 2 de 3 no ar' });
  });

  it('comandos para copiar ou executar, só com nome válido', () => {
    const cmds = infrCheckCommands('suporte_38', 8087);
    expect(cmds.map((c) => c.id)).toEqual(['ps', 'logs-oracle', 'logs-wta', 'logs-wsh', 'wta-http']);
    expect(cmds[0].command).toBe('docker ps -a --filter name=suporte_38');
    expect(cmds[4].command).toContain('http://localhost:8087/');
    expect(infrCheckCommands('suporte_38').map((c) => c.id)).not.toContain('wta-http');
    expect(infrCheckCommands('x; rm -rf /')).toEqual([]);
  });

  it('comando longo do Gerar em várias linhas, uma opção por linha', () => {
    expect(multilineCommand('./new_version_env.sh --version 40 --name a')).toBe('./new_version_env.sh \\\n  --version 40 \\\n  --name a');
  });
});

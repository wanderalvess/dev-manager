import { describe, expect, it } from 'vitest';
import { parseEnvCheckOutput, stuckBundles, summarizeEnvCheck, type InfrContainerCheck } from './infrEnvCheck';
import { matchKnownFailures } from './infrAiKnownFailures';
import { buildLogProbeScript, parseBuildLogProbe } from './infrBuildLog';

const up = (role: InfrContainerCheck['role'], over: Partial<InfrContainerCheck> = {}): InfrContainerCheck => ({
  role,
  container: `${role}-local`,
  exists: true,
  state: 'running',
  restarts: 0,
  ports: [],
  logTail: [],
  ...over
});
const gone = (role: InfrContainerCheck['role']): InfrContainerCheck => ({ role, container: `${role}-local`, exists: false, ports: [], logTail: [] });
const http200 = { url: 'http://localhost:8080/', status: 200 };

// Saída do docker logs --timestamps: a hora vem na frente de cada linha
const TIMEOUT_LINES = [
  "2026-11-03T20:10:11.123456789Z WARN  Application context initialization for 'br.com.winthor.autenticacao' has timed out waiting for (&(objectClass=br.com.winthor.Repo))",
  "2026-11-03T20:15:12.000000001Z WARN  Application context initialization for 'br.com.winthor.pedido' has timed out waiting for (&(objectClass=br.com.winthor.Servico))",
  "2026-11-03T20:15:12.500000000Z WARN  Application context initialization for 'br.com.winthor.autenticacao' has timed out waiting for (&(objectClass=br.com.winthor.Repo))",
  '2026-11-03T20:15:13.000000000Z Existem pacotes em transição, postergando a análise de saúde'
];

describe('Verificar: ambiente sem WSH', () => {
  it('sem WSH e sem criação em andamento, banco e WTA no ar contam como ambiente no ar', () => {
    const s = summarizeEnvCheck([up('oracle'), up('wta'), gone('wsh')], http200, undefined);
    expect(s.status).toBe('ok');
    expect(s.title).toBe('Ambiente no ar');
    expect(s.detail).toContain('este ambiente não tem WSH');
  });

  it('o WTA ainda não responde: continua subindo, contando só o que existe (2 de 2)', () => {
    const s = summarizeEnvCheck([up('oracle'), up('wta'), gone('wsh')], { url: 'http://localhost:8080/', error: 'timeout' }, undefined);
    expect(s.status).toBe('starting');
    expect(s.title).toBe('Subindo: 2 de 2 no ar');
    expect(s.detail).not.toContain('WSH ainda não criado');
  });

  it('com a criação em andamento (há log da criação), o WSH que falta ainda é esperado', () => {
    const log = { path: '/tmp/x.log', exists: true, tail: ['[4/5] WTA'] };
    const s = summarizeEnvCheck([up('oracle'), up('wta'), gone('wsh')], http200, log);
    expect(s.status).toBe('starting');
    expect(s.title).toBe('Subindo: 2 de 3 no ar');
    expect(s.detail).toContain('WSH ainda não criado');
  });

  it('log da criação ainda lá, mas a criação foi sem WSH: WSH opcional (Sem --wsh-jar, comando sem --wsh-jar ou "Pronto")', () => {
    const base = { path: '/tmp/x.log', exists: true, tail: [] };
    for (const log of [{ ...base, noWsh: true }, { ...base, done: true }]) {
      const s = summarizeEnvCheck([up('oracle'), up('wta'), gone('wsh')], http200, log);
      expect(s.status).toBe('ok');
      expect(s.detail).toContain('não tem WSH');
    }
  });

  it('com WSH rodando continua "Banco, WTA e WSH rodando"', () => {
    const s = summarizeEnvCheck([up('oracle'), up('wta'), up('wsh')], http200, undefined);
    expect(s.status).toBe('ok');
    expect(s.detail).toContain('Banco, WTA e WSH rodando');
  });
});

describe('Verificar: Karaf travado', () => {
  it('bundles que estouraram o tempo no log viram "O WTA não termina de subir", mesmo com a raiz em HTTP 200', () => {
    const wta = up('wta', { stuck: TIMEOUT_LINES });
    expect(stuckBundles(wta)).toEqual(['br.com.winthor.autenticacao', 'br.com.winthor.pedido']);
    const s = summarizeEnvCheck([up('oracle'), wta, gone('wsh')], http200, undefined);
    expect(s.status).toBe('fail');
    expect(s.title).toBe('O WTA não termina de subir');
    expect(s.detail).toContain('2 bundles estouraram');
    expect(s.detail).toContain('br.com.winthor.autenticacao, br.com.winthor.pedido');
    expect(s.detail).toContain('login');
    // a IA reconhece o sintoma e não o confunde com o Karaf ainda subindo (HTTP 500 no início)
    expect(matchKnownFailures(`${s.title}. ${s.detail}`).map((f) => f.id)).toContain(13);
  });

  it('só vale a subida atual: timeout anterior ao StartedAt (de um start antigo) é ignorado; posterior vale', () => {
    // restart às 20:30: os timeouts das 20:10 e 20:15 são da subida da manhã
    const depois = up('wta', { startedAt: '2026-11-03T20:30:00.000000000Z', stuck: TIMEOUT_LINES });
    expect(stuckBundles(depois)).toEqual([]);
    const s = summarizeEnvCheck([up('oracle'), depois, gone('wsh')], { url: 'u', status: 200 }, undefined);
    expect(s.status).toBe('ok');
    // o start foi antes dos timeouts: valem
    const antes = up('wta', { startedAt: '2026-11-03T20:00:00.000000000Z', stuck: TIMEOUT_LINES });
    expect(stuckBundles(antes)).toHaveLength(2);
    // misto: só o que veio depois do start
    const misto = up('wta', { startedAt: '2026-11-03T20:12:00Z', stuck: TIMEOUT_LINES });
    expect(stuckBundles(misto)).toEqual(['br.com.winthor.pedido', 'br.com.winthor.autenticacao']);
    // sem StartedAt não há como separar: vale tudo
    expect(stuckBundles(up('wta', { stuck: TIMEOUT_LINES }))).toHaveLength(2);
  });

  it('o fim do log sem hora não conta, e sem timeout é só "subindo"', () => {
    expect(stuckBundles(up('wta', { logTail: TIMEOUT_LINES.map((l) => l.replace(/^\S+ /, '')) }))).toEqual([]);
    const slow = summarizeEnvCheck([up('oracle'), up('wta', { stuck: ['2026-11-03T20:15:13.000000000Z Existem pacotes em transição'] }), gone('wsh')], { url: 'u', status: 500 }, undefined);
    expect(slow.status).toBe('starting');
  });

  it('WTA parado não é "travado": a falha de container parado vem antes', () => {
    const s = summarizeEnvCheck([up('oracle'), up('wta', { state: 'exited', stuck: TIMEOUT_LINES }), gone('wsh')], undefined, undefined);
    expect(s.title).toBe('Falhou: WTA');
  });

  it('a leitura separa a seção @@stuck do log do WTA', () => {
    const out = [
      '@@c wta-local',
      'running||0|2026-11-03T20:00:00Z|linux-winthor:38-debian',
      '@@ports',
      '0.0.0.0:8080->8080/tcp',
      '@@logs',
      'linha do log',
      '@@stuck',
      ...TIMEOUT_LINES
    ].join('\n');
    const wta = parseEnvCheckOutput(out, 'local').find((c) => c.role === 'wta');
    expect(wta?.logTail).toEqual(['linha do log']);
    expect(wta?.stuck).toHaveLength(4);
  });
});

describe('log da criação: sem WSH e Pronto', () => {
  const sondaOk = (extra: string) => `@@tail\n[5/5] WSH\n${extra}\n@@causa\n@@erros\n0\n@@falhas\n`;

  it('"Sem --wsh-jar" no log marca criação sem WSH; "Pronto: ambiente" marca terminada', () => {
    const r = parseBuildLogProbe('/tmp/x.log', sondaOk('[INFO] Sem --wsh-jar: WSH não criado.\nPronto: ambiente local') + '@@semwsh\n1\n@@pronto\n1\n@@comando\n');
    expect(r).toMatchObject({ exists: true, noWsh: true, done: true });
  });

  it('comando gravado sem --wsh-jar vale; com --wsh-jar, não', () => {
    const sem = parseBuildLogProbe('/tmp/x.log', sondaOk('') + '@@semwsh\n0\n@@pronto\n0\n@@comando\n./new_version_env.sh --version 40 --name local\n');
    expect(sem?.noWsh).toBe(true);
    const com = parseBuildLogProbe('/tmp/x.log', sondaOk('') + '@@semwsh\n0\n@@pronto\n0\n@@comando\n./new_version_env.sh --version 40 --name local --wsh-jar /opt/wsh/40/x.jar\n');
    expect(com?.noWsh).toBeUndefined();
    expect(com?.done).toBeUndefined();
  });

  it('o roteiro procura Sem --wsh-jar, Pronto e o comando', () => {
    const script = buildLogProbeScript('/tmp/x.log');
    expect(script).toContain('Sem --wsh-jar');
    expect(script).toContain('Pronto: ambiente');
    expect(script).toContain('new_version_env.sh');
  });
});

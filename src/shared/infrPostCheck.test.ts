import { describe, expect, it } from 'vitest';
import { summarizeEnvCheck, type InfrContainerCheck } from './infrEnvCheck';
import { postChecks, refineSummary, wshMissingRoutes } from './infrPostCheck';
import { wakeDbCommand } from './infrWinthorVersion';

const c = (role: InfrContainerCheck['role'], startedAt: string, extra: Partial<InfrContainerCheck> = {}): InfrContainerCheck => ({
  role,
  container: `${role}-homolog`,
  exists: true,
  state: 'running',
  startedAt,
  ports: role === 'wta' ? ['8080/tcp -> 0.0.0.0:8040'] : [],
  logTail: [],
  ...extra
});

const WSH_404 = "2026-11-04 15:05:04.801 ERROR 1 --- [Trd-Busca-1] b.c.t.i.w.i.u.ConectorGenericoService : [Servico: WTA - Buscar planos de pagamentos] - Erro 'Client' na chamada da API:404 Not Found: [<!DOCTYPE HTML";
const STUCK = "2026-11-04T13:59:10.000000000Z 2026-11-04T10:59:10 | ERROR | Application context initialization for 'ferramenta-usuario' has timed out waiting for (objectClass=x)";
const NOW = new Date('2026-11-04T15:05:00Z');
const http = { url: 'http://localhost:8040/', status: 200 };

describe('validação depois da criação', () => {
  it('ambiente do Nathan: WTA ligou antes do banco e travou; a causa vira o título e o botão reinicia o WTA', () => {
    const cs = [
      c('oracle', '2026-11-04T14:04:00Z', { health: 'healthy' }),
      c('wta', '2026-11-04T13:54:00Z', { stuck: [STUCK] }),
      c('wsh', '2026-11-04T13:54:20Z', { logTail: [WSH_404] })
    ];
    const items = postChecks(cs, http, { url: 'http://localhost:8040/winthor/autenticacao/v1/login', status: 405 }, NOW);
    expect(items.find((i) => i.id === 'ordem')).toMatchObject({ status: 'fail', fix: { role: 'wta', action: 'restart' } });
    expect(items.find((i) => i.id === 'karaf')?.status).toBe('fail');
    expect(items.find((i) => i.id === 'wsh')).toMatchObject({ status: 'warn', title: 'WSH chama rotas que o WTA não tem' });
    const s = refineSummary(summarizeEnvCheck(cs, http), items);
    expect(s).toMatchObject({ status: 'fail', title: 'O WTA subiu antes do banco e travou' });
  });

  it('tudo de pé: pronto para usar só com banco, ordem, Karaf, login e WSH ok', () => {
    const cs = [c('oracle', '2026-11-04T14:00:00Z', { health: 'healthy' }), c('wta', '2026-11-04T14:05:00Z'), c('wsh', '2026-11-04T14:06:00Z')];
    const items = postChecks(cs, http, { url: 'u', status: 405 }, NOW);
    expect(items.map((i) => i.status)).toEqual(['ok', 'ok', 'ok', 'ok', 'ok']);
    expect(refineSummary(summarizeEnvCheck(cs, http), items)).toMatchObject({ status: 'ok', title: 'Ambiente pronto para usar' });
  });

  it('raiz respondendo mas login 404: subindo nos primeiros minutos, falha depois', () => {
    const cs = [c('oracle', '2026-11-04T14:00:00Z', { health: 'healthy' }), c('wta', '2026-11-04T15:00:00Z')];
    const login = { url: 'u', status: 404 };
    const cedo = postChecks(cs, http, login, NOW);
    expect(cedo.find((i) => i.id === 'login')?.status).toBe('wait');
    expect(refineSummary(summarizeEnvCheck(cs, http), cedo).status).toBe('starting');
    const tarde = postChecks(cs, http, login, new Date('2026-11-04T15:30:00Z'));
    expect(tarde.find((i) => i.id === 'login')).toMatchObject({ status: 'fail', fix: { action: 'restart' } });
  });

  it('banco parado: falha com o botão de ligar o banco', () => {
    const cs = [c('oracle', '2026-11-04T14:00:00Z', { state: 'exited' }), c('wta', '2026-11-04T14:05:00Z')];
    expect(postChecks(cs, undefined, undefined, NOW)[0]).toMatchObject({ id: 'banco', status: 'fail', fix: { role: 'oracle', action: 'start' } });
  });

  it('WTA e banco ligando juntos (a distro voltando) ou WTA antes sem nada travado: ordem não é problema', () => {
    const juntos = [c('oracle', '2026-11-04T14:00:30Z', { health: 'healthy' }), c('wta', '2026-11-04T14:00:00Z')];
    expect(postChecks(juntos, http, { url: 'u', status: 405 }, NOW).find((i) => i.id === 'ordem')?.status).toBe('ok');
    const antesSemEfeito = [c('oracle', '2026-11-04T14:30:00Z', { health: 'healthy' }), c('wta', '2026-11-04T14:00:00Z')];
    expect(postChecks(antesSemEfeito, http, { url: 'u', status: 405 }, NOW).find((i) => i.id === 'ordem')).toMatchObject({ status: 'ok', title: 'Ordem de subida sem efeito' });
  });

  it('lê do log do WSH os serviços que dão 404 no WTA', () => {
    expect(wshMissingRoutes(c('wsh', 'x', { logTail: [WSH_404, WSH_404, 'INFO ok'] }))).toEqual(['Buscar planos de pagamentos']);
  });
});

describe('banco de destino parado antes do build', () => {
  it('liga e espera o healthcheck do banco que já existe parado', () => {
    const cmd = wakeDbCommand({ name: 'homolog' });
    expect(cmd).toContain("docker inspect -f '{{.State.Running}}' oracle-homolog");
    expect(cmd).toContain('docker start oracle-homolog');
    expect(cmd).toContain('healthy');
    expect(wakeDbCommand({ name: 'homolog', dbContainer: 'oracle-teste' })).toContain('docker start oracle-teste');
    expect(wakeDbCommand({ name: 'x; rm -rf /' })).toBe('');
  });
});

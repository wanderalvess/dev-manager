import { describe, expect, it } from 'vitest';
import {
  activeEnvGroup,
  activeEnvSettingsPatch,
  describeEnvironment,
  firstHostPort,
  hostPortOf,
  isActiveEnvStale
} from './infrActiveEnv';
import type { InfrEnvironment } from './infrWinthorVersion';

const c = (name: string, state: string, ports = '') => ({ name, image: 'img', state, ports });
const WTA_PORTS = '0.0.0.0:8087->8080/tcp, [::]:8087->8080/tcp, 0.0.0.0:8187->8101/tcp, 0.0.0.0:1087->1099/tcp, 0.0.0.0:61687->61616/tcp';

const develop: InfrEnvironment = {
  name: 'develop',
  oracle: c('oracle-develop', 'running', '0.0.0.0:1540->1521/tcp'),
  wta: c('wta-develop', 'running', WTA_PORTS),
  wsh: c('wsh-develop', 'running', '0.0.0.0:9040->9040/tcp')
};

describe('hostPortOf / firstHostPort', () => {
  it('lê a porta do host mapeada para a do container', () => {
    expect(hostPortOf(WTA_PORTS, 8080)).toBe(8087);
    expect(hostPortOf(WTA_PORTS, 8101)).toBe(8187);
    expect(hostPortOf(WTA_PORTS, 61616)).toBe(61687);
  });

  it('não confunde 8080 com 80801 nem lê de outro container', () => {
    expect(hostPortOf('0.0.0.0:9000->80801/tcp', 8080)).toBeUndefined();
    expect(hostPortOf('', 8080)).toBeUndefined();
    expect(hostPortOf(undefined, 8080)).toBeUndefined();
  });

  it('o WSH publica a mesma porta nos dois lados', () => {
    expect(firstHostPort('0.0.0.0:9040->9040/tcp')).toBe(9040);
    expect(firstHostPort('')).toBeUndefined();
  });
});

describe('describeEnvironment', () => {
  it('usa as portas reais do docker, mesmo fora do padrão por versão', () => {
    const e = describeEnvironment(develop);
    expect(e.ports).toMatchObject({ web: 8087, ssh: 8187, jmx: 1087, jms: 61687, oracle: 1540, wsh: 9040 });
    expect(e.portsSource).toBe('docker');
    expect(e.wtaUrl).toBe('http://localhost:8087');
    expect(e.status).toBe('up');
  });

  it('WTA parado e nome por versão: usa o padrão da versão', () => {
    const e = describeEnvironment({ name: '39', oracle: c('oracle-39', 'exited'), wta: c('wta-39', 'exited'), wsh: c('wsh-39', 'exited') });
    expect(e.portsSource).toBe('versao');
    expect(e.wtaUrl).toBe('http://localhost:8039');
    expect(e.ports.ssh).toBe(8139);
    expect(e.status).toBe('down');
  });

  it('WTA parado e nome livre: não inventa porta', () => {
    const e = describeEnvironment({ name: 'develop', wta: c('wta-develop', 'exited') });
    expect(e.portsSource).toBe('desconhecida');
    expect(e.wtaUrl).toBeUndefined();
  });

  it('banco no ar e WTA parado é parcial; sem WSH, banco e WTA no ar é no ar', () => {
    expect(describeEnvironment({ ...develop, wta: c('wta-develop', 'exited') }).status).toBe('partial');
    expect(describeEnvironment({ name: 'x', oracle: c('oracle-x', 'running'), wta: c('wta-x', 'running', WTA_PORTS) }).status).toBe('up');
  });
});

describe('activeEnvGroup', () => {
  it('sobe oracle, wta e wsh nessa ordem, com a espera de sempre', () => {
    const g = activeEnvGroup(describeEnvironment(develop), 'ubuntu2604-winthor');
    expect(g.wslDistro).toBe('ubuntu2604-winthor');
    expect(g.containers).toEqual([
      { id: 'oracle-develop', name: 'oracle-develop', delay: 45 },
      { id: 'wta-develop', name: 'wta-develop', delay: 15 },
      { id: 'wsh-develop', name: 'wsh-develop' }
    ]);
  });

  it('ambiente sem WSH sobe só banco e WTA', () => {
    const g = activeEnvGroup(describeEnvironment({ name: 'x', oracle: c('oracle-x', 'exited'), wta: c('wta-x', 'exited') }));
    expect(g.containers.map((x) => (typeof x === 'string' ? x : x.name))).toEqual(['oracle-x', 'wta-x']);
  });
});

describe('activeEnvSettingsPatch', () => {
  it('aponta WTA, Rotina 801 e SSH do Karaf para o ambiente e lista o que mudou', () => {
    const { patch, changes } = activeEnvSettingsPatch(describeEnvironment(develop), {
      wtaUrl: 'http://localhost:8889',
      routine801Url: 'http://localhost:8889',
      karafSshPort: 8101,
      wtaPassword: 'segredo'
    });
    expect(patch).toEqual({
      activeEnvironment: 'develop',
      wtaUrl: 'http://localhost:8087',
      routine801Url: 'http://localhost:8087',
      wtaPassword: 'segredo',
      karafSshPort: 8187
    });
    expect(changes.map((x) => x.label)).toEqual(['URL do WTA', 'URL da Rotina 801', 'Porta SSH do Karaf']);
    expect(changes[0]).toEqual({ label: 'URL do WTA', from: 'http://localhost:8889', to: 'http://localhost:8087' });
  });

  it('sem mudança nenhuma, não lista nada', () => {
    const { changes } = activeEnvSettingsPatch(describeEnvironment(develop), {
      wtaUrl: 'http://localhost:8087',
      routine801Url: 'http://localhost:8087',
      karafSshPort: 8187
    });
    expect(changes).toEqual([]);
  });

  it('sem porta conhecida, só grava o nome e não mexe nas URLs', () => {
    const { patch } = activeEnvSettingsPatch(describeEnvironment({ name: 'develop', wta: c('wta-develop', 'exited') }), { wtaUrl: 'http://localhost:8889' });
    expect(patch).toEqual({ activeEnvironment: 'develop' });
  });

  it('não leva senha que não existe', () => {
    const { patch } = activeEnvSettingsPatch(describeEnvironment(develop), {});
    expect(patch).not.toHaveProperty('wtaPassword');
  });
});

describe('isActiveEnvStale', () => {
  it('compara a URL do WTA das Configurações com a do ambiente, sem a barra final', () => {
    const e = describeEnvironment(develop);
    expect(isActiveEnvStale(e, 'http://localhost:8087/')).toBe(false);
    expect(isActiveEnvStale(e, 'http://localhost:8889')).toBe(true);
    expect(isActiveEnvStale(undefined, 'http://localhost:8889')).toBe(false);
  });
});

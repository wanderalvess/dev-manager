import { describe, expect, it } from 'vitest';
import {
  buildEnvironmentSlots,
  buildEnvironmentSlotsFromList,
  computeGroupStatus,
  computeStackTopology,
  extractOraclePort,
  extractWtaPort,
  filterContainers,
  flattenPortBindings,
  getGroupContainerNames,
  getOracleTnsConfig,
  parsePortLinks
} from './dockerContainerUtils';
import type { ContainerEnvironment, DockerContainerInfo } from '../../../shared/types';

function makeContainer(overrides: Partial<DockerContainerInfo> = {}): DockerContainerInfo {
  return {
    id: 'abc123',
    names: '/oracle-winthor',
    image: 'oracle/xe',
    state: 'running',
    status: 'Up 2 hours',
    ports: '',
    created: '2026-01-01T00:00:00Z',
    ...overrides
  };
}

describe('parsePortLinks', () => {
  it('extrai porta/host/protocolo de uma string simples do docker ps', () => {
    expect(parsePortLinks('0.0.0.0:5432->5432/tcp')).toEqual([
      { hostPort: 5432, containerPort: 5432, protocol: 'tcp' }
    ]);
  });

  it('lida com múltiplos mapeamentos e IPv6 ([::]:)', () => {
    const result = parsePortLinks('0.0.0.0:1521->1521/tcp, :::1521->1521/tcp, [::]:5500->5500/tcp');
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ hostPort: 1521, containerPort: 1521, protocol: 'tcp' });
    expect(result[2]).toEqual({ hostPort: 5500, containerPort: 5500, protocol: 'tcp' });
  });

  it('retorna lista vazia para string vazia ou sem mapeamentos', () => {
    expect(parsePortLinks('')).toEqual([]);
    expect(parsePortLinks('sem portas mapeadas')).toEqual([]);
  });
});

describe('extractOraclePort', () => {
  it('extrai a porta do host mapeada para 1521 (formato docker ps)', () => {
    expect(extractOraclePort('0.0.0.0:1522->1521/tcp')).toBe('1522');
  });

  it('extrai a porta no formato direto host:1521', () => {
    expect(extractOraclePort('1533:1521')).toBe('1533');
  });

  it('usa o fallback 1522 quando não há string ou não há match', () => {
    expect(extractOraclePort(undefined)).toBe('1522');
    expect(extractOraclePort('')).toBe('1522');
    expect(extractOraclePort('0.0.0.0:8080->8080/tcp')).toBe('1522');
  });
});

describe('extractWtaPort', () => {
  it('extrai a porta mapeada para 8080', () => {
    expect(extractWtaPort('0.0.0.0:9090->8080/tcp')).toBe(9090);
  });

  it('usa o match alternativo quando o formato não é 0.0.0.0', () => {
    expect(extractWtaPort(':9191->8080/tcp')).toBe(9191);
  });

  it('usa o fallback 8080 quando não há string ou não há match', () => {
    expect(extractWtaPort(undefined)).toBe(8080);
    expect(extractWtaPort('sem porta aqui')).toBe(8080);
  });
});

describe('getOracleTnsConfig', () => {
  it('gera o bloco tnsnames.ora com os valores informados', () => {
    const tns = getOracleTnsConfig('1522', 'MEU_ALIAS', 'XE');
    expect(tns).toContain('MEU_ALIAS =');
    expect(tns).toContain('(PORT = 1522)');
    expect(tns).toContain('(SERVICE_NAME = XE)');
  });

  it('usa os valores padrão quando nenhum argumento é informado', () => {
    const tns = getOracleTnsConfig();
    expect(tns).toContain('LOCAL_DOCKER =');
    expect(tns).toContain('(PORT = 1522)');
    expect(tns).toContain('(SERVICE_NAME = XE)');
  });
});

describe('filterContainers', () => {
  const containers = [
    makeContainer({ id: 'c1', names: '/oracle-winthor', image: 'oracle/xe', ports: '1521:1521' }),
    makeContainer({ id: 'c2', names: '/linux-winthor', image: 'winthor/wta', ports: '8080:8080' })
  ];

  it('retorna todos os containers quando o filtro está vazio', () => {
    expect(filterContainers(containers, '')).toEqual(containers);
  });

  it('filtra por nome, imagem, id ou portas, case-insensitive', () => {
    expect(filterContainers(containers, 'ORACLE')).toEqual([containers[0]]);
    expect(filterContainers(containers, 'wta')).toEqual([containers[1]]);
    expect(filterContainers(containers, '8080')).toEqual([containers[1]]);
    expect(filterContainers(containers, 'c1')).toEqual([containers[0]]);
  });

  it('retorna lista vazia quando nada corresponde', () => {
    expect(filterContainers(containers, 'inexistente')).toEqual([]);
  });
});

describe('flattenPortBindings', () => {
  it('achata o dicionário de portas do docker inspect em uma lista plana', () => {
    const result = flattenPortBindings({
      '5432/tcp': [{ hostIp: '0.0.0.0', hostPort: '5432' }],
      '5433/tcp': [
        { hostIp: '0.0.0.0', hostPort: '5433' },
        { hostIp: '::', hostPort: '5433' }
      ]
    });
    expect(result).toEqual([
      { containerPort: '5432', protocol: 'tcp', hostIp: '0.0.0.0', hostPort: '5432' },
      { containerPort: '5433', protocol: 'tcp', hostIp: '0.0.0.0', hostPort: '5433' },
      { containerPort: '5433', protocol: 'tcp', hostIp: '::', hostPort: '5433' }
    ]);
  });

  it('ignora portas expostas sem binding de host (valor null)', () => {
    const result = flattenPortBindings({ '5432/tcp': null });
    expect(result).toEqual([]);
  });

  it('retorna lista vazia quando ports é undefined', () => {
    expect(flattenPortBindings(undefined)).toEqual([]);
  });
});

describe('computeStackTopology', () => {
  it('identifica a stack completa quando Oracle, WTA e WSH estão rodando', () => {
    const containers = [
      makeContainer({ names: '/oracle-winthor', state: 'running', ports: '0.0.0.0:1521->1521/tcp' }),
      makeContainer({ names: '/linux-winthor', state: 'running', ports: '0.0.0.0:8080->8080/tcp' }),
      makeContainer({ names: '/wsh-winthor', state: 'running' })
    ];

    const topology = computeStackTopology(containers);
    expect(topology.isStackComplete).toBe(true);
    expect(topology.hasMissingDependency).toBe(false);
    expect(topology.oracle.exists).toBe(true);
    expect(topology.oracle.port).toBe('1521');
    expect(topology.wta.port).toBe('8080');
  });

  it('sinaliza dependência faltando quando WTA está rodando sem Oracle', () => {
    const containers = [makeContainer({ names: '/linux-winthor', state: 'running' })];
    const topology = computeStackTopology(containers);
    expect(topology.isStackComplete).toBe(false);
    expect(topology.hasMissingDependency).toBe(true);
    expect(topology.oracle.exists).toBe(false);
  });

  it('considera a stack completa sem WSH quando ele simplesmente não existe', () => {
    const containers = [
      makeContainer({ names: '/oracle-winthor', state: 'running' }),
      makeContainer({ names: '/linux-winthor', state: 'running' })
    ];
    const topology = computeStackTopology(containers);
    expect(topology.isStackComplete).toBe(true);
    expect(topology.wsh.exists).toBe(false);
  });

  it('usa nomes padrão quando não há nenhum container', () => {
    const topology = computeStackTopology([]);
    expect(topology.oracle.name).toBe('oracle-winthor');
    expect(topology.wta.name).toBe('linux-winthor');
    expect(topology.wsh.name).toBe('wsh-winthor');
    expect(topology.isStackComplete).toBe(false);
  });
});

describe('buildEnvironmentSlots', () => {
  it('usa o preset "doc" com nomes e delays fixos do manual oficial', () => {
    const slots = buildEnvironmentSlots('doc', []);
    expect(slots).toEqual([
      { id: '1', name: 'oracle-local', delay: 30 },
      { id: '2', name: 'wta-local', delay: 10 },
      { id: '3', name: 'wsh-local' }
    ]);
  });

  it('usa o preset "infr" com nomes e delays do INFR-Docker', () => {
    const slots = buildEnvironmentSlots('infr', []);
    expect(slots).toEqual([
      { id: '1', name: 'oracle-winthor', delay: 45 },
      { id: '2', name: 'linux-winthor', delay: 15 },
      { id: '3', name: 'wsh-winthor' }
    ]);
  });

  it('monta os slots a partir dos containers atuais quando o preset é "current"', () => {
    const containers = [
      makeContainer({ names: '/meu-oracle-custom', state: 'running' }),
      makeContainer({ names: '/meu-wta-custom', state: 'running' })
    ];
    const slots = buildEnvironmentSlots('current', containers);
    expect(slots).toEqual([
      { id: '1', name: 'meu-oracle-custom', delay: 30 },
      { id: '2', name: 'meu-wta-custom', delay: 10 }
    ]);
  });

  it('usa os nomes padrão quando nenhum container correspondente é encontrado', () => {
    const slots = buildEnvironmentSlots('current', []);
    expect(slots).toEqual([
      { id: '1', name: 'oracle-local', delay: 30 },
      { id: '2', name: 'wta-local', delay: 10 }
    ]);
  });

  it('omite o slot de WSH quando não há container WSH nos containers atuais', () => {
    const slots = buildEnvironmentSlots('current', []);
    expect(slots).toHaveLength(2);
    expect(slots.find((s) => s.id === '3')).toBeUndefined();
  });

  it('inclui o slot de WSH quando há um container WSH nos containers atuais', () => {
    const containers = [makeContainer({ names: '/meu-wsh', state: 'running' })];
    const slots = buildEnvironmentSlots('current', containers);
    expect(slots).toContainEqual({ id: '3', name: 'meu-wsh' });
  });
});

describe('getGroupContainerNames', () => {
  it('extrai nomes de strings e objetos de slot limpando a barra inicial', () => {
    const env: ContainerEnvironment = {
      id: 'g1',
      name: 'Stack Financeira',
      containers: ['/oracle-winthor', { id: 's2', name: 'api-financeiro', delay: 10 }]
    };
    expect(getGroupContainerNames(env)).toEqual(['oracle-winthor', 'api-financeiro']);
  });

  it('retorna lista vazia se grupo for inválido ou sem containers', () => {
    expect(getGroupContainerNames({ id: 'g2', name: 'Vazio', containers: [] })).toEqual([]);
    expect(getGroupContainerNames(null as any)).toEqual([]);
  });
});

describe('computeGroupStatus', () => {
  it('calcula corretamente containers rodando e parados do grupo', () => {
    const env: ContainerEnvironment = {
      id: 'g1',
      name: 'Backend Core',
      containers: ['redis-core', 'postgres-core', 'api-gateway']
    };
    const containers: DockerContainerInfo[] = [
      makeContainer({ names: '/redis-core', state: 'running' }),
      makeContainer({ names: '/postgres-core', state: 'exited' }),
      makeContainer({ names: '/outro-container', state: 'running' })
    ];

    const status = computeGroupStatus(env, containers);
    expect(status.total).toBe(3);
    expect(status.running).toBe(1);
    expect(status.stopped).toBe(2);
    expect(status.isAllRunning).toBe(false);
    expect(status.isNoneRunning).toBe(false);
  });

  it('identifica quando todos os containers do grupo estão rodando', () => {
    const env: ContainerEnvironment = {
      id: 'g1',
      name: 'Microservices',
      containers: ['auth-service', 'billing-service']
    };
    const containers: DockerContainerInfo[] = [
      makeContainer({ names: '/auth-service', state: 'running' }),
      makeContainer({ names: '/billing-service', state: 'running' })
    ];

    const status = computeGroupStatus(env, containers);
    expect(status.total).toBe(2);
    expect(status.running).toBe(2);
    expect(status.stopped).toBe(0);
    expect(status.isAllRunning).toBe(true);
    expect(status.isNoneRunning).toBe(false);
  });

  it('identifica quando nenhum container do grupo está rodando', () => {
    const env: ContainerEnvironment = {
      id: 'g1',
      name: 'Dev Stack',
      containers: ['api-service']
    };
    const status = computeGroupStatus(env, []);
    expect(status.total).toBe(1);
    expect(status.running).toBe(0);
    expect(status.stopped).toBe(1);
    expect(status.isAllRunning).toBe(false);
    expect(status.isNoneRunning).toBe(true);
  });
});

describe('buildEnvironmentSlotsFromList', () => {
  it('cria slots indexados com nomes limpos e delays preservados', () => {
    const input = [
      { name: '/db-container', delay: 30 },
      { name: 'app-service', delay: 0 },
      { name: 'worker-service' }
    ];
    const slots = buildEnvironmentSlotsFromList(input);
    expect(slots).toEqual([
      { id: '1', name: 'db-container', delay: 30 },
      { id: '2', name: 'app-service' },
      { id: '3', name: 'worker-service' }
    ]);
  });
});

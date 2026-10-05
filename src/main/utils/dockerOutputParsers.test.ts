import { describe, expect, it } from 'vitest';
import { parseComposeStatus, parseContainerList, parseContainerStats } from './dockerOutputParsers';

describe('parseContainerList', () => {
  it('interpreta uma linha JSON por container e normaliza o estado', () => {
    const stdout = [
      JSON.stringify({ id: 'a1', names: 'oracle-local', image: 'oracle/xe', state: 'Running', status: 'Up', ports: '1521', created: 'x' }),
      JSON.stringify({ id: 'b2', names: 'wta', image: 'wta', state: 'weird', status: 'Odd' })
    ].join('\n');

    const result = parseContainerList(stdout);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: 'a1', names: 'oracle-local', state: 'running', ports: '1521' });
    expect(result[1]).toMatchObject({ id: 'b2', state: 'unknown', ports: '', created: '' });
  });

  it('ignora linhas vazias e JSON inválido', () => {
    const stdout = `\n{"id":"a1","state":"exited"}\nnao-e-json\n   \n`;
    const result = parseContainerList(stdout);
    expect(result).toHaveLength(1);
    expect(result[0].state).toBe('exited');
  });

  it('usa unknown quando o estado está ausente', () => {
    expect(parseContainerList('{"id":"x"}')[0].state).toBe('unknown');
  });
});

describe('parseContainerStats', () => {
  it('aplica valores padrão para campos ausentes e ignora linhas inválidas', () => {
    const stdout = `{"id":"a1","name":"db","cpu":"1.5%","mem":"10MiB / 1GiB","memPerc":"1%","netIO":"1kB / 2kB"}\nlixo\n{"id":"b2"}`;
    const result = parseContainerStats(stdout);
    expect(result).toEqual([
      { id: 'a1', name: 'db', cpu: '1.5%', mem: '10MiB / 1GiB', memPerc: '1%', netIO: '1kB / 2kB' },
      { id: 'b2', name: '', cpu: '0%', mem: '0B', memPerc: '0%', netIO: '0B' }
    ]);
  });
});

describe('parseComposeStatus', () => {
  it('mapeia serviço, estado, saúde e portas publicadas', () => {
    const stdout = [
      JSON.stringify({ Service: 'db', State: 'running', Health: 'healthy', Publishers: [{ PublishedPort: 1521, TargetPort: 1521 }] }),
      JSON.stringify({ Name: 'cache', Status: 'exited', Publishers: [] }),
      'invalido'
    ].join('\n');

    expect(parseComposeStatus(stdout)).toEqual([
      { name: 'db', state: 'running', health: 'healthy', ports: ['1521:1521'] },
      { name: 'cache', state: 'exited', health: undefined, ports: undefined }
    ]);
  });

  it('retorna unknown quando não há estado', () => {
    expect(parseComposeStatus('{"Service":"x"}')[0].state).toBe('unknown');
  });
});

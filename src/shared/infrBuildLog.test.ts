import { describe, expect, it } from 'vitest';
import { analyzeBuildLog, buildLogPath } from './infrBuildLog';

describe('infrBuildLog', () => {
  it('o caminho do log segue o nome do ambiente e recusa nome inválido', () => {
    expect(buildLogPath('teste40')).toBe('/tmp/hub-nova-versao-teste40.log');
    expect(buildLogPath('a b; rm')).toBeNull();
  });

  it('sem arquivo ou vazio, não há o que mostrar', () => {
    expect(analyzeBuildLog('/tmp/x', null)).toEqual({ path: '/tmp/x', exists: false, tail: [] });
    expect(analyzeBuildLog('/tmp/x', '  \n')).toMatchObject({ exists: true, tail: [] });
  });

  it('acha o "Unable to resolve" do fim do build e a etapa em que estava', () => {
    const log = ['==> Montando a imagem 40', 'Step 3/9 : RUN feature:install', '\x1b[31mError executing command: Unable to resolve root: missing requirement [root] osgi.identity=winthor-x\x1b[0m'].join('\n');
    const r = analyzeBuildLog('/tmp/x', log);
    expect(r.failure).toContain('Unable to resolve root');
    expect(r.stage).toBe('Step 3/9 : RUN feature:install');
    expect(r.tail).toHaveLength(3);
  });

  it('log sem erro conhecido não acusa nada, e só guarda o fim', () => {
    const log = Array.from({ length: 100 }, (_, i) => `linha ${i}`).join('\n');
    const r = analyzeBuildLog('/tmp/x', log);
    expect(r.failure).toBeUndefined();
    expect(r.tail).toHaveLength(40);
    expect(r.tail.at(-1)).toBe('linha 99');
  });

  it('reconhece falhas de rede, disco e porta', () => {
    for (const t of ['curl: Temporary failure in name resolution', 'write: no space left on device', 'Bind for 0.0.0.0:8040 failed: port is already allocated']) {
      expect(analyzeBuildLog('/tmp/x', `a\n${t}\n`).failure).toBeDefined();
    }
  });
});

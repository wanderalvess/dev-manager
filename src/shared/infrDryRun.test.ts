import { describe, expect, it } from 'vitest';
import { buildDryRunCommands, parseDryRunOutput } from './infrDryRun';

describe('infrDryRun', () => {
  it('acrescenta os repositórios, simula as features e retira os repositórios', () => {
    expect(buildDryRunCommands(['mvn:g/a/1.40/xml/features'], [{ name: 'winthor-a', to: '1.40.1.0' }])).toEqual([
      'feature:repo-add mvn:g/a/1.40/xml/features',
      'feature:install -t -v winthor-a/1.40.1.0',
      'feature:repo-remove mvn:g/a/1.40/xml/features'
    ]);
  });

  it('descarta o que não tem formato seguro (nada vai para o console sem validar)', () => {
    const cmds = buildDryRunCommands(['mvn:g/a/1/xml/features; shutdown', 'http://x'], [{ name: 'a;b', to: '1' }, { name: 'ok', to: '1.0' }]);
    expect(cmds).toEqual(['feature:install -t -v ok/1.0']);
  });

  it('acha os erros do Karaf sem as cores, sem repetir', () => {
    const out = '\x1b[31mError executing command: Unable to resolve root: missing requirement [root] osgi.identity\x1b[0m\nError executing command: Unable to resolve root: missing requirement [root] osgi.identity\nok\n';
    const r = parseDryRunOutput(out, 3);
    expect(r.simulated).toBe(3);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toContain('Unable to resolve root');
    expect(parseDryRunOutput('tudo certo\n', 1).errors).toEqual([]);
  });
});

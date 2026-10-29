import { describe, expect, it, vi } from 'vitest';
import type { KarafContext } from './karafContext';
import { deploy } from './karafDeploy';

const LIST = ` ID │ State  │ Lvl │ Version    │ Location
837 │ Active │  80 │ 0.39.10.99 │ mvn:br.com.pcsist.winthor.tributacao/winthor-tributacao/0.39.10.99
838 │ Active │  80 │ 0.39.10.99 │ mvn:br.com.pcsist.winthor.tributacao.domain/winthor-tributacao-domain/0.39.10.99
10  │ Active │  80 │ 4.1.5      │ mvn:org.apache.karaf.features/org.apache.karaf.features.core/4.1.5`;

const NO_CHANGE = `The specified feature: 'winthor-tributacao' version '0.39.10.99' is already installed
Adding features: winthor-tributacao/[0.39.10.99,0.39.10.99]
No deployment change.
Done.`;

function makeCtx(installOutput: string, list = LIST, failUpdate = false) {
  const executeKarafCommand = vi.fn(async (command: string) => {
    if (command.startsWith('feature:install')) return { code: 0, stdout: installOutput, stderr: '' };
    if (command.startsWith('bundle:list')) return { code: 0, stdout: list, stderr: '' };
    if (command.startsWith('bundle:update') && failUpdate) return { code: 1, stdout: '', stderr: 'erro' };
    return { code: 0, stdout: '', stderr: '' };
  });
  const ctx = {
    getSettings: () => ({ karafDeployHistory: [] }),
    saveSettings: vi.fn(),
    isKarafRunning: async () => true,
    parseProjectPomOrBat: () => ({ groupId: 'br.com.pcsist.winthor.tributacao', artifactId: 'winthor-tributacao', version: '0.39.10.99', modules: [] }),
    executeKarafCommand
  } as unknown as KarafContext;
  return { ctx, executeKarafCommand };
}

const request = {
  repoUrl: 'feature:repo-add mvn:br.com.pcsist.winthor.tributacao/winthor-tributacao-features/0.39.10.99/xml/features',
  featureInstall: 'feature:install -r -u winthor-tributacao/0.39.10.99',
  karafClientPath: '',
  user: 'karaf',
  pass: 'karaf'
};

describe('deploy de uma versão que o Karaf já tem', () => {
  it('atualiza só os bundles do projeto com bundle:update e faz refresh', async () => {
    const { ctx, executeKarafCommand } = makeCtx(NO_CHANGE);

    const result = await deploy(ctx, request, () => {}, 'ui', 'C:/proj');

    expect(result).toEqual({ success: true });
    const commands = executeKarafCommand.mock.calls.map((call) => call[0]);
    expect(commands.filter((c) => c.startsWith('bundle:update'))).toEqual(['bundle:update 837', 'bundle:update 838']);
    expect(commands.at(-1)).toBe('bundle:refresh');
  });

  it('sem bundle do projeto no contêiner, avisa que nada novo foi carregado', async () => {
    const { ctx } = makeCtx(NO_CHANGE, ' ID │ State │ Lvl │ Version │ Location\n10 │ Active │ 80 │ 4.1.5 │ mvn:org.apache.karaf/x/4.1.5');

    const result = await deploy(ctx, request, () => {}, 'ui', 'C:/proj');

    expect(result).toMatchObject({ success: false, error: expect.stringContaining('manteve o que já estava instalado') });
  });

  it('falha de bundle:update volta como erro; instalação que mudou algo não chama bundle:update', async () => {
    expect(await deploy(makeCtx(NO_CHANGE, LIST, true).ctx, request, () => {}, 'ui', 'C:/proj')).toMatchObject({ success: false });

    const changed = makeCtx('Installing bundles:\n  mvn:x/y/1\nDone.');
    expect(await deploy(changed.ctx, request, () => {}, 'ui', 'C:/proj')).toEqual({ success: true });
    expect(changed.executeKarafCommand.mock.calls.some((call) => String(call[0]).startsWith('bundle:update'))).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { buildFirstSteps, missingFiles, parseDistroProbe, summarizeFirstSteps, type InfrFirstStepsProbe } from './infrFirstSteps';
import {
  applyEnvValues,
  dumpImportCommand,
  dumpImportError,
  envOverridesFor,
  infrCheckoutCommand,
  infrCloneCommand
} from './infrFirstStepsCommands';

const ready: InfrFirstStepsProbe = {
  wsl: { installed: true, version: '2.4.13' },
  distros: ['ubuntu2604-winthor'],
  distro: 'ubuntu2604-winthor',
  docker: { version: '27.3.1', network: true },
  git: true,
  infr: { folder: 'C:\\projetos\\INFR-Docker', exists: true, isGit: true, branch: 'feature/imagem-por-versao', missingScripts: [] },
  files: { pcsist: true, dumps: ['loja.dmp'], winthorIni: true, wshJars: ['winthor-integracao-core.jar'] },
  version: '39',
  envFiles: { wta: true, wsh: true },
  containers: { oracle: 'running', wta: 'running', wsh: 'running' },
  wta: { url: 'http://localhost:8039', http: 200, login: { ok: true } }
};

const status = (p: InfrFirstStepsProbe) => buildFirstSteps(p).map((s) => s.status);

describe('buildFirstSteps', () => {
  it('máquina zerada: só o WSL em vermelho e quase tudo bloqueado', () => {
    const p: InfrFirstStepsProbe = { ...ready, wsl: { installed: false }, distros: [], distro: undefined, docker: undefined, files: undefined, containers: undefined, wta: undefined, infr: { ...ready.infr, exists: false, isGit: false } };
    const steps = buildFirstSteps(p);
    expect(steps.map((s) => s.status)).toEqual(['fail', 'blocked', 'blocked', 'fail', 'blocked', 'blocked', 'blocked', 'blocked']);
    expect(steps[0].commands?.[0].command).toBe('wsl --install --no-distribution');
    expect(steps[3].commands?.[0].command).toContain('git clone');
  });

  it('WSL sem a distro do WinThor pede o .tar do Drive', () => {
    const steps = buildFirstSteps({ ...ready, distro: undefined, docker: undefined });
    expect(steps[1].status).toBe('fail');
    expect(steps[1].detail).toContain('ubuntu2604-winthor-26-07-22.tar');
    expect(steps[2].status).toBe('blocked');
  });

  it('clone no branch errado fica amarelo com o checkout', () => {
    const steps = buildFirstSteps({ ...ready, infr: { ...ready.infr, branch: 'main', missingScripts: ['linux-winthor/scripts/build_version.sh'] } });
    expect(steps[3].status).toBe('warn');
    expect(steps[3].detail).toContain('build_version.sh');
    expect(steps[3].commands?.[0].command).toContain('checkout feature/imagem-por-versao');
  });

  it('pasta que não é clone pede para clonar de novo', () => {
    const steps = buildFirstSteps({ ...ready, infr: { ...ready.infr, isGit: false } });
    expect(steps[3].status).toBe('fail');
    expect(steps[3].detail).toContain('não é um clone');
  });

  it('sem o pcsist.tar.gz, subir fica bloqueado; sem o dump, não', () => {
    expect(status({ ...ready, files: { ...ready.files!, pcsist: false } })[5]).toBe('blocked');
    expect(status({ ...ready, files: { ...ready.files!, dumps: [] }, containers: {} })[5]).toBe('warn');
  });

  it('WTA no ar sem login: espera a configuração inicial', () => {
    const steps = buildFirstSteps({ ...ready, containers: { oracle: 'running', wta: 'running' }, wta: { url: 'http://localhost:8039', http: 200, login: { ok: false } } });
    expect(steps[5].status).toBe('ok');
    expect(steps[5].detail).toContain('o WSH sobe depois');
    expect(steps[6].status).toBe('waiting');
    expect(steps[6].detail).toContain('instalador');
    expect(steps[7].status).toBe('blocked');
  });

  it('tudo no ar e o login entrando: 8 de 8', () => {
    const steps = buildFirstSteps(ready);
    expect(steps.every((s) => s.status === 'ok')).toBe(true);
    expect(summarizeFirstSteps(steps)).toEqual({ done: 8, total: 8, next: undefined });
  });

  it('o resumo aponta a primeira que precisa de atenção, não uma bloqueada', () => {
    const s = summarizeFirstSteps(buildFirstSteps({ ...ready, infr: { ...ready.infr, branch: 'main' }, files: { ...ready.files!, pcsist: false } }));
    expect(s.next?.id).toBe('infr');
  });
});

describe('missingFiles', () => {
  it('lista o que falta na ordem da tela', () => {
    expect(missingFiles({ ...ready, files: { pcsist: false, dumps: [], winthorIni: true, wshJars: [] } })).toEqual(['pcsist.tar.gz', 'dump do banco (.dmp)', 'jar do WSH']);
  });
});

describe('parseDistroProbe', () => {
  it('lê docker, arquivos, containers e a porta do WTA', () => {
    const out = ['27.3.1', 'yes', 'a.dmp\nb.dmp', 'yes', 'winthor-integracao-core.jar', 'oracle|running\nwta|exited\nwsh|', '0.0.0.0:8039\n[::]:8039'].join('\n@@\n');
    const r = parseDistroProbe(out);
    expect(r.docker).toEqual({ version: '27.3.1', network: true });
    expect(r.files?.dumps).toEqual(['a.dmp', 'b.dmp']);
    expect(r.files?.winthorIni).toBe(true);
    expect(r.containers).toEqual({ oracle: 'running', wta: 'exited' });
    expect(r.wtaPort).toBe(8039);
  });

  it('Docker parado não vira objeto', () => {
    expect(parseDistroProbe('@@\n@@\n@@\n@@\n@@\n@@').docker).toBeUndefined();
  });
});

describe('comandos', () => {
  it('clone cria a pasta-mãe e já troca de branch', () => {
    const c = infrCloneCommand('C:\\projetos\\INFR-Docker');
    expect(c).toContain('New-Item -ItemType Directory -Force "C:\\projetos"');
    expect(c).toContain('git -C "C:\\projetos\\INFR-Docker" checkout feature/imagem-por-versao');
    expect(infrCheckoutCommand('D:\\x\\INFR-Docker')).toBe('git -C "D:\\x\\INFR-Docker" fetch origin; git -C "D:\\x\\INFR-Docker" checkout feature/imagem-por-versao');
  });

  it('import do dump pede a senha no terminal e nunca a recebe', () => {
    const input = { version: '39', file: 'loja.dmp', schema: 'local', codclipc: '9999' };
    expect(dumpImportError(input)).toBeNull();
    const cmd = dumpImportCommand(input);
    expect(cmd).toContain("read -r -s -p");
    expect(cmd).toContain('docker exec -it oracle-39 import_dump.sh system "$P" loja.dmp LOCAL 9999');
  });

  it('valida o formulário do dump', () => {
    expect(dumpImportError({ version: '39', file: '../x.dmp', schema: 'A', codclipc: '1' })).toContain('.dmp');
    expect(dumpImportError({ version: '39', file: 'x.dmp', schema: 'A;rm', codclipc: '1' })).toContain('Schema');
    expect(dumpImportError({ version: '39', file: 'x.dmp', schema: 'A', codclipc: '1a' })).toContain('codclipc');
    expect(dumpImportError({ version: 'x', file: 'x.dmp', schema: 'A', codclipc: '1' })).toContain('Versão');
  });

  it('applyEnvValues troca as chaves e mantém o resto', () => {
    const text = '# banco\nDB_HOST=oracle-master\nDB_PASSWORD=segredo\n';
    expect(applyEnvValues(text, { DB_HOST: 'oracle-39', NOVA: 'x' })).toBe('# banco\nDB_HOST=oracle-39\nDB_PASSWORD=segredo\n\nNOVA=x');
  });

  it('o .env da versão aponta para os containers e a porta dela', () => {
    const o = envOverridesFor('39');
    expect(o.wta).toEqual({ DB_HOST: 'oracle-39' });
    expect(o.wsh).toMatchObject({ WSH_CONTAINER: 'wsh-39', WTA_HOST: 'wta-39', SERVER_PORT: '9039' });
  });
});

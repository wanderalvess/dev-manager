import { describe, expect, it } from 'vitest';
import { buildStateScript, parseBuildState, reviewBuildState, type InfrBuildState } from './infrBuildState';
import type { InfrEnvironment } from './infrWinthorVersion';

const c = (name: string, image: string, state = 'running', ports = '') => ({ name, image, state, ports });
const envs = (over: InfrEnvironment[] = []): InfrEnvironment[] => [
  { name: 'master', oracle: c('oracle-master', 'oracle-winthor:11.2.0.2-xe'), wta: c('wta-master', 'linux-winthor:1.93-debian', 'running', '0.0.0.0:8040->8080/tcp'), wsh: c('wsh-master', 'wsh:1') },
  ...over
];
const base = { mode: 'update' as const, version: '40', name: 'homolog', from: 'master', withWsh: true };

describe('leitura do estado da distro', () => {
  it('o roteiro só roda com nomes válidos e só lê', () => {
    expect(buildStateScript({ name: 'x; rm -rf /', from: 'master' })).toBe('echo invalid');
    const s = buildStateScript({ name: 'homolog', from: 'master', wshJar: '/opt/wsh/40/winthor-integracao-core.jar' });
    expect(s).toContain("docker images --format '{{.Repository}}:{{.Tag}}|{{.ID}}'");
    expect(s).toContain('docker inspect -f');
    expect(s).toContain("grep -x 'wta-homolog-data'");
    expect(s).toContain("[ -f '/opt/wsh/40/winthor-integracao-core.jar' ]");
    expect(s).not.toMatch(/\brm\b|rmi|stop|prune/);
    // caminho de jar com aspas ou espaço não entra no roteiro
    expect(buildStateScript({ name: 'homolog', from: 'master', wshJar: "/opt/x'; rm -rf /" })).not.toContain('@@jar');
  });

  it('lê imagens, imagem da origem, volume e jar', () => {
    const st = parseBuildState(
      '@@img\nlinux-winthor:40-debian|aaa111bbb222\nlinux-winthor:1.93-debian|aaa111bbb222\n@@origem\nsha256:aaa111bbb222ccccdddd\n@@vol\nwta-homolog-data\n@@jar\nno\n@@fim\n'
    );
    expect(st.images).toEqual([
      { tag: 'linux-winthor:40-debian', id: 'aaa111bbb222' },
      { tag: 'linux-winthor:1.93-debian', id: 'aaa111bbb222' }
    ]);
    expect(st.originImageId).toBe('aaa111bbb222');
    expect(st.volumes).toEqual(['wta-homolog-data']);
    expect(st.jarExists).toBe(false);
  });
});

describe('conferências do que já existe na distro', () => {
  it('2: imagem da versão com o mesmo ID da origem avisa e mostra como tirar só o nome', () => {
    const state: InfrBuildState = { images: [{ tag: 'linux-winthor:40-debian', id: 'aaa' }, { tag: 'linux-winthor:1.93-debian', id: 'aaa' }], originImageId: 'aaa', volumes: [] };
    const item = reviewBuildState({ ...base, state, envs: envs() }).find((x) => x.id === 'imagemmesma');
    expect(item).toMatchObject({ status: 'warn' });
    expect(item?.detail).toContain('linux-winthor:1.93-debian');
    expect(item?.detail).toContain('wta-master');
    expect(item?.detail).toContain('docker rmi linux-winthor:40-debian');
    // imagem própria (ID diferente) ou sem imagem: nada a avisar; no Só clonar a conferência não vale
    const own: InfrBuildState = { images: [{ tag: 'linux-winthor:40-debian', id: 'bbb' }, { tag: 'linux-winthor:1.93-debian', id: 'aaa' }], originImageId: 'aaa', volumes: [] };
    expect(reviewBuildState({ ...base, state: own, envs: envs() }).some((x) => x.id === 'imagemmesma')).toBe(false);
    expect(reviewBuildState({ ...base, mode: 'clone', state, envs: envs() }).some((x) => x.id === 'imagemmesma')).toBe(false);
  });

  it('3: portas fixas da versão em uso por outro WTA bloqueiam no Atualizar; as do próprio ambiente não', () => {
    const other = envs([{ name: 'prod40', wta: c('wta-prod40', 'linux-winthor:40-debian', 'running', '0.0.0.0:8140->22/tcp, 0.0.0.0:1040->1040/tcp, 0.0.0.0:61640->61616/tcp') }]);
    const item = reviewBuildState({ ...base, envs: other }).find((x) => x.id === 'portasfixas');
    expect(item).toMatchObject({ status: 'block' });
    expect(item?.detail).toContain('SSH do Karaf 8140 (wta-prod40)');
    expect(item?.detail).toContain('docker stop wta-prod40');
    const mine = envs([{ name: 'homolog', wta: c('wta-homolog', 'linux-winthor:40-debian', 'running', '0.0.0.0:8140->22/tcp') }]);
    expect(reviewBuildState({ ...base, envs: mine }).some((x) => x.id === 'portasfixas')).toBe(false);
    // parado não ocupa a porta
    const stopped = envs([{ name: 'prod40', wta: c('wta-prod40', 'linux-winthor:40-debian', 'exited', '0.0.0.0:8140->22/tcp') }]);
    expect(reviewBuildState({ ...base, envs: stopped }).some((x) => x.id === 'portasfixas')).toBe(false);
  });

  it('4: container ou volume de tentativa anterior avisam e trazem o comando para recriar', () => {
    const prev = envs([{ name: 'homolog', wta: c('wta-homolog', 'linux-winthor:40-debian', 'exited'), wsh: c('wsh-homolog', 'wsh:1', 'exited') }]);
    const state: InfrBuildState = { images: [], volumes: ['wta-homolog-data'], forName: 'homolog' };
    const item = reviewBuildState({ ...base, state, envs: prev }).find((x) => x.id === 'recriar');
    expect(item).toMatchObject({ status: 'warn' });
    expect(item?.title).toContain('wta-homolog');
    expect(item?.detail).toContain('docker rm -f wta-homolog wsh-homolog');
    expect(item?.detail).toContain('docker volume rm wta-homolog-data');
    expect(item?.detail).toContain('rode você mesmo');
    // volume lido para outro nome não vale
    expect(reviewBuildState({ ...base, state: { ...state, forName: 'outro' }, envs: envs() }).some((x) => x.id === 'recriar')).toBe(false);
    expect(reviewBuildState({ ...base, state: { images: [], volumes: [], forName: 'homolog' }, envs: envs() }).some((x) => x.id === 'recriar')).toBe(false);
  });

  it('5: outro ambiente da mesma versão avisa que os arquivos por versão apontam para o banco novo', () => {
    const same = envs([{ name: 'prod40', wta: c('wta-prod40', 'linux-winthor:40-debian') }]);
    expect(reviewBuildState({ ...base, envs: same }).find((x) => x.id === 'arquivosenv')?.detail).toContain('prod40');
    expect(reviewBuildState({ ...base, envs: envs() }).some((x) => x.id === 'arquivosenv')).toBe(false);
  });

  it('8: jar inexistente ou wsh-<origem> ausente bloqueiam; sem WSH não se confere', () => {
    const noJar = reviewBuildState({ ...base, state: { images: [], volumes: [], jarExists: false }, envs: envs() }).find((x) => x.id === 'jarwsh');
    expect(noJar).toMatchObject({ status: 'block' });
    expect(noJar?.detail).toContain('jar do WSH escolhido não existe');
    const noOrigin = envs();
    noOrigin[0] = { ...noOrigin[0], wsh: undefined };
    expect(reviewBuildState({ ...base, envs: noOrigin }).find((x) => x.id === 'jarwsh')?.detail).toContain('wsh-master não existe');
    expect(reviewBuildState({ ...base, withWsh: false, envs: noOrigin }).some((x) => x.id === 'jarwsh')).toBe(false);
    expect(reviewBuildState({ ...base, state: { images: [], volumes: [], jarExists: true }, envs: envs() }).some((x) => x.id === 'jarwsh')).toBe(false);
  });
});

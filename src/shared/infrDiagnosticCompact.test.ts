import { describe, expect, it } from 'vitest';
import { buildCompactDiagnostic, parseDiagnosticProbe, type DiagnosticInput } from './infrDiagnostic';

/** Cenário do Nathan: script sem --version, banco criado, WTA e WSH ausentes, [ERRO] no log da criação. */
const nathan = (over: Partial<DiagnosticInput> = {}): DiagnosticInput => ({
  generatedAt: '2026-11-03 18:20',
  hubVersion: '1.67.0',
  os: 'Windows_NT 10.0.19045 x64',
  name: 'homolog',
  distro: 'ubuntu2604-winthor-nathan',
  infrPath: 'C:\\Projetos\\INFR-Docker',
  summary: { status: 'fail', title: 'A criação parou antes de terminar', detail: 'Criado: Banco Oracle. Falta: WTA, WSH.' },
  git: { branch: 'feature/imagem-por-versao', commit: '883b3a4 2026-11-03 fix', changes: [' M linux-winthor/scripts/wta_setup.sh'] },
  scripts: [
    { script: 'wta_setup.sh', path: 'linux-winthor/scripts/wta_setup.sh', exists: true, bytes: 4100, modified: '2026-10-01 10:00', missing: ['--version', '--distro'] },
    { script: 'new_version_env.sh', path: 'linux-winthor/scripts/new_version_env.sh', exists: true, bytes: 9000, modified: '2026-11-03 09:00', missing: [] }
  ],
  gapsMessage: 'linux-winthor/scripts/wta_setup.sh não conhece --version, --distro',
  files: [{ label: 'linux-winthor/wta.env.40', exists: false }],
  containers: [
    { name: 'oracle-homolog', exists: true, state: 'running', health: 'healthy', restarts: 0, image: 'oracle-winthor:11.2.0.2-xe', ports: [] },
    { name: 'wta-homolog', exists: false, ports: [] },
    { name: 'wsh-homolog', exists: false, ports: [] }
  ],
  probe: parseDiagnosticProbe(
    '@@imagens\nlinux-winthor:40-debian | criada 3 hours ago | 2GB\n@@erros\n12:[ERRO] Flag desconhecida: --version\n@@log\n4/5 WTA wta-homolog\n[ERRO] Flag desconhecida: --version\n@@fim\n'
  ),
  buildLog: { path: '/tmp/hub-nova-versao-homolog.log', failure: '[ERRO] Flag desconhecida: --version', stage: '4/5 WTA wta-homolog' },
  notes: 'Mensagem da criação: ok\nAuthorization: Basic dXNlcjpwYXNz\nrepo http://deploy:S3nh4Secreta@nexus.exemplo.com/repository/releases',
  ...over
});

describe('relatório compacto para a IA', () => {
  it('traz as evidências do cenário do Nathan', () => {
    const text = buildCompactDiagnostic(nathan());
    expect(text).toContain('fail: A criação parou antes de terminar');
    expect(text).toContain('SCRIPTS DESATUALIZADOS');
    expect(text).toContain('linux-winthor/scripts/wta_setup.sh (modificado 2026-10-01 10:00): não conhece --version, --distro');
    expect(text).toContain('branch feature/imagem-por-versao');
    expect(text).toContain('Alterações locais (1)');
    expect(text).toContain('- oracle-homolog: running/healthy');
    expect(text).toContain('- wta-homolog: não existe');
    expect(text).toContain('[ERRO] Flag desconhecida: --version');
    expect(text).toContain('última etapa 4/5 WTA wta-homolog');
    expect(text).toContain('Arquivos de configuração ausentes: linux-winthor/wta.env.40');
  });

  it('nenhum segredo sai: nem Authorization, nem usuário:senha@, nem senha em log', () => {
    const text = buildCompactDiagnostic(nathan());
    expect(text).not.toMatch(/dXNlcjpwYXNz|S3nh4Secreta/);
    expect(text).toContain('Authorization: Basic ***');
    const withLog = buildCompactDiagnostic(nathan({ probe: parseDiagnosticProbe('@@log\nDB_PASSWORD=pcinfo\nhttp://u:pw123@nexus.exemplo.com/x\n@@fim\n') }));
    expect(withLog).not.toMatch(/pcinfo|pw123/);
  });

  it('com log gigante continua em até 8 mil caracteres, com o essencial no começo', () => {
    const big = Array.from({ length: 5000 }, (_, n) => `linha ${n} ${'x'.repeat(300)}`).join('\n');
    const text = buildCompactDiagnostic(
      nathan({
        probe: parseDiagnosticProbe(`@@erros\n${big}\n@@log\n${big}\n@@c oracle-homolog\n${big}\n@@fim\n`),
        containers: [{ name: 'oracle-homolog', exists: true, state: 'exited', restarts: 3, image: 'x', ports: [] }],
        notes: big
      })
    );
    expect(text.length).toBeLessThanOrEqual(8000);
    expect(text).toContain('SCRIPTS DESATUALIZADOS');
  });

  it('fica na faixa de 1 a 8 mil caracteres no caso normal', () => {
    const text = buildCompactDiagnostic(nathan());
    expect(text.length).toBeGreaterThan(500);
    expect(text.length).toBeLessThanOrEqual(8000);
  });

  it('sem log da criação, diz isso; scripts em dia não geram alerta', () => {
    const text = buildCompactDiagnostic(nathan({ gapsMessage: undefined, scripts: [], buildLog: undefined }));
    expect(text).toContain('Não há log da criação');
    expect(text).not.toContain('SCRIPTS DESATUALIZADOS');
  });
});

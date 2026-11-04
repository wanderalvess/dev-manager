import { describe, expect, it } from 'vitest';
import { buildDiagnosticReport, diagnosticProbeScript, maskDiagnostic, maskEnvText, parseDiagnosticProbe, type DiagnosticInput } from './infrDiagnostic';

describe('máscara do relatório', () => {
  it('esconde senha, token, usuário:senha@ em URL, Authorization e conexão do Oracle', () => {
    expect(maskDiagnostic('repo http://deploy:S3nh4Secreta@nexus.exemplo.com/repository/releases')).toBe('repo http://***@nexus.exemplo.com/repository/releases');
    expect(maskDiagnostic('Authorization: Basic dXNlcjpwYXNz')).toBe('Authorization: Basic ***');
    expect(maskDiagnostic('DB_PASSWORD=pcinfo e senha: abc123 e token=xyz')).not.toMatch(/pcinfo|abc123|xyz/);
    expect(maskDiagnostic('./restore_rman.sh --origem a --destino b --usuario LOCAL --senha pcinfo2')).not.toContain('pcinfo2');
    expect(maskDiagnostic('./restore_rman.sh --usuario LOCAL --senha pcinfo2')).toContain('--usuario LOCAL');
    expect(maskDiagnostic('sqlplus system/pcinfo@XE')).toBe('sqlplus system/***@XE');
    expect(maskDiagnostic('DB_PASS=abc e pass: def')).not.toMatch(/abc|def/);
    // palavras comuns que só contêm "pass" ou "token" ficam como estão
    expect(maskDiagnostic('health check passed: 5 tests; tokens: 120; bypass: on')).toBe('health check passed: 5 tests; tokens: 120; bypass: on');
    // não estraga a URL do Nexus com opções do pax-url nem o nome de imagem
    expect(maskDiagnostic('https://nexus.exemplo.com/repository/releases@id=rel')).toBe('https://nexus.exemplo.com/repository/releases@id=rel');
    expect(maskDiagnostic('linux-winthor:40-debian | criada 2 hours ago')).toBe('linux-winthor:40-debian | criada 2 hours ago');
  });

  it('arquivo .env: some o valor das chaves de senha, token e chave; o resto fica', () => {
    const masked = maskEnvText('DB_HOST=oracle-homolog\nDB_PASSWORD=pcinfo\nWTA_API_KEY=abc\nexport NEXUS_TOKEN=t0k\nDB_PORT=1521\n# comentário\n');
    expect(masked).toContain('DB_HOST=oracle-homolog');
    expect(masked).toContain('DB_PORT=1521');
    expect(masked).toContain('DB_PASSWORD=***');
    expect(masked).toContain('WTA_API_KEY=***');
    expect(masked).toContain('export NEXUS_TOKEN=***');
    expect(masked).not.toMatch(/pcinfo|abc\b|t0k/);
  });
});

describe('coleta na distro', () => {
  it('o roteiro só roda com nome válido e lê containers, imagens, disco e o log da criação', () => {
    expect(diagnosticProbeScript('x; rm -rf /', '/tmp/a.log')).toBe('echo invalid-name');
    const script = diagnosticProbeScript('homolog', '/tmp/hub-nova-versao-homolog.log');
    for (const part of ['docker logs --tail 80 oracle-homolog', 'docker logs --tail 80 wta-homolog', 'docker logs --tail 80 wsh-homolog', "f='/tmp/hub-nova-versao-homolog.log'", '"$f.prev"', 'Flag desconhecida']) {
      expect(script).toContain(part);
    }
  });

  it('separa as seções, inclusive as de cada container', () => {
    const s = parseDiagnosticProbe('@@sistema\nLinux 6\n@@c oracle-homolog\nlinha 1\nlinha 2\n@@erros\n@@fim\nlixo depois do fim\n');
    expect(s.get('sistema')).toEqual(['Linux 6']);
    expect(s.get('c oracle-homolog')).toEqual(['linha 1', 'linha 2']);
    expect(s.get('erros')).toEqual([]);
    expect([...s.keys()]).not.toContain('fim');
  });
});

const input = (over: Partial<DiagnosticInput> = {}): DiagnosticInput => ({
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
  files: [{ label: 'linux-winthor/wta.env.40', exists: true, modified: '2026-11-03 17:00', lines: ['DB_HOST=oracle-homolog', 'DB_PASSWORD=pcinfo'] }],
  containers: [
    { name: 'oracle-homolog', exists: true, state: 'running', health: 'healthy', restarts: 0, image: 'oracle-winthor:11.2.0.2-xe', ports: ['1521/tcp -> 0.0.0.0:1590'] },
    { name: 'wta-homolog', exists: false, ports: [] }
  ],
  probe: parseDiagnosticProbe(
    '@@sistema\nLinux 5.15\n@@imagens\nlinux-winthor:40-debian | criada 3 hours ago | 2GB\n@@ps\noracle-homolog | oracle-winthor | Up 2 hours | 1521\n@@c oracle-homolog\nDATABASE READY\n' +
      '@@erros\n12:[ERRO] Flag desconhecida: --version\n@@log\n4/5 WTA wta-homolog\n[ERRO] Flag desconhecida: --version\n@@anterior\n[ERRO] Unable to resolve root\n'
  ),
  buildLog: { path: '/tmp/hub-nova-versao-homolog.log', failure: '[ERRO] Flag desconhecida: --version', stage: '4/5 WTA wta-homolog' },
  notes: 'Mensagem da criação: ok\nAuthorization: Basic dXNlcjpwYXNz',
  ...over
});

describe('relatório para suporte', () => {
  it('traz resumo, pasta, scripts desatualizados, containers e os dois logs da criação', () => {
    const text = buildDiagnosticReport(input());
    expect(text).toContain('# Relatório do Hub Manager: ambiente homolog');
    expect(text).toContain('Hub 1.67.0');
    expect(text).toContain('**fail**: A criação parou antes de terminar');
    expect(text).toContain('Branch: feature/imagem-por-versao');
    expect(text).toContain('M linux-winthor/scripts/wta_setup.sh');
    expect(text).toContain('**DESATUALIZADO**: linux-winthor/scripts/wta_setup.sh não conhece --version, --distro');
    expect(text).toContain('| linux-winthor/scripts/wta_setup.sh | 4100 B | 2026-10-01 10:00 | --version, --distro |');
    expect(text).toContain('### oracle-homolog: running / healthy');
    expect(text).toContain('### wta-homolog: não existe');
    expect(text).toContain('Primeiros erros, com contexto');
    expect(text).toContain('Criação anterior');
    expect(text).toContain('Unable to resolve root');
  });

  it('nenhum segredo sai: nem do .env, nem das anotações da tela', () => {
    const text = buildDiagnosticReport(input({ files: [{ label: 'wta.env.40', exists: true, lines: [maskEnvText('DB_PASSWORD=pcinfo')] }] }));
    expect(text).not.toMatch(/pcinfo|dXNlcjpwYXNz/);
    expect(text).toContain('Authorization: Basic ***');
  });

  it('sem script desatualizado, diz que todos conhecem; sem log da criação, explica', () => {
    const text = buildDiagnosticReport(input({ gapsMessage: undefined, buildLog: undefined, git: { changes: [], error: 'não deu para rodar o git' } }));
    expect(text).toContain('Todos os scripts conhecem as opções que o Hub passa.');
    expect(text).toContain('Não há log da criação deste ambiente');
    expect(text).toContain('Git: não deu para rodar o git');
  });

  it('relatório enorme é cortado no meio, mantendo o começo e o fim', () => {
    const big = Array.from({ length: 20000 }, (_, n) => `linha ${n} de log com bastante texto para encher`).join('\n');
    const text = buildDiagnosticReport(input({ notes: big }));
    expect(text.length).toBeLessThan(160000);
    expect(text).toContain('relatório cortado');
    expect(text).toContain('# Relatório do Hub Manager');
    expect(text).toContain('linha 19999');
  });
});

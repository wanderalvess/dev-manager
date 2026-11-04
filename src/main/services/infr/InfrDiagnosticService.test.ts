import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const execWsl = vi.fn(async (..._args: unknown[]) => ({ stdout: '' }));
vi.mock('../../utils/wslExec', async (orig) => ({ ...(await orig<object>()), execWsl }));
const execFileAsync = vi.fn(async (..._args: unknown[]) => ({ stdout: '' }));
vi.mock('../../utils/security', async (orig) => ({ ...(await orig<object>()), execFileAsync }));

const { InfrDiagnosticService } = await import('./InfrDiagnosticService');
const { INFR_SCRIPT_PATHS } = await import('../../../shared/infrScriptSupport');

const ALL_FLAGS = [
  '--container', '--port', '--version', '--distro', '--ssh-port', '--jmx-port', '--jms-port', '--origem', '--destino', '--usuario', '--senha',
  '--name', '--from', '--wsh-jar', '--db-mode', '--db-source', '--db-container', '--wta-from', '--wsh-from', '--oracle-port', '--wta-port', '--wsh-port'
];
const PROBE =
  '@@sistema\nLinux 5.15\n@@imagens\nlinux-winthor:40-debian | criada 3 hours ago | 2GB\n@@ps\noracle-homolog | oracle-winthor | Up 2 hours | 1521\n' +
  '@@c oracle-homolog\nDATABASE IS READY TO USE!\n@@erros\n40:[ERRO] Flag desconhecida: --version\n@@log\n4/5 WTA wta-homolog\n[ERRO] Flag desconhecida: --version\n@@anterior\n@@fim\n';

const check = {
  success: true,
  distro: 'ubuntu2604-winthor-nathan',
  name: 'homolog',
  checkedAt: '2026-11-03T18:00:00Z',
  containers: [
    { role: 'oracle', container: 'oracle-homolog', exists: true, state: 'running', health: 'healthy', restarts: 0, image: 'oracle-winthor:11.2.0.2-xe', ports: [], logTail: [] },
    { role: 'wta', container: 'wta-homolog', exists: false, ports: [], logTail: [] },
    { role: 'wsh', container: 'wsh-homolog', exists: false, ports: [], logTail: [] }
  ],
  buildLog: { path: '/tmp/hub-nova-versao-homolog.log', exists: true, failure: '[ERRO] Flag desconhecida: --version', stage: '4/5 WTA wta-homolog', tail: [] },
  summary: { status: 'fail', title: 'A criação parou antes de terminar', detail: 'Criado: Banco Oracle. Falta: WTA, WSH.' }
};

describe('InfrDiagnosticService: relatório para suporte', () => {
  let infr: string;
  let data: string;
  const service = () =>
    new InfrDiagnosticService(
      { resolveInfrPaths: () => ({ windows: infr, wsl: '/mnt/c/Projetos/INFR-Docker' }) } as any,
      { check: vi.fn(async () => check) } as any,
      { hubVersion: () => '1.67.0', dataDir: () => data }
    );
  const writeScript = (script: string, text: string) => {
    const file = path.join(infr, INFR_SCRIPT_PATHS[script]);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  };

  beforeEach(() => {
    infr = fs.mkdtempSync(path.join(os.tmpdir(), 'infr-diag-'));
    data = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-data-'));
    execWsl.mockReset().mockResolvedValue({ stdout: PROBE });
    execFileAsync.mockReset().mockImplementation(async (_cmd: unknown, args: unknown) => {
      const a = args as string[];
      if (a.includes('rev-parse')) return { stdout: 'feature/imagem-por-versao\n' };
      if (a.includes('log')) return { stdout: '883b3a4 2026-11-03 fix(oracle-winthor)\n' };
      return { stdout: ' M linux-winthor/scripts/wta_setup.sh\n' };
    });
    for (const s of Object.keys(INFR_SCRIPT_PATHS)) writeScript(s, ALL_FLAGS.map((f) => `${f}) ;;`).join('\n'));
    // O wta_setup.sh do Nathan: anterior à imagem por versão
    writeScript('wta_setup.sh', '--container) ;;\n--port) ;;\n*) echo "[ERRO] Flag desconhecida: $1" ;;');
    fs.writeFileSync(path.join(infr, 'linux-winthor', 'wta.env.40'), 'DB_HOST=oracle-homolog\nDB_USER=LOCAL\nDB_PASSWORD=pcinfo\n');
    fs.mkdirSync(path.join(infr, 'linux-winthor', 'versions'), { recursive: true });
    fs.writeFileSync(path.join(infr, 'linux-winthor', 'versions', '40.features'), 'repo mvn:g/a/1/xml/features\nrepo mvn:g/b/1/xml/features\nfeature a 1\n');
  });
  afterEach(() => {
    fs.rmSync(infr, { recursive: true, force: true });
    fs.rmSync(data, { recursive: true, force: true });
  });

  it('aponta o script desatualizado, a branch, os containers e o log da criação, sem a senha do .env', async () => {
    const res = await service().build({ name: 'homolog', version: '40', notes: 'Mensagem da criação: parou' });
    expect(res.success).toBe(true);
    const text = res.text as string;
    expect(text).toContain('Hub 1.67.0');
    expect(text).toContain('Branch: feature/imagem-por-versao · commit: 883b3a4');
    expect(text).toContain('M linux-winthor/scripts/wta_setup.sh');
    expect(text).toContain('**DESATUALIZADO**');
    expect(text).toMatch(/linux-winthor\/scripts\/wta_setup\.sh \| \d+ B \| [\d-]+ [\d:]+ \| --version, --distro, --ssh-port, --jmx-port, --jms-port/);
    expect(text).toContain('### oracle-homolog: running / healthy');
    expect(text).toContain('### wta-homolog: não existe');
    expect(text).toContain('[ERRO] Flag desconhecida: --version');
    expect(text).toContain('2 repositórios e 1 features');
    expect(text).toContain('DB_HOST=oracle-homolog');
    expect(text).toContain('DB_PASSWORD=***');
    expect(text).not.toContain('pcinfo');
    expect(text).toContain('Mensagem da criação: parou');
  });

  it('para a IA devolve só a versão compacta (sem segredo) e não guarda arquivo', async () => {
    const res = await service().build({ name: 'homolog', version: '40', forAi: true });
    expect(res.success).toBe(true);
    expect(res.text).toBeUndefined();
    expect(res.path).toBeUndefined();
    const compact = res.compact as string;
    expect(compact.length).toBeLessThanOrEqual(8000);
    expect(compact).toContain('SCRIPTS DESATUALIZADOS');
    expect(compact).toContain('[ERRO] Flag desconhecida: --version');
    expect(compact).not.toContain('pcinfo');
    expect(fs.existsSync(path.join(data, 'diagnosticos'))).toBe(false);
  });

  it('guarda o arquivo na pasta de dados e mantém só os 20 mais recentes', async () => {
    const dir = path.join(data, 'diagnosticos');
    fs.mkdirSync(dir, { recursive: true });
    for (let n = 0; n < 25; n++) {
      const f = path.join(dir, `infr-velho-${n}.md`);
      fs.writeFileSync(f, 'x');
      fs.utimesSync(f, new Date(2026, 0, 1, 0, 0, n), new Date(2026, 0, 1, 0, 0, n));
    }
    const res = await service().build({ name: 'homolog' });
    expect(res.path && fs.existsSync(res.path)).toBe(true);
    expect(path.basename(res.path as string)).toMatch(/^infr-homolog-\d{8}-\d{6}\.md$/);
    expect(fs.readFileSync(res.path as string, 'utf-8')).toBe(res.text);
    expect(fs.readdirSync(dir)).toHaveLength(20);
    expect(fs.existsSync(path.join(dir, 'infr-velho-0.md'))).toBe(false);
  });

  it('sem o git do Windows, a branch sai do .git/HEAD e o relatório diz o que ficou sem leitura', async () => {
    execFileAsync.mockRejectedValue(new Error('git não encontrado'));
    fs.mkdirSync(path.join(infr, '.git'));
    fs.writeFileSync(path.join(infr, '.git', 'HEAD'), 'ref: refs/heads/develop\n');
    const res = await service().build({ name: 'homolog' });
    expect(res.text).toContain('Branch: develop');
    expect(res.text).toContain('não deu para rodar o git');
  });

  it('falha da distro entra no relatório em vez de derrubá-lo; nome inválido e pasta inválida recusam', async () => {
    execWsl.mockRejectedValue(new Error('distro parada'));
    const res = await service().build({ name: 'homolog' });
    expect(res.success).toBe(true);
    expect(res.text).toContain('Não foi possível ler o Docker na distro');
    expect((await service().build({ name: 'x; rm -rf /' })).success).toBe(false);
    const semPasta = new InfrDiagnosticService({ resolveInfrPaths: () => null } as any, { check: vi.fn() } as any, { hubVersion: () => '1', dataDir: () => data });
    expect((await semPasta.build({ name: 'homolog' })).error).toContain('Pasta do INFR-Docker inválida');
  });
});

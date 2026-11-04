import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const execFileAsync = vi.fn(async (..._args: unknown[]) => ({ stdout: '' }));
vi.mock('../utils/security', async (orig) => ({ ...(await orig<object>()), execFileAsync }));
const spawn = vi.fn((..._args: unknown[]) => ({ on: vi.fn(), unref: vi.fn() }));
vi.mock('child_process', async (orig) => ({ ...(await orig<object>()), spawn }));

const { WslService } = await import('./WslService');
const { INFR_SCRIPT_PATHS } = await import('../../shared/infrScriptSupport');

const FLAGS = [
  '--container', '--port', '--version', '--distro', '--ssh-port', '--jmx-port', '--jms-port', '--origem', '--destino', '--usuario', '--senha',
  '--name', '--from', '--wsh-jar', '--db-mode', '--db-source', '--db-container', '--wta-from', '--wsh-from', '--oracle-port', '--wta-port', '--wsh-port'
];

describe('Criar uma versão nova: o log do Criação anterior sai antes do terminal', () => {
  let dir: string;
  const request = () => ({ distro: 'ubuntu2604-winthor', infrPath: dir, winthorVersion: '40', newEnv: { name: 'homolog', from: 'master', dbMode: 'clone' as const, dbSource: 'oracle-master' } });
  const writeScripts = (text: string) => {
    for (const rel of Object.values(INFR_SCRIPT_PATHS)) {
      fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      fs.writeFileSync(path.join(dir, rel), text);
    }
  };

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'infr-log-'));
    execFileAsync.mockClear();
    spawn.mockClear();
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('tira /tmp/hub-nova-versao-<nome>.log do caminho (fica como .prev) e só depois abre o terminal', async () => {
    writeScripts(FLAGS.map((f) => `${f}) ;;`).join('\n'));
    const res = await new WslService().runInfrSetupScript('version', request());
    expect(res.success).toBe(true);
    const mv = execFileAsync.mock.calls.find((c) => (c[1] as string[]).includes('sh'));
    expect(mv?.[0]).toBe('wsl.exe');
    const log = '/tmp/hub-nova-versao-homolog.log';
    expect((mv?.[1] as string[]).at(-1)).toBe(`[ -f ${log} ] && mv -f ${log} ${log}.prev; true`);
    expect(execFileAsync.mock.invocationCallOrder[0]).toBeLessThan(spawn.mock.invocationCallOrder[0]);
  });

  it('script da pasta sem as opções (o do Nathan): não apaga nada e não abre o terminal', async () => {
    writeScripts('--container) ;;\n--port) ;;');
    const res = await new WslService().runInfrSetupScript('version', request());
    expect(res.success).toBe(false);
    expect(res.output).toContain('estão desatualizados');
    expect(execFileAsync).not.toHaveBeenCalled();
    expect(spawn).not.toHaveBeenCalled();
  });
});

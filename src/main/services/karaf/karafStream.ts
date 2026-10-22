import crypto from 'crypto';
import path from 'path';
import type { ChildProcess } from 'child_process';
import { getKarafSshPort } from '../../../shared/types';
import { killProcessTree } from '../../utils/process';
import { parseKarafStreamCommand } from '../../utils/karafStreamCommand';
import { runClientProcess } from './karafExecute';
import type { ChunkHandler, KarafContext, KarafCredentials } from './karafContext';

const MAX_STREAMS = 3;

export type KarafStreamStart = { success: true; id: string } | { success: false; error: string };

/** Comandos do Karaf que ficam rodando (log:tail): um processo do client por stream, parado por id. */
export class KarafStreamManager {
  private streams = new Map<string, { child: ChildProcess; command: string }>();

  public list(): { id: string; command: string }[] {
    return [...this.streams].map(([id, s]) => ({ id, command: s.command }));
  }

  public async start(
    ctx: KarafContext,
    rawCommand: string,
    onChunk: ChunkHandler,
    onEnd: (id: string, code: number) => void,
    credentials?: KarafCredentials
  ): Promise<KarafStreamStart> {
    const parsed = parseKarafStreamCommand(rawCommand);
    if (!parsed.ok) return { success: false, error: parsed.error };
    if (this.streams.size >= MAX_STREAMS) {
      return { success: false, error: `Limite de ${MAX_STREAMS} streams simultâneos. Pare um antes de abrir outro.` };
    }

    const settings = ctx.getSettings();
    const karafClient = ctx.getKarafClientExecutable();
    if (!karafClient) {
      return { success: false, error: `Executável client do Karaf não encontrado em: ${path.join(settings.karafPath, 'bin')}` };
    }
    const sshPort = credentials?.port || getKarafSshPort(settings);
    if (!(await ctx.isKarafRunning(sshPort))) {
      return { success: false, error: `Karaf não está em execução (porta SSH ${sshPort} inacessível).` };
    }

    const user = credentials?.user || settings.karafUser || 'karaf';
    const pass = credentials?.pass || settings.karafPass || 'karaf';
    const portArgs = sshPort && sshPort !== 8101 ? ['-a', String(sshPort)] : [];
    const clientArgs = ['-u', user, '-p', pass, ...portArgs, parsed.command];

    const id = crypto.randomUUID();
    onChunk(`> ${path.basename(karafClient)} -u ${user} -p ****${sshPort !== 8101 ? ` -a ${sshPort}` : ''} "${parsed.command}"\r\n`);
    // Sem timeout: o stream só termina por stop() ou quando o Karaf fecha a sessão.
    void runClientProcess(settings, karafClient, clientArgs, ctx.getResolvedJavaEnv(undefined, true), onChunk, undefined, (child) => {
      this.streams.set(id, { child, command: parsed.command });
    }).then((res) => {
      this.streams.delete(id);
      onEnd(id, res.code);
    });
    return { success: true, id };
  }

  public stop(id: string): boolean {
    const stream = this.streams.get(id);
    if (!stream?.child.pid) return false;
    killProcessTree(stream.child.pid);
    return true;
  }

  public stopAll(): void {
    for (const id of [...this.streams.keys()]) this.stop(id);
  }
}

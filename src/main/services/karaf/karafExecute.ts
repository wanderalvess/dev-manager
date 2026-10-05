import path from 'path';
import fs from 'fs';
import { AppSettings, getKarafSshPort, OsgiResolutionDiagnosticSummary } from '../../../shared/types';
import { isSafeKarafCommand } from '../../utils/security';
import { CapturedProcessResult, runCapturedProcess } from '../../utils/process';
import { diagnoseKarafResolutionError } from '../../utils/karafResolutionParser';
import { isWslKaraf, resolveKarafWslClient, resolveKarafWslLogPath, buildWslClientArgs } from '../../utils/karafWslUtils';
import {
  filterBenignStderr,
  findKarafErrorMatch,
  isHeavyKarafCommand,
  stripAnsiSequences,
  toResolutionSummary
} from '../../utils/karafCommandUtils';
import { listLocalProjectsFast, tryFindPomXml } from './karafProjectFiles';
import type { ChunkHandler, KarafCommandResult, KarafContext, KarafCredentials } from './karafContext';

async function runClientProcess(
  settings: AppSettings,
  karafClient: string,
  clientArgs: string[],
  childEnv: NodeJS.ProcessEnv,
  onChunk: ChunkHandler,
  effectiveTimeoutMs: number
): Promise<CapturedProcessResult> {
  const isWin = process.platform === 'win32';
  const isWsl = isWslKaraf(settings);
  return isWsl
    ? await (() => {
        const wslClient = resolveKarafWslClient(settings);
        const targetDistro = wslClient?.distro || settings.karafWslDistro!;
        const targetClient = wslClient?.linuxClientPath || karafClient;
        const wslCmd = buildWslClientArgs(targetDistro, targetClient, clientArgs);
        return runCapturedProcess(wslCmd.command, wslCmd.args, { env: childEnv }, onChunk, effectiveTimeoutMs);
      })()
    : isWin
      ? await runCapturedProcess('cmd.exe', ['/c', karafClient, ...clientArgs], { cwd: path.dirname(karafClient), env: childEnv }, onChunk, effectiveTimeoutMs)
      : await runCapturedProcess(karafClient, clientArgs, { cwd: path.dirname(karafClient), env: childEnv }, onChunk, effectiveTimeoutMs);
}

function emitTimeoutHint(command: string, res: CapturedProcessResult, effectiveTimeoutMs: number, onChunk: ChunkHandler): void {
  if (res.timedOut || (res.code !== 0 && res.stderr?.includes('Processo encerrado por timeout'))) {
    if (isHeavyKarafCommand(command)) {
      onChunk(
        `\r\n💡 [DICA DE TIMEOUT] O comando Karaf excedeu o tempo limite (${effectiveTimeoutMs / 1000}s).\r\n` +
        `   Comandos como "feature:install" frequentemente entram em timeout quando o Karaf tenta baixar dependências ausentes\r\n` +
        `   em repositórios remotos (Pax URL/Nexus) que demoram a responder ou exigem autenticação.\r\n` +
        `   Verifique se as dependências do projeto foram instaladas previamente no Karaf ou estão disponíveis no Maven local (~/.m2/repository).\r\n`
      );
    }
  }
}

function buildErrorResult(
  ctx: KarafContext,
  settings: AppSettings,
  command: string,
  context: { projectPath?: string; pomXmlContent?: string } | undefined,
  onChunk: ChunkHandler,
  res: CapturedProcessResult,
  cleanStderr: string,
  cleanCombined: string,
  karafErrorMatch: RegExpMatchArray
): KarafCommandResult {
  const errLine = karafErrorMatch[0].trim();
  const finalStderr = cleanStderr && cleanStderr.trim().length > 0 ? `${cleanStderr}\r\n${errLine}` : errLine;

  let resolutionDiagSummary: OsgiResolutionDiagnosticSummary | undefined;
  const isResolutionErr = /ResolutionException|Unable to resolve|missing requirement/i.test(cleanCombined);
  if (isResolutionErr) {
    const pomXmlContent = context?.pomXmlContent || tryFindPomXml(ctx, context?.projectPath, command);
    const diag = diagnoseKarafResolutionError({
      rawOutput: cleanCombined,
      pomXmlContent,
      deployProfiles: settings.deployProfiles,
      projects: listLocalProjectsFast(ctx)
    });

    if (diag) {
      onChunk(diag.formattedBanner);
      resolutionDiagSummary = toResolutionSummary(diag);
    }
  }

  if (/No matching features for/i.test(errLine)) {
    onChunk(`\r\n💡 [DICA] O Karaf não encontrou a feature no repositório. Verifique se o atributo name="..." no features.xml do projeto coincide com o nome informado no comando.\r\n`);
  } else if (/Failed to get the session|Connection refused|ConnectException|Session is closed/i.test(errLine)) {
    onChunk(`\r\n💡 [DICA] O cliente Karaf não conseguiu estabelecer sessão com o contêiner OSGi. Verifique se o Karaf está rodando e com a porta SSH ativa.\r\n`);
  }

  return {
    code: res.code !== 0 ? res.code : 1,
    stdout: res.stdout,
    stderr: finalStderr,
    resolutionDiagnostic: resolutionDiagSummary
  };
}

// Fallback inteligente para comandos de log caso a saída via SSH esteja vazia
function buildLogDisplayFallback(settings: AppSettings, command: string, onChunk: ChunkHandler): KarafCommandResult {
  const wslLog = isWslKaraf(settings) ? resolveKarafWslLogPath(settings) : null;
  const candidates = [
    ...(wslLog ? [wslLog] : []),
    path.join(settings.karafPath, 'data', 'log', 'winthor.log'),
    path.join(settings.karafPath, 'data', 'log', 'karaf.log')
  ];
  for (const logFile of candidates) {
    if (fs.existsSync(logFile)) {
      try {
        const content = fs.readFileSync(logFile, 'utf-8');
        const allLines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
        const nMatch = command.match(/-n\s+(\d+)/);
        const count = nMatch ? parseInt(nMatch[1], 10) : 50;
        const tailLines = allLines.slice(-count);
        if (tailLines.length > 0) {
          const note = `[INFO] Buffer em memória vazio. Exibindo últimas ${tailLines.length} linhas de ${path.basename(logFile)}:\r\n\r\n`;
          onChunk(note);
          const outputText = tailLines.join('\r\n') + '\r\n';
          onChunk(outputText);
          return { code: 0, stdout: note + outputText, stderr: '' };
        }
      } catch {
        // Ignora falha de leitura
      }
    }
  }
  const emptyNote = `[INFO] O buffer de logs em memória do Karaf está vazio no momento (nenhum registro recente).\r\n`;
  onChunk(emptyNote);
  return { code: 0, stdout: emptyNote, stderr: '' };
}

export async function executeKarafCommand(
  ctx: KarafContext,
  command: string,
  onChunk: ChunkHandler,
  credentials?: KarafCredentials,
  timeoutMs?: number,
  context?: { projectPath?: string; pomXmlContent?: string }
): Promise<KarafCommandResult> {
  if (!isSafeKarafCommand(command)) {
    const errMsg = `[ERRO DE SEGURANÇA] Comando Karaf rejeitado: contém caracteres de controle proibidos ou formato inválido.\r\n`;
    onChunk(errMsg);
    return { code: 1, stdout: '', stderr: errMsg };
  }

  const settings = ctx.getSettings();
  const karafClient = ctx.getKarafClientExecutable();
  const user = credentials?.user || settings.karafUser || 'karaf';
  const pass = credentials?.pass || settings.karafPass || 'karaf';
  const sshPort = credentials?.port || getKarafSshPort(settings);

  if (!karafClient) {
    const errMsg = `[ERRO] Executável client do Karaf não encontrado em: ${path.join(settings.karafPath, 'bin')}\r\n`;
    onChunk(errMsg);
    return { code: 1, stdout: '', stderr: errMsg };
  }

  // Valida se o contêiner OSGi está de fato em execução antes de acionar client.bat.
  // client.bat frequentemente retorna exit code 0 com "Failed to get the session." quando
  // o Karaf está offline, gerando falsos positivos na automação.
  const isOnline = await ctx.isKarafRunning(sshPort);
  if (!isOnline) {
    const errMsg = `[ERRO] O contêiner Apache Karaf/OSGi não está em execução (porta SSH ${sshPort} inacessível).\r\n💡 [DICA] Inicie o Karaf pelo Cockpit (Console Karaf ou pipeline de ambiente) antes de executar comandos ou deploys.\r\n`;
    onChunk(errMsg);
    return { code: 1, stdout: '', stderr: `Karaf OSGi offline: porta SSH ${sshPort} fechada` };
  }

  const scriptName = path.basename(karafClient);
  const portDesc = sshPort && sshPort !== 8101 ? ` -a ${sshPort}` : '';
  onChunk(`> ${scriptName} -u ${user} -p ****${portDesc} "${command}"\r\n`);

  const clientArgs = sshPort && sshPort !== 8101
    ? ['-u', user, '-p', pass, '-a', String(sshPort), command]
    : ['-u', user, '-p', pass, command];

  // isClient: true garante que o client.bat não carregue o agente OpenTelemetry APM nem depuração JDWP
  const childEnv = ctx.getResolvedJavaEnv(undefined, true);

  // Comandos de instalação/repositório baixam dependências via rede (Nexus/Maven) e resolvem OSGi,
  // necessitando de timeout estendido para não abortar precocemente.
  const isHeavyCommand = isHeavyKarafCommand(command);
  const effectiveTimeoutMs = timeoutMs ?? (isHeavyCommand ? 300000 : 60000);

  const res = await runClientProcess(settings, karafClient, clientArgs, childEnv, onChunk, effectiveTimeoutMs);
  emitTimeoutHint(command, res, effectiveTimeoutMs, onChunk);

  // Karaf client.bat no Windows ou SSH shell frequentemente retorna exit code 0 mesmo
  // quando o comando falha no contêiner OSGi (ex: "Error executing command: No matching features...").
  // Limpamos sequências de escape ANSI e inspecionamos stdout/stderr para detectar falhas reais.
  const cleanStdout = stripAnsiSequences(res.stdout || '');
  const rawCleanStderr = stripAnsiSequences(res.stderr || '');
  const cleanStderr = filterBenignStderr(rawCleanStderr);
  const cleanCombined = `${cleanStdout}\n${cleanStderr}`;

  const karafErrorMatch = findKarafErrorMatch(command, cleanCombined);
  if (karafErrorMatch) {
    return buildErrorResult(ctx, settings, command, context, onChunk, res, cleanStderr, cleanCombined, karafErrorMatch);
  }

  if (command.startsWith('log:display') && res.code === 0 && !res.stdout.trim() && settings.karafPath) {
    return buildLogDisplayFallback(settings, command, onChunk);
  }

  // Se o comando for log:clear e executou com sucesso (saída normalmente vazia), envia mensagem de confirmação
  if (command.trim() === 'log:clear' && res.code === 0 && !res.stdout.trim()) {
    const confirmMsg = `[ OK ] Buffer de logs em memória do Karaf (log:clear) limpo com sucesso.\r\n`;
    onChunk(confirmMsg);
    return { code: 0, stdout: confirmMsg, stderr: '' };
  }

  // Feedback para qualquer outro comando que executou com sucesso sem produzir saída
  if (res.code === 0 && !res.stdout.trim() && !cleanStderr.trim()) {
    const okMsg = `[ OK ] Comando "${command}" executado com sucesso no Karaf (sem saída no console).\r\n`;
    onChunk(okMsg);
    return { code: 0, stdout: okMsg, stderr: '' };
  }

  return {
    code: res.code,
    stdout: res.stdout,
    stderr: cleanStderr
  };
}

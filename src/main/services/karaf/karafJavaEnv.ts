import path from 'path';
import fs from 'fs';
import { AppSettings, buildOtelJavaAgentProperties, getApmReceiverPort, getApmServiceName } from '../../../shared/types';

function applyWindowsPath(childEnv: NodeJS.ProcessEnv): void {
  // No Windows, variáveis de ambiente são case-insensitive no sistema operacional,
  // mas objetos JS são case-sensitive. Se process.env contiver "Path" (padrão do Windows)
  // e o código definisse apenas "PATH", o Node/libuv enviava ambas ou priorizava a vazia,
  // excluindo C:\Windows\System32 e gerando "spawn cmd.exe ENOENT".
  const existingPathKey = Object.keys(childEnv).find((k) => k.toUpperCase() === 'PATH');
  const currentPath = (existingPathKey ? childEnv[existingPathKey] : '') || '';

  const sysRoot = childEnv.SystemRoot || process.env.SystemRoot || 'C:\\Windows';
  // path.win32.join (não path.join) garante separador "\" mesmo quando este processo Node
  // roda em host não-Windows (ex: suíte de testes em CI Linux simulando process.platform).
  const sys32 = path.win32.join(sysRoot, 'System32');

  const pathEntries = currentPath.split(';').filter(Boolean);

  if (childEnv.JAVA_HOME) {
    const jdkBin = path.win32.join(childEnv.JAVA_HOME, 'bin');
    if (!pathEntries.some((p) => p.toLowerCase() === jdkBin.toLowerCase())) {
      pathEntries.unshift(jdkBin);
    }
  }

  if (!pathEntries.some((p) => p.toLowerCase() === sys32.toLowerCase())) {
    pathEntries.push(sys32);
  }

  const updatedPath = pathEntries.join(';');

  // Remove todas as chaves variantes de PATH para evitar duplicatas conflitantes
  for (const k of Object.keys(childEnv)) {
    if (k.toUpperCase() === 'PATH') {
      delete childEnv[k];
    }
  }

  // Define uniformemente tanto Path quanto PATH para compatibilidade absoluta
  childEnv.Path = updatedPath;
  childEnv.PATH = updatedPath;

  if (!childEnv.SystemRoot) childEnv.SystemRoot = sysRoot;
  if (!childEnv.ComSpec) childEnv.ComSpec = process.env.ComSpec || process.env.COMSPEC || path.win32.join(sys32, 'cmd.exe');
}

function applyClientJavaOptions(childEnv: NodeJS.ProcessEnv): void {
  // Para comandos CLI (client.bat / karaf-client), REMOVE qualquer agente OpenTelemetry ou depuração
  // para evitar overhead brutal de inicialização da JVM, hooks de rede/shutdown do APM e poluição do stderr
  if (childEnv.JAVA_TOOL_OPTIONS) {
    childEnv.JAVA_TOOL_OPTIONS = childEnv.JAVA_TOOL_OPTIONS
      .replace(/-javaagent:[^\s"]+/g, '')
      .replace(/-javaagent:"[^"]+"/g, '')
      .replace(/-Dotel\.[^\s]+/g, '')
      .trim();
    if (!childEnv.JAVA_TOOL_OPTIONS) {
      delete childEnv.JAVA_TOOL_OPTIONS;
    }
  }
  delete childEnv.JAVA_DEBUG_PORT;
  delete childEnv.JAVA_DEBUG_OPTS;
}

function applyServerJavaOptions(childEnv: NodeJS.ProcessEnv, settings: AppSettings, customDebugPort?: number): void {
  // Se o agente OpenTelemetry estiver presente no Karaf E a telemetria estiver habilitada nas
  // configurações, anexa-o automaticamente via JAVA_TOOL_OPTIONS para alimentar o Cockpit APM
  // sem requerer alteração manual de scripts. Desligado por padrão: o agente Java deixa o log
  // do Karaf mais verboso mesmo sem nenhum consumidor olhando a tela APM.
  if (settings.karafPath && settings.apmInstrumentationEnabled) {
    const agentCandidates = [
      path.join(settings.karafPath, 'bin', 'opentelemetry-javaagent.jar'),
      path.join(settings.karafPath, 'opentelemetry-javaagent.jar')
    ];
    const agentJar = agentCandidates.find((c) => fs.existsSync(c));
    if (agentJar && !childEnv.JAVA_TOOL_OPTIONS?.includes('opentelemetry-javaagent.jar')) {
      childEnv.JAVA_TOOL_OPTIONS = (childEnv.JAVA_TOOL_OPTIONS ? childEnv.JAVA_TOOL_OPTIONS + ' ' : '') +
        `-javaagent:"${agentJar}" ${buildOtelJavaAgentProperties(getApmReceiverPort(settings), getApmServiceName(settings)).join(' ')}`;
    }
  }

  // Injeta porta de debug configurada no Cockpit para o JDWP do Karaf / WinThor
  const debugPort = customDebugPort || settings.karafDebugPort || 5005;
  childEnv.JAVA_DEBUG_PORT = String(debugPort);
  childEnv.JAVA_DEBUG_OPTS = `-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=${debugPort}`;
}

export function getResolvedJavaEnv(
  settings: AppSettings,
  customDebugPort?: number,
  isClient: boolean = false
): NodeJS.ProcessEnv {
  const configuredJdk = settings.jdkPath && fs.existsSync(settings.jdkPath) ? settings.jdkPath : null;
  const chosenJdk = configuredJdk || process.env.JAVA_HOME;

  const childEnv: NodeJS.ProcessEnv = { ...process.env };
  if (chosenJdk) {
    childEnv.JAVA_HOME = chosenJdk;
  }

  if (process.platform === 'win32') {
    applyWindowsPath(childEnv);
  }

  // Configura dimensões do terminal para que ferramentas CLI do Karaf (como feature:list e bundle:list)
  // formatem tabelas sem quebrar cada célula em múltiplas linhas (evita limite estreito padrão de 80 colunas).
  childEnv.COLUMNS = '300';
  childEnv.LINES = '1000';

  if (process.platform === 'win32') {
    // No Windows, NÃO definir TERM como 'xterm' ou 'xterm-256color'.
    // Quando TERM=xterm está presente no ambiente no Windows, a biblioteca JLine do Karaf
    // instancia UnixTerminal() em vez de WindowsTerminal.
    // Isso faz o JLine emitir sequências VT100 não suportadas no cmd.exe ao editar a linha
    // (ex: \x1b[P para delete, \x1b[1@ para insert), que aparecem no console como setas
    // literais (←[P, +[P, +[1@) em cima do texto digitado ao apagar ou navegar com as setas.
    delete childEnv.TERM;
  } else {
    childEnv.TERM = 'xterm-256color';
  }

  // Garante que o processo Java/Karaf inicialize o console em UTF-8 para não corromper acentuação
  childEnv.JAVA_TOOL_OPTIONS = (childEnv.JAVA_TOOL_OPTIONS ? childEnv.JAVA_TOOL_OPTIONS + ' ' : '') + '-Dfile.encoding=UTF-8';

  if (!childEnv.LANG) childEnv.LANG = 'pt_BR.UTF-8';
  if (!childEnv.LC_ALL) childEnv.LC_ALL = 'pt_BR.UTF-8';
  if (isClient) {
    applyClientJavaOptions(childEnv);
  } else {
    applyServerJavaOptions(childEnv, settings, customDebugPort);
  }
  if (!childEnv.LC_ALL) childEnv.LC_ALL = 'pt_BR.UTF-8';

  return childEnv;
}

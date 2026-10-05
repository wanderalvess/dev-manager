import path from 'path';
import fs from 'fs';
import { KarafDeployHistoryEntry, KarafDeployRequest, getKarafSshPort } from '../../../shared/types';
import { runCapturedProcess } from '../../utils/process';
import type { ChunkHandler, DeployTrigger, KarafContext, KarafDeployResult } from './karafContext';

const MAX_DEPLOY_HISTORY_ENTRIES = 200;

/** Extrai groupId/artifactId/version de um comando "feature:repo-add mvn:g/a/v/xml/features", quando o projeto de origem não está disponível pra ler o pom.xml direto (ex: deploy manual sem projectPath). */
function extractCoordsFromRepoUrl(repoUrl: string): { groupId: string; artifactId: string; version: string } | null {
  const match = repoUrl.match(/mvn:([^/\s]+)\/([^/\s]+)\/([^/\s]+)/);
  if (!match) return null;
  return { groupId: match[1], artifactId: match[2], version: match[3] };
}

/** Grava uma entrada no histórico persistido de deploys Karaf (settings.karafDeployHistory), mesmo padrão de BackupSchedulerService.recordHistory. */
function recordDeployHistory(
  ctx: KarafContext,
  request: KarafDeployRequest,
  result: KarafDeployResult,
  startedAt: string,
  durationMs: number,
  trigger: DeployTrigger,
  projectPath?: string
): void {
  const coords = (projectPath ? ctx.parseProjectPomOrBat(projectPath) : null) || extractCoordsFromRepoUrl(request.repoUrl);

  const entry: KarafDeployHistoryEntry = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    projectName: coords?.artifactId,
    groupId: coords?.groupId,
    artifactId: coords?.artifactId,
    version: coords?.version,
    repoUrl: request.repoUrl,
    featureInstall: request.featureInstall,
    success: result.success,
    message: result.error,
    startedAt,
    durationMs,
    trigger
  };

  const history = ctx.getSettings().karafDeployHistory || [];
  const updated = [entry, ...history].slice(0, MAX_DEPLOY_HISTORY_ENTRIES);
  ctx.saveSettings({ karafDeployHistory: updated });
}

/** Lista o histórico persistido de deploys/builds Karaf, mais recente primeiro. */
export function getDeployHistory(ctx: KarafContext): KarafDeployHistoryEntry[] {
  return ctx.getSettings().karafDeployHistory || [];
}

export async function deploy(
  ctx: KarafContext,
  request: KarafDeployRequest,
  onChunk: ChunkHandler,
  trigger: DeployTrigger = 'ui',
  projectPath?: string
): Promise<KarafDeployResult> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  const isRunning = await ctx.isKarafRunning(request.port);
  if (!isRunning) {
    const port = request.port || getKarafSshPort(ctx.getSettings());
    const err = `O contêiner Karaf/OSGi não está em execução (porta SSH ${port} inacessível). Inicie o Karaf antes de realizar o deploy.`;
    onChunk(`\r\n[ERRO] ${err}\r\n💡 [DICA] Inicie o Karaf pelo Console Karaf integrado ou pipeline de ambiente.\r\n`);
    const result = { success: false, error: err };
    recordDeployHistory(ctx, request, result, startedAt, Date.now() - t0, trigger, projectPath);
    return result;
  }

  onChunk(`\r\n==========================================\r\n`);
  onChunk(`INICIANDO DEPLOY NO KARAF LOCAL\r\n`);
  onChunk(`==========================================\r\n`);

  onChunk(`\r\n[1/2] Adicionando repositório Maven...\r\n`);
  const repoRes = await ctx.executeKarafCommand(
    request.repoUrl,
    onChunk,
    {
      user: request.user,
      pass: request.pass,
      port: request.port
    },
    180000
  );
  const repoCombined = `${repoRes.stdout}\n${repoRes.stderr || ''}`;
  if (repoRes.code !== 0 && !repoCombined.includes('already registered')) {
    onChunk(`\r\n[AVISO] O comando de repositório retornou código ${repoRes.code}, prosseguindo para instalação...\r\n`);
  }

  onChunk(`\r\n[2/2] Instalando Feature no contêiner OSGi...\r\n`);
  const installRes = await ctx.executeKarafCommand(
    request.featureInstall,
    onChunk,
    {
      user: request.user,
      pass: request.pass,
      port: request.port
    },
    300000
  );

  let result: KarafDeployResult;
  if (installRes.code === 0) {
    onChunk(`\r\n==========================================\r\n`);
    onChunk(`✨ DEPLOY FINALIZADO COM SUCESSO!\r\n`);
    onChunk(`==========================================\r\n`);
    result = { success: true };
  } else {
    onChunk(`\r\n[ERRO] Falha na instalação da feature (Código ${installRes.code}).\r\n`);
    result = { success: false, error: installRes.stderr || 'Erro na instalação' };
  }

  recordDeployHistory(ctx, request, result, startedAt, Date.now() - t0, trigger, projectPath);
  return result;
}

export async function runMavenBuild(
  projectPath: string,
  skipTests: boolean,
  onChunk: ChunkHandler
): Promise<{ code: number; stdout: string; stderr: string }> {
  onChunk(`\r\n==========================================\r\n`);
  onChunk(`🔨 EXECUTANDO COMPILAÇÃO MAVEN (mvn clean install)\r\n`);
  onChunk(`Diretório: ${projectPath}\r\n`);
  onChunk(`==========================================\r\n`);

  if (!fs.existsSync(projectPath)) {
    const err = `[ERRO] Diretório do projeto não encontrado: ${projectPath}\r\n`;
    onChunk(err);
    return { code: 1, stdout: '', stderr: err };
  }

  const isWin = process.platform === 'win32';
  const mvnwBat = path.join(projectPath, 'mvnw.cmd');
  const mvnwSh = path.join(projectPath, 'mvnw');

  let cmd = 'mvn';
  const args = ['clean', 'install'];
  if (skipTests) {
    args.push('-DskipTests');
  }

  if (isWin && fs.existsSync(mvnwBat)) {
    cmd = mvnwBat;
  } else if (!isWin && fs.existsSync(mvnwSh)) {
    cmd = mvnwSh;
  }

  onChunk(`> ${cmd} ${args.join(' ')}\r\n\r\n`);

  const result = isWin
    ? await runCapturedProcess('cmd.exe', ['/c', cmd, ...args], { cwd: projectPath }, onChunk)
    : await runCapturedProcess(cmd, args, { cwd: projectPath }, onChunk);

  onChunk(
    result.code === 0
      ? `\r\n[SUCESSO] Compilação Maven concluída com sucesso!\r\n`
      : `\r\n[ERRO] Falha na compilação Maven (Código de saída: ${result.code}).\r\n`
  );
  return result;
}

export async function buildAndDeployMaven(
  ctx: KarafContext,
  request: KarafDeployRequest,
  projectPath: string,
  skipTests: boolean,
  onChunk: ChunkHandler,
  trigger: DeployTrigger = 'ui'
): Promise<KarafDeployResult> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  // Valida previamente se o Karaf está rodando para não gastar tempo compilando se o container estiver offline
  const isRunning = await ctx.isKarafRunning(request.port);
  if (!isRunning) {
    const port = request.port || getKarafSshPort(ctx.getSettings());
    const err = `O contêiner Karaf/OSGi não está em execução (porta SSH ${port} inacessível). Inicie o Karaf antes de compilar e fazer o deploy.`;
    onChunk(`\r\n==========================================\r\n`);
    onChunk(`❌ DEPLOY ABORTADO: Karaf OSGi offline (porta SSH ${port} fechada).\r\n`);
    onChunk(`💡 [DICA] Inicie o Karaf pelo Cockpit antes de rodar o deploy.\r\n`);
    onChunk(`==========================================\r\n`);
    const result = { success: false, error: err };
    recordDeployHistory(ctx, request, result, startedAt, Date.now() - t0, trigger, projectPath);
    return result;
  }

  const buildRes = await ctx.runMavenBuild(projectPath, skipTests, onChunk);
  if (buildRes.code !== 0) {
    onChunk(`\r\n==========================================\r\n`);
    onChunk(`❌ DEPLOY ABORTADO: A compilação Maven falhou.\r\n`);
    onChunk(`==========================================\r\n`);
    const result = { success: false, error: 'Falha na compilação Maven' };
    recordDeployHistory(ctx, request, result, startedAt, Date.now() - t0, trigger, projectPath);
    return result;
  }

  return ctx.deploy(request, onChunk, trigger, projectPath);
}

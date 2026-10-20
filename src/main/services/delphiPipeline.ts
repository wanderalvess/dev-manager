import fs from 'fs';
import path from 'path';
import { isSafeLocalPath } from '../utils/security';
import { isSafeBatchPath, validateBuildRequest } from '../utils/delphiBuildUtils';
import type {
  DelphiBuildRequest,
  DelphiBuildResult,
  DelphiPipelineRequest,
  DelphiPipelineResult,
  DelphiPipelineStep,
  DelphiPipelineStepId
} from '../../shared/types';

export interface DelphiPipelineDeps {
  build: (req: DelphiBuildRequest) => Promise<DelphiBuildResult>;
  /** Encerra o processo pelo nome da imagem; true se havia algo para encerrar. */
  killImage: (imageName: string) => Promise<boolean>;
  launch: (exePath: string, cwd: string) => void;
  log: (line: string) => void;
}

const ORDER: DelphiPipelineStepId[] = ['kill', 'build', 'publish', 'launch'];

/** Copia o executável para a pasta de publicação guardando a versão anterior como `.bak`. */
function publishExe(exePath: string, publishDir: string): string {
  fs.mkdirSync(publishDir, { recursive: true });
  const target = path.join(publishDir, path.basename(exePath));
  // Publicar na própria pasta de saída: copiar o arquivo sobre ele mesmo falharia ou o truncaria.
  if (path.resolve(target).toLowerCase() === path.resolve(exePath).toLowerCase()) return exePath;
  if (fs.existsSync(target)) fs.copyFileSync(target, `${target}.bak`);
  fs.copyFileSync(exePath, target);
  return target;
}

/**
 * Encerrar → compilar → publicar → abrir. Etapa que falha interrompe o restante (as seguintes ficam "puladas"),
 * pois publicar ou abrir um executável antigo depois de um build quebrado esconderia o erro.
 */
export async function runDelphiPipeline(req: DelphiPipelineRequest, deps: DelphiPipelineDeps): Promise<DelphiPipelineResult> {
  const steps: DelphiPipelineStep[] = [];
  const push = (id: DelphiPipelineStepId, status: DelphiPipelineStep['status'], detail: string) => {
    steps.push({ id, status, detail });
    deps.log(`[${steps.length}/${ORDER.length}] ${id}: ${detail}\n`);
  };
  const finish = (build?: DelphiBuildResult): DelphiPipelineResult => {
    for (const id of ORDER) {
      if (!steps.some((s) => s.id === id)) steps.push({ id, status: 'skipped', detail: 'Não executada.' });
    }
    return { success: steps.every((s) => s.status !== 'failed'), steps, build };
  };

  const projectName = path.basename(req.dprojPath, path.extname(req.dprojPath));
  const publishDir = req.publishDir?.trim();
  if (publishDir && (!isSafeLocalPath(publishDir) || !isSafeBatchPath(publishDir))) {
    push('publish', 'failed', 'Pasta de publicação inválida.');
    return finish();
  }

  // Valida antes de encerrar qualquer processo: pedido inválido não pode custar o app que o dev estava usando.
  const invalid = validateBuildRequest(req);
  if (invalid) {
    push('build', 'failed', invalid);
    return finish();
  }

  if (req.killRunning) {
    const killed = await deps.killImage(`${projectName}.exe`);
    push('kill', 'success', killed ? `${projectName}.exe encerrado.` : 'Nenhuma instância em execução.');
  } else {
    push('kill', 'skipped', 'Desativada.');
  }

  let build: DelphiBuildResult;
  try {
    build = await deps.build(req);
  } catch (err) {
    push('build', 'failed', err instanceof Error ? err.message : String(err));
    return finish();
  }
  if (!build.success) {
    const reason = build.cancelled ? 'cancelado' : build.errorCount > 0 ? `${build.errorCount} erro(s)` : 'veja o final do log';
    push('build', 'failed', `Build falhou: ${reason}.`);
    return finish(build);
  }
  push('build', 'success', `Compilado em ${(build.durationMs / 1000).toFixed(1)}s (${build.warningCount} aviso(s)).`);

  let runnable = build.outputExePath;
  if (!publishDir) {
    push('publish', 'skipped', 'Sem pasta de publicação.');
  } else if (!runnable) {
    push('publish', 'failed', 'Build ok, mas o .exe gerado não foi encontrado dentro da pasta do projeto.');
    return finish(build);
  } else {
    try {
      runnable = publishExe(runnable, publishDir);
      push('publish', 'success', `Publicado em ${runnable} (versão anterior salva como .bak).`);
    } catch (err) {
      push('publish', 'failed', err instanceof Error ? err.message : String(err));
      return finish(build);
    }
  }

  if (!req.launch) {
    push('launch', 'skipped', 'Desativada.');
  } else if (!runnable) {
    push('launch', 'failed', 'Executável não encontrado para abrir.');
  } else {
    // O diretório de trabalho precisa ser o do .exe para carregar DLLs e INIs ao lado dele.
    deps.launch(runnable, path.dirname(runnable));
    push('launch', 'success', `Aberto ${path.basename(runnable)}.`);
  }
  return finish(build);
}

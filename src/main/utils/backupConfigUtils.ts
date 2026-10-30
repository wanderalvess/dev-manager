import * as cron from 'node-cron';
import type { BackupConfig } from '../../shared/types';
import { isSafeLocalPath } from './security';

interface ValidateOptions {
  /** Recusa pasta de destino remota (UNC); usado onde quem chama é um assistente, não o usuário na tela. */
  requireLocalDestination?: boolean;
}

/** Devolve a mensagem de erro da configuração de backup, ou `null` quando está válida. */
export function validateBackupConfig(config: BackupConfig, options: ValidateOptions = {}): string | null {
  if (options.requireLocalDestination && !isSafeLocalPath(config.destinationFolder)) {
    return 'Pasta de destino inválida ou remota não permitida.';
  }
  if (config.cronExpression && !cron.validate(config.cronExpression)) {
    return 'Expressão cron inválida.';
  }
  if (config.restoreDrillCronExpression && !cron.validate(config.restoreDrillCronExpression)) {
    return 'Expressão cron de restore drill inválida.';
  }
  if (config.restoreDrillScratchConnectionId && config.restoreDrillScratchConnectionId === config.connectionId) {
    return 'A conexão do teste de restauração não pode ser a própria conexão do backup: o teste sobrescreve o destino.';
  }
  if (config.restoreDrillCronExpression && config.restoreDrillEnabled !== false && !config.restoreDrillScratchConnectionId) {
    return 'Escolha a conexão descartável do teste de restauração agendado, ou desative o agendamento do teste.';
  }
  return null;
}

/** Aplica `config` sobre a configuração anterior da mesma conexão, que passa a ser a primeira da lista. */
export function mergeBackupConfig(existing: BackupConfig[], config: BackupConfig): BackupConfig[] {
  const previous = existing.find((b) => b.connectionId === config.connectionId);
  return [{ ...previous, ...config }, ...existing.filter((b) => b.connectionId !== config.connectionId)];
}

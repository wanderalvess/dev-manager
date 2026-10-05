import path from 'path';
import fs from 'fs';
import type { ParseTnsNamesResult } from '../../../shared/types';
import { parseTnsNamesFile } from '../../utils/tnsnamesParser';
import type { DatabaseContext } from './databaseContext';

/**
 * Lê e faz o parsing das entradas de conexão do arquivo tnsnames.ora do Oracle.
 * Se nenhum caminho for informado, utiliza o caminho configurado em AppSettings.oracleTnsnamesPath
 * ou busca no diretório TNS_ADMIN do ambiente.
 */
export async function parseTnsNames(ctx: DatabaseContext, filePath?: string): Promise<ParseTnsNamesResult> {
  const targetPath = filePath?.trim() || ctx.configService?.getSettings().oracleTnsnamesPath?.trim();
  if (!targetPath) {
    const tnsAdmin = process.env.TNS_ADMIN;
    if (tnsAdmin) {
      const candidate = path.join(tnsAdmin, 'tnsnames.ora');
      if (fs.existsSync(candidate)) {
        return parseTnsNamesFile(candidate);
      }
    }
    return {
      success: false,
      entries: [],
      error: 'Nenhum caminho de tnsnames.ora configurado. Defina o arquivo nas Configurações do sistema.'
    };
  }
  return parseTnsNamesFile(targetPath);
}

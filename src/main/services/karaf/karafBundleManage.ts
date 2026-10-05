import {
  BUNDLE_ACTIONS,
  BundleAction,
  ChunkHandler,
  KarafActionResult,
  KarafContext,
  KarafCredentials
} from './karafContext';

/**
 * Executa ação de ciclo de vida em um bundle específico (start, stop, restart, uninstall).
 */
export async function manageBundle(
  ctx: KarafContext,
  action: BundleAction,
  bundleId: string,
  credentials: KarafCredentials | undefined,
  onChunk: ChunkHandler
): Promise<KarafActionResult> {
  if (!BUNDLE_ACTIONS.includes(action)) {
    return { success: false, output: 'Ação de bundle não permitida.' };
  }
  const cleanId = bundleId.trim();
  if (!/^\d+$/.test(cleanId)) {
    return { success: false, output: 'ID do bundle inválido (deve ser numérico).' };
  }

  const command = `bundle:${action} ${cleanId}`;
  let output = '';
  const res = await ctx.executeKarafCommand(
    command,
    (chunk) => {
      output += chunk;
      onChunk(chunk);
    },
    credentials
  );

  return {
    success: res.code === 0,
    output: output || res.stdout || res.stderr
  };
}

/**
 * Executa ação de ciclo de vida em lote em múltiplos bundles (start, stop, restart, refresh, uninstall).
 */
export async function manageBundlesBatch(
  ctx: KarafContext,
  action: BundleAction,
  bundleIds: string[],
  credentials: KarafCredentials | undefined,
  onChunk: ChunkHandler
): Promise<{ success: boolean; output: string; processedCount: number }> {
  if (!BUNDLE_ACTIONS.includes(action)) {
    return { success: false, output: 'Ação de bundle não permitida.', processedCount: 0 };
  }
  const cleanIds = (bundleIds || [])
    .map((id) => (typeof id === 'string' ? id.trim() : String(id).trim()))
    .filter((id) => /^\d+$/.test(id));

  if (cleanIds.length === 0) {
    return { success: false, output: 'Nenhum ID de bundle válido informado.', processedCount: 0 };
  }

  const command = `bundle:${action} ${cleanIds.join(' ')}`;
  let output = '';
  const res = await ctx.executeKarafCommand(
    command,
    (chunk) => {
      output += chunk;
      onChunk(chunk);
    },
    credentials
  );

  if (action === 'uninstall' && res.code === 0) {
    await ctx.executeKarafCommand(
      'bundle:refresh',
      (chunk) => {
        output += chunk;
        onChunk(chunk);
      },
      credentials
    );
  }

  return {
    success: res.code === 0,
    output: output || res.stdout || res.stderr,
    processedCount: cleanIds.length
  };
}

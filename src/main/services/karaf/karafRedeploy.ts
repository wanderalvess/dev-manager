import type { KarafDeployRequest } from '../../../shared/types';
import { parseBundleLocations, parseMvnLocation, pickProjectBundles } from '../../utils/karafRedeployUtils';
import type { ChunkHandler, KarafContext, KarafDeployResult } from './karafContext';

/**
 * O `feature:install` não trocou nada porque a versão já estava instalada: atualiza os bundles do projeto com
 * `bundle:update` (relê o jar recém-gerado no `.m2`) e faz um `bundle:refresh`. Sem bundle do projeto para atualizar,
 * o deploy não carregou código novo e volta como falha, em vez do "sucesso" que o Karaf sugere.
 */
export async function updateUnchangedBundles(
  ctx: KarafContext,
  request: KarafDeployRequest,
  onChunk: ChunkHandler,
  projectPath?: string
): Promise<KarafDeployResult> {
  const credentials = { user: request.user, pass: request.pass, port: request.port };
  const project = (projectPath ? ctx.parseProjectPomOrBat(projectPath) : null) ?? parseMvnLocation(request.repoUrl.replace(/^.*?(mvn:)/, '$1'));
  const notLoaded = (detail: string): KarafDeployResult => {
    const error = `O Karaf manteve o que já estava instalado: ${detail} Mude a versão no pom (ou use -SNAPSHOT) ou rode bundle:update nos bundles do projeto.`;
    onChunk(`\r\n[ERRO] ${error}\r\n`);
    return { success: false, error };
  };
  if (!project) return notLoaded('não deu para saber o grupo e a versão do projeto.');

  onChunk(`\r\n[3/3] A versão ${project.version} já estava instalada: atualizando os bundles do projeto com o jar novo...\r\n`);
  const list = await ctx.executeKarafCommand('bundle:list -l -t 0', () => {}, credentials, 60000);
  const bundles = pickProjectBundles(parseBundleLocations(list.stdout), project);
  if (bundles.length === 0) return notLoaded(`nenhum bundle de ${project.groupId} na versão ${project.version} está no contêiner.`);

  const failed: string[] = [];
  for (const bundle of bundles) {
    onChunk(`> bundle:update ${bundle.id}  (${bundle.location})\r\n`);
    const result = await ctx.executeKarafCommand(`bundle:update ${bundle.id}`, onChunk, credentials, 120000);
    if (result.code !== 0) failed.push(bundle.id);
  }
  await ctx.executeKarafCommand('bundle:refresh', onChunk, credentials, 120000);

  if (failed.length > 0) {
    const error = `bundle:update falhou em ${failed.length} de ${bundles.length} bundle(s): ${failed.join(', ')}.`;
    onChunk(`\r\n[ERRO] ${error}\r\n`);
    return { success: false, error };
  }
  onChunk(`\r\n${bundles.length} bundle(s) do projeto recarregado(s) com o jar novo.\r\n`);
  return { success: true };
}

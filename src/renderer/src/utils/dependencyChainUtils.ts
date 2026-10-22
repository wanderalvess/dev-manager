import type { DependencyChainNode, DeployProfile, DeployStep } from '../../../shared/types';

/**
 * Converte os nós de uma cadeia de dependências em uma sequência executável de DeploySteps
 * e cria um DeployProfile correspondente.
 */
export function buildProfileFromDependencyChain(
  chainName: string,
  nodes: DependencyChainNode[],
  createPomBackups: boolean = true
): DeployProfile {
  const steps: DeployStep[] = [];
  const profileId = `deploy-profile-chain-${Date.now()}`;

  for (let i = 0; i < nodes.length; i++) {
    const currentNode = nodes[i];
    const isFirst = i === 0;
    const isLast = i === nodes.length - 1;

    // Se não for o primeiro nó, adiciona antes a etapa de sincronização de versão da camada anterior para esta
    if (!isFirst) {
      const prevNode = nodes[i - 1];
      steps.push({
        id: `step-sync-${prevNode.id}-to-${currentNode.id}`,
        name: `Sincronizar versão: ${prevNode.projectName} -> ${currentNode.projectName}`,
        type: 'pom-sync-version',
        enabled: true,
        sourceProjectPath: prevNode.projectPath,
        targetProjectPath: currentNode.projectPath,
        createPomBackup: createPomBackups
      });
    }

    // Etapa de compilação Maven da camada atual
    steps.push({
      id: `step-mvn-build-${currentNode.id}`,
      name: `Maven Clean Install: ${currentNode.projectName}`,
      type: 'maven-build',
      enabled: true,
      projectPath: currentNode.projectPath,
      skipTests: currentNode.skipTests ?? true
    });

    // Se for o último nó e foi marcado para deploy no Karaf
    if (isLast && currentNode.deployToKaraf) {
      steps.push({
        id: `step-karaf-deploy-${currentNode.id}`,
        name: `Deploy Karaf Feature: ${currentNode.projectName}`,
        type: 'karaf-command',
        enabled: true,
        command: `feature:install -r -u ${currentNode.projectName.replace('-service', '')}/1.0.0-SNAPSHOT`
      });
    }
  }

  return {
    id: profileId,
    name: chainName || 'Cadeia de Dependências Maven',
    description: `Pipeline sequencial gerado para ${nodes.length} camadas: ${nodes.map((n) => n.projectName).join(' -> ')}`,
    steps
  };
}

/**
 * Valida se uma cadeia possui ao menos 2 nós e se todos os nós possuem caminhos válidos.
 */
export function validateDependencyChain(nodes: DependencyChainNode[]): { valid: boolean; error?: string } {
  if (!nodes || nodes.length < 2) {
    return { valid: false, error: 'A cadeia precisa ter ao menos 2 projetos para haver propagação de versões.' };
  }

  for (let i = 0; i < nodes.length; i++) {
    if (!nodes[i].projectPath) {
      return { valid: false, error: `O projeto na posição ${i + 1} não possui diretório configurado.` };
    }
  }

  const paths = nodes.map((n) => n.projectPath.toLowerCase());
  const unique = new Set(paths);
  if (unique.size !== paths.length) {
    return { valid: false, error: 'Não é permitido repetir o mesmo projeto em múltiplas etapas da mesma cadeia.' };
  }

  return { valid: true };
}

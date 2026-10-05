import path from 'path';
import fs from 'fs';
import { PomInfo } from '../../../shared/types';
import type { KarafContext } from './karafContext';

export function parseProjectPomOrBat(projectPath: string): PomInfo | null {
  try {
    if (!projectPath || !fs.existsSync(projectPath)) return null;

    // 1. Tentar ler deploy-local.bat se existir
    const batPath = path.join(projectPath, 'deploy-local.bat');
    let batRepoCmd = '';
    let batInstallCmd = '';

    if (fs.existsSync(batPath)) {
      const batContent = fs.readFileSync(batPath, 'utf-8');
      const repoMatch = batContent.match(/"(feature:repo-add[^"]+)"/);
      const installMatch = batContent.match(/"(feature:install[^"]+)"/);
      if (repoMatch) batRepoCmd = repoMatch[1];
      if (installMatch) batInstallCmd = installMatch[1];
    }

    // 2. Ler pom.xml
    const pomPath = path.join(projectPath, 'pom.xml');
    if (fs.existsSync(pomPath)) {
      const pomContent = fs.readFileSync(pomPath, 'utf-8');
      const groupIdMatch = pomContent.match(/<groupId>([^<]+)<\/groupId>/g);
      const artifactIdMatch = pomContent.match(/<artifactId>([^<]+)<\/artifactId>/g);
      const versionMatch = pomContent.match(/<version>([^<]+)<\/version>/g);
      const moduleMatches = Array.from(pomContent.matchAll(/<module>([^<]+)<\/module>/g)).map((m) => m[1]);

      const groupId = groupIdMatch ? groupIdMatch[groupIdMatch.length > 1 ? 1 : 0].replace(/<\/?groupId>/g, '') : '';
      const artifactId = artifactIdMatch ? artifactIdMatch[artifactIdMatch.length > 1 ? 1 : 0].replace(/<\/?artifactId>/g, '') : '';
      const version = versionMatch ? versionMatch[versionMatch.length > 1 ? 1 : 0].replace(/<\/?version>/g, '') : '0.0.1-SNAPSHOT';

      const serviceModule = moduleMatches.find((m) => m.includes('service')) || moduleMatches[0] || artifactId;
      const featureName = artifactId.replace('-parent', '');

      return {
        groupId,
        artifactId,
        version,
        modules: moduleMatches,
        suggestedRepoCommand: batRepoCmd || `feature:repo-add mvn:${groupId}/${serviceModule}/${version}/xml/features`,
        suggestedInstallCommand: batInstallCmd || `feature:install -r -u ${featureName}/${version}`
      };
    }
  } catch (err) {
    console.error('Erro ao analisar pom.xml:', err);
  }
  return null;
}

/**
 * Lista pastas diretas de projetos locais sob settings.projectsPath de forma leve.
 */
export function listLocalProjectsFast(ctx: KarafContext): Array<{ name: string; path: string }> {
  const settings = ctx.getSettings();
  if (!settings.projectsPath || !fs.existsSync(settings.projectsPath)) return [];
  try {
    return fs
      .readdirSync(settings.projectsPath, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => ({ name: d.name, path: path.join(settings.projectsPath, d.name) }));
  } catch {
    return [];
  }
}

/**
 * Tenta localizar o conteúdo do pom.xml do projeto associado ao comando ou ao diretório informado.
 */
export function tryFindPomXml(ctx: KarafContext, projectPath?: string, command?: string): string | undefined {
  if (projectPath) {
    const directPom = path.join(projectPath, 'pom.xml');
    if (fs.existsSync(directPom)) {
      try {
        return fs.readFileSync(directPom, 'utf-8');
      } catch {
        // segue busca alternativa
      }
    }
  }

  const settings = ctx.getSettings();
  if (!settings.projectsPath || !fs.existsSync(settings.projectsPath)) return undefined;

  let targetName = '';
  if (command) {
    const mvnMatch = command.match(/mvn:[^/\s]+\/([^/\s]+)/);
    if (mvnMatch) {
      targetName = mvnMatch[1];
    } else {
      const featureMatch = command.match(/feature:(?:install|repo-add)\s+(?:-[a-zA-Z\s]+\s+)?([a-zA-Z0-9_.-]+)/);
      if (featureMatch) {
        targetName = featureMatch[1].split('/')[0];
      }
    }
  }

  if (!targetName) return undefined;

  try {
    const entries = fs.readdirSync(settings.projectsPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const lower = entry.name.toLowerCase();
        const targetLower = targetName.toLowerCase().replace(/-parent|-service$/, '');
        if (lower.includes(targetLower) || targetLower.includes(lower)) {
          const pomFile = path.join(settings.projectsPath, entry.name, 'pom.xml');
          if (fs.existsSync(pomFile)) {
            return fs.readFileSync(pomFile, 'utf-8');
          }
        }
      }
    }
  } catch {
    // ignora falha de leitura
  }

  return undefined;
}

import fs from 'fs';
import path from 'path';
import { parsePom } from '../../shared/pomParser';
import type { DeployQueueProject } from '../../shared/deployQueue';
import type { ConfigService } from './ConfigService';

const MAX_POM_BYTES = 2 * 1024 * 1024;

export interface WorkspaceScanResult {
  projectsPath: string;
  projects: DeployQueueProject[];
}

/**
 * Lê os pom.xml dos projetos diretos de `settings.projectsPath` para montar a fila de deploy.
 * Não recebe caminho do chamador: a única raiz varrida é a configurada em Configurações.
 */
export class PomGraphService {
  constructor(private readonly configService: ConfigService) {}

  public scanWorkspace(): WorkspaceScanResult {
    const projectsPath = this.configService.getSettings().projectsPath || '';
    if (!projectsPath || !fs.existsSync(projectsPath)) return { projectsPath, projects: [] };

    const projects: DeployQueueProject[] = [];
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(projectsPath, { withFileTypes: true });
    } catch {
      return { projectsPath, projects };
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const dir = path.join(projectsPath, entry.name);
      const pomPath = path.join(dir, 'pom.xml');
      try {
        if (!fs.existsSync(pomPath) || fs.statSync(pomPath).size > MAX_POM_BYTES) continue;
        const pom = parsePom(fs.readFileSync(pomPath, 'utf-8'));
        if (!pom) continue;
        projects.push({
          name: entry.name,
          path: dir,
          groupId: pom.groupId,
          artifactId: pom.artifactId,
          version: pom.version,
          packaging: pom.packaging,
          parent: pom.parent,
          dependencies: pom.dependencies
        });
      } catch {
        // pom ilegível: o projeto só não entra na lista
      }
    }
    return { projectsPath, projects: projects.sort((a, b) => a.name.localeCompare(b.name)) };
  }
}

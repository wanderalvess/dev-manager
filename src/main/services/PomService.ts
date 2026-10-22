import fs from 'fs';
import path from 'path';

export interface PomCoordinates {
  groupId: string;
  artifactId: string;
  version: string;
  packaging?: string;
  modules?: string[];
  filePath: string;
}

export interface PomDependencyItem {
  groupId: string;
  artifactId: string;
  version: string;
}

export interface PomUpdateResult {
  success: boolean;
  targetPomPath: string;
  artifactId: string;
  oldVersion?: string;
  newVersion: string;
  backupPath?: string;
  error?: string;
}

/**
 * Serviço responsável pela leitura e atualização cirúrgica de dependências em arquivos pom.xml,
 * preservando indentação, formatação e comentários originais.
 */
export class PomService {
  /**
   * Localiza o arquivo pom.xml correspondente ao diretório do projeto.
   */
  public resolvePomPath(projectPath: string): string | null {
    if (!projectPath) return null;
    const direct = path.join(projectPath, 'pom.xml');
    if (fs.existsSync(direct)) return direct;
    return null;
  }

  /**
   * Lê as coordenadas Maven básicas (groupId, artifactId, version) do pom.xml.
   */
  public readCoordinates(projectPath: string): PomCoordinates | null {
    const pomPath = this.resolvePomPath(projectPath);
    if (!pomPath) return null;

    try {
      const content = fs.readFileSync(pomPath, 'utf-8');
      return this.parseCoordinatesFromXml(content, pomPath);
    } catch {
      return null;
    }
  }

  /**
   * Extrai coordenadas de uma string XML do pom.xml.
   */
  public parseCoordinatesFromXml(content: string, filePath: string = ''): PomCoordinates | null {
    // Remove bloco <parent> temporariamente para não confundir o groupId/version do projeto com o pai
    const parentMatch = content.match(/<parent>[\s\S]*?<\/parent>/);
    const parentContent = parentMatch ? parentMatch[0] : '';
    const withoutParent = content.replace(/<parent>[\s\S]*?<\/parent>/, '');

    const artifactIdMatch = withoutParent.match(/<artifactId>([^<]+)<\/artifactId>/);
    if (!artifactIdMatch) return null;
    const artifactId = artifactIdMatch[1].trim();

    // GroupId pode estar no próprio pom ou ser herdado do parent
    const selfGroupId = withoutParent.match(/<groupId>([^<]+)<\/groupId>/);
    const parentGroupId = parentContent.match(/<groupId>([^<]+)<\/groupId>/);
    const groupId = (selfGroupId ? selfGroupId[1] : parentGroupId ? parentGroupId[1] : '').trim();

    // Version pode estar no próprio pom ou ser herdada do parent
    const selfVersion = withoutParent.match(/<version>([^<]+)<\/version>/);
    const parentVersion = parentContent.match(/<version>([^<]+)<\/version>/);
    const version = (selfVersion ? selfVersion[1] : parentVersion ? parentVersion[1] : '0.0.1-SNAPSHOT').trim();

    const packagingMatch = withoutParent.match(/<packaging>([^<]+)<\/packaging>/);
    const packaging = packagingMatch ? packagingMatch[1].trim() : 'jar';

    const modules = Array.from(content.matchAll(/<module>([^<]+)<\/module>/g)).map((m) => m[1].trim());

    return {
      groupId,
      artifactId,
      version,
      packaging,
      modules,
      filePath
    };
  }

  /**
   * Lista dependências diretas declaradas no pom.xml.
   */
  public listDependencies(projectPath: string): PomDependencyItem[] {
    const pomPath = this.resolvePomPath(projectPath);
    if (!pomPath) return [];

    try {
      const content = fs.readFileSync(pomPath, 'utf-8');
      return this.extractDependenciesFromXml(content);
    } catch {
      return [];
    }
  }

  /**
   * Extrai lista de dependências de conteúdo XML bruto, ignorando comentários.
   */
  public extractDependenciesFromXml(xml: string): PomDependencyItem[] {
    const noComments = xml.replace(/<!--[\s\S]*?-->/g, '');
    const depBlocks = noComments.matchAll(/<dependency>([\s\S]*?)<\/dependency>/g);
    const items: PomDependencyItem[] = [];

    for (const block of depBlocks) {
      const inner = block[1];
      const gMatch = inner.match(/<groupId>([^<]+)<\/groupId>/);
      const aMatch = inner.match(/<artifactId>([^<]+)<\/artifactId>/);
      const vMatch = inner.match(/<version>([^<]+)<\/version>/);

      if (aMatch) {
        items.push({
          groupId: gMatch ? gMatch[1].trim() : '',
          artifactId: aMatch[1].trim(),
          version: vMatch ? vMatch[1].trim() : ''
        });
      }
    }

    return items;
  }

  /**
   * Atualiza cirurgicamente a versão de uma dependência dentro do pom.xml, preservando formatação e comentários.
   */
  public updateDependencyVersion(
    targetProjectPath: string,
    dependency: { artifactId: string; newVersion: string; groupId?: string },
    createBackup: boolean = true
  ): PomUpdateResult {
    const pomPath = this.resolvePomPath(targetProjectPath);
    if (!pomPath) {
      return {
        success: false,
        targetPomPath: targetProjectPath,
        artifactId: dependency.artifactId,
        newVersion: dependency.newVersion,
        error: `pom.xml não encontrado em "${targetProjectPath}".`
      };
    }

    try {
      const content = fs.readFileSync(pomPath, 'utf-8');
      const updated = this.patchDependencyVersionInXml(content, dependency);

      if (!updated.changed) {
        return {
          success: false,
          targetPomPath: pomPath,
          artifactId: dependency.artifactId,
          newVersion: dependency.newVersion,
          error: `Dependência com artifactId "${dependency.artifactId}" não encontrada no pom.xml.`
        };
      }

      let backupPath: string | undefined;
      if (createBackup) {
        backupPath = `${pomPath}.bak`;
        fs.writeFileSync(backupPath, content, 'utf-8');
      }

      fs.writeFileSync(pomPath, updated.content, 'utf-8');

      return {
        success: true,
        targetPomPath: pomPath,
        artifactId: dependency.artifactId,
        oldVersion: updated.oldVersion,
        newVersion: dependency.newVersion,
        backupPath
      };
    } catch (err: any) {
      return {
        success: false,
        targetPomPath: pomPath,
        artifactId: dependency.artifactId,
        newVersion: dependency.newVersion,
        error: err?.message || String(err)
      };
    }
  }

  /**
   * Aplica regex cirúrgico sobre a tag <dependency> específica contendo o artifactId desejado.
   */
  public patchDependencyVersionInXml(
    xml: string,
    dependency: { artifactId: string; newVersion: string; groupId?: string }
  ): { content: string; changed: boolean; oldVersion?: string } {
    let changed = false;
    let oldVersion: string | undefined;

    // Procura tags <dependency>...</dependency>
    const regex = /<dependency>([\s\S]*?)<\/dependency>/g;

    const newXml = xml.replace(regex, (fullMatch, inner: string) => {
      // Se não contém o artifactId desejado, mantém intacto
      const artMatch = inner.match(new RegExp(`<artifactId>\\s*${dependency.artifactId}\\s*<\\/artifactId>`));
      if (!artMatch) return fullMatch;

      // Se foi passado groupId, verifica também
      if (dependency.groupId) {
        const grpMatch = inner.match(new RegExp(`<groupId>\\s*${dependency.groupId}\\s*<\\/groupId>`));
        if (!grpMatch) return fullMatch;
      }

      // Procura tag <version> existente
      const verMatch = inner.match(/<version>([^<]+)<\/version>/);
      if (verMatch) {
        oldVersion = verMatch[1].trim();
        const replacedInner = inner.replace(/<version>[^<]+<\/version>/, `<version>${dependency.newVersion}</version>`);
        changed = true;
        return `<dependency>${replacedInner}</dependency>`;
      } else {
        // Se a dependência não tinha tag version declarada diretamente (ex: dependencyManagement), adiciona
        const replacedInner = `${inner}\n            <version>${dependency.newVersion}</version>`;
        changed = true;
        return `<dependency>${replacedInner}</dependency>`;
      }
    });

    return { content: newXml, changed, oldVersion };
  }
}

import type { GitProjectInfo, KarafBundleInfo } from '../../../shared/types';

export type KarafInstallSourceType = 'project' | 'mvn' | 'file';

const DEFAULT_VERSION = '1.0.0-SNAPSHOT';

type PomInfo = NonNullable<GitProjectInfo['pomInfo']>;

// O módulo "service" é o que de fato publica o bundle OSGi; sem ele cai no primeiro módulo.
function resolveServiceModule(pom: Pick<PomInfo, 'artifactId' | 'modules'>): string {
  return pom.modules?.find((m) => m.includes('service')) || pom.modules?.[0] || pom.artifactId;
}

export function buildCoordinateFromProject(proj: GitProjectInfo): { coordinate: string; version: string } {
  if (proj.pomInfo) {
    const { groupId, version } = proj.pomInfo;
    return {
      coordinate: `mvn:${groupId}/${resolveServiceModule(proj.pomInfo)}/${version}`,
      version
    };
  }
  return { coordinate: `mvn:com.suaempresa/${proj.name}/${DEFAULT_VERSION}`, version: DEFAULT_VERSION };
}

export function buildCoordinateForUpdate(bundle: KarafBundleInfo): string {
  return `mvn:${bundle.symbolicName || bundle.name}/${bundle.version}`;
}

export interface InstallLocationInput {
  sourceType: KarafInstallSourceType;
  mvnCoordinate: string;
  filePath: string;
  targetVersion: string;
  selectedProjectPath: string;
  projects: GitProjectInfo[];
}

export function computeInstallLocation(input: InstallLocationInput): string {
  const { sourceType, mvnCoordinate, filePath, targetVersion, selectedProjectPath, projects } = input;
  if (sourceType === 'mvn') return mvnCoordinate.trim();
  if (sourceType === 'file') return filePath.trim();
  if (sourceType === 'project') {
    const proj = projects.find((p) => p.path === selectedProjectPath);
    if (proj?.pomInfo) {
      const v = targetVersion.trim() || proj.pomInfo.version || DEFAULT_VERSION;
      return `mvn:${proj.pomInfo.groupId}/${resolveServiceModule(proj.pomInfo)}/${v}`;
    }
    return mvnCoordinate.trim();
  }
  return '';
}

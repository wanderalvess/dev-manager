import { describe, expect, it } from 'vitest';
import type { GitProjectInfo, KarafBundleInfo } from '../../../shared/types';
import {
  buildCoordinateForUpdate,
  buildCoordinateFromProject,
  computeInstallLocation
} from './karafInstallModalUtils';

const makeProject = (over: Record<string, unknown> = {}): GitProjectInfo =>
  ({
    name: 'meu-proj',
    path: 'C:/p/meu-proj',
    pomInfo: { groupId: 'com.x', artifactId: 'root', version: '2.0.0', modules: ['meu-api', 'meu-service'] },
    ...over
  }) as unknown as GitProjectInfo;

describe('buildCoordinateFromProject', () => {
  it('prefere o módulo service', () => {
    expect(buildCoordinateFromProject(makeProject())).toEqual({
      coordinate: 'mvn:com.x/meu-service/2.0.0',
      version: '2.0.0'
    });
  });

  it('cai no primeiro módulo e depois no artifactId', () => {
    const p1 = makeProject({ pomInfo: { groupId: 'g', artifactId: 'a', version: '1', modules: ['m1'] } });
    expect(buildCoordinateFromProject(p1).coordinate).toBe('mvn:g/m1/1');
    const p2 = makeProject({ pomInfo: { groupId: 'g', artifactId: 'a', version: '1' } });
    expect(buildCoordinateFromProject(p2).coordinate).toBe('mvn:g/a/1');
  });

  it('usa padrão quando não há pomInfo', () => {
    expect(buildCoordinateFromProject(makeProject({ pomInfo: undefined }))).toEqual({
      coordinate: 'mvn:com.suaempresa/meu-proj/1.0.0-SNAPSHOT',
      version: '1.0.0-SNAPSHOT'
    });
  });
});

describe('buildCoordinateForUpdate', () => {
  it('usa symbolicName com fallback para name', () => {
    expect(buildCoordinateForUpdate({ symbolicName: 's', name: 'n', version: '1' } as KarafBundleInfo)).toBe('mvn:s/1');
    expect(buildCoordinateForUpdate({ name: 'n', version: '1' } as KarafBundleInfo)).toBe('mvn:n/1');
  });
});

describe('computeInstallLocation', () => {
  const base = {
    mvnCoordinate: ' mvn:a/b/1 ',
    filePath: ' C:/x.jar ',
    targetVersion: '',
    selectedProjectPath: 'C:/p/meu-proj',
    projects: [makeProject()]
  };

  it('mvn e file fazem trim', () => {
    expect(computeInstallLocation({ ...base, sourceType: 'mvn' })).toBe('mvn:a/b/1');
    expect(computeInstallLocation({ ...base, sourceType: 'file' })).toBe('C:/x.jar');
  });

  it('project usa versão alvo ou a do pom', () => {
    expect(computeInstallLocation({ ...base, sourceType: 'project' })).toBe('mvn:com.x/meu-service/2.0.0');
    expect(computeInstallLocation({ ...base, sourceType: 'project', targetVersion: ' 3.1 ' })).toBe(
      'mvn:com.x/meu-service/3.1'
    );
  });

  it('project sem pom cai na coordenada mvn', () => {
    expect(computeInstallLocation({ ...base, sourceType: 'project', selectedProjectPath: 'x' })).toBe('mvn:a/b/1');
  });
});

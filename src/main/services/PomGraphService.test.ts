import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { PomGraphService } from './PomGraphService';
import type { ConfigService } from './ConfigService';

let root = '';

const makeService = (projectsPath: string) =>
  new PomGraphService({ getSettings: () => ({ projectsPath }) } as unknown as ConfigService);

const writePom = (dir: string, body: string) => {
  fs.mkdirSync(path.join(root, dir), { recursive: true });
  fs.writeFileSync(path.join(root, dir, 'pom.xml'), `<project>${body}</project>`);
};

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'pomgraph-'));
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe('PomGraphService', () => {
  it('lê os projetos com pom.xml, ordenados por nome', () => {
    writePom('zeta', '<groupId>g</groupId><artifactId>zeta</artifactId><version>1</version>');
    writePom(
      'alfa',
      '<groupId>g</groupId><artifactId>alfa</artifactId><version>2</version><dependencies><dependency><groupId>g</groupId><artifactId>zeta</artifactId></dependency></dependencies>'
    );
    const { projects, projectsPath } = makeService(root).scanWorkspace();
    expect(projectsPath).toBe(root);
    expect(projects.map((p) => p.name)).toEqual(['alfa', 'zeta']);
    expect(projects[0].dependencies).toEqual([{ groupId: 'g', artifactId: 'zeta' }]);
    expect(projects[0].path).toBe(path.join(root, 'alfa'));
  });

  it('ignora pastas sem pom, pom inválido, ocultas e node_modules', () => {
    fs.mkdirSync(path.join(root, 'sem-pom'));
    writePom('quebrado', '<version>1</version>');
    writePom('.oculta', '<artifactId>x</artifactId>');
    writePom('node_modules', '<artifactId>y</artifactId>');
    expect(makeService(root).scanWorkspace().projects).toEqual([]);
  });

  it('devolve lista vazia sem projectsPath configurado ou inexistente', () => {
    expect(makeService('').scanWorkspace().projects).toEqual([]);
    expect(makeService(path.join(root, 'nao-existe')).scanWorkspace().projects).toEqual([]);
  });
});

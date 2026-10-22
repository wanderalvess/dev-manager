import { describe, expect, it } from 'vitest';
import { alteredPomsInCommit, relativeToRepo, sanitizeAlteredPoms, type AlteredPom } from './alteredPoms';

const entry = (pomPath: string): AlteredPom => ({
  id: 'a1',
  pomPath,
  projectPath: pomPath.replace(/[\\/]pom\.xml$/, ''),
  artifactId: 'winthor-integracao-matcon-service',
  from: '1.39.23.45',
  to: '0.0.1-SNAPSHOT',
  at: 1
});

describe('alteredPoms', () => {
  it('calcula o caminho relativo ao repositório, com barras do Windows e caixa diferente', () => {
    expect(relativeToRepo('C:\\Projetos\\Varejo\\varejo-service\\pom.xml', 'c:/projetos/varejo')).toBe('varejo-service/pom.xml');
    expect(relativeToRepo('C:\\Outro\\pom.xml', 'C:\\Projetos\\Varejo')).toBeNull();
    expect(relativeToRepo('C:\\Projetos\\VarejoX\\pom.xml', 'C:\\Projetos\\Varejo')).toBeNull();
  });

  it('só avisa quando o pom alterado está entre os arquivos do commit', () => {
    const e = entry('C:\\Projetos\\Varejo\\varejo-service\\pom.xml');
    expect(alteredPomsInCommit([e], 'C:\\Projetos\\Varejo', ['varejo-service/pom.xml', 'src/A.java'])).toEqual([e]);
    expect(alteredPomsInCommit([e], 'C:\\Projetos\\Varejo', ['src/A.java'])).toEqual([]);
  });

  it('o backup .bak no commit também conta', () => {
    const e = entry('/ws/varejo/pom.xml');
    expect(alteredPomsInCommit([e], '/ws/varejo', ['pom.xml.bak'])).toEqual([e]);
  });

  it('descarta entradas inválidas do storage', () => {
    expect(sanitizeAlteredPoms('x')).toEqual([]);
    expect(sanitizeAlteredPoms([{ id: '1' }, null, { id: '2', pomPath: '/p/pom.xml', artifactId: 'a', from: '1', to: '2', at: 5 }])).toHaveLength(1);
  });
});

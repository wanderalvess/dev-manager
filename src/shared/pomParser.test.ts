import { describe, expect, it } from 'vitest';
import { parsePom } from './pomParser';

const POM = `<?xml version="1.0"?>
<project>
  <!-- <dependency><artifactId>comentado</artifactId></dependency> -->
  <parent><groupId>com.acme</groupId><artifactId>acme-parent</artifactId><version>1.2.0</version></parent>
  <artifactId>acme-service</artifactId>
  <packaging>bundle</packaging>
  <dependencyManagement>
    <dependencies><dependency><groupId>x</groupId><artifactId>gerenciado</artifactId></dependency></dependencies>
  </dependencyManagement>
  <dependencies>
    <dependency><groupId>com.acme</groupId><artifactId>acme-core</artifactId><version>1.0</version></dependency>
    <dependency><groupId>org.slf4j</groupId><artifactId>slf4j-api</artifactId></dependency>
  </dependencies>
  <build><plugins><plugin><dependencies><dependency><artifactId>do-plugin</artifactId></dependency></dependencies></plugin></plugins></build>
</project>`;

describe('parsePom', () => {
  it('lê coordenadas próprias, herdando groupId e versão do parent', () => {
    const pom = parsePom(POM);
    expect(pom).toMatchObject({
      groupId: 'com.acme',
      artifactId: 'acme-service',
      version: '1.2.0',
      packaging: 'bundle',
      parent: { groupId: 'com.acme', artifactId: 'acme-parent' }
    });
  });

  it('ignora comentários, dependencyManagement e plugins', () => {
    const names = parsePom(POM)?.dependencies.map((d) => d.artifactId);
    expect(names).toEqual(['acme-core', 'slf4j-api']);
  });

  it('lê módulos e assume packaging jar', () => {
    const pom = parsePom(
      '<project><groupId>g</groupId><artifactId>a</artifactId><version>1</version><modules><module>m1</module><module> m2 </module></modules></project>'
    );
    expect(pom?.modules).toEqual(['m1', 'm2']);
    expect(pom?.packaging).toBe('jar');
  });

  it('devolve null para conteúdo que não é pom', () => {
    expect(parsePom('')).toBeNull();
    expect(parsePom('<html></html>')).toBeNull();
    expect(parsePom('<project><version>1</version></project>')).toBeNull();
  });
});

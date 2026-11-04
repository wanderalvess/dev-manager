import { describe, expect, it } from 'vitest';
import { analyzeBuildLog, buildLogPath, buildLogProbeScript, extractBuildCause, parseBuildLogProbe } from './infrBuildLog';

describe('infrBuildLog', () => {
  it('o caminho do log segue o nome do ambiente e recusa nome inválido', () => {
    expect(buildLogPath('teste40')).toBe('/tmp/hub-nova-versao-teste40.log');
    expect(buildLogPath('a b; rm')).toBeNull();
  });

  it('sem arquivo ou vazio, não há o que mostrar', () => {
    expect(analyzeBuildLog('/tmp/x', null)).toEqual({ path: '/tmp/x', exists: false, tail: [] });
    expect(analyzeBuildLog('/tmp/x', '  \n')).toMatchObject({ exists: true, tail: [] });
  });

  it('acha o "Unable to resolve" do fim do build e a etapa em que estava', () => {
    const log = ['==> Montando a imagem 40', 'Step 3/9 : RUN feature:install', '\x1b[31mError executing command: Unable to resolve root: missing requirement [root] osgi.identity=winthor-x\x1b[0m'].join('\n');
    const r = analyzeBuildLog('/tmp/x', log);
    expect(r.failure).toContain('Unable to resolve root');
    expect(r.stage).toBe('Step 3/9 : RUN feature:install');
    expect(r.tail).toHaveLength(3);
  });

  it('log sem erro conhecido não acusa nada, e só guarda o fim', () => {
    const log = Array.from({ length: 100 }, (_, i) => `linha ${i}`).join('\n');
    const r = analyzeBuildLog('/tmp/x', log);
    expect(r.failure).toBeUndefined();
    expect(r.tail).toHaveLength(40);
    expect(r.tail.at(-1)).toBe('linha 99');
  });

  it('reconhece falhas de rede, disco e porta', () => {
    for (const t of ['curl: Temporary failure in name resolution', 'write: no space left on device', 'Bind for 0.0.0.0:8040 failed: port is already allocated']) {
      expect(analyzeBuildLog('/tmp/x', `a\n${t}\n`).failure).toBeDefined();
    }
  });
});

const ROOT =
  '#8 100.1 [09:00:01] [ERRO] winthor-hub-carga-dados/1.39.6.1: Error executing command: Unable to resolve root: missing requirement [root] osgi.identity; osgi.identity=winthor-hub-carga-dados; type=karaf.feature; version="[1.39.6.1,1.39.6.1]"; filter:="(&(osgi.identity=winthor-hub-carga-dados)(type=karaf.feature)(version>=1.39.6.1)(version<=1.39.6.1))" [caused by: Unable to resolve winthor-hub-carga-dados/1.39.6.1: missing requirement [winthor-hub-carga-dados] osgi.wiring.package; (&(osgi.wiring.package=br.com.pcsist.winthor.core.data)(version>=1.40.0)(!(version>=2.0.0)))] [caused by: Unable to resolve winthor-core-servico [273](R 273.0): missing requirement [winthor-core-servico] osgi.wiring.package]';

describe('extractBuildCause', () => {
  it('destrincha o primeiro "Unable to resolve root": feature e faixa, pacote e faixa, cadeia caused by', () => {
    const c = extractBuildCause([ROOT], 151, 151)!;
    expect(c.headline).toBe('não resolveu feature winthor-hub-carga-dados na versão [1.39.6.1,1.39.6.1]');
    expect(c.requirements).toEqual(['feature winthor-hub-carga-dados na versão [1.39.6.1,1.39.6.1]', 'pacote br.com.pcsist.winthor.core.data em [1.40.0, 2.0.0)']);
    expect(c.causedBy).toHaveLength(2);
    expect(c.causedBy[0]).toContain('Unable to resolve winthor-hub-carga-dados/1.39.6.1');
    expect(c.symptoms).toBe(151);
    expect(c.failures).toBe(151);
    expect(c.hint).toContain('rode o ensaio no Karaf de origem');
    expect(c.full.startsWith('winthor-hub-carga-dados/1.39.6.1: Error executing command')).toBe(true);
  });

  it('a causa é a PRIMEIRA falha: um "No matching features" que vem depois vira outro problema, sem trocar o como resolver', () => {
    const later = '#8 444.2 [09:04:02] [ERRO] winthor-integracao-2650/1.40.1.2: Error executing command: No matching features for winthor-integracao-2650/1.40.1.2';
    const c = extractBuildCause([ROOT, later, later], 151, 151)!;
    expect(c.requirements).toEqual(['feature winthor-hub-carga-dados na versão [1.39.6.1,1.39.6.1]', 'pacote br.com.pcsist.winthor.core.data em [1.40.0, 2.0.0)']);
    expect(c.hint).toContain('rode o ensaio no Karaf de origem');
    expect(c.hint).not.toContain('repo mvn');
    expect(c.others).toEqual(['feature winthor-integracao-2650/1.40.1.2 não existe em nenhum repositório da lista']);
  });

  it('"No matching features" aponta a feature sem repositório e o que conferir', () => {
    const c = extractBuildCause(['#8 444.2 [09:04:02] [ERRO] winthor-integracao-2650/1.40.1.2: Error executing command: No matching features for winthor-integracao-2650/1.40.1.2'], 3)!;
    expect(c.headline).toBe('feature winthor-integracao-2650/1.40.1.2 não existe em nenhum repositório da lista');
    expect(c.hint).toContain('o Hub busca o repositório na 801');
  });

  it('não corta o texto no meio de uma palavra e não repete a cadeia', () => {
    const long = `Unable to resolve root: missing requirement [root] [caused by: ${'palavra '.repeat(200)}] [caused by: ${'palavra '.repeat(200)}]`;
    const c = extractBuildCause([long], 2)!;
    expect(c.causedBy[0].length).toBeLessThanOrEqual(401);
    expect(c.causedBy[0].endsWith('palavra…')).toBe(true);
    expect(extractBuildCause([], 0)).toBeUndefined();
  });
});

describe('parseBuildLogProbe', () => {
  it('sem arquivo não há relatório; sem seções vale como o fim do log (formato antigo)', () => {
    expect(parseBuildLogProbe('/tmp/x', '@@semlog\n')).toBeUndefined();
    expect(parseBuildLogProbe('/tmp/x', 'Error executing command: Unable to resolve root: x\n')?.failure).toContain('Unable to resolve root');
  });

  it('une o fim do log, a primeira falha de resolução, a contagem de [ERRO] e o total do script', () => {
    const out = `@@tail\n==> Instalando\n#8 444.2 [ERRO] winthor-x não ficou instalada\n@@causa\n${ROOT}\n@@erros\n151\n@@falhas\n#8 441.0 [09:04:00] 151 falha(s) ao aplicar /opt/winthor-version.features\n`;
    const r = parseBuildLogProbe('/tmp/x', out)!;
    expect(r.cause).toMatchObject({ symptoms: 151, failures: 151 });
    expect(r.failure).toContain('não resolveu feature winthor-hub-carga-dados');
    expect(r.stage).toBe('==> Instalando');
    expect(r.tail).toHaveLength(2);
  });

  it('o roteiro só usa o caminho validado do ambiente', () => {
    const script = buildLogProbeScript('/tmp/hub-nova-versao-a.log');
    expect(script).toContain("f='/tmp/hub-nova-versao-a.log'");
    expect(script).toContain("grep -m4 -E 'Unable to resolve root|No matching features|Could not resolve'");
  });
});

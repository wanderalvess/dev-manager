import { describe, expect, it } from 'vitest';
import { buildEnvFile, envFieldsFor, parseEnvLines, pickEnv } from './infrEnvConfig';

const WTA_INSPECT = `PATH=/usr/bin
DB_HOST=oracle-master
DB_PORT=1521
DB_SID=XE
DB_USER=LOCAL
DB_PASSWORD=LOCAL
WTA_LOJA=LOCAL
WTA_EMPRESA=XE
WTA_JAVA_OPTS=-Xms1g -Xmx4g
JAVA_HOME=/opt/java`;

describe('configuração do WTA e do WSH do ambiente novo', () => {
  it('lê o ambiente do container e fica só com o que é do .env', () => {
    const env = pickEnv('wta', parseEnvLines(WTA_INSPECT));
    expect(Object.keys(env)).toEqual(['DB_HOST', 'DB_PORT', 'DB_SID', 'DB_USER', 'DB_PASSWORD', 'WTA_LOJA', 'WTA_EMPRESA', 'WTA_JAVA_OPTS']);
    expect(pickEnv('wsh', { JVM_XMX: '3072m', WTA_PORT: '8080', SERVER_PORT: '8090', PATH: 'x' })).toEqual({ JVM_XMX: '3072m', WTA_PORT: '8080' });
  });

  it('campos para a tela: valores da origem, senha nunca volta (só se existe)', () => {
    const fields = envFieldsFor('wta', parseEnvLines(WTA_INSPECT));
    expect(fields.find((f) => f.key === 'WTA_JAVA_OPTS')?.value).toBe('-Xms1g -Xmx4g');
    expect(fields.find((f) => f.key === 'DB_PASSWORD')).toMatchObject({ value: '', secret: true, hasValue: true });
    expect(envFieldsFor('wsh', {}).find((f) => f.key === 'DB_PASSWORD')).toMatchObject({ hasValue: false });
  });

  it('grava: edição vale, senha vazia mantém a da origem e o ambiente novo manda no banco', () => {
    const origin = pickEnv('wta', parseEnvLines(WTA_INSPECT));
    const text = buildEnvFile(
      origin,
      { DB_PASSWORD: '', WTA_JAVA_OPTS: '-Xms512m -Xmx2g', DB_HOST: 'ignorado' },
      { DB_HOST: 'oracle-develop', DB_PORT: '1521' },
      'Gerado pelo Hub'
    );
    const out = parseEnvLines(text);
    expect(out.DB_PASSWORD).toBe('LOCAL');
    expect(out.WTA_JAVA_OPTS).toBe('-Xms512m -Xmx2g');
    expect(out.DB_HOST).toBe('oracle-develop');
    expect(text.startsWith('# Gerado pelo Hub')).toBe(true);
    expect(buildEnvFile(origin, { DB_PASSWORD: 'NOVA' }, {}, 'x')).toContain('DB_PASSWORD=NOVA');
  });

  it('recusa valor com quebra de linha (injetaria outra variável)', () => {
    expect(() => buildEnvFile({}, { WTA_LOJA: 'LOCAL\nDB_HOST=evil' }, {}, 'x')).toThrow(/inválido/);
    expect(() => buildEnvFile({}, { 'A B': '1' }, {}, 'x')).toThrow(/inválido/);
  });
});

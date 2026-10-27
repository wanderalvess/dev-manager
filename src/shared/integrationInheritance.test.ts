import { describe, expect, it } from 'vitest';
import { effectiveLayer, hubDefaultsFrom, inheritedValues, karafServicesLogPath } from './integrationInheritance';

const defaults = hubDefaultsFrom({
  wtaUrl: 'http://localhost:8889',
  wtaLogin: 'ADMIN',
  wtaPassword: 'segredo',
  karafPath: 'C:\\karaf\\'
});

describe('herança da camada WinThor', () => {
  it('log dos serviços no Karaf, com o separador do caminho', () => {
    expect(karafServicesLogPath('C:\\karaf\\')).toBe('C:\\karaf\\data\\log\\winthor.log');
    expect(karafServicesLogPath('/opt/karaf')).toBe('/opt/karaf/data/log/winthor.log');
    expect(karafServicesLogPath('  ')).toBeUndefined();
  });

  it('camada vazia herda URL, log e o login do WinThor do Hub', () => {
    const layer = effectiveLayer({ layer: 'winthor', dbConnectionId: 'ora' }, defaults);
    expect(layer).toEqual({
      layer: 'winthor',
      dbConnectionId: 'ora',
      baseUrl: 'http://localhost:8889',
      logFilePath: 'C:\\karaf\\data\\log\\winthor.log',
      auth: { type: 'winthor', user: 'ADMIN', password: 'segredo' }
    });
    expect(inheritedValues({ layer: 'winthor' }, defaults)).toEqual({
      baseUrl: 'http://localhost:8889',
      logFilePath: 'C:\\karaf\\data\\log\\winthor.log',
      auth: 'ADMIN'
    });
  });

  it('o que a camada preenche vence o herdado, e "sem autenticação" escolhido é respeitado', () => {
    const layer = effectiveLayer(
      { layer: 'winthor', baseUrl: 'http://wta:9000', logFilePath: 'D:\\x.log', auth: { type: 'none' } },
      defaults
    );
    expect(layer).toEqual({ layer: 'winthor', baseUrl: 'http://wta:9000', logFilePath: 'D:\\x.log', auth: { type: 'none' } });
    expect(inheritedValues({ layer: 'winthor', auth: { type: 'basic', user: 'u' } }, defaults).auth).toBeUndefined();
  });

  it('"login do WinThor das Configurações" escolhido usa o do Hub; outras camadas não herdam nada', () => {
    expect(effectiveLayer({ layer: 'winthor', auth: { type: 'hub-winthor' } }, defaults).auth).toEqual({ type: 'winthor', user: 'ADMIN', password: 'segredo' });
    expect(effectiveLayer({ layer: 'wsh' }, defaults)).toEqual({ layer: 'wsh' });
    expect(inheritedValues({ layer: 'ch' }, defaults)).toEqual({});
  });

  it('sem login salvo no Hub, a camada sem autenticação continua sem login', () => {
    expect(effectiveLayer({ layer: 'winthor' }, hubDefaultsFrom({ wtaUrl: 'http://x' })).auth).toBeUndefined();
  });
});

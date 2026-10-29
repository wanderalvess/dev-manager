import { describe, expect, it } from 'vitest';
import type { AppSettings } from '../../shared/types';
import { makeService } from './integrationTraceServiceTestKit';

describe('IntegrationTraceService: camada WinThor herda das outras telas', () => {
  it('sem URL nem login na camada, o pré-voo usa a URL e o login do WinThor salvos no Hub', async () => {
    const settings: Partial<AppSettings> = {
      wtaUrl: 'http://localhost:8889',
      wtaLogin: 'ADMIN',
      wtaPassword: 'segredo',
      integrationLayers: [{ layer: 'winthor' }]
    };
    const { service, httpClientService } = makeService(settings);

    const winthor = service.getLayers().find((layer) => layer.layer === 'winthor');
    expect(winthor).toMatchObject({ baseUrl: 'http://localhost:8889', auth: { type: 'winthor', user: 'ADMIN' } });

    await service.checkReadiness();
    expect(httpClientService.loginWinThor).toHaveBeenCalledWith({
      loginUrl: 'http://localhost:8889/winthor/autenticacao/v1/login',
      login: 'ADMIN',
      senha: 'segredo'
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Routine801Service } from './Routine801Service';
import { ConfigService } from './ConfigService';
import { KarafService } from './KarafService';
import { httpRequest } from '../utils/httpRequest';

vi.mock('../utils/httpRequest', () => ({
  httpRequest: vi.fn()
}));

describe('Routine801Service', () => {
  let configService: ConfigService;
  let karafService: KarafService;
  let routine801Service: Routine801Service;

  beforeEach(() => {
    vi.clearAllMocks();

    configService = {
      getSettings: vi.fn().mockReturnValue({
        routine801Url: 'http://localhost:8889',
        wtaUrl: 'http://localhost:8889'
      }),
      saveSettings: vi.fn()
    } as unknown as ConfigService;

    karafService = {
      executeKarafCommand: vi.fn().mockResolvedValue({ code: 0, stdout: 'OK', stderr: '' }),
      isKarafRunning: vi.fn().mockResolvedValue(true)
    } as unknown as KarafService;

    routine801Service = new Routine801Service(configService, karafService);
  });

  describe('getServerUrl', () => {
    it('deve priorizar a URL informada explicitamente', () => {
      const url = routine801Service.getServerUrl('http://192.168.1.100:8889/');
      expect(url).toBe('http://192.168.1.100:8889');
    });

    it('deve usar routine801Url das configurações quando não fornecida', () => {
      vi.mocked(configService.getSettings).mockReturnValue({
        routine801Url: 'http://custom-host:9000'
      } as any);

      const url = routine801Service.getServerUrl();
      expect(url).toBe('http://custom-host:9000');
    });

    it('deve usar fallback para http://localhost:8889 se nada estiver configurado', () => {
      vi.mocked(configService.getSettings).mockReturnValue({} as any);

      const url = routine801Service.getServerUrl();
      expect(url).toBe('http://localhost:8889');
    });
  });

  describe('checkServerHealth', () => {
    it('deve retornar ok: true quando o servidor responde com status 200', async () => {
      vi.mocked(httpRequest).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => '{"status":"OK"}',
        buffer: async () => Buffer.from('')
      });

      const health = await routine801Service.checkServerHealth();
      expect(health.ok).toBe(true);
      expect(health.status).toBe(200);
    });

    it('deve retornar ok: false quando o servidor responde com erro de autenticação 401', async () => {
      vi.mocked(httpRequest).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Unauthorized',
        buffer: async () => Buffer.from('')
      });

      const health = await routine801Service.checkServerHealth();
      expect(health.ok).toBe(false);
      expect(health.status).toBe(401);
      expect(health.message).toContain('401');
    });

    it('deve retornar ok: false com mensagem informativa quando houver falha de conexão', async () => {
      vi.mocked(httpRequest).mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const health = await routine801Service.checkServerHealth();
      expect(health.ok).toBe(false);
      expect(health.message).toContain('ECONNREFUSED');
    });
  });

  describe('fetchInstallations', () => {
    it('deve consultar o endpoint /instalacao e normalizar os resultados', async () => {
      const fakeJson = JSON.stringify({
        repositorios: [
          {
            comando: 'INSTALL',
            repositorio: {
              groupId: 'br.com.pcsist.winthor.rotina',
              artifactId: 'winthor-fin-1531-features',
              version: '1.38.0.2'
            }
          }
        ],
        funcionalidades: [
          {
            nome: 'winthor-fin-1531',
            versao: '1.38.0.2',
            codigoRotina: 1531,
            codigoModulo: 15,
            tipoProjeto: 'ROTINA',
            descricao: '1531 - Conciliação',
            status: 'LIBERADO'
          }
        ]
      });

      vi.mocked(httpRequest).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => fakeJson,
        buffer: async () => Buffer.from(fakeJson)
      });

      const res = await routine801Service.fetchInstallations();
      expect(res.funcionalidades).toHaveLength(1);
      expect(res.funcionalidades[0].nome).toBe('winthor-fin-1531');
      expect(res.funcionalidades[0].featureMavenUrl).toContain('winthor-fin-1531-features');
    });
  });

  describe('installFeatures', () => {
    it('deve rejeitar lista vazia', async () => {
      const result = await routine801Service.installFeatures({ funcionalidades: [] });
      expect(result.success).toBe(false);
      expect(result.installedCount).toBe(0);
    });

    it('deve executar repo-add e feature:install no Karaf para cada feature', async () => {
      const logChunks: string[] = [];

      const result = await routine801Service.installFeatures(
        {
          funcionalidades: [
            {
              nome: 'winthor-fin-1531',
              versao: '1.38.0.2',
              codigoRotina: 1531,
              codigoModulo: 15,
              tipoProjeto: 'ROTINA',
              descricao: '1531',
              status: 'LIBERADO',
              featureMavenUrl: 'mvn:br.com.pcsist.winthor.rotina/winthor-fin-1531-features/1.38.0.2/xml/features'
            }
          ],
          executeVia: 'karaf_cli'
        },
        (chunk) => logChunks.push(chunk)
      );

      expect(karafService.executeKarafCommand).toHaveBeenCalledTimes(2);
      expect(karafService.executeKarafCommand).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('feature:repo-add'),
        expect.any(Function),
        undefined,
        180000
      );
      expect(karafService.executeKarafCommand).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('feature:install'),
        expect.any(Function),
        undefined,
        300000
      );
      expect(result.success).toBe(true);
      expect(result.installedCount).toBe(1);
      expect(result.failedCount).toBe(0);
      expect(logChunks.some((l) => l.includes('Sucesso'))).toBe(true);
    });

    it('deve auto-inferir repositório Maven e executar feature:repo-add quando featureMavenUrl for omitida', async () => {
      const logChunks: string[] = [];

      const result = await routine801Service.installFeatures(
        {
          funcionalidades: [
            {
              nome: 'winthor-atualizacao-dados',
              versao: '1.39.1.6',
              codigoRotina: 0,
              codigoModulo: 0,
              tipoProjeto: 'SERVICO',
              descricao: 'Atualização de Dados',
              status: 'LIBERADO'
            }
          ],
          executeVia: 'karaf_cli'
        },
        (chunk) => logChunks.push(chunk)
      );

      expect(karafService.executeKarafCommand).toHaveBeenCalledTimes(2);
      expect(karafService.executeKarafCommand).toHaveBeenNthCalledWith(
        1,
        'feature:repo-add mvn:br.com.pcsist.winthor.servico/winthor-atualizacao-dados-features/1.39.1.6/xml/features',
        expect.any(Function),
        undefined,
        180000
      );
      expect(karafService.executeKarafCommand).toHaveBeenNthCalledWith(
        2,
        'feature:install -r -u winthor-atualizacao-dados/1.39.1.6',
        expect.any(Function),
        undefined,
        300000
      );
      expect(result.success).toBe(true);
      expect(result.installedCount).toBe(1);
    });

    it('deve suportar action: repo_add_only executando apenas feature:repo-add sem instalar', async () => {
      const logChunks: string[] = [];

      const result = await routine801Service.installFeatures(
        {
          funcionalidades: [
            {
              nome: 'winthor-ferramenta-servidor',
              versao: '1.37.0.1',
              codigoRotina: 0,
              codigoModulo: 0,
              tipoProjeto: 'SERVICO',
              descricao: 'Ferramenta Servidor',
              status: 'LIBERADO'
            }
          ],
          action: 'repo_add_only',
          executeVia: 'karaf_cli'
        },
        (chunk) => logChunks.push(chunk)
      );

      // Deve executar apenas o repo-add
      expect(karafService.executeKarafCommand).toHaveBeenCalledTimes(1);
      expect(karafService.executeKarafCommand).toHaveBeenCalledWith(
        'feature:repo-add mvn:br.com.pcsist.winthor.servico/winthor-ferramenta-servidor-features/1.37.0.1/xml/features',
        expect.any(Function),
        undefined,
        180000
      );
      expect(result.success).toBe(true);
      expect(result.installedCount).toBe(1);
      expect(logChunks.some((l) => l.includes('Registrando Repositórios Maven'))).toBe(true);
    });

    it('deve aplicar targetVersionOverride para forçar versão específica', async () => {
      const result = await routine801Service.installFeatures({
        funcionalidades: [
          {
            nome: 'winthor-atualizacao-dados',
            versao: '1.39.1.6',
            codigoRotina: 0,
            codigoModulo: 0,
            tipoProjeto: 'SERVICO',
            descricao: 'Atualização',
            status: 'LIBERADO'
          }
        ],
        targetVersionOverride: '1.38.0.0',
        executeVia: 'karaf_cli'
      });

      expect(karafService.executeKarafCommand).toHaveBeenCalledWith(
        'feature:repo-add mvn:br.com.pcsist.winthor.servico/winthor-atualizacao-dados-features/1.38.0.0/xml/features',
        expect.any(Function),
        undefined,
        180000
      );
      expect(karafService.executeKarafCommand).toHaveBeenCalledWith(
        'feature:install -r -u winthor-atualizacao-dados/1.38.0.0',
        expect.any(Function),
        undefined,
        300000
      );
      expect(result.details?.[0].version).toBe('1.38.0.0');
    });
  });

  describe('auth and tokens', () => {
    it('deve incluir Cookie e Authorization quando wtaAuthToken estiver configurado', () => {
      vi.mocked(configService.getSettings).mockReturnValue({
        wtaAuthToken: 'token123'
      } as any);

      const headers = routine801Service.getAuthHeaders();
      expect(headers['Cookie']).toBe('suukie=token123');
      expect(headers['Authorization']).toBe('Bearer token123');
    });

    it('deve renovar token via login quando credenciais estiverem preenchidas', async () => {
      vi.mocked(configService.getSettings).mockReturnValue({
        wtaLogin: 'PCADMIN',
        wtaPassword: '1'
      } as any);

      vi.mocked(httpRequest).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify({ accessToken: 'newToken999' }),
        buffer: async () => Buffer.from('')
      });

      const token = await routine801Service.renewWtaAuth('http://localhost:8889');
      expect(token).toBe('newToken999');
      expect(configService.saveSettings).toHaveBeenCalledWith({ wtaAuthToken: 'newToken999' });
    });
  });
});

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DelphiBuildService } from '../../main/services/DelphiBuildService';

interface DelphiToolDeps {
  delphiBuildService: DelphiBuildService;
  ok: (data: unknown) => unknown;
  fail: (message: string) => unknown;
}

const buildShape = {
  dprojPath: z.string().describe('Caminho completo do arquivo .dproj'),
  rsvarsPath: z.string().describe('Caminho do rsvars.bat da instalação (veja delphi_detect_installations)'),
  config: z.string().optional().describe('Configuração do projeto (padrão: Debug)'),
  platform: z.string().optional().describe('Plataforma (padrão: Win32)')
};

/** Tools de build Delphi. Os logs de streaming do compilador são bufferizados e devolvidos junto do resultado. */
export function registerDelphiTools(server: McpServer, { delphiBuildService, ok, fail }: DelphiToolDeps): void {
  const reply = ok as (data: unknown) => never;
  const error = fail as (message: string) => never;

  server.registerTool(
    'delphi_detect_installations',
    { title: 'Detectar instalações do Delphi', description: 'Lista as versões do RAD Studio/Delphi instaladas e o rsvars.bat de cada uma.' },
    async () => reply(delphiBuildService.detectInstallations())
  );

  server.registerTool(
    'delphi_list_projects',
    {
      title: 'Listar projetos Delphi',
      description: 'Procura arquivos .dproj na pasta de projetos configurada (ou na pasta informada).',
      inputSchema: { root: z.string().optional().describe('Pasta a varrer (padrão: pasta de projetos das configurações)') }
    },
    async ({ root }) => reply(await delphiBuildService.findProjects(root))
  );

  server.registerTool(
    'delphi_build',
    {
      title: 'Compilar projeto Delphi',
      description: 'Compila um .dproj via MSBuild e devolve erros e avisos do compilador já estruturados (arquivo, linha, código).',
      inputSchema: buildShape
    },
    async ({ dprojPath, rsvarsPath, config, platform }) => {
      try {
        const result = await delphiBuildService.build(
          { dprojPath, rsvarsPath, config: config || 'Debug', platform: platform || 'Win32' },
          () => undefined
        );
        return reply(result);
      } catch (err: any) {
        return error(err?.message || 'Falha ao compilar o projeto Delphi.');
      }
    }
  );

  server.registerTool(
    'delphi_run_pipeline',
    {
      title: 'Pipeline Delphi: compilar, publicar e abrir',
      description: 'Encerra o .exe em execução, compila, publica o executável (com backup .bak) e o abre.',
      inputSchema: {
        ...buildShape,
        killRunning: z.boolean().optional().describe('Encerrar o .exe em execução antes (padrão: true)'),
        publishDir: z.string().optional().describe('Pasta onde publicar o .exe; vazio = não publica'),
        launch: z.boolean().optional().describe('Abrir o executável ao final (padrão: false)')
      }
    },
    async ({ dprojPath, rsvarsPath, config, platform, killRunning, publishDir, launch }) => {
      try {
        const result = await delphiBuildService.runPipeline(
          {
            dprojPath,
            rsvarsPath,
            config: config || 'Debug',
            platform: platform || 'Win32',
            killRunning: killRunning ?? true,
            publishDir,
            launch: launch ?? false
          },
          () => undefined
        );
        return reply(result);
      } catch (err: any) {
        return error(err?.message || 'Falha ao executar o pipeline Delphi.');
      }
    }
  );
}

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AuthLockoutTestService } from '../../main/services/AuthLockoutTestService';
import { AUTH_LOCKOUT_CHECKS, AUTH_LOCKOUT_CHECK_IDS, estimateAuthLockoutMinutes } from '../../shared/authLockoutCatalog';
import type { AuthLockoutCheckId } from '../../shared/authLockoutTypes';

interface AuthLockoutToolDeps {
  authLockoutTestService: AuthLockoutTestService;
  ok: (data: unknown) => unknown;
  fail: (message: string) => unknown;
}

const SLOW_CHECKS = AUTH_LOCKOUT_CHECKS.filter((c) => c.slow).map((c) => c.id);
const checkIdSchema = z.enum(AUTH_LOCKOUT_CHECK_IDS as [AuthLockoutCheckId, ...AuthLockoutCheckId[]]);

/** Teste de bloqueio de login do WinThor (Homologação → Bloqueio de Login). */
export function registerAuthLockoutTools(server: McpServer, { authLockoutTestService, ok, fail }: AuthLockoutToolDeps): void {
  const reply = ok as (data: unknown) => never;
  const error = fail as (message: string) => never;

  server.registerTool(
    'qa_list_auth_lockout_checks',
    {
      title: 'Listar as checagens do teste de bloqueio de login',
      description:
        'Lista as 12 checagens do teste de bloqueio de login do WinThor (limiar, senha certa durante o bloqueio, troca de cliente, bloqueio por usuário, logoff, concorrência, duração, janela de contagem, exceções de APIs, exposição de erro, registro de logs e falha do destino de logs), com a tentativa feita e o que precisa ser verdade. Devolve também os padrões (URL do WTA, caminhos de login/logoff, API de logs, winthor.log, limiar 5, janela 60 s, durações candidatas 4 e 5 min).'
    },
    async () => reply({ checks: AUTH_LOCKOUT_CHECKS, defaults: authLockoutTestService.getDefaults() })
  );

  server.registerTool(
    'qa_run_auth_lockout_test',
    {
      title: 'Rodar o teste de bloqueio de login (homologação)',
      description:
        'Executa tentativas controladas contra o login do WTA (POST /winthor/autenticacao/v1/login) com dois usuários de teste e confere: bloqueio só na N-ésima falha, senha certa sem token durante o bloqueio, outro cliente HTTP, logoff que não limpa o bloqueio, bloqueio por usuário, falhas simultâneas, duração do bloqueio (4 ou 5 min), regra da janela, falhas simultâneas em APIs diferentes, exposição de stack trace/senha/token/string de conexão, correlação com o winthor.log e com a API /winthor/ferramenta/servidor/v1/logs (acesso restrito e sem segredos) e, com confirmação, o serviço de pé com o destino de logs indisponível. BLOQUEIA as contas de teste de propósito: use só em homologação, com usuários dedicados, e não rode junto com a tela Bloqueio de Login. Sem `checks`, roda as rápidas (~2 min); `includeSlow` acrescenta duração e janela (~8 min). Devolve o status de cada checagem e o relatório em Markdown (senhas e tokens mascarados).',
      inputSchema: {
        userALogin: z.string().describe('Login do usuário de teste A (é bloqueado durante o teste)'),
        userAPassword: z.string().describe('Senha correta do usuário A (texto digitado ou o MD5 pronto)'),
        userBLogin: z.string().optional().describe('Login do usuário de teste B (bloqueio por usuário e concorrência)'),
        userBPassword: z.string().optional().describe('Senha correta do usuário B'),
        passwordEncoding: z.enum(['md5', 'plain']).optional().describe('Como a senha vai no login: md5 (padrão, MD5 maiúsculo como o WTA espera) ou plain'),
        checks: z.array(checkIdSchema).optional().describe('Checagens a executar; sem elas, as rápidas (ou todas com includeSlow)'),
        includeSlow: z.boolean().optional().describe('Inclui duração do bloqueio e janela de contagem, que esperam minutos'),
        baseUrl: z.string().optional().describe('URL base do WTA (padrão: a de Configurações)'),
        logsUrl: z.string().optional().describe('URL completa da API de logs (padrão: <baseUrl>/winthor/ferramenta/servidor/v1/logs)'),
        logoffPath: z.string().optional().describe('Caminho do logoff (padrão /winthor/autenticacao/v1/logoff; vazio pula)'),
        threshold: z.number().int().optional().describe('Falhas que bloqueiam (padrão 5)'),
        windowSeconds: z.number().int().optional().describe('Janela de contagem em segundos (padrão 60)'),
        lockMinutesCandidates: z.array(z.number().int()).optional().describe('Durações de bloqueio a conferir, em minutos (padrão [4, 5])'),
        logSinkUnavailableConfirmed: z.boolean().optional().describe('O destino de logs já foi derrubado por um mecanismo autorizado')
      }
    },
    async (args) => {
      const checks = args.checks?.length
        ? args.checks
        : AUTH_LOCKOUT_CHECK_IDS.filter((id) => args.includeSlow || !SLOW_CHECKS.includes(id));
      try {
        const result = await authLockoutTestService.run({
          userA: { login: args.userALogin, password: args.userAPassword },
          ...(args.userBLogin && args.userBPassword ? { userB: { login: args.userBLogin, password: args.userBPassword } } : {}),
          checks,
          passwordEncoding: args.passwordEncoding,
          baseUrl: args.baseUrl,
          logsUrl: args.logsUrl,
          logoffPath: args.logoffPath,
          threshold: args.threshold,
          windowSeconds: args.windowSeconds,
          lockMinutesCandidates: args.lockMinutesCandidates,
          logSinkUnavailableConfirmed: args.logSinkUnavailableConfirmed
        });
        if (!result.success && result.checks.length === 0) return error(result.error ?? 'Falha ao iniciar o teste.');
        const { attempts, ...rest } = result;
        return reply({
          ...rest,
          attemptsCount: attempts.length,
          estimatedMinutes: estimateAuthLockoutMinutes(checks, args.windowSeconds ?? 60, args.lockMinutesCandidates ?? [4, 5])
        });
      } catch (err: any) {
        return error(err?.message || 'Falha ao rodar o teste de bloqueio.');
      }
    }
  );
}

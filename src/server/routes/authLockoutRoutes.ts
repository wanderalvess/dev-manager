import { randomUUID } from 'crypto';
import express, { Router, Request, Response } from 'express';
import type { AuthLockoutTestService } from '../../main/services/AuthLockoutTestService';
import type { UsageMetricsService } from '../../main/services/UsageMetricsService';
import type { AuthLockoutRunResult } from '../../shared/authLockoutTypes';

const KEEP_RESULTS = 5;

/**
 * Teste de bloqueio de login no modo Web/Docker. A execução leva minutos (janela e duração do bloqueio), mais que o
 * `requestTimeout` padrão do Node (300 s): o POST devolve um ticket na hora e o resultado é buscado por ele depois.
 */
export function createAuthLockoutRouter(
  service: AuthLockoutTestService,
  broadcastWs: (type: string, data: unknown) => void,
  usage?: Pick<UsageMetricsService, 'record'>
): Router {
  const router = express.Router();
  const results = new Map<string, AuthLockoutRunResult | null>();

  router.get('/defaults', (_req: Request, res: Response) => {
    res.json(service.getDefaults());
  });

  router.post('/run', (req: Request, res: Response) => {
    if (service.isRunning()) {
      res.status(409).json({ error: 'Já existe um teste de bloqueio em execução. Aguarde ou interrompa.' });
      return;
    }
    const ticket = randomUUID();
    results.set(ticket, null);
    for (const old of [...results.keys()].slice(0, Math.max(0, results.size - KEEP_RESULTS))) results.delete(old);
    const started = Date.now();
    service
      .run(req.body ?? {}, (progress) => broadcastWs('auth-lockout:progress', progress))
      .then((result) => {
        results.set(ticket, result);
        usage?.record({ module: 'qa', action: 'auth-lockout-run', origin: 'rest', ok: result.success, durationMs: Date.now() - started });
      })
      .catch((err: any) => {
        results.delete(ticket);
        console.error('[auth-lockout] falha inesperada:', err?.message);
      });
    res.status(202).json({ ticket });
  });

  router.get('/result/:ticket', (req: Request, res: Response) => {
    if (!results.has(req.params.ticket)) {
      res.status(404).json({ error: 'Execução não encontrada.' });
      return;
    }
    const result = results.get(req.params.ticket);
    res.json(result ? { done: true, result } : { done: false });
  });

  router.post('/abort', (_req: Request, res: Response) => {
    res.json({ success: service.abort() });
  });

  return router;
}

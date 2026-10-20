import type { NextFunction, Request, Response } from 'express';
import type { UsageMetricsService } from '../main/services/UsageMetricsService';
import { findTrackedRestAction } from '../shared/usageActions';

/**
 * Middleware que mede as rotas REST da lista de ações rastreadas (usageActions.ts).
 *
 * Registre-o ANTES das rotas e DEPOIS da autenticação: requisição barrada pelo guard não chega
 * a casar rota e, por isso, não conta. A medição acontece no `finish` da resposta, quando o
 * Express já preencheu `req.route`; a chave é `MÉTODO baseUrl+caminho`, que para rotas de
 * routers (ex.: `/api/http-client` + `/execute`) é o caminho completo.
 */
export function createUsageTrackingMiddleware(usage: UsageMetricsService) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const started = Date.now();
    res.on('finish', () => {
      const routePath = req.route?.path;
      if (typeof routePath !== 'string') return;
      const action = findTrackedRestAction(req.method, `${req.baseUrl}${routePath}`);
      if (!action) return;
      usage.record({
        module: action.module,
        action: action.action,
        origin: 'rest',
        ok: res.statusCode < 400,
        durationMs: Date.now() - started
      });
    });
    next();
  };
}

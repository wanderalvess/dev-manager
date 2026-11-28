import express, { NextFunction, Router, Request, Response } from 'express';
import type { KnowledgeBaseService } from '../../main/services/kb/KnowledgeBaseService';

type AsyncHandler = (req: Request, res: Response) => Promise<void> | void;

/**
 * O `wrapAsyncRoutes` só protege rotas registradas direto no `app`; num `Router` um erro assíncrono (ex.: servidor da base
 * fora do ar) viraria rejeição não tratada e derrubaria o processo. Aqui vira uma resposta 502 com a mensagem do erro.
 */
const safe =
  (handler: AsyncHandler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(handler(req, res)).catch((err: unknown) => {
      if (res.headersSent) return next(err);
      // Falha da base (fora do ar, chave recusada, motor de IA sem chave): a mensagem já diz o que fazer.
      res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
    });
  };

/** Base de Conhecimento compartilhada no modo Web/Docker. A importação envia só a pasta configurada. */
export function createKnowledgeBaseRouter(
  service: KnowledgeBaseService,
  broadcastWs: (type: string, data: unknown) => void
): Router {
  const router = express.Router();

  router.get('/status', safe((_req, res) => void res.json(service.getStatus())));
  router.post('/search', safe(async (req, res) => void res.json(await service.search(req.body ?? {}))));
  router.post('/ask', safe(async (req, res) => void res.json(await service.ask(req.body ?? {}))));
  router.post('/chat', safe(async (req, res) => void res.json(await service.chat(req.body ?? {}))));
  router.get(
    '/divergences',
    safe(async (req, res) => {
      const module = typeof req.query.module === 'string' ? req.query.module : undefined;
      const limit = Number(req.query.limit) || undefined;
      res.json(await service.divergences(module, limit));
    })
  );
  router.post(
    '/sync-embeddings',
    safe(async (_req, res) => {
      res.json(
        await service.syncEmbeddings({ downloadModel: true, onProgress: (p) => broadcastWs('kb:embeddings-progress', p) })
      );
    })
  );
  router.post(
    '/import',
    safe(async (req, res) => {
      const version = typeof req.body?.version === 'string' ? req.body.version : undefined;
      res.json(await service.importFolder({ version, onProgress: (p) => broadcastWs('kb:import-progress', p) }));
    })
  );

  return router;
}

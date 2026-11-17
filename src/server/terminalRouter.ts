import { Router, type Request, type Response } from 'express';
import type { TerminalSessionService } from '../main/services/TerminalSessionService';
import type { ConfigService } from '../main/services/ConfigService';

export function createTerminalRouter(
  terminalService: TerminalSessionService,
  broadcast: (type: string, data: unknown) => void,
  configService: ConfigService
): Router {
  const router = Router();

  router.get('/profiles', async (_req: Request, res: Response) => {
    try {
      const profiles = await terminalService.listProfiles();
      res.json(profiles);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Falha ao listar perfis de terminal' });
    }
  });

  router.post('/sessions', (req: Request, res: Response) => {
    try {
      const defaultCwd = configService.getSettings().projectsPath;
      const info = terminalService.createSession(
        req.body || {},
        defaultCwd,
        (evt) => broadcast('terminal:data', evt),
        (evt) => broadcast('terminal:exit', evt)
      );
      res.json(info);
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Falha ao criar sessão de terminal' });
    }
  });

  router.post('/sessions/:id/input', (req: Request, res: Response) => {
    const ok = terminalService.writeInput(req.params.id, String(req.body?.input || ''));
    res.json({ ok });
  });

  router.post('/sessions/:id/interrupt', async (req: Request, res: Response) => {
    const ok = await terminalService.interruptSession(req.params.id);
    res.json({ ok });
  });

  router.delete('/sessions/:id', (req: Request, res: Response) => {
    const ok = terminalService.closeSession(req.params.id);
    res.json({ ok });
  });

  return router;
}

import type { Express, Request, Response } from 'express';
import { TerminalSessionService } from '../src/main/services/TerminalSessionService';
import { state } from './state';

const terminalService = new TerminalSessionService();

export function registerTerminalRoutes(
  app: Express,
  broadcast: (channel: string, payload: unknown) => void
): void {
  app.get('/api/terminal/profiles', async (_req: Request, res: Response) => {
    try {
      const profiles = await terminalService.listProfiles();
      res.json(profiles);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Falha ao listar perfis de terminal' });
    }
  });

  app.post('/api/terminal/sessions', (req: Request, res: Response) => {
    try {
      const info = terminalService.createSession(
        req.body || {},
        state.settings.projectsDir,
        (evt) => broadcast('terminal:data', evt),
        (evt) => broadcast('terminal:exit', evt)
      );
      res.json(info);
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Falha ao criar sessão de terminal' });
    }
  });

  app.post('/api/terminal/sessions/:id/input', (req: Request, res: Response) => {
    const ok = terminalService.writeInput(req.params.id, String(req.body?.input || ''));
    res.json({ ok });
  });

  app.post('/api/terminal/sessions/:id/interrupt', async (req: Request, res: Response) => {
    const ok = await terminalService.interruptSession(req.params.id);
    res.json({ ok });
  });

  app.delete('/api/terminal/sessions/:id', (req: Request, res: Response) => {
    const ok = terminalService.closeSession(req.params.id);
    res.json({ ok });
  });
}

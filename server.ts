import express from 'express';
import http from 'node:http';
import path from 'node:path';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { registerApiRoutes } from './server/routes';

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const isProd = process.env.NODE_ENV === 'production';

async function bootstrap() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  const broadcast = (channel: string, payload: unknown) => {
    const msg = JSON.stringify({ channel, payload });
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) {
        client.send(msg);
      }
    }
  };

  registerApiRoutes(app, broadcast);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, HOST, () => {
    console.log(`[Hub Manager] Server listening at http://${HOST}:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('[Hub Manager] Fatal startup error:', err);
  process.exit(1);
});

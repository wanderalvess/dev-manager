import { app, BrowserWindow, desktopCapturer, globalShortcut, ipcMain, net, screen, session, shell } from 'electron';
import path from 'path';
import {
  EVIDENCE_HOTKEY,
  EVIDENCE_HOTKEY_EVENT,
  isValidSessionId,
  type EvidenceCaptureSource,
  type EvidenceSessionInput,
  type EvidenceStep
} from '../../../shared/evidenceTypes';
import { EvidenceService } from '../../services/EvidenceService';
import { safeSend } from '../../utils/ipcSend';
import type { IpcContext } from '../ipcContext';

async function renderPdf(htmlPath: string): Promise<Buffer> {
  const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false } });
  try {
    await win.loadFile(htmlPath);
    return await win.webContents.printToPDF({ printBackground: true, pageSize: 'A4' });
  } finally {
    win.destroy();
  }
}

async function captureScreenPng(sourceId?: string): Promise<Buffer> {
  const { size, scaleFactor } = screen.getPrimaryDisplay();
  const thumbnailSize = { width: Math.round(size.width * scaleFactor), height: Math.round(size.height * scaleFactor) };
  const sources = await desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize });
  const source = (sourceId && sources.find((s) => s.id === sourceId)) || sources.find((s) => s.id.startsWith('screen:'));
  if (!source || source.thumbnail.isEmpty()) throw new Error('Não consegui capturar a tela.');
  return source.thumbnail.toPNG();
}

const toBuffer = (data: unknown): Buffer => {
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  throw new Error('Dados inválidos.');
};

const decodePngDataUrl = (dataUrl: unknown): Buffer | null => {
  if (typeof dataUrl !== 'string') return null;
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  return m ? Buffer.from(m[1], 'base64') : null;
};

/** Evidências de desenvolvimento/teste (prints, gravação, relatório, Jira). Canais: evidence:* */
export function registerEvidenceHandlers(ctx: IpcContext): void {
  const { mainWindow, configService } = ctx;
  const service = new EvidenceService({
    rootDir: path.join(path.dirname(configService.getConfigFilePath()), 'evidencias'),
    getSettings: () => configService.getSettings(),
    fetchImpl: ((input: string, init?: RequestInit) => net.fetch(input, init)) as typeof fetch,
    renderPdf
  });

  let activeSessionId: string | null = null;
  let recordingSourceId: string | null = null;

  // O app nega todas as permissões por padrão; a gravação usa getDisplayMedia, atendido aqui só para a janela principal.
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    const foreignFrame = !!request.frame && request.frame.processId !== mainWindow.webContents.mainFrame.processId;
    if (foreignFrame) {
      console.warn('[evidence] captura de tela recusada: frame externo');
      return callback({});
    }
    const wantsWindow = !!recordingSourceId && !recordingSourceId.startsWith('screen:');
    desktopCapturer
      .getSources({ types: wantsWindow ? ['screen', 'window'] : ['screen'], thumbnailSize: { width: 0, height: 0 } })
      .then((sources) => {
        const source = sources.find((s) => s.id === recordingSourceId) ?? sources[0];
        if (!source) console.warn('[evidence] nenhuma fonte de tela encontrada');
        callback(source ? { video: source } : {});
      })
      .catch((err) => {
        console.warn('[evidence] desktopCapturer falhou', err);
        callback({});
      });
  });
  ipcMain.handle('evidence:set-recording-source', (_, sourceId: string | null) => {
    recordingSourceId = typeof sourceId === 'string' && sourceId ? sourceId : null;
    return true;
  });

  const requireId = (id: unknown): string => {
    if (!isValidSessionId(id)) throw new Error('Sessão inválida.');
    return id;
  };

  ipcMain.handle('evidence:root-dir', () => service.getRootDir());
  ipcMain.handle('evidence:list', () => service.list());
  ipcMain.handle('evidence:create', (_, input: EvidenceSessionInput) => service.createSession(input));
  ipcMain.handle('evidence:get', (_, id: string) => service.get(requireId(id)));
  ipcMain.handle('evidence:delete', (_, id: string) => {
    service.deleteSession(requireId(id));
    if (activeSessionId === id) activeSessionId = null;
    return true;
  });
  ipcMain.handle('evidence:set-active', (_, id: string | null) => {
    activeSessionId = id ? requireId(id) : null;
    return true;
  });

  ipcMain.handle('evidence:list-sources', async (): Promise<EvidenceCaptureSource[]> => {
    const sources = await desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 320, height: 180 } });
    return sources.map((s) => ({ id: s.id, name: s.name, thumbnail: s.thumbnail.toDataURL(), isScreen: s.id.startsWith('screen:') }));
  });

  ipcMain.handle('evidence:capture', async (_, id: string, sourceId?: string, title?: string) => {
    requireId(id);
    return service.addStep(id, await captureScreenPng(sourceId), title);
  });
  ipcMain.handle('evidence:add-image', (_, id: string, dataUrl: string, title?: string) => {
    requireId(id);
    return service.addStep(id, decodePngDataUrl(dataUrl), title);
  });
  ipcMain.handle('evidence:add-note', (_, id: string, title?: string) => service.addStep(requireId(id), null, title));
  ipcMain.handle(
    'evidence:update-step',
    (_, id: string, stepId: string, patch: Partial<Pick<EvidenceStep, 'title' | 'expected' | 'actual' | 'result'>>) =>
      service.updateStep(requireId(id), String(stepId), patch ?? {})
  );
  ipcMain.handle('evidence:delete-step', (_, id: string, stepId: string) => service.deleteStep(requireId(id), String(stepId)));
  ipcMain.handle('evidence:save-video', (_, id: string, data: unknown) => service.saveVideo(requireId(id), toBuffer(data)));

  ipcMain.handle('evidence:report', (_, id: string, withPdf: boolean) => service.generateReport(requireId(id), !!withPdf));
  ipcMain.handle('evidence:open-folder', async (_, id?: string) => {
    const target = id ? service.getSessionDir(requireId(id)) : service.getRootDir();
    return (await shell.openPath(target)) === '';
  });
  ipcMain.handle('evidence:open-file', async (_, id: string, name: 'html' | 'pdf') => {
    const file = path.join(service.getSessionDir(requireId(id)), name === 'pdf' ? 'relatorio.pdf' : 'relatorio.html');
    return (await shell.openPath(file)) === '';
  });
  ipcMain.handle('evidence:save-image', (_, id: string, name: string, dataUrl: string) => {
    const png = decodePngDataUrl(dataUrl);
    if (!png) throw new Error('Imagem inválida.');
    return service.replaceImage(requireId(id), String(name ?? ''), png);
  });
  ipcMain.handle('evidence:get-image', (_, id: string, name: string) => service.getImageDataUrl(requireId(id), String(name ?? '')));
  ipcMain.handle('evidence:lookup-issue', (_, issueKey: string) => service.lookupIssue(String(issueKey ?? '')));

  ipcMain.handle('evidence:publish-jira', (_, id: string, issueKey: string, includeVideos: boolean) =>
    service.publishToJira(requireId(id), String(issueKey ?? ''), { includeVideos: !!includeVideos })
  );

  const registered = globalShortcut.register(EVIDENCE_HOTKEY, () => {
    if (!activeSessionId) return;
    captureScreenPng()
      .then((png) => safeSend(mainWindow, EVIDENCE_HOTKEY_EVENT, service.addStep(activeSessionId as string, png)))
      .catch(() => undefined);
  });
  if (registered) app.on('will-quit', () => globalShortcut.unregister(EVIDENCE_HOTKEY));
}

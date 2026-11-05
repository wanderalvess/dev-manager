import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  EvidenceCaptureSource,
  EvidenceJiraIssue,
  EvidenceJiraResult,
  EvidenceSession,
  EvidenceSessionInput,
  EvidenceSessionListItem
} from '../../../../shared/evidenceTypes';
import type { EvidenceStepPatch } from '../../../../preload/evidenceApi';

const errorText = (err: unknown): string =>
  err instanceof Error ? err.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '') : String(err);

export function useEvidence(isActive: boolean) {
  const [sessions, setSessions] = useState<EvidenceSessionListItem[]>([]);
  const [session, setSession] = useState<EvidenceSession | null>(null);
  const [sources, setSources] = useState<EvidenceCaptureSource[]>([]);
  const [sourceId, setSourceId] = useState<string>('');
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'info' | 'error'; text: string } | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const sessionRef = useRef<EvidenceSession | null>(null);
  sessionRef.current = session;

  const api = window.electronAPI;
  const info = useCallback((text: string) => setMessage({ kind: 'info', text }), []);
  const fail = useCallback((err: unknown) => setMessage({ kind: 'error', text: errorText(err) }), []);

  const refreshList = useCallback(async () => {
    try {
      setSessions(await api.evidenceList());
    } catch (err) {
      fail(err);
    }
  }, [api, fail]);

  const refreshSources = useCallback(async () => {
    try {
      const list = await api.evidenceListSources();
      setSources(list);
      setSourceId((current) => (list.some((s) => s.id === current) ? current : (list.find((s) => s.isScreen) ?? list[0])?.id ?? ''));
    } catch (err) {
      fail(err);
    }
  }, [api, fail]);

  useEffect(() => {
    if (!isActive) return;
    void refreshList();
    void refreshSources();
  }, [isActive, refreshList, refreshSources]);

  useEffect(
    () =>
      api.onEvidenceHotkey((updated) => {
        if (updated.id === sessionRef.current?.id) setSession(updated);
        info('Print capturado pelo atalho.');
      }),
    [api, info]
  );

  useEffect(() => {
    void api.evidenceSetActive(session?.id ?? null);
  }, [api, session?.id]);

  const run = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
      setBusy(true);
      try {
        return await fn();
      } catch (err) {
        fail(err);
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [fail]
  );

  const create = (input: EvidenceSessionInput) =>
    run(async () => {
      setSession(await api.evidenceCreate(input));
      setMessage(null);
      await refreshList();
    });

  const open = (id: string) =>
    run(async () => {
      setSession(await api.evidenceGet(id));
      setMessage(null);
    });

  const remove = (id: string) =>
    run(async () => {
      await api.evidenceDelete(id);
      if (sessionRef.current?.id === id) setSession(null);
      await refreshList();
    });

  const capture = (title?: string) =>
    session &&
    run(async () => {
      setSession(await api.evidenceCapture(session.id, sourceId || undefined, title));
      void refreshList();
    });

  const addNote = (title?: string) => session && run(async () => setSession(await api.evidenceAddNote(session.id, title)));
  const updateStep = (stepId: string, patch: EvidenceStepPatch) =>
    session && run(async () => setSession(await api.evidenceUpdateStep(session.id, stepId, patch)));
  const deleteStep = (stepId: string) => session && run(async () => setSession(await api.evidenceDeleteStep(session.id, stepId)));

  // A fonte Ã© informada antes do clique: getDisplayMedia exige ativaÃ§Ã£o do usuÃ¡rio e nÃ£o pode esperar por IPC.
  useEffect(() => {
    if (sourceId) void api.evidenceSetRecordingSource(sourceId);
  }, [api, sourceId]);

  const startRecording = async () => {
    if (!session || !sourceId || recording) return;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ audio: false, video: true });
      const sessionId = session.id;
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        void run(async () => {
          const updated = await api.evidenceSaveVideo(sessionId, await new Blob(chunks, { type: 'video/webm' }).arrayBuffer());
          if (sessionRef.current?.id === sessionId) setSession(updated);
          info('GravaÃ§Ã£o salva na pasta da evidÃªncia.');
          await refreshList();
        });
      };
      recorder.start(1000);
      recorderRef.current = recorder;
      setRecording(true);
      setMessage(null);
    } catch (err) {
      const name = err instanceof DOMException ? `[${err.name}] ` : '';
      setMessage({ kind: 'error', text: `Falha ao gravar a tela: ${name}${errorText(err)}` });
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  useEffect(
    () => () => {
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    },
    []
  );

  const report = (withPdf: boolean) =>
    session &&
    run(async () => {
      const files = await api.evidenceReport(session.id, withPdf);
      info(`RelatÃ³rio gerado: ${files.pdf ?? files.html}`);
      await api.evidenceOpenFile(session.id, withPdf ? 'pdf' : 'html');
    });

  const openFolder = (all?: boolean) => run(() => api.evidenceOpenFolder(all ? undefined : session?.id));

  const getImage = (name: string): Promise<string | null> => (session ? api.evidenceGetImage(session.id, name) : Promise.resolve(null));

  const saveImage = (name: string, dataUrl: string): Promise<boolean> =>
    session ? api.evidenceSaveImage(session.id, name, dataUrl) : Promise.resolve(false);

  const lookupIssue = (issueKey: string): Promise<EvidenceJiraIssue> => api.evidenceLookupIssue(issueKey);

  const publish = (issueKey: string, includeVideos: boolean): Promise<EvidenceJiraResult | undefined> =>
    run(async () => {
      if (!session) throw new Error('Nenhuma sessÃ£o aberta.');
      const result = await api.evidencePublishJira(session.id, issueKey, includeVideos);
      if (result.success) {
        const skipped = result.skipped?.length ? ` (nÃ£o anexados por tamanho: ${result.skipped.join(', ')})` : '';
        info(`Publicado em ${result.issueKey}: ${result.attached?.join(', ')}${skipped}`);
      } else {
        setMessage({ kind: 'error', text: result.error ?? 'Falha ao publicar no Jira.' });
      }
      return result;
    });

  return {
    lookupIssue,
    getImage,
    saveImage,
    sessions,
    session,
    sources,
    sourceId,
    setSourceId,
    recording,
    busy,
    message,
    refreshSources,
    create,
    open,
    remove,
    close: () => setSession(null),
    capture,
    addNote,
    updateStep,
    deleteStep,
    startRecording,
    stopRecording,
    report,
    openFolder,
    publish
  };
}

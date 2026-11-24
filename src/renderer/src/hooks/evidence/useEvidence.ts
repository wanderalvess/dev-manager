import { useCallback, useEffect, useRef, useState } from 'react';
import { formatHttpExchange, formatQueryTable, isReadOnlySql } from '../../../../shared/evidenceTypes';
import type {
  EvidenceAction,
  EvidenceReplayProgress,
  EvidenceBlockInput,
  EvidenceCaptureSource,
  EvidenceJiraIssue,
  EvidenceJiraPreview,
  EvidenceJiraResult,
  EvidenceReportLayout,
  EvidenceSession,
  EvidenceSessionInput,
  EvidenceSessionListItem
} from '../../../../shared/evidenceTypes';
import type { HttpEnvironment, HttpKeyValueItem, HttpMethod } from '../../../../shared/httpClientTypes';
import type { DatabaseConnectionConfig } from '../../../../shared/types';
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

  const [recordingClicks, setRecordingClicks] = useState(false);
  const [replayProgress, setReplayProgress] = useState<EvidenceReplayProgress | null>(null);

  // Passo recém-criado (print, atalho, clique ou nota): a tela o abre e oferece complementar com API/SQL.
  const [freshStepId, setFreshStepId] = useState<string | null>(null);
  const knownStepsRef = useRef<{ sessionId: string; ids: Set<string> } | null>(null);
  useEffect(() => {
    if (!session) {
      knownStepsRef.current = null;
      setFreshStepId(null);
      return;
    }
    const known = knownStepsRef.current;
    const added = known?.sessionId === session.id ? session.steps.filter((s) => !known.ids.has(s.id)) : [];
    if (added.length) setFreshStepId(added[added.length - 1].id);
    else if (known?.sessionId !== session.id) setFreshStepId(null);
    knownStepsRef.current = { sessionId: session.id, ids: new Set(session.steps.map((s) => s.id)) };
  }, [session]);

  useEffect(
    () =>
      api.onEvidenceAutoStep((updated) => {
        if (!updated) {
          setRecordingClicks(false);
          return fail('A gravação de cliques foi interrompida.');
        }
        if (updated.id === sessionRef.current?.id) setSession(updated);
        info(`Passo ${updated.steps.length} registrado pelo clique.`);
      }),
    [api, fail, info]
  );
  useEffect(() => api.onEvidenceReplayProgress(setReplayProgress), [api]);

  // Trocar de sessão ou sair da página encerra a gravação de cliques.
  useEffect(
    () => () => {
      void api.evidenceRecordClicksStop();
    },
    [api, session?.id]
  );
  useEffect(() => {
    setRecordingClicks(false);
  }, [session?.id]);

  const startClickRecording = () =>
    session &&
    run(async () => {
      await api.evidenceRecordClicksStart(session.id);
      setRecordingClicks(true);
      info('Registrando cliques: navegue em outras janelas; cada clique vira um passo com print. Volte ao Hub para parar.');
    });
  const stopClickRecording = async () => {
    await api.evidenceRecordClicksStop();
    setRecordingClicks(false);
  };

  const setActions = (stepId: string, actions: EvidenceAction[]) =>
    session && run(async () => setSession(await api.evidenceSetActions(session.id, stepId, actions)));

  const replay = () =>
    session &&
    run(async () => {
      setReplayProgress(null);
      const result = await api.evidenceReplay(session.id);
      await refreshList();
      setSession(result);
      info(`Reexecução concluída em uma nova evidência (${result.steps.length} passos).`);
    });

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

  const updateSession = (patch: Partial<EvidenceSessionInput>) =>
    session &&
    run(async () => {
      setSession(await api.evidenceUpdateSession(session.id, patch));
      await refreshList();
    });

  const addNote = (title?: string) => session && run(async () => setSession(await api.evidenceAddNote(session.id, title)));
  const updateStep = (stepId: string, patch: EvidenceStepPatch) =>
    session && run(async () => setSession(await api.evidenceUpdateStep(session.id, stepId, patch)));
  const deleteStep = (stepId: string) => session && run(async () => setSession(await api.evidenceDeleteStep(session.id, stepId)));

  // A fonte é informada antes do clique: getDisplayMedia exige ativação do usuário e não pode esperar por IPC.
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
          info('Gravação salva na pasta da evidência.');
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

  const report = (withPdf: boolean, layout: EvidenceReportLayout = 'document') =>
    session &&
    run(async () => {
      const files = await api.evidenceReport(session.id, withPdf, layout);
      info(`${layout === 'slides' ? 'Apresentação' : 'Relatório'} gerado: ${files.pdf ?? files.html}`);
      await api.evidenceOpenFile(session.id, withPdf ? 'pdf' : 'html', layout);
    });

  /** Os passos e provas já são gravados a cada alteração; "Salvar" atualiza o relatório HTML na pasta, sem abrir nada. */
  const save = () =>
    session &&
    run(async () => {
      const files = await api.evidenceReport(session.id, false, 'document');
      info(`Evidência salva. Relatório atualizado em ${files.html}`);
    });

  const previewJira = (includeVideos: boolean): Promise<EvidenceJiraPreview> =>
    session ? api.evidencePreviewJira(session.id, includeVideos) : Promise.reject(new Error('Nenhuma sessão aberta.'));

  const addBlock = (stepId: string, input: EvidenceBlockInput) =>
    session && run(async () => setSession(await api.evidenceAddBlock(session.id, stepId, input)));
  const updateBlock = (stepId: string, blockId: string, patch: Partial<EvidenceBlockInput>) =>
    session && run(async () => setSession(await api.evidenceUpdateBlock(session.id, stepId, blockId, patch)));
  const deleteBlock = (stepId: string, blockId: string) =>
    session && run(async () => setSession(await api.evidenceDeleteBlock(session.id, stepId, blockId)));

  /** Roda a requisição pelo cliente HTTP do app e devolve os campos prontos do bloco "api". */
  const listEnvironments = (): Promise<HttpEnvironment[]> => api.httpListEnvironments().then((envs) => envs ?? []);

  const runHttp = async (spec: {
    method: HttpMethod;
    url: string;
    headers: string;
    body: string;
    environmentId?: string;
  }): Promise<Pick<EvidenceBlockInput, 'request' | 'response' | 'meta' | 'environment'>> => {
    // Variáveis do API Studio ({{base}}, {{TOKEN}}...) são resolvidas no main; o texto registrado guarda o {{...}} original.
    const env = spec.environmentId ? (await listEnvironments()).find((e) => e.id === spec.environmentId) : undefined;
    const environmentVariables: Record<string, string> = {};
    for (const v of env?.variables ?? []) if (v.enabled) environmentVariables[v.key] = v.value;
    const headers: HttpKeyValueItem[] = spec.headers
      .split(/\r?\n/)
      .map((line) => /^\s*([^:\s][^:]*):\s*(.*)$/.exec(line))
      .filter((m): m is RegExpExecArray => !!m)
      .map((m, i) => ({ id: `h${i}`, key: m[1].trim(), value: m[2].trim(), enabled: true }));
    const body = spec.body.trim();
    const res = await api.httpExecute({
      request: {
        id: 'evidence',
        name: 'Evidência',
        method: spec.method,
        url: spec.url.trim(),
        params: [],
        headers,
        body: body ? { mode: /^[[{]/.test(body) ? 'raw-json' : 'raw-text', raw: body } : { mode: 'none' },
        auth: { type: 'none' }
      },
      environmentId: env?.id,
      environmentVariables,
      activeToken: env?.variables.find((v) => v.enabled && v.key.toUpperCase() === 'TOKEN')?.value
    });
    return {
      environment: env?.name,
      ...formatHttpExchange({
        method: spec.method,
        url: spec.url.trim(),
        headers: spec.headers,
        body,
        status: res.error ? undefined : res.status,
        statusText: res.statusText,
        durationMs: res.durationMs,
        sizeBytes: res.sizeBytes,
        responseBody: res.body,
        error: res.error
      })
    };
  };

  const listConnections = async (): Promise<DatabaseConnectionConfig[]> => (await api.getSettings()).databaseConnections ?? [];

  /** Roda uma consulta de leitura na conexão escolhida e devolve a tabela de texto do bloco "sql". */
  const runSql = async (connectionId: string, sql: string): Promise<Pick<EvidenceBlockInput, 'request' | 'response' | 'meta'>> => {
    if (!isReadOnlySql(sql)) throw new Error('Só consultas SELECT/WITH rodam aqui. Para outros comandos, cole a consulta e o resultado manualmente.');
    const conn = (await listConnections()).find((c) => c.id === connectionId);
    if (!conn) throw new Error('Conexão não encontrada. Cadastre em Banco de Dados.');
    const res = await api.executeDbQuery(conn, sql, 200);
    if (!res.success) throw new Error(res.error ?? 'Falha ao executar a consulta.');
    return {
      request: sql.trim(),
      response: formatQueryTable(res.columns, res.rows, res.truncated),
      meta: `${res.rowCount} linha(s) · ${res.executionTimeMs} ms · ${conn.name}`
    };
  };

  const openFolder = (all?: boolean) => run(() => api.evidenceOpenFolder(all ? undefined : session?.id));

  const getImage = (name: string): Promise<string | null> => (session ? api.evidenceGetImage(session.id, name) : Promise.resolve(null));

  const saveImage = (name: string, dataUrl: string): Promise<boolean> =>
    session ? api.evidenceSaveImage(session.id, name, dataUrl) : Promise.resolve(false);

  const lookupIssue = (issueKey: string): Promise<EvidenceJiraIssue> => api.evidenceLookupIssue(issueKey);

  const publish = (issueKey: string, includeVideos: boolean): Promise<EvidenceJiraResult | undefined> =>
    run(async () => {
      if (!session) throw new Error('Nenhuma sessão aberta.');
      const result = await api.evidencePublishJira(session.id, issueKey, includeVideos);
      if (result.success) {
        const skipped = result.skipped?.length ? ` (não anexados por tamanho: ${result.skipped.join(', ')})` : '';
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
    freshStepId,
    dismissFresh: () => setFreshStepId(null),
    capture,
    addNote,
    updateSession,
    updateStep,
    deleteStep,
    startRecording,
    stopRecording,
    report,
    save,
    previewJira,
    recordingClicks,
    replayProgress,
    startClickRecording,
    stopClickRecording,
    setActions,
    replay,
    addBlock,
    updateBlock,
    deleteBlock,
    runHttp,
    runSql,
    listConnections,
    listEnvironments,
    openFolder,
    publish
  };
}

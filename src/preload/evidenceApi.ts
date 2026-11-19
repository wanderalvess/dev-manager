import { ipcRenderer } from 'electron';
import {
  EVIDENCE_AUTO_EVENT,
  EVIDENCE_HOTKEY_EVENT,
  EVIDENCE_REPLAY_EVENT,
  type EvidenceAction,
  type EvidenceReplayProgress,
  type EvidenceBlockInput,
  type EvidenceCaptureSource,
  type EvidenceJiraIssue,
  type EvidenceJiraResult,
  type EvidenceReportFiles,
  type EvidenceReportLayout,
  type EvidenceSession,
  type EvidenceSessionInput,
  type EvidenceSessionListItem,
  type EvidenceStep
} from '../shared/evidenceTypes';

export type EvidenceStepPatch = Partial<Pick<EvidenceStep, 'title' | 'expected' | 'actual' | 'result'>>;

/** Canais evidence:* do preload (módulo Evidências), isolados para não crescer o index.ts. */
export const evidenceApi = {
  evidenceRootDir: (): Promise<string> => ipcRenderer.invoke('evidence:root-dir'),
  evidenceList: (): Promise<EvidenceSessionListItem[]> => ipcRenderer.invoke('evidence:list'),
  evidenceCreate: (input: EvidenceSessionInput): Promise<EvidenceSession> => ipcRenderer.invoke('evidence:create', input),
  evidenceGet: (id: string): Promise<EvidenceSession> => ipcRenderer.invoke('evidence:get', id),
  evidenceDelete: (id: string): Promise<boolean> => ipcRenderer.invoke('evidence:delete', id),
  evidenceSetActive: (id: string | null): Promise<boolean> => ipcRenderer.invoke('evidence:set-active', id),
  evidenceListSources: (): Promise<EvidenceCaptureSource[]> => ipcRenderer.invoke('evidence:list-sources'),
  evidenceCapture: (id: string, sourceId?: string, title?: string): Promise<EvidenceSession> =>
    ipcRenderer.invoke('evidence:capture', id, sourceId, title),
  evidenceAddImage: (id: string, dataUrl: string, title?: string): Promise<EvidenceSession> =>
    ipcRenderer.invoke('evidence:add-image', id, dataUrl, title),
  evidenceAddNote: (id: string, title?: string): Promise<EvidenceSession> => ipcRenderer.invoke('evidence:add-note', id, title),
  evidenceUpdateStep: (id: string, stepId: string, patch: EvidenceStepPatch): Promise<EvidenceSession> =>
    ipcRenderer.invoke('evidence:update-step', id, stepId, patch),
  evidenceDeleteStep: (id: string, stepId: string): Promise<EvidenceSession> => ipcRenderer.invoke('evidence:delete-step', id, stepId),
  evidenceSaveVideo: (id: string, data: ArrayBuffer): Promise<EvidenceSession> => ipcRenderer.invoke('evidence:save-video', id, data),
  evidenceAddBlock: (id: string, stepId: string, input: EvidenceBlockInput): Promise<EvidenceSession> =>
    ipcRenderer.invoke('evidence:add-block', id, stepId, input),
  evidenceUpdateBlock: (id: string, stepId: string, blockId: string, patch: Partial<EvidenceBlockInput>): Promise<EvidenceSession> =>
    ipcRenderer.invoke('evidence:update-block', id, stepId, blockId, patch),
  evidenceDeleteBlock: (id: string, stepId: string, blockId: string): Promise<EvidenceSession> =>
    ipcRenderer.invoke('evidence:delete-block', id, stepId, blockId),
  evidenceReport: (id: string, withPdf: boolean, layout?: EvidenceReportLayout): Promise<EvidenceReportFiles> =>
    ipcRenderer.invoke('evidence:report', id, withPdf, layout),
  evidenceGetImage: (id: string, name: string): Promise<string | null> => ipcRenderer.invoke('evidence:get-image', id, name),
  evidenceSaveImage: (id: string, name: string, dataUrl: string): Promise<boolean> => ipcRenderer.invoke('evidence:save-image', id, name, dataUrl),
  evidenceOpenFolder: (id?: string): Promise<boolean> => ipcRenderer.invoke('evidence:open-folder', id),
  evidenceOpenFile: (id: string, kind: 'html' | 'pdf', layout?: EvidenceReportLayout): Promise<boolean> =>
    ipcRenderer.invoke('evidence:open-file', id, kind, layout),
  evidenceSetRecordingSource: (sourceId: string | null): Promise<boolean> => ipcRenderer.invoke('evidence:set-recording-source', sourceId),
  evidenceLookupIssue: (issueKey: string): Promise<EvidenceJiraIssue> => ipcRenderer.invoke('evidence:lookup-issue', issueKey),
  evidencePublishJira: (id: string, issueKey: string, includeVideos: boolean): Promise<EvidenceJiraResult> =>
    ipcRenderer.invoke('evidence:publish-jira', id, issueKey, includeVideos),
  evidenceRecordClicksStart: (id: string): Promise<boolean> => ipcRenderer.invoke('evidence:record-clicks-start', id),
  evidenceRecordClicksStop: (): Promise<boolean> => ipcRenderer.invoke('evidence:record-clicks-stop'),
  evidenceSetActions: (id: string, stepId: string, actions: EvidenceAction[]): Promise<EvidenceSession> =>
    ipcRenderer.invoke('evidence:set-actions', id, stepId, actions),
  evidenceReplay: (id: string): Promise<EvidenceSession> => ipcRenderer.invoke('evidence:replay', id),
  onEvidenceAutoStep: (callback: (session: EvidenceSession | null) => void): (() => void) => {
    const listener = (_: unknown, session: EvidenceSession | null) => callback(session);
    ipcRenderer.on(EVIDENCE_AUTO_EVENT, listener);
    return () => ipcRenderer.removeListener(EVIDENCE_AUTO_EVENT, listener);
  },
  onEvidenceReplayProgress: (callback: (progress: EvidenceReplayProgress) => void): (() => void) => {
    const listener = (_: unknown, progress: EvidenceReplayProgress) => callback(progress);
    ipcRenderer.on(EVIDENCE_REPLAY_EVENT, listener);
    return () => ipcRenderer.removeListener(EVIDENCE_REPLAY_EVENT, listener);
  },
  onEvidenceHotkey: (callback: (session: EvidenceSession) => void): (() => void) => {
    const listener = (_: unknown, session: EvidenceSession) => callback(session);
    ipcRenderer.on(EVIDENCE_HOTKEY_EVENT, listener);
    return () => ipcRenderer.removeListener(EVIDENCE_HOTKEY_EVENT, listener);
  }
};

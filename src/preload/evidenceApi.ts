import { ipcRenderer } from 'electron';
import {
  EVIDENCE_HOTKEY_EVENT,
  type EvidenceCaptureSource,
  type EvidenceJiraIssue,
  type EvidenceJiraResult,
  type EvidenceReportFiles,
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
  evidenceAddNote: (id: string, title?: string): Promise<EvidenceSession> => ipcRenderer.invoke('evidence:add-note', id, title),
  evidenceUpdateStep: (id: string, stepId: string, patch: EvidenceStepPatch): Promise<EvidenceSession> =>
    ipcRenderer.invoke('evidence:update-step', id, stepId, patch),
  evidenceDeleteStep: (id: string, stepId: string): Promise<EvidenceSession> => ipcRenderer.invoke('evidence:delete-step', id, stepId),
  evidenceSaveVideo: (id: string, data: ArrayBuffer): Promise<EvidenceSession> => ipcRenderer.invoke('evidence:save-video', id, data),
  evidenceReport: (id: string, withPdf: boolean): Promise<EvidenceReportFiles> => ipcRenderer.invoke('evidence:report', id, withPdf),
  evidenceGetImage: (id: string, name: string): Promise<string | null> => ipcRenderer.invoke('evidence:get-image', id, name),
  evidenceSaveImage: (id: string, name: string, dataUrl: string): Promise<boolean> => ipcRenderer.invoke('evidence:save-image', id, name, dataUrl),
  evidenceOpenFolder: (id?: string): Promise<boolean> => ipcRenderer.invoke('evidence:open-folder', id),
  evidenceOpenFile: (id: string, kind: 'html' | 'pdf'): Promise<boolean> => ipcRenderer.invoke('evidence:open-file', id, kind),
  evidenceSetRecordingSource: (sourceId: string | null): Promise<boolean> => ipcRenderer.invoke('evidence:set-recording-source', sourceId),
  evidenceLookupIssue: (issueKey: string): Promise<EvidenceJiraIssue> => ipcRenderer.invoke('evidence:lookup-issue', issueKey),
  evidencePublishJira: (id: string, issueKey: string, includeVideos: boolean): Promise<EvidenceJiraResult> =>
    ipcRenderer.invoke('evidence:publish-jira', id, issueKey, includeVideos),
  onEvidenceHotkey: (callback: (session: EvidenceSession) => void): (() => void) => {
    const listener = (_: unknown, session: EvidenceSession) => callback(session);
    ipcRenderer.on(EVIDENCE_HOTKEY_EVENT, listener);
    return () => ipcRenderer.removeListener(EVIDENCE_HOTKEY_EVENT, listener);
  }
};

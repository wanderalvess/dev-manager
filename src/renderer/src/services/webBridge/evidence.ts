import type { ElectronAPI } from '../../../../preload/index';

const desktopOnly = () => Promise.reject(new Error('Evidências estão disponíveis apenas no app desktop.'));

/** Evidências dependem de captura de tela e disco local: no modo web os canais só recusam com uma mensagem clara. */
export function createEvidenceApi() {
  return {
    evidenceRootDir: desktopOnly,
    evidenceList: () => Promise.resolve([]),
    evidenceCreate: desktopOnly,
    evidenceGet: desktopOnly,
    evidenceDelete: desktopOnly,
    evidenceSetActive: () => Promise.resolve(false),
    evidenceListSources: () => Promise.resolve([]),
    evidenceCapture: desktopOnly,
    evidenceAddImage: desktopOnly,
    evidenceAddNote: desktopOnly,
    evidenceUpdateStep: desktopOnly,
    evidenceDeleteStep: desktopOnly,
    evidenceSaveVideo: desktopOnly,
    evidenceAddBlock: desktopOnly,
    evidenceUpdateBlock: desktopOnly,
    evidenceDeleteBlock: desktopOnly,
    evidenceReport: desktopOnly,
    evidenceGetImage: () => Promise.resolve(null),
    evidenceSaveImage: () => Promise.resolve(false),
    evidenceOpenFolder: () => Promise.resolve(false),
    evidenceOpenFile: () => Promise.resolve(false),
    evidenceSetRecordingSource: desktopOnly,
    evidenceLookupIssue: desktopOnly,
    evidencePublishJira: desktopOnly,
    evidenceRecordClicksStart: desktopOnly,
    evidenceRecordClicksStop: () => Promise.resolve(false),
    evidenceSetActions: desktopOnly,
    evidenceReplay: desktopOnly,
    onEvidenceAutoStep: () => () => undefined,
    onEvidenceReplayProgress: () => () => undefined,
    onEvidenceHotkey: () => () => undefined
  } satisfies Partial<ElectronAPI>;
}

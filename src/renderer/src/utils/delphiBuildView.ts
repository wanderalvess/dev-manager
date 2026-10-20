import type { DelphiDiagnostic, DelphiPipelineStep, DelphiPipelineStepId } from '../../../shared/types';

const MAX_LOG_CHARS = 200_000;

export const DELPHI_FORM_STORAGE_KEY = 'hubManager.delphiBuildForm';

export interface DelphiFormState {
  rsvarsPath: string;
  dprojPath: string;
  config: string;
  platform: string;
  killRunning: boolean;
  publishDir: string;
  launch: boolean;
}

export const DEFAULT_DELPHI_FORM: DelphiFormState = {
  rsvarsPath: '',
  dprojPath: '',
  config: 'Debug',
  platform: 'Win32',
  killRunning: true,
  publishDir: '',
  launch: false
};

/** O log do compilador cresce rápido em projetos grandes; mantém só o final para não pesar a tela. */
export function appendDelphiLog(current: string, chunk: string): string {
  const next = current + chunk;
  return next.length > MAX_LOG_CHARS ? next.slice(next.length - MAX_LOG_CHARS) : next;
}

export function formatDelphiDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  return `${Math.floor(seconds / 60)} min ${Math.round(seconds % 60)} s`;
}

export function diagnosticLocation(d: DelphiDiagnostic): string {
  const name = d.file.split(/[\\/]/).pop() || d.file;
  return `${name}:${d.line}`;
}

/** Texto para copiar no clique: caminho completo e linha, no formato que a maioria dos editores entende. */
export function diagnosticClipboardText(d: DelphiDiagnostic): string {
  return `${d.file}(${d.line}): ${d.code} ${d.message}`;
}

const STEP_LABELS: Record<DelphiPipelineStepId, string> = {
  kill: 'Encerrar processo',
  build: 'Compilar',
  publish: 'Publicar',
  launch: 'Abrir'
};

export function pipelineStepLabel(step: DelphiPipelineStep): string {
  return STEP_LABELS[step.id];
}

/** Evita que um estado salvo antigo ou corrompido derrube o formulário. */
export function loadDelphiForm(raw: string | null): DelphiFormState {
  if (!raw) return DEFAULT_DELPHI_FORM;
  try {
    const parsed = JSON.parse(raw) as Partial<DelphiFormState>;
    return {
      rsvarsPath: typeof parsed.rsvarsPath === 'string' ? parsed.rsvarsPath : '',
      dprojPath: typeof parsed.dprojPath === 'string' ? parsed.dprojPath : '',
      config: typeof parsed.config === 'string' && parsed.config ? parsed.config : 'Debug',
      platform: typeof parsed.platform === 'string' && parsed.platform ? parsed.platform : 'Win32',
      killRunning: parsed.killRunning !== false,
      publishDir: typeof parsed.publishDir === 'string' ? parsed.publishDir : '',
      launch: parsed.launch === true
    };
  } catch {
    return DEFAULT_DELPHI_FORM;
  }
}

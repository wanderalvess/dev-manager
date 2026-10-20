/** Tipos do build Delphi (MSBuild/dcc) e do pipeline "compilar → publicar → abrir". */

export interface DelphiInstallation {
  /** Pasta da versão do RAD Studio (ex.: 23.0) — identifica a instalação. */
  id: string;
  /** Nome comercial inferido da pasta (ex.: "Delphi 12 Athens"). */
  label: string;
  /** Caminho do rsvars.bat, que prepara PATH e variáveis do compilador. */
  rsvarsPath: string;
}

export interface DelphiProject {
  name: string;
  dprojPath: string;
  /** Pasta do projeto, relativa à raiz varrida (para exibição). */
  relativeDir: string;
}

export interface DelphiBuildRequest {
  dprojPath: string;
  rsvarsPath: string;
  /** Configuração do projeto: Debug, Release ou personalizada. */
  config: string;
  /** Plataforma: Win32 ou Win64. */
  platform: string;
}

export type DelphiDiagnosticSeverity = 'error' | 'warning' | 'hint';

export interface DelphiDiagnostic {
  severity: DelphiDiagnosticSeverity;
  /** Caminho como veio do compilador (pode ser relativo ao projeto). */
  file: string;
  line: number;
  /** Código do compilador (ex.: E2003, W1000, H2443). */
  code: string;
  message: string;
}

export interface DelphiBuildResult {
  success: boolean;
  exitCode: number | null;
  cancelled: boolean;
  durationMs: number;
  errorCount: number;
  warningCount: number;
  /** Erros primeiro e depois avisos; limitado para não pesar na tela. */
  diagnostics: DelphiDiagnostic[];
  /** Executável gerado (o mais recente encontrado após o build), se houver. */
  outputExePath?: string;
  /** Últimas linhas da saída quando o build falha; cobre erros que o parser não estrutura. */
  logTail?: string;
}

export interface DelphiPipelineRequest extends DelphiBuildRequest {
  /** Encerra o .exe em execução antes de compilar (evita "arquivo em uso"). */
  killRunning: boolean;
  /** Pasta onde o executável novo será publicado; vazio = não publica. */
  publishDir?: string;
  /** Abre o executável (da pasta de publicação, se houver) ao final. */
  launch: boolean;
}

export type DelphiPipelineStepId = 'kill' | 'build' | 'publish' | 'launch';
export type DelphiPipelineStepStatus = 'success' | 'skipped' | 'failed';

export interface DelphiPipelineStep {
  id: DelphiPipelineStepId;
  status: DelphiPipelineStepStatus;
  detail: string;
}

export interface DelphiPipelineResult {
  success: boolean;
  steps: DelphiPipelineStep[];
  build?: DelphiBuildResult;
}

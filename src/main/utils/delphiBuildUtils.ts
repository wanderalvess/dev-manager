import path from 'path';
import { isSafeLocalPath } from './security';
import type { DelphiBuildRequest, DelphiDiagnostic, DelphiDiagnosticSeverity } from '../../shared/types';

/** Teto de diagnósticos enviados à tela; a contagem usa a lista completa. */
export const MAX_DIAGNOSTICS = 200;

/** Pasta da versão em `Embarcadero\Studio\<n>` → nome comercial. */
const STUDIO_VERSION_LABELS: Record<string, string> = {
  '14.0': 'Delphi XE6',
  '15.0': 'Delphi XE7',
  '16.0': 'Delphi XE8',
  '17.0': 'Delphi 10 Seattle',
  '18.0': 'Delphi 10.1 Berlin',
  '19.0': 'Delphi 10.2 Tokyo',
  '20.0': 'Delphi 10.3 Rio',
  '21.0': 'Delphi 10.4 Sydney',
  '22.0': 'Delphi 11 Alexandria',
  '23.0': 'Delphi 12 Athens'
};

export function delphiVersionLabel(folderName: string): string {
  return STUDIO_VERSION_LABELS[folderName] ?? `RAD Studio ${folderName}`;
}

/**
 * Cobre `C:\x\Unit1.pas(12): E2003 ...` (dcc), `[dcc32 Error] Unit1.pas(12): E2003 ...` (IDE antiga)
 * e `C:\x\Unit1.pas(12,5): error E2003: ... [proj.dproj]` (MSBuild). A severidade vem da letra do código.
 */
const DIAGNOSTIC_PATTERN =
  /^(?:\[[^\]]*\]\s*)?(.+?)\((\d+)(?:,\d+)?\):\s*(?:(?:fatal error|error|warning|hint)\s+)?([EWHF]\d{3,4})\s*:?\s*(.*)$/i;

function severityOf(code: string): DelphiDiagnosticSeverity {
  const letter = code[0].toUpperCase();
  if (letter === 'W') return 'warning';
  if (letter === 'H') return 'hint';
  return 'error';
}

export function parseDelphiDiagnosticLine(line: string): DelphiDiagnostic | null {
  const match = DIAGNOSTIC_PATTERN.exec(line.trim());
  if (!match) return null;
  const [, file, lineNo, code, rawMessage] = match;
  // MSBuild acrescenta o projeto ao final: "... [C:\x\Projeto.dproj]".
  const message = rawMessage.replace(/\s*\[[^\]]+\.dproj\]\s*$/i, '').trim();
  return { severity: severityOf(code), file: file.trim(), line: Number(lineNo), code: code.toUpperCase(), message };
}

/** Extrai diagnósticos da saída completa; remove repetidos (o MSBuild reimprime o resumo) e ordena erros primeiro. */
export function parseDelphiBuildOutput(output: string): DelphiDiagnostic[] {
  const seen = new Set<string>();
  const found: DelphiDiagnostic[] = [];
  for (const line of output.split(/\r?\n/)) {
    const diagnostic = parseDelphiDiagnosticLine(line);
    if (!diagnostic) continue;
    const key = `${diagnostic.code}|${diagnostic.file.toLowerCase()}|${diagnostic.line}|${diagnostic.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    found.push(diagnostic);
  }
  const rank: Record<DelphiDiagnosticSeverity, number> = { error: 0, warning: 1, hint: 2 };
  return found.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

// Os caminhos do build são sempre Windows (.dproj, rsvars.bat); path.win32 mantém o comportamento igual quando
// os testes rodam no CI em Linux.
/** O caminho entra entre aspas num .cmd: aspas, `%` e quebras de linha escapariam da string. */
export function isSafeBatchPath(value: string): boolean {
  return typeof value === 'string' && value.trim() !== '' && !/["%\r\n\0]/.test(value);
}

const NAME_PATTERN = /^[A-Za-z0-9_.-]{1,40}$/;

/** Retorna a mensagem de erro, ou null se o pedido de build é válido. */
export function validateBuildRequest(req: DelphiBuildRequest): string | null {
  if (!isSafeLocalPath(req.dprojPath) || !isSafeBatchPath(req.dprojPath) || path.win32.extname(req.dprojPath).toLowerCase() !== '.dproj') {
    return 'Informe um arquivo .dproj válido (sem aspas ou "%" no caminho).';
  }
  // Recusa UNC: o script faria `call` de um .bat em outra máquina.
  if (!isSafeLocalPath(req.rsvarsPath) || !isSafeBatchPath(req.rsvarsPath) || path.win32.basename(req.rsvarsPath).toLowerCase() !== 'rsvars.bat') {
    return 'Informe o caminho do rsvars.bat da instalação do RAD Studio.';
  }
  if (!NAME_PATTERN.test(req.config)) return 'Configuração inválida (use letras, números, "_", "-" ou ".").';
  if (!NAME_PATTERN.test(req.platform)) return 'Plataforma inválida (ex.: Win32 ou Win64).';
  return null;
}

/** Script temporário: `call rsvars` prepara o ambiente do compilador e o MSBuild compila o .dproj. */
export function buildBatchScript(req: DelphiBuildRequest): string {
  return [
    '@echo off',
    // O cmd lê o .cmd na página OEM; sem isto, acentos nos caminhos (gravados em latin1) viram outros bytes.
    'chcp 1252 >nul',
    `call "${req.rsvarsPath}"`,
    `msbuild "${req.dprojPath}" /t:Build /p:Config=${req.config} /p:Platform=${req.platform} /v:minimal /nologo /nr:false`,
    'exit /b %ERRORLEVEL%',
    ''
  ].join('\r\n');
}

/** Últimas linhas não vazias da saída: explica falhas que o parser não reconhece (MSBxxxx, Fatal sem linha). */
export function tailLines(output: string, count: number): string {
  return output.split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean).slice(-count).join('\n');
}

export interface ExeCandidate {
  path: string;
  mtimeMs: number;
}

/** O executável do build é o do projeto (mesmo nome do .dproj) modificado depois do início da compilação. */
export function pickBuiltExe(candidates: ExeCandidate[], projectName: string, sinceMs: number): string | undefined {
  const wanted = `${projectName.toLowerCase()}.exe`;
  return candidates
    .filter((c) => path.win32.basename(c.path).toLowerCase() === wanted && c.mtimeMs >= sinceMs)
    .sort((a, b) => b.mtimeMs - a.mtimeMs)[0]?.path;
}

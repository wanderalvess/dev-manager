export interface NormalizedRoutineTarget {
  code: string | null;
  baseName: string;
  fileName: string;
}

/**
 * Normaliza o código ou nome de rotina digitado pelo usuário para o formato padrão do WinThor.
 * Exemplos:
 *  - "132" -> code: "132", baseName: "PCSIS132", fileName: "PCSIS132.EXE"
 *  - "pcsis132" -> code: "132", baseName: "PCSIS132", fileName: "PCSIS132.EXE"
 *  - "PCSIS132.exe" -> code: "132", baseName: "PCSIS132", fileName: "PCSIS132.EXE"
 *  - "pc1406" -> code: "1406", baseName: "PC1406", fileName: "PC1406.EXE"
 *  - "pcinf000" -> code: "000", baseName: "PCINF000", fileName: "PCINF000.EXE"
 *  - "pcinftab" -> code: "560", baseName: "PCINFTAB", fileName: "PCINFTAB.EXE"
 *  - "rotina529" -> code: "529", baseName: "PCSIS529", fileName: "PCSIS529.EXE"
 */
export function normalizeRoutineTarget(input: string): NormalizedRoutineTarget {
  const raw = (input || '').trim().replace(/^['"]|['"]$/g, '');
  if (!raw) {
    return { code: null, baseName: '', fileName: '' };
  }

  // Remove qualquer caminho se foi passado um path completo
  const cleanName = raw.split(/[\\/]/).pop() || raw;
  const lastDot = cleanName.lastIndexOf('.');
  const ext = lastDot > 0 ? cleanName.substring(lastDot) : '';
  const withoutExt = (ext ? cleanName.slice(0, -ext.length) : cleanName).trim().toUpperCase();

  // Caso especial PCINFTAB (rotina 560 na convenção CCW)
  if (withoutExt === 'PCINFTAB') {
    return { code: '560', baseName: 'PCINFTAB', fileName: 'PCINFTAB.EXE' };
  }

  // Apenas números: prefixa com PCSIS (ex: 132 -> PCSIS132)
  if (/^\d+$/.test(withoutExt)) {
    return {
      code: withoutExt,
      baseName: `PCSIS${withoutExt}`,
      fileName: `PCSIS${withoutExt}.EXE`
    };
  }

  // Padrão clássico PCSIS seguido de números (ex: PCSIS132)
  const pcsisMatch = withoutExt.match(/^PCSIS(\d+)$/i);
  if (pcsisMatch) {
    return {
      code: pcsisMatch[1],
      baseName: withoutExt,
      fileName: `${withoutExt}.EXE`
    };
  }

  // Padrão PC seguido de números (ex: PC1406, PC1000)
  const pcMatch = withoutExt.match(/^PC(\d+)$/i);
  if (pcMatch) {
    return {
      code: pcMatch[1],
      baseName: withoutExt,
      fileName: `${withoutExt}.EXE`
    };
  }

  // Prefixo genérico: ROTINA132, ROT_132, SIS132 -> converte para PCSIS
  const genericMatch = withoutExt.match(/^(?:ROTINA|ROT|SIS)[_ -]?(\d+)$/i);
  if (genericMatch) {
    const num = genericMatch[1];
    return {
      code: num,
      baseName: `PCSIS${num}`,
      fileName: `PCSIS${num}.EXE`
    };
  }

  // Outros formatos (ex: PCINF000, PCROT123)
  const otherMatch = withoutExt.match(/^([A-Z]+)(\d+)$/i);
  if (otherMatch) {
    return {
      code: otherMatch[2],
      baseName: withoutExt,
      fileName: `${withoutExt}.EXE`
    };
  }

  return {
    code: null,
    baseName: withoutExt,
    fileName: `${withoutExt}.EXE`
  };
}

/**
 * Constrói a URL direta de download na API da Central de Controle do WinThor (CCW).
 * Padrão oficial: https://centraldecontrole.pcinformatica.com.br/api/rotinas/downloadRotina/{rotina}/{versaoWinThor}/
 */
export function buildCcwDownloadUrl(
  baseUrl: string = 'https://centraldecontrole.pcinformatica.com.br',
  routineBaseName: string,
  winthorVersion: string = '30'
): string {
  const cleanBase = (baseUrl || 'https://centraldecontrole.pcinformatica.com.br').trim().replace(/\/+$/, '');
  const cleanRoutine = (routineBaseName || '').trim().toUpperCase();
  // Se a versão for completa (ex: "30.0.12.3"), extrai apenas a major version "30"
  let cleanVersion = (winthorVersion || '30').trim();
  const dotIndex = cleanVersion.indexOf('.');
  if (dotIndex > 0) {
    cleanVersion = cleanVersion.substring(0, dotIndex);
  }
  return `${cleanBase}/api/rotinas/downloadRotina/${cleanRoutine}/${cleanVersion}/`;
}

/**
 * Deduz o número do módulo a partir do código numérico da rotina no padrão WinThor.
 * Exemplo: 132 -> 1 (MOD-001), 529 -> 5 (MOD-005), 1406 -> 14 (MOD-014).
 */
export function deduceModuleNumber(routineCode: string | null): number | null {
  if (!routineCode) return null;
  const num = parseInt(routineCode, 10);
  if (isNaN(num) || num <= 0) return null;
  return Math.floor(num / 100);
}

/**
 * Formata o nome da pasta do módulo (ex: 1 -> "MOD-001", 14 -> "MOD-014").
 */
export function formatModuleFolderName(moduleNumber: number): string {
  return `MOD-${String(moduleNumber).padStart(3, '0')}`;
}

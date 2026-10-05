export interface ContainerCardKinds {
  isOracle: boolean;
  isWta: boolean;
  isWsh: boolean;
}

/** Os flags não são exclusivos (um nome pode casar com mais de um); a prioridade visual fica no componente. */
export function containerCardKinds(cleanName: string): ContainerCardKinds {
  const lower = cleanName.toLowerCase();
  return {
    isOracle: lower.includes('oracle'),
    isWta: lower.includes('wta') || lower.includes('linux'),
    isWsh: lower.includes('wsh')
  };
}

/** Converte "12.5%" em número; valores inválidos viram 0. */
export function containerCardParsePercent(value: string | undefined): number {
  if (!value) return 0;
  return parseFloat(value.replace('%', '')) || 0;
}

export type ContainerCardGaugeTone = 'critical' | 'warning' | 'normal';

export function containerCardGaugeTone(value: number, warnAbove: number, criticalAbove: number): ContainerCardGaugeTone {
  if (value > criticalAbove) return 'critical';
  if (value > warnAbove) return 'warning';
  return 'normal';
}

/** Largura mínima de 4% mantém a barra visível mesmo com uso quase zero. */
export function containerCardGaugeWidth(value: number): string {
  return `${Math.min(100, Math.max(4, value))}%`;
}

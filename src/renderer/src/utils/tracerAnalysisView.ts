import type { TracerRepeatKind } from '../../../shared/types';

/** Milissegundos legíveis: 0,4 ms, 12 ms, 1,3 s, 2 min 5 s. */
export function formatTracerMs(ms: number): string {
  if (ms < 1) return `${ms.toFixed(2).replace('.', ',')} ms`;
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1).replace('.', ',')} s`;
  return `${Math.floor(seconds / 60)} min ${Math.round(seconds % 60)} s`;
}

const REPEAT_LABELS: Record<TracerRepeatKind, { title: string; hint: string }> = {
  'many-executions': {
    title: 'Executada muitas vezes',
    hint: 'A mesma consulta rodou em laço. Se for uma por registro (N+1), vale trazer tudo numa consulta só.'
  },
  'literal-variants': {
    title: 'Variações só de valor',
    hint: 'A consulta é montada com os valores dentro do texto. Usar parâmetros (bind) evita um parse a cada chamada.'
  }
};

export function repeatKindInfo(kind: TracerRepeatKind): { title: string; hint: string } {
  return REPEAT_LABELS[kind];
}

/** Rótulo do cartão: "Rotina 2075 (PCSIS2075)" para executáveis com número; senão o próprio módulo. */
export function routineHeading(label: string, routineCode: string | null): string {
  return routineCode ? `Rotina ${routineCode} (${label})` : label;
}

/** Limites de linhas oferecidos no editor; "carregar mais" sobe para o próximo degrau. */
export const ROW_LIMIT_STEPS = [50, 100, 250, 500, 1000, 5000, 10000] as const;

/** Próximo limite maior que o atual, ou null quando já está no máximo. */
export function nextRowLimit(current: number): number | null {
  const next = ROW_LIMIT_STEPS.find((step) => step > current);
  return next ?? null;
}

// Classes repetidas entre as etapas do onboarding.

/** Item de uma lista lateral selecionável (grupos de módulos, seções do ambiente, temas, exemplos). */
export const selectableRow = (active: boolean): string =>
  `min-h-12 px-4 rounded-xl border text-left flex items-center gap-3 cursor-pointer transition-colors ${
    active ? 'border-primary bg-muted text-foreground' : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/60'
  }`;

export const PANEL = 'rounded-2xl border border-border bg-card overflow-hidden';

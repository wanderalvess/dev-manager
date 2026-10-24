export type WshUtilsTab = 'md5' | 'files' | 'rotina2650';

export const WSH_DEFAULT_PLAIN_PASS = 'pcinfo';
export const WSH_ROTINA_2650_URL = 'http://localhost:8080/';

/** Remove a barra inicial que o Docker adiciona ao nome do container. */
export function wshUtilsModalCleanName(names: string): string {
  return names.replace(/^\//, '');
}

/** Classes do botão de aba; a cor ativa é fixa (violeta) neste modal. */
export function wshUtilsModalTabClass(active: boolean): string {
  const base =
    'px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 transition cursor-pointer';
  return active
    ? `${base} border-primary text-primary bg-card shadow-2xs`
    : `${base} border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40`;
}

export interface WshPrereqVisual {
  cardClass: string;
  badgeClass: string;
  label: string;
}

/** Aparência do item de pré-requisito: presente, obrigatório ausente ou opcional ausente. */
export function wshUtilsModalPrereqVisual(prereq: { exists: boolean; required: boolean }): WshPrereqVisual {
  if (prereq.exists) {
    return {
      cardClass: 'bg-success/5 border-success/25 text-foreground',
      badgeClass: 'bg-success/10 text-success',
      label: 'Presente'
    };
  }
  if (prereq.required) {
    return {
      cardClass: 'bg-danger/5 border-danger/30 text-foreground',
      badgeClass: 'bg-danger/10 text-danger',
      label: 'Obrigatório Ausente'
    };
  }
  return {
    cardClass: 'bg-muted/40 border-border/80 text-muted-foreground',
    badgeClass: 'bg-muted text-muted-foreground border-border',
    label: 'Opcional Ausente'
  };
}

// Visual comum aos cartões da tela de início. Só tokens do tema: o mesmo desenho serve no claro e no escuro.
export const START_CARD = 'rounded-2xl border border-border bg-card p-5 flex flex-col gap-3 min-w-0 shadow-sm';
export const START_EYEBROW = 'font-mono text-2xs font-bold tracking-[0.14em] text-muted-foreground uppercase';
/** Linha de lista dentro de um cartão (issue, ambiente) */
export const START_ROW = 'min-h-11 px-3 rounded-xl bg-muted/50 flex items-center gap-3 min-w-0';
export const START_LINK = 'min-h-9 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer';

/** Abre um link do Jira no navegador (o renderer não navega para fora). */
export const openExternal = (url: string): void => {
  void window.electronAPI?.openExternal?.(url);
};

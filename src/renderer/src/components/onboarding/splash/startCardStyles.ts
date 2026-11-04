// Visual comum aos cartões da tela de início. Só tokens do tema: o mesmo desenho serve no claro e no escuro.
export const START_CARD = 'rounded-2xl border border-border bg-card p-4 sm:p-4.5 flex flex-col gap-2.5 min-w-0 shadow-sm overflow-hidden';
export const START_EYEBROW = 'font-mono text-2xs font-bold tracking-[0.14em] text-muted-foreground uppercase';
/** Linha de lista dentro de um cartão (issue, ambiente) */
export const START_ROW = 'h-8 min-h-[2rem] px-2.5 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors flex items-center gap-2.5 min-w-0';
export const START_LINK = 'min-h-8 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer';

/** Abre um link do Jira no navegador (o renderer não navega para fora). */
export const openExternal = (url: string): void => {
  void window.electronAPI?.openExternal?.(url);
};

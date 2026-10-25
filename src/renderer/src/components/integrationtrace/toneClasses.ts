import type { ReadinessTone } from '../../utils/integrationReadinessView';

/** Classes por tom, compartilhadas pelo pré-voo e pelo rastreio de lote (literais completos para o scanner do Tailwind). */
export const TONE_TEXT: Record<ReadinessTone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  muted: 'text-muted-foreground'
};

export const TONE_BADGE: Record<ReadinessTone, string> = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  muted: 'bg-muted text-muted-foreground'
};

export const TONE_BOX: Record<ReadinessTone, { box: string; icon: string }> = {
  success: { box: 'bg-success/10 border-success/30', icon: 'text-success' },
  warning: { box: 'bg-warning/10 border-warning/30', icon: 'text-warning' },
  danger: { box: 'bg-danger/10 border-danger/30', icon: 'text-danger' },
  muted: { box: 'bg-muted/40 border-border', icon: 'text-muted-foreground' }
};

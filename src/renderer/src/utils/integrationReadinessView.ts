import {
  INTEGRATION_LAYER_LABELS,
  type IntegrationCheckStatus,
  type IntegrationLayerId,
  type IntegrationLayerReadinessStatus,
  type IntegrationReadinessResult
} from '../../../shared/integrationTypes';

/**
 * Apresentação pura do pré-voo (decisão 0003): rótulos, tons e o veredito em palavras.
 * Sem JSX para poder ser testada sem renderizar a página.
 */

export type ReadinessTone = 'success' | 'warning' | 'danger' | 'muted';

export const LAYER_STATUS_LABELS: Readonly<Record<IntegrationLayerReadinessStatus, string>> = {
  ok: 'Pronta',
  warning: 'Com aviso',
  failed: 'Com falha',
  'not-configured': 'Não configurada'
};

export const LAYER_STATUS_TONES: Readonly<Record<IntegrationLayerReadinessStatus, ReadinessTone>> = {
  ok: 'success',
  warning: 'warning',
  failed: 'danger',
  'not-configured': 'muted'
};

export const CHECK_STATUS_TONES: Readonly<Record<IntegrationCheckStatus, ReadinessTone>> = {
  ok: 'success',
  failed: 'danger',
  skipped: 'warning'
};

export const CHECK_STATUS_LABELS: Readonly<Record<IntegrationCheckStatus, string>> = {
  ok: 'ok',
  failed: 'falhou',
  skipped: 'não verificado'
};

export function formatCheckDuration(ms: number | undefined): string {
  if (ms === undefined) return '';
  return ms >= 1000 ? `${(ms / 1000).toFixed(1).replace('.', ',')} s` : `${ms} ms`;
}

export interface ReadinessVerdict {
  tone: ReadinessTone;
  title: string;
  detail: string;
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}

/** Nome curto da camada para frases ("WinThor", "WSH", "CH", "PDV"). */
function shortName(layer: IntegrationLayerId): string {
  return INTEGRATION_LAYER_LABELS[layer].split(' (')[0].replace('Commerce Hub', 'CH');
}

/** Frase que responde "posso testar agora?": o que falhou, o que só tem aviso ou que está tudo pronto. */
export function describeReadiness(result: IntegrationReadinessResult | null): ReadinessVerdict {
  if (!result) {
    return { tone: 'muted', title: 'Ainda não conferido', detail: 'Clique em Conferir agora para verificar as camadas configuradas.' };
  }
  const named = (status: IntegrationLayerReadinessStatus) =>
    result.layers.filter((layer) => layer.status === status).map((layer) => shortName(layer.layer));
  const failed = named('failed');
  const warning = named('warning');
  const verified = result.layers.filter((layer) => layer.status !== 'not-configured').length;

  if (verified === 0) {
    return { tone: 'muted', title: 'Nenhuma camada configurada', detail: 'Preencha ao menos uma camada em Configurações para o pré-voo ter o que conferir.' };
  }
  if (failed.length > 0) {
    return {
      tone: 'danger',
      title: failed.length === 1 ? `${failed[0]} com falha` : `${failed.length} camadas com falha`,
      detail: `Resolva antes de testar: ${joinNames(failed)}.`
    };
  }
  if (warning.length > 0) {
    return {
      tone: 'warning',
      title: 'Pronto, com avisos',
      detail: `Sem falhas, mas há verificações que não puderam ser provadas em ${joinNames(warning)}.`
    };
  }
  return { tone: 'success', title: 'Pronto para testar', detail: `${verified} de ${result.layers.length} camadas verificadas, nenhuma falha.` };
}

/** Quanto tempo atrás o pré-voo rodou, em palavras curtas. */
export function formatCheckedAgo(checkedAt: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - checkedAt) / 1000));
  if (seconds < 5) return 'agora há pouco';
  if (seconds < 60) return `há ${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  return `há ${Math.round(minutes / 60)} h`;
}

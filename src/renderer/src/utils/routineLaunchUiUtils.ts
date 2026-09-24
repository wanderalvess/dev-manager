import { KarafWtaStatusResult } from '../../../shared/types';

export interface KarafWtaBadgeInfo {
  label: string;
  colorClass: string;
  tooltip: string;
  isOffline: boolean;
}

export function getKarafWtaBadgeInfo(
  karafStatus: KarafWtaStatusResult | null,
  isChecking: boolean,
  winthorStartActive: boolean
): KarafWtaBadgeInfo {
  if (isChecking && !karafStatus) {
    return {
      label: 'Karaf (WTA): Checando...',
      colorClass: 'bg-muted text-muted-foreground border-border animate-pulse',
      tooltip: 'Verificando se o servidor Apache Karaf / WTA está online...',
      isOffline: false
    };
  }

  const isOnline = Boolean(karafStatus?.online);
  const wtaUrl = karafStatus?.wtaUrl || 'http://localhost:8889';

  if (isOnline) {
    return {
      label: 'Karaf (WTA): Online',
      colorClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      tooltip: `Servidor Apache Karaf / WTA online em ${wtaUrl}. Sessões autenticadas ativas para o WinThor Start.`,
      isOffline: false
    };
  }

  return {
    label: 'Karaf (WTA): Parado',
    colorClass: winthorStartActive
      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 font-bold'
      : 'bg-muted text-muted-foreground border-border',
    tooltip: `Apache Karaf / WTA não está em execução em ${wtaUrl}. O WinThor Start precisa do Karaf ativo para autenticar a sessão do usuário.`,
    isOffline: true
  };
}

export function shouldShowKarafWarningBanner(
  karafStatus: KarafWtaStatusResult | null,
  winthorStartActive: boolean
): boolean {
  if (!winthorStartActive) return false;
  if (!karafStatus) return false;
  return !karafStatus.online;
}

export function formatLaunchFeedbackDisplay(feedback: {
  id: string;
  success: boolean;
  message: string;
  karafOffline?: boolean;
  authFailed?: boolean;
}): { title: string; message: string; isKarafOffline: boolean } {
  if (feedback.karafOffline) {
    return {
      title: `Apache Karaf não está em execução (${feedback.id})`,
      message:
        feedback.message ||
        'O Apache Karaf / WTA não está em execução. O WinThor Start requer o Karaf ativo para autenticar o usuário e gerar a sessão da rotina.',
      isKarafOffline: true
    };
  }

  if (feedback.authFailed) {
    return {
      title: `Falha de autenticação no WinThor Anywhere (${feedback.id})`,
      message:
        feedback.message ||
        'O Karaf está online, mas as credenciais do WTA foram recusadas. Verifique login e senha nas Configurações.',
      isKarafOffline: false
    };
  }

  return {
    title: `Falha ao abrir rotina (${feedback.id})`,
    message: feedback.message || 'Não foi possível iniciar a rotina.',
    isKarafOffline: false
  };
}

import type { SystemAppInfo } from '../../../shared/types';

/** Porcentagem de RAM em uso (0-100); 0 quando faltam dados (carregando). */
export function helpAboutMemoryUsagePercent(appInfo: SystemAppInfo | null): number {
  if (!appInfo || !appInfo.totalMemoryMb || !appInfo.freeMemoryMb) return 0;
  const used = appInfo.totalMemoryMb - appInfo.freeMemoryMb;
  return Math.min(100, Math.max(0, Math.round((used / appInfo.totalMemoryMb) * 100)));
}

/** Relatório de diagnóstico copiado pelo botão da aba Sobre (texto de produto, pt-BR). */
export function helpAboutBuildDiagnosticReport(appInfo: SystemAppInfo, now: Date = new Date()): string {
  return [
    `=== DIAGNÓSTICO DO SISTEMA - DEV MANAGER ===`,
    `Data/Hora: ${now.toLocaleString('pt-BR')}`,
    `Aplicação: ${appInfo.appName} v${appInfo.appVersion}`,
    `Privilégios UAC: ${appInfo.isAdmin ? 'Administrador (Elevado)' : 'Usuário Padrão (Sem Elevação)'}`,
    `Sistema Operacional: Windows (${appInfo.osPlatform} ${appInfo.osRelease} ${appInfo.osArch})`,
    `Hostname: ${appInfo.osHostname}`,
    `Memória RAM: ${appInfo.freeMemoryMb} MB livres de ${appInfo.totalMemoryMb} MB totais`,
    `Electron: v${appInfo.electronVersion}`,
    `Node.js: v${appInfo.nodeVersion}`,
    `Chromium: v${appInfo.chromeVersion}`,
    `V8 Engine: v${appInfo.v8Version}`,
    `Arquivo Config: ${appInfo.configPath}`,
    `====================================================`
  ].join('\n');
}

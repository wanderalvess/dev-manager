import type { UpdateStatus } from '../../../../shared/types';

/** Fase do aviso de atualização; entra na chave de "Depois" para o aviso voltar quando a fase avança. */
export type UpdatePhase = 'available' | 'downloading' | 'ready';

export interface UpdateNotice {
  phase: UpdatePhase;
  version: string;
  title: string;
  description: string;
  /** Porcentagem do download (só em `downloading`). */
  percent?: number;
  /** Texto do botão principal; ausente quando não há ação (baixando). */
  primaryLabel?: string;
  /** `manual`: build portátil, o botão abre o download no navegador. */
  manual?: boolean;
}

export const noticeKey = (n: Pick<UpdateNotice, 'version' | 'phase'>): string => `${n.version}:${n.phase}`;

/**
 * Converte o status do updater no conteúdo do card. `lastVersion` é a versão vista no último `available`
 * (o status `downloading` não carrega versão). Estados sem aviso (checando, sem novidade, erro) devolvem null:
 * o erro de checagem não vira notificação, só aparece em Ajuda › Sobre.
 */
export function buildUpdateNotice(status: UpdateStatus | null, lastVersion: string | null): UpdateNotice | null {
  if (!status) return null;
  switch (status.status) {
    case 'available':
      return status.manual
        ? {
            phase: 'available',
            version: status.version,
            manual: true,
            title: `Nova versão ${status.version} disponível`,
            description: 'Esta é a versão portátil: baixe o novo executável e substitua o atual.',
            primaryLabel: 'Baixar nova versão'
          }
        : {
            phase: 'available',
            version: status.version,
            title: `Nova versão ${status.version} disponível`,
            description: 'Baixe agora e continue trabalhando. A instalação só acontece quando você reiniciar.',
            primaryLabel: 'Baixar atualização'
          };
    case 'downloading':
      if (!lastVersion) return null;
      return {
        phase: 'downloading',
        version: lastVersion,
        percent: Math.max(0, Math.min(100, Math.round(status.percent))),
        title: `Baixando a versão ${lastVersion}`,
        description: 'Pode continuar usando o app enquanto isso.'
      };
    case 'downloaded':
      return {
        phase: 'ready',
        version: status.version,
        title: `Nova versão ${status.version} pronta`,
        description: 'Reinicie quando for bom para você. Se preferir, ela é instalada sozinha quando você fechar o app.',
        primaryLabel: 'Reiniciar e atualizar'
      };
    default:
      return null;
  }
}

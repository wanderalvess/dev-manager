import React, { useEffect, useState } from 'react';
import type { UpdateStatus } from '../../../../shared/types';
import { buildUpdateNotice, noticeKey, type UpdateNotice } from './updateNotice';

/**
 * Aviso de atualização em card, no canto da tela e em qualquer aba: nova versão disponível, baixando e
 * pronta para instalar, cada uma com a ação direta (sem mandar o usuário para Ajuda › Sobre). "Depois"
 * esconde o aviso daquela fase; ele volta quando a fase avança (ex.: terminou de baixar).
 * Também dispara a checagem ao montar: a do boot no processo main costuma acontecer antes de a janela
 * assinar o canal update:status, e o resultado se perderia.
 */
export const UpdateNotifier: React.FC = () => {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [lastVersion, setLastVersion] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribe = window.electronAPI?.onUpdateStatus?.((next) => {
      if (next.status === 'available' || next.status === 'downloaded') setLastVersion(next.version);
      setStatus(next);
    });
    window.electronAPI?.checkForUpdate?.();
    return () => unsubscribe?.();
  }, []);

  const notice: UpdateNotice | null = buildUpdateNotice(status, lastVersion);
  if (!notice || dismissed.has(noticeKey(notice))) return null;

  const dismiss = () => setDismissed((prev) => new Set(prev).add(noticeKey(notice)));
  const act = () => {
    if (notice.phase === 'ready') {
      void window.electronAPI?.installUpdate?.();
      return;
    }
    void window.electronAPI?.downloadUpdate?.();
    // Baixar no instalado: o card passa a mostrar o progresso. No portátil o download abre no navegador.
    if (notice.manual) dismiss();
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-101 w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-5 shadow-2xl animate-fade-in"
    >
      <h2 className="m-0 text-sm font-bold text-foreground">{notice.title}</h2>
      <p className="mt-2 mb-0 text-xs leading-relaxed text-muted-foreground">{notice.description}</p>

      {notice.phase === 'downloading' ? (
        <div className="mt-4 flex items-center gap-3">
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={notice.percent}
          >
            <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${notice.percent}%` }} />
          </div>
          <span className="font-mono text-2xs text-muted-foreground">{notice.percent}%</span>
        </div>
      ) : (
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={dismiss}
            className="h-10 cursor-pointer rounded-xl px-4 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Depois
          </button>
          <button
            type="button"
            onClick={act}
            className="h-10 cursor-pointer rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {notice.primaryLabel}
          </button>
        </div>
      )}
    </div>
  );
};

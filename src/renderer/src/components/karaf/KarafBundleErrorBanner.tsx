import React from 'react';
import { AlertTriangle, Play } from 'lucide-react';
import { KarafContainerStatus } from '../../utils/karafBundleUtils';

interface KarafBundleErrorBannerProps {
  message: string;
  karafStatus: KarafContainerStatus;
  isStartingKaraf: boolean;
  onLaunchKarafDebug: () => void;
  onDismiss: () => void;
}

export const KarafBundleErrorBanner: React.FC<KarafBundleErrorBannerProps> = ({
  message,
  karafStatus,
  isStartingKaraf,
  onLaunchKarafDebug,
  onDismiss
}) => (
  <div className="bg-danger/10 border-b border-danger/30 p-3 px-6 text-xs text-danger flex items-center justify-between gap-3">
    <div className="flex items-center gap-2 min-w-0">
      <AlertTriangle className="w-4 h-4 shrink-0 text-danger" />
      <span className="truncate">{message}</span>
    </div>
    <div className="flex items-center gap-2 shrink-0">
      {karafStatus === 'OFFLINE' && (
        <button
          type="button"
          onClick={onLaunchKarafDebug}
          disabled={isStartingKaraf}
          className="px-2.5 py-1 bg-success hover:bg-success/90 text-background font-bold text-2xs rounded-lg transition flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-2xs"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>Subir Karaf Agora</span>
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        className="hover:underline font-bold text-2xs text-muted-foreground hover:text-foreground cursor-pointer"
      >
        Fechar
      </button>
    </div>
  </div>
);

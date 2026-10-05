import React from 'react';
import { Archive, X } from 'lucide-react';

interface WslSnapshotsHeaderProps {
  onClose: () => void;
}

export const WslSnapshotsHeader: React.FC<WslSnapshotsHeaderProps> = ({ onClose }) => (
  <div className="px-5 py-4 border-b border-border/80 flex items-center justify-between bg-muted/20">
    <div className="flex items-center space-x-3">
      <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
        <Archive className="w-5 h-5" />
      </div>
      <div>
        <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
          <span>Snapshots WSL (.tar)</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
            WSL2 Backup & Restore
          </span>
        </h3>
        <p className="text-[11px] text-muted-foreground">
          Importação de distros a partir de snapshots .tar (ex: ubuntu2604-winthor-26-07-22.tar) e exportação de backups
        </p>
      </div>
    </div>

    <button
      onClick={onClose}
      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition cursor-pointer"
    >
      <X className="w-4 h-4" />
    </button>
  </div>
);

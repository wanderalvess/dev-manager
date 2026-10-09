import React from 'react';
import { AlertTriangle, RotateCw, X } from 'lucide-react';
import { Modal } from '../../ui/Modal';

interface KarafInlineDiagModalProps {
  bundle: { id: string; name: string; diag: string } | null;
  isLoading: boolean;
  onClose: () => void;
}

export const KarafInlineDiagModal: React.FC<KarafInlineDiagModalProps> = ({
  bundle,
  isLoading,
  onClose
}) => {
  if (!bundle) return null;

  return (
    <Modal
      open
      onClose={onClose}
      bare
      panelClassName="bg-card border border-border rounded-xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden animate-fade-in"
      closeOnBackdrop={false}
    >
      <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">
              Diagnóstico OSGi (bundle:diag [{bundle.id}])
            </h4>
            <p className="text-2xs text-muted-foreground truncate max-w-md">
              {bundle.name}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div className="bg-slate-950 rounded-xl p-3.5 border border-amber-500/30 font-mono text-xs text-amber-200 whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed selection:bg-amber-900/40">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
              <RotateCw className="w-5 h-5 animate-spin text-primary" />
              <span>Consultando bundle:diag no Karaf...</span>
            </div>
          ) : (
            bundle.diag
          )}
        </div>
      </div>

      <div className="p-3 border-t border-border bg-muted/30 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 rounded-xl font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition cursor-pointer"
        >
          Fechar
        </button>
      </div>
    </Modal>
  );
};

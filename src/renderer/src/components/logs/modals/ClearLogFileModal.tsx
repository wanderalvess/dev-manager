import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface ClearLogFileModalProps {
  filePath: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ClearLogFileModal: React.FC<ClearLogFileModalProps> = ({ filePath, onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
    <div className="bg-card border border-rose-500/40 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-center space-x-3 text-rose-400">
        <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-foreground">Limpar Arquivo no Disco?</h3>
          <span className="text-[11px] text-rose-400 font-mono">Ação destrutiva no sistema de arquivos</span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Deseja realmente zerar o conteúdo do arquivo físico abaixo? O log será esvaziado para permitir testar
        uma nova execução do serviço do zero:
      </p>

      <div className="bg-background p-2.5 rounded-xl border border-border font-mono text-[11px] text-slate-300 break-all select-all">
        {filePath}
      </div>

      <div className="flex justify-end space-x-2 pt-2">
        <button
          onClick={onCancel}
          className="px-4 py-1.5 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-lg text-xs transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs flex items-center space-x-1.5 shadow-sm transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Sim, Zerar Arquivo</span>
        </button>
      </div>
    </div>
  </div>
);

import React from 'react';
import { Key, Play, RotateCw } from 'lucide-react';

interface InfrWshTabProps {
  isExecuting: boolean;
  onRun: () => void;
}

export const InfrWshTab: React.FC<InfrWshTabProps> = ({ isExecuting, onRun }) => (
  <div className="space-y-4">
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
        <Key className="w-4 h-4" />
      </div>
      <div className="text-xs leading-relaxed text-muted-foreground">
        <strong className="text-foreground font-semibold block mb-0.5">
          Setup Automatizado do Winthor Smart Hub (WSH)
        </strong>
        Executa <code className="text-foreground font-mono">wsh_setup.sh</code> na pasta <code className="text-foreground font-mono">wsh-winthor</code>. Cria o container WSH configurado com o <code className="text-foreground font-mono">Winthor.ini</code> e variáveis do <code className="text-foreground font-mono">.env</code>.
      </div>
    </div>

    <div className="p-4 bg-card border border-border/80 rounded-xl space-y-3">
      <div className="p-3 bg-[#090D14] rounded-lg border border-border/60 text-xs font-mono text-emerald-400">
        ./wsh_setup.sh
      </div>

      <button
        onClick={onRun}
        disabled={isExecuting}
        className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-primary hover:bg-primary text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 active:scale-98"
      >
        {isExecuting ? (
          <RotateCw className="w-4 h-4 animate-spin" />
        ) : (
          <Play className="w-4 h-4 fill-current" />
        )}
        <span>{isExecuting ? 'Iniciando Setup...' : 'Executar Setup WSH'}</span>
      </button>
    </div>
  </div>
);

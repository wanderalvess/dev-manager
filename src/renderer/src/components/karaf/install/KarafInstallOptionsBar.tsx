import React from 'react';
import { RotateCw, Sparkles } from 'lucide-react';

interface KarafInstallOptionsBarProps {
  startImmediately: boolean;
  isChecking: boolean;
  canCheck: boolean;
  onStartImmediatelyChange: (value: boolean) => void;
  onCheck: () => void;
}

export const KarafInstallOptionsBar: React.FC<KarafInstallOptionsBarProps> = ({
  startImmediately,
  isChecking,
  canCheck,
  onStartImmediatelyChange,
  onCheck
}) => (
  <div className="pt-2 border-t border-border flex items-center justify-between">
    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
      <input
        type="checkbox"
        checked={startImmediately}
        onChange={(e) => onStartImmediatelyChange(e.target.checked)}
        className="rounded border-border text-primary focus:ring-primary"
      />
      <span>
        Iniciar bundle após instalação (<code className="font-mono text-primary">-s</code>)
      </span>
    </label>

    <button
      type="button"
      onClick={onCheck}
      disabled={isChecking || !canCheck}
      className="px-3 py-1.5 bg-card hover:bg-muted border border-border rounded-xl text-xs font-bold text-foreground flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
    >
      {isChecking ? (
        <RotateCw className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Sparkles className="w-3.5 h-3.5 text-primary" />
      )}
      <span>Verificar Dependências</span>
    </button>
  </div>
);

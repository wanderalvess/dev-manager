import React from 'react';
import { Copy, Check } from 'lucide-react';

interface HelpAboutConfigPathProps {
  configPath: string;
  copiedItem: string | null;
  copyToClipboard: (text: string, key?: string) => void;
}

export const HelpAboutConfigPath: React.FC<HelpAboutConfigPathProps> = ({
  configPath,
  copiedItem,
  copyToClipboard
}) => (
  <div className="mt-3 p-3 rounded-xl bg-muted/60 border border-border flex items-center justify-between gap-2 shadow-inner">
    <div className="min-w-0 flex-1">
      <span className="text-2xs uppercase font-bold text-muted-foreground block">
        Arquivo de Configurações Persistidas do Hub Manager:
      </span>
      <span className="text-2xs font-mono text-foreground truncate block">
        {configPath}
      </span>
    </div>
    <button
      onClick={() => copyToClipboard(configPath, 'configPath')}
      className="p-1.5 rounded-lg bg-card hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer"
      title="Copiar caminho completo"
    >
      {copiedItem === 'configPath' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  </div>
);

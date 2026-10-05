import React from 'react';
import { Copy } from 'lucide-react';

interface OracleCopyOutputButtonProps {
  copied: boolean;
  onCopy: () => void;
}

export const OracleCopyOutputButton: React.FC<OracleCopyOutputButtonProps> = ({ copied, onCopy }) => (
  <button
    onClick={onCopy}
    className="ml-auto text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50 border border-border/60 cursor-pointer transition"
  >
    <Copy className="w-3 h-3" />
    <span>{copied ? 'Copiado!' : 'Copiar Saída'}</span>
  </button>
);

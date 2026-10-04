import React from 'react';
import { Check, Copy } from 'lucide-react';

export const CopySqlButton: React.FC<{ sql: string; keyId: string; onCopy: (text: string, key?: string) => void; copiedKey: string | null }> = ({
  sql,
  keyId,
  onCopy,
  copiedKey
}) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onCopy(sql, keyId);
    }}
    title="Copiar texto"
    className="text-muted-foreground hover:text-primary transition cursor-pointer shrink-0"
  >
    {copiedKey === keyId ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
  </button>
);

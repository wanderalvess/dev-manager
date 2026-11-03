import React from 'react';
import { Key, Sparkles } from 'lucide-react';

interface WshMd5TabProps {
  plainPass: string;
  md5Upper: string;
  md5Lower: string;
  copiedKey: string | null;
  onPlainPassChange: (value: string) => void;
  onCopy: (text: string, key: string) => void;
}

export const WshMd5Tab: React.FC<WshMd5TabProps> = ({
  plainPass,
  md5Upper,
  md5Lower,
  copiedKey,
  onPlainPassChange,
  onCopy
}) => (
  <div className="space-y-4">
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
        <Key className="w-4 h-4" />
      </div>
      <div className="text-xs leading-relaxed text-muted-foreground">
        <strong className="text-foreground font-semibold block mb-0.5">Onde o MD5 maiúsculo é usado</strong>
        O login do WTA (e das rotinas e APIs do WinThor) recebe o MD5 da senha em hexadecimal maiúsculo; o Hub faz essa conversão sozinho. Já a conexão do WSH com o banco usa a senha do <code className="text-foreground font-mono">Winthor.ini</code>, que o WSH grava em <strong>maiúsculas</strong>: em Oracle 12 ou mais novo, use a senha do usuário do banco em maiúsculas (senão o erro é ORA-01017).
      </div>
    </div>

    <div className="space-y-3 bg-card border border-border/80 rounded-xl p-4">
      <div>
        <label className="text-2xs font-semibold text-muted-foreground block mb-1">
          Senha em Texto Plano
        </label>
        <input
          type="text"
          value={plainPass}
          onChange={(e) => onPlainPassChange(e.target.value)}
          placeholder="Ex: pcinfo, 123456, totvs"
          className="w-full bg-background border border-input/80 rounded-[10px] px-3 py-2.5 text-sm text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-primary"
          autoFocus
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* MD5 Maiúsculo */}
        <div className="p-3 bg-muted/40 rounded-xl border border-primary/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold text-primary flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>MD5 Maiúsculo (WSH .env)</span>
            </span>
            <button
              onClick={() => onCopy(md5Upper, 'md5-upper')}
              disabled={!md5Upper}
              className="text-2xs px-2 py-0.5 rounded bg-primary hover:bg-primary text-white font-semibold transition cursor-pointer disabled:opacity-50"
            >
              {copiedKey === 'md5-upper' ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
          <div className="font-mono text-xs text-foreground font-bold break-all select-all bg-background p-2 rounded-lg border border-border/60">
            {md5Upper || '—'}
          </div>
          <p className="text-2xs text-muted-foreground">
            Utilize para a variável <code className="text-foreground font-mono">DB_PASSWORD</code> no arquivo <code className="text-foreground font-mono">.env</code>.
          </p>
        </div>

        {/* MD5 Minúsculo */}
        <div className="p-3 bg-muted/40 rounded-xl border border-border/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold text-muted-foreground">
              MD5 Minúsculo (Padrão Linux)
            </span>
            <button
              onClick={() => onCopy(md5Lower, 'md5-lower')}
              disabled={!md5Lower}
              className="text-2xs px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground border border-border/80 font-medium transition cursor-pointer disabled:opacity-50"
            >
              {copiedKey === 'md5-lower' ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
          <div className="font-mono text-xs text-foreground break-all select-all bg-background p-2 rounded-lg border border-border/60">
            {md5Lower || '—'}
          </div>
          <p className="text-2xs text-muted-foreground">
            Padrão gerado por <code className="text-foreground font-mono">echo -n "{plainPass}" | md5sum</code>.
          </p>
        </div>
      </div>
    </div>
  </div>
);

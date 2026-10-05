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
    <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-3.5 flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0 mt-0.5">
        <Key className="w-4 h-4" />
      </div>
      <div className="text-xs leading-relaxed text-muted-foreground">
        <strong className="text-foreground font-semibold block mb-0.5">Por que o MD5 é obrigatório no WSH?</strong>
        O WSH valida a conexão com o banco comparando o hash MD5 da senha com o configurado no <code className="text-foreground font-mono">Winthor.ini</code>. No arquivo <code className="text-foreground font-mono">.env</code>, o parâmetro <code className="text-foreground font-mono">DB_PASSWORD</code> deve ser <strong>obrigatoriamente o hash MD5 em letras maiúsculas</strong>.
      </div>
    </div>

    <div className="space-y-3 bg-card border border-border/80 rounded-xl p-4">
      <div>
        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
          Senha em Texto Plano
        </label>
        <input
          type="text"
          value={plainPass}
          onChange={(e) => onPlainPassChange(e.target.value)}
          placeholder="Ex: pcinfo, 123456, totvs"
          className="w-full bg-background border border-border/80 rounded-lg px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
          autoFocus
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* MD5 Maiúsculo */}
        <div className="p-3 bg-muted/40 rounded-xl border border-violet-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>MD5 Maiúsculo (WSH .env)</span>
            </span>
            <button
              onClick={() => onCopy(md5Upper, 'md5-upper')}
              disabled={!md5Upper}
              className="text-[10px] px-2 py-0.5 rounded bg-violet-600 hover:bg-violet-500 text-white font-semibold transition cursor-pointer disabled:opacity-50"
            >
              {copiedKey === 'md5-upper' ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
          <div className="font-mono text-xs text-foreground font-bold break-all select-all bg-background p-2 rounded-lg border border-border/60">
            {md5Upper || '—'}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Utilize para a variável <code className="text-foreground font-mono">DB_PASSWORD</code> no arquivo <code className="text-foreground font-mono">.env</code>.
          </p>
        </div>

        {/* MD5 Minúsculo */}
        <div className="p-3 bg-muted/40 rounded-xl border border-border/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground">
              MD5 Minúsculo (Padrão Linux)
            </span>
            <button
              onClick={() => onCopy(md5Lower, 'md5-lower')}
              disabled={!md5Lower}
              className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground border border-border/80 font-medium transition cursor-pointer disabled:opacity-50"
            >
              {copiedKey === 'md5-lower' ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
          <div className="font-mono text-xs text-foreground break-all select-all bg-background p-2 rounded-lg border border-border/60">
            {md5Lower || '—'}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Padrão gerado por <code className="text-foreground font-mono">echo -n "{plainPass}" | md5sum</code>.
          </p>
        </div>
      </div>
    </div>
  </div>
);

import React from 'react';
import { Check, Copy } from 'lucide-react';

interface MarkdownCodeBlockProps {
  language: string;
  lineCount: number;
  code: string;
  isCopied: boolean;
  onCopy: () => void;
}

export const MarkdownCodeBlock: React.FC<MarkdownCodeBlockProps> = ({ language, lineCount, code, isCopied, onCopy }) => (
  <div className="my-5 rounded-2xl border border-border/80 overflow-hidden bg-slate-950 text-slate-100 shadow-lg">
    <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-[11px] font-mono select-none">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
        <span className="ml-2 px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 font-bold uppercase tracking-wider text-2xs">
          {language}
        </span>
        <span className="text-slate-500 text-2xs">{lineCount} linhas</span>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors text-2xs font-bold cursor-pointer"
        title="Copiar código"
      >
        {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
        <span>{isCopied ? 'Copiado!' : 'Copiar'}</span>
      </button>
    </div>
    <div className="p-4 overflow-x-auto font-mono text-[12px] leading-relaxed text-slate-200 selection:bg-cyan-500/30">
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  </div>
);

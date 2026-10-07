import React from 'react';

interface OracleOutputTerminalProps {
  title: string;
  output: string;
  success: boolean | null;
  successLabel: string;
  failLabel: string;
}

export const OracleOutputTerminal: React.FC<OracleOutputTerminalProps> = ({
  title,
  output,
  success,
  successLabel,
  failLabel
}) => (
  <div className="relative rounded-xl overflow-hidden border border-border/80 shadow-inner">
    <div className="bg-[#090D14] px-3.5 py-2 border-b border-border/40 flex items-center justify-between">
      <div className="flex items-center space-x-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
        <span className="text-2xs font-mono text-muted-foreground ml-2">{title}</span>
      </div>
      {success !== null && (
        <span
          className={`text-2xs font-bold font-mono px-2 py-0.5 rounded border ${
            success
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
          }`}
        >
          {success ? successLabel : failLabel}
        </span>
      )}
    </div>
    <pre className="bg-[#090D14] p-4 text-[11px] font-mono text-emerald-400 overflow-auto max-h-72 whitespace-pre-wrap leading-relaxed select-text scrollbar-thin">
      {output}
    </pre>
  </div>
);

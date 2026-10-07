import React from 'react';
import { CornerDownLeft } from 'lucide-react';

interface TerminalCommandInputProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSubmit: (e?: React.FormEvent) => void;
}

/** Linha interativa de comando CLI. */
export const TerminalCommandInput: React.FC<TerminalCommandInputProps> = ({
  value,
  placeholder,
  onChange,
  onKeyDown,
  onSubmit
}) => (
  <form
    onSubmit={onSubmit}
    className="bg-[#0b101c] border-t border-[#1b283f] px-3 py-2 flex items-center space-x-2 shrink-0"
  >
    <span className="text-amber-400 font-mono font-bold text-xs shrink-0 select-none">
      karaf@root()&gt;
    </span>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className="flex-1 bg-transparent border-none text-xs text-slate-200 font-mono focus:outline-hidden placeholder-slate-600"
    />
    <button
      type="submit"
      disabled={!value.trim()}
      className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-40"
    >
      <span>Enviar</span>
      <CornerDownLeft className="w-3 h-3" />
    </button>
  </form>
);

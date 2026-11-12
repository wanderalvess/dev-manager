import React from 'react';
import { Send } from 'lucide-react';

export const TerminalCommandInput: React.FC<{
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  onAbort?: () => void;
}> = ({ value, placeholder, onChange, onKeyDown, onSubmit }) => (
  <div className="flex items-center gap-2 px-3 py-2 bg-[#0b101b] border-t border-slate-800 shrink-0">
    <span className="font-mono text-xs text-emerald-400 font-bold">karaf&gt;</span>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className="flex-1 bg-transparent font-mono text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
    />
    <button
      type="button"
      onClick={onSubmit}
      className="px-2.5 py-1 rounded bg-primary text-primary-foreground text-2xs font-bold flex items-center gap-1 cursor-pointer hover:opacity-90"
    >
      <Send className="w-3 h-3" /> Enviar
    </button>
  </div>
);

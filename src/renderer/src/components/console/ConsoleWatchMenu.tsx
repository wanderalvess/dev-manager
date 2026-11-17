import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Eye, EyeOff, List } from 'lucide-react';
import { buildWatchCommand } from '../../utils/karafWatchCommand';
import { showToast } from '../ToastHost';

interface ConsoleWatchMenuProps {
  onRunCommand: (cmd: string) => void;
}

/** Popover compacto para bundle:watch sem alongar nem quebrar a barra de ações do painel lateral. */
export const ConsoleWatchMenu: React.FC<ConsoleWatchMenuProps> = ({ onRunCommand }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [target, setTarget] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  const runWatch = (action: 'start' | 'stop' | 'list') => {
    const cmd = buildWatchCommand(action, target);
    if (!cmd) {
      showToast('Alvo inválido. Use ids, nomes ou URLs mvn: separados por vírgula (sem ; | & $).', 'info');
      return;
    }
    setIsOpen(false);
    onRunCommand(cmd);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        title="Configurar bundle:watch (recarregamento automático ao compilar bundles)"
        className="flex items-center gap-1 px-2 py-1 rounded-lg border border-border bg-card hover:bg-muted text-2xs font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer whitespace-nowrap"
      >
        <Eye className="w-3 h-3 text-primary" /> Watch
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-72 bg-card border border-border rounded-xl shadow-xl z-50 p-2.5 space-y-2">
          <div>
            <label className="block text-2xs font-semibold text-muted-foreground mb-1">
              Alvo do bundle:watch
            </label>
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="* (todos), ids ou mvn:..."
              title="Alvo do bundle:watch. Vazio monitora todos os bundles (*)."
              className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-2xs font-mono text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => runWatch('start')}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-primary text-primary-foreground text-2xs font-semibold cursor-pointer hover:opacity-90 whitespace-nowrap"
            >
              <Eye className="w-3 h-3" /> Iniciar
            </button>
            <button
              type="button"
              onClick={() => runWatch('stop')}
              className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-2xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer whitespace-nowrap"
            >
              <EyeOff className="w-3 h-3" /> Parar
            </button>
            <button
              type="button"
              onClick={() => runWatch('list')}
              className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-2xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer whitespace-nowrap"
            >
              <List className="w-3 h-3" /> Listar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

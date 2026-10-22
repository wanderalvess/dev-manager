import React, { useState } from 'react';
import { ChevronDown, ListChecks } from 'lucide-react';
import { EscapeToClose } from '../ui/EscapeToClose';
import { confirmKarafCommand, useKarafQuickCommands } from '../../hooks/karafConsole/useKarafQuickCommands';

interface ConsoleQuickCommandsMenuProps {
  onRunCommand: (cmd: string) => void;
}

/** Menu "Comandos" do dock: roda no console qualquer comando da lista personalizada em Deploy › Diagnósticos. */
export const ConsoleQuickCommandsMenu: React.FC<ConsoleQuickCommandsMenuProps> = ({ onRunCommand }) => {
  const { commands } = useKarafQuickCommands();
  const [isOpen, setIsOpen] = useState(false);

  const run = async (command: string) => {
    setIsOpen(false);
    if (await confirmKarafCommand(command)) onRunCommand(command);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        title="Rodar no console um dos comandos rápidos (bundle:list, feature:list, log:display...)"
        className="flex items-center gap-1 px-2 py-1 rounded-lg border border-border bg-card hover:bg-muted text-2xs font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer"
      >
        <ListChecks className="w-3 h-3 text-primary" /> Comandos
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <EscapeToClose onEscape={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-1 w-64 max-h-72 overflow-y-auto bg-card border border-border rounded-xl shadow-xl z-50 py-1">
            {commands.length === 0 ? (
              <p className="px-3 py-2 text-2xs text-muted-foreground">Nenhum comando rápido configurado.</p>
            ) : (
              commands.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => void run(c.command)}
                  className="w-full text-left px-3 py-1.5 hover:bg-muted cursor-pointer"
                >
                  <span className="block text-xs font-medium text-foreground truncate">{c.label}</span>
                  <span className="block text-2xs font-mono text-muted-foreground truncate">{c.command}</span>
                </button>
              ))
            )}
            <p className="px-3 pt-1.5 mt-1 border-t border-border/60 text-2xs text-muted-foreground">
              Edite a lista em Deploy › Diagnósticos › Personalizar.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { AlertTriangle, FileText, Layers, ListTree, Package, Pencil, RotateCcw, Terminal } from 'lucide-react';
import { useKarafQuickCommands } from '../../../hooks/karafConsole/useKarafQuickCommands';
import { KarafDiagCommandButton } from './KarafDiagButtons';
import { KarafQuickCommandsEditor } from './KarafQuickCommandsEditor';

interface KarafDiagQuickTabProps {
  disabled: boolean;
  onRun: (cmd: string, label: string) => void;
}

const ICON = 'w-3.5 h-3.5 shrink-0';

function iconFor(command: string) {
  if (/^bundle:diag/.test(command)) return <AlertTriangle className={`${ICON} text-warning`} />;
  if (/^feature:repo/.test(command)) return <Layers className={`${ICON} text-primary`} />;
  if (/^feature:/.test(command)) return <ListTree className={`${ICON} text-primary`} />;
  if (/^bundle:/.test(command)) return <Package className={`${ICON} text-primary`} />;
  if (/^log:clear/.test(command)) return <RotateCcw className={`${ICON} text-muted-foreground`} />;
  if (/^log:/.test(command)) return <FileText className={`${ICON} text-primary`} />;
  return <Terminal className={`${ICON} text-primary`} />;
}

/** Atalhos de comandos Karaf que o desenvolvedor personaliza (a lista vale também para o menu do console). */
export const KarafDiagQuickTab: React.FC<KarafDiagQuickTabProps> = ({ disabled, onRun }) => {
  const { commands, save, reset } = useKarafQuickCommands();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <KarafQuickCommandsEditor
        commands={commands}
        onSave={save}
        onRestoreDefaults={reset}
        onClose={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="space-y-2">
      {commands.length === 0 ? (
        <p className="py-3 text-center text-xs text-muted-foreground">
          Nenhum comando rápido. Use "Personalizar" para adicionar os seus.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {commands.map((c) => (
            <KarafDiagCommandButton
              key={c.id}
              icon={iconFor(c.command)}
              label={c.label}
              command={c.command}
              title={c.command}
              disabled={disabled}
              onClick={() => onRun(c.command, c.id)}
            />
          ))}
        </div>
      )}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex items-center gap-1 text-2xs text-primary hover:underline cursor-pointer"
          title="Adicionar, remover e reordenar os comandos desta lista"
        >
          <Pencil className="w-3 h-3" /> Personalizar
        </button>
      </div>
    </div>
  );
};

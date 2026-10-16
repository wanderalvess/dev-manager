import React from 'react';
import { FolderOpen } from 'lucide-react';
import { DatabaseConnectionConfig } from '../../../../shared/types';

interface OracleThickClientSectionProps {
  editingConn: Partial<DatabaseConnectionConfig>;
  setEditingConn: React.Dispatch<React.SetStateAction<Partial<DatabaseConnectionConfig>>>;
}

export const OracleThickClientSection: React.FC<OracleThickClientSectionProps> = ({
  editingConn,
  setEditingConn
}) => {
  const isThickActive = Boolean(editingConn.oracleThickMode || editingConn.oracleClientPath);

  const handleBrowseDir = async () => {
    try {
      const selected = await window.electronAPI?.selectDirectory?.(editingConn.oracleClientPath || undefined);
      if (selected) {
        setEditingConn((prev) => ({ ...prev, oracleClientPath: selected }));
      }
    } catch (err) {
      console.error('Falha ao selecionar diretório do Instant Client:', err);
    }
  };

  return (
    <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20 space-y-2 text-xs">
      <label className="flex items-center space-x-2 cursor-pointer font-medium text-foreground">
        <input
          type="checkbox"
          checked={isThickActive}
          onChange={(e) =>
            setEditingConn({
              ...editingConn,
              oracleThickMode: e.target.checked
            })
          }
          className="rounded border-border text-primary focus:ring-0 cursor-pointer"
        />
        <span>Modo Thick / Suporte a Oracle 11g (Instant Client)</span>
      </label>
      <p className="text-2xs text-muted-foreground leading-relaxed pl-5">
        Obrigatório para Oracle 11g e anteriores para evitar o erro{' '}
        <span className="font-mono text-foreground font-semibold">NJS-138</span>. Requer bibliotecas nativas de 64 bits da Oracle.
      </p>
      {isThickActive && (
        <div className="pl-5 pt-1 space-y-1">
          <label className="block text-2xs font-medium text-foreground">
            Diretório do Oracle Instant Client (opcional se estiver no PATH):
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={editingConn.oracleClientPath || ''}
              onChange={(e) =>
                setEditingConn({ ...editingConn, oracleClientPath: e.target.value })
              }
              placeholder="Ex: C:\oracle\instantclient_19_25"
              className="flex-1 bg-background border border-border/70 rounded-md p-1.5 text-foreground focus:outline-hidden focus:border-primary font-mono text-xs"
            />
            <button
              type="button"
              onClick={handleBrowseDir}
              className="p-1.5 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-md border border-border/70 transition cursor-pointer shrink-0"
              title="Selecionar pasta do Instant Client"
              aria-label="Selecionar pasta do Instant Client"
            >
              <FolderOpen className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

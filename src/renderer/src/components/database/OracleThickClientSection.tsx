import React from 'react';
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
      <p className="text-[11px] text-muted-foreground leading-relaxed pl-5">
        Obrigatório para Oracle 11g e anteriores para evitar o erro{' '}
        <span className="font-mono text-foreground font-semibold">NJS-138</span>. Requer bibliotecas nativas de 64 bits da Oracle.
      </p>
      {isThickActive && (
        <div className="pl-5 pt-1 space-y-1">
          <label className="block text-[11px] font-medium text-foreground">
            Diretório do Oracle Instant Client (opcional se estiver no PATH):
          </label>
          <input
            type="text"
            value={editingConn.oracleClientPath || ''}
            onChange={(e) =>
              setEditingConn({ ...editingConn, oracleClientPath: e.target.value })
            }
            placeholder="Ex: C:\oracle\instantclient_19_25"
            className="w-full bg-background border border-border/70 rounded-md p-1.5 text-foreground focus:outline-hidden focus:border-primary font-mono text-xs"
          />
        </div>
      )}
    </div>
  );
};

import React from 'react';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  ShieldCheck
} from 'lucide-react';
import { DatabaseConnectionConfig, DatabaseType, OracleTnsEntry } from '../../../../shared/types';
import { OracleTnsSelector } from './OracleTnsSelector';
import { OracleThickClientSection } from './OracleThickClientSection';
import { ConnectionCredentialsSection } from './ConnectionCredentialsSection';

export interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingConn: Partial<DatabaseConnectionConfig>;
  setEditingConn: React.Dispatch<React.SetStateAction<Partial<DatabaseConnectionConfig>>>;
  testResult: { success: boolean; message: string; version?: string } | null;
  isTesting: boolean;
  onTestConnection: () => void;
  onSaveConnection: (e: React.FormEvent) => void;
  defaultPorts: Record<DatabaseType, number>;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({
  isOpen,
  onClose,
  editingConn,
  setEditingConn,
  testResult,
  isTesting,
  onTestConnection,
  onSaveConnection,
  defaultPorts
}) => {

  const handleSelectTnsEntry = (entry: OracleTnsEntry) => {
    setEditingConn((prev) => ({
      ...prev,
      name: prev.name && prev.name !== 'Oracle Local' ? prev.name : entry.alias,
      host: entry.host || 'localhost',
      port: entry.port || 1521,
      database: entry.serviceName || entry.sid || '',
      oracleMode: entry.oracleMode,
      tnsAlias: entry.alias
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              {editingConn.id ? 'Editar Conexão' : 'Nova Conexão de Banco'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-sm font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSaveConnection} className="p-4 space-y-3 text-xs overflow-y-auto flex-1">
          {/* Tipo de Banco */}
          <div>
            <label className="block font-bold text-foreground mb-1">Tipo de Banco</label>
            <div className="grid grid-cols-3 gap-2">
              {(['oracle', 'mysql', 'postgres'] as DatabaseType[]).map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() =>
                    setEditingConn({
                      ...editingConn,
                      type,
                      port: defaultPorts[type]
                    })
                  }
                  className={`p-2 rounded-lg border text-center font-bold capitalize transition cursor-pointer ${
                    editingConn.type === type
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'bg-background border-border/70 text-muted-foreground hover:border-border'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Nome Amigável */}
          <div>
            <label className="block font-medium text-foreground mb-1">Nome da Conexão</label>
            <input
              type="text"
              required
              value={editingConn.name || ''}
              onChange={(e) => setEditingConn({ ...editingConn, name: e.target.value })}
              placeholder="Ex: Oracle Produção"
              className="w-full bg-background border border-border/70 rounded-md p-2 text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          {/* Seletor TNS (Oracle) */}
          {editingConn.type === 'oracle' && (
            <OracleTnsSelector
              onSelectEntry={handleSelectTnsEntry}
              selectedAlias={editingConn.tnsAlias}
            />
          )}

          {/* Host e Porta */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block font-medium text-foreground mb-1">Host / Servidor / IP</label>
              <input
                type="text"
                required
                value={editingConn.host || ''}
                onChange={(e) => setEditingConn({ ...editingConn, host: e.target.value })}
                placeholder="localhost ou IP do servidor"
                className="w-full bg-background border border-border/70 rounded-md p-2 text-foreground focus:outline-none focus:border-primary font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-foreground mb-1">Porta</label>
              <input
                type="number"
                required
                value={editingConn.port || ''}
                onChange={(e) => setEditingConn({ ...editingConn, port: Number(e.target.value) })}
                className="w-full bg-background border border-border/70 rounded-md p-2 text-foreground focus:outline-none focus:border-primary font-mono"
              />
            </div>
          </div>

          {/* Database ou Service Name */}
          <div>
            <label className="block font-medium text-foreground mb-1">
              {editingConn.type === 'oracle' ? 'Service Name ou SID' : 'Nome do Banco de Dados'}
            </label>
            <input
              type="text"
              required
              value={editingConn.database || ''}
              onChange={(e) => setEditingConn({ ...editingConn, database: e.target.value })}
              placeholder={editingConn.type === 'oracle' ? 'Ex: XEPDB1 ou ORCL' : 'Ex: dev_db'}
              className="w-full bg-background border border-border/70 rounded-md p-2 text-foreground focus:outline-none focus:border-primary font-mono"
            />
          </div>

          {/* Oracle: Opção Service Name vs SID */}
          {editingConn.type === 'oracle' && (
            <>
              <div className="flex items-center space-x-4 pt-1">
                <label className="flex items-center space-x-1.5 cursor-pointer text-muted-foreground">
                  <input
                    type="radio"
                    name="oracleMode"
                    checked={editingConn.oracleMode !== 'sid'}
                    onChange={() => setEditingConn({ ...editingConn, oracleMode: 'serviceName' })}
                    className="text-primary focus:ring-0 cursor-pointer"
                  />
                  <span>Service Name (Padrão)</span>
                </label>
                <label className="flex items-center space-x-1.5 cursor-pointer text-muted-foreground">
                  <input
                    type="radio"
                    name="oracleMode"
                    checked={editingConn.oracleMode === 'sid'}
                    onChange={() => setEditingConn({ ...editingConn, oracleMode: 'sid' })}
                    className="text-primary focus:ring-0 cursor-pointer"
                  />
                  <span>SID</span>
                </label>
              </div>

              {/* Modo Thick / Suporte a Oracle 11g */}
              <OracleThickClientSection
                editingConn={editingConn}
                setEditingConn={setEditingConn}
              />
            </>
          )}

          {/* Usuário e Senha */}
          <ConnectionCredentialsSection
            editingConn={editingConn}
            setEditingConn={setEditingConn}
          />

          {/* Feedback de Teste de Conexão */}
          {testResult && (
            <div
              className={`p-3 rounded-xl text-[11px] border ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
              }`}
            >
              <div className="flex items-center space-x-2 font-bold">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
              {testResult.version && (
                <p className="text-2xs font-mono opacity-80 mt-1 truncate">
                  {testResult.version}
                </p>
              )}
            </div>
          )}

          {/* Botões de Ação */}
          <div className="pt-2 flex items-center justify-between border-t border-border/60">
            <button
              type="button"
              onClick={onTestConnection}
              disabled={isTesting}
              className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg font-semibold transition disabled:opacity-50 flex items-center space-x-1 cursor-pointer"
            >
              {isTesting ? (
                <RotateCw className="w-3.5 h-3.5 animate-spin text-primary" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>Testar Conexão</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-muted-foreground hover:text-foreground font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition shadow-sm cursor-pointer"
              >
                Salvar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

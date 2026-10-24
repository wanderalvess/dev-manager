import React from 'react';
import { Database, X } from 'lucide-react';
import { DatabaseConnectionConfig, DatabaseType, OracleTnsEntry } from '../../../../shared/types';
import { OracleTnsSelector } from './OracleTnsSelector';
import { OracleThickClientSection } from './OracleThickClientSection';
import { ConnectionCredentialsSection } from './ConnectionCredentialsSection';
import { ConnectionTestFeedback } from './ConnectionTestFeedback';
import { ConnectionModalFooter } from './ConnectionModalFooter';
import { Modal } from '../ui/Modal';

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
    <Modal
      open
      onClose={onClose}
      bare
      panelClassName="bg-card border border-border rounded-xl shadow-lg w-full max-w-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]"
      closeOnBackdrop={false}
      closeOnEscape={false}
    >
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-primary" />
            <h3 className="text-base font-semibold text-foreground">
              {editingConn.id ? 'Editar Conexão' : 'Nova Conexão de Banco'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-sm font-bold p-1 rounded-md hover:bg-muted/60 transition-colors cursor-pointer"
            aria-label="Fechar"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSaveConnection} className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
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
              className="w-full bg-background border border-border/70 rounded-md p-2 text-foreground focus:outline-hidden focus:border-primary"
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
                className="w-full bg-background border border-border/70 rounded-md p-2 text-foreground focus:outline-hidden focus:border-primary font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-foreground mb-1">Porta</label>
              <input
                type="number"
                required
                value={editingConn.port || ''}
                onChange={(e) => setEditingConn({ ...editingConn, port: Number(e.target.value) })}
                className="w-full bg-background border border-border/70 rounded-md p-2 text-foreground focus:outline-hidden focus:border-primary font-mono"
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
              className="w-full bg-background border border-border/70 rounded-md p-2 text-foreground focus:outline-hidden focus:border-primary font-mono"
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

          {/* SSL (PostgreSQL e MySQL) e ambiente de produção */}
          <div className="space-y-1.5 pt-1">
            {editingConn.type !== 'oracle' && (
              <label className="flex items-center space-x-2 cursor-pointer text-muted-foreground">
                <input
                  type="checkbox"
                  checked={!!editingConn.ssl}
                  onChange={(e) => setEditingConn({ ...editingConn, ssl: e.target.checked })}
                  className="rounded text-primary focus:ring-0 cursor-pointer"
                />
                <span>Usar SSL/TLS na conexão</span>
              </label>
            )}
            <label className="flex items-start space-x-2 cursor-pointer text-muted-foreground">
              <input
                type="checkbox"
                checked={!!editingConn.isProduction}
                onChange={(e) => setEditingConn({ ...editingConn, isProduction: e.target.checked })}
                className="mt-0.5 rounded text-primary focus:ring-0 cursor-pointer"
              />
              <span>
                <span className="font-semibold text-foreground">Ambiente de produção</span>
                <span className="block text-2xs">
                  O editor SQL começa em modo manual (commit e rollback sob seu controle) e destaca a conexão.
                </span>
              </span>
            </label>
          </div>

          {/* Feedback de Teste de Conexão */}
          <ConnectionTestFeedback testResult={testResult} />

          {/* Botões de Ação */}
          <ConnectionModalFooter
            isTesting={isTesting}
            onTestConnection={onTestConnection}
            onClose={onClose}
          />
        </form>
    </Modal>
  );
};

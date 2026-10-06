import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppSettings, DatabaseConnectionConfig, SqlSnippet } from '../../../../shared/types';
import { DEFAULT_PORTS } from '../../utils/dbPageTypes';

interface UseDatabaseConnectionsParams {
  settingsVersion?: number;
  setSql: React.Dispatch<React.SetStateAction<string>>;
  setCustomSnippets: React.Dispatch<React.SetStateAction<SqlSnippet[]>>;
}

const NEW_CONNECTION_DRAFT: Partial<DatabaseConnectionConfig> = {
  type: 'oracle',
  name: 'Oracle Local',
  host: 'localhost',
  port: 1521,
  database: 'XEPDB1',
  user: 'system',
  password: '',
  oracleMode: 'serviceName',
  oracleThickMode: false,
  oracleClientPath: ''
};

/** Configurações, lista de conexões, conexão ativa e o fluxo do modal de conexão. */
export function useDatabaseConnections({ settingsVersion, setSql, setCustomSnippets }: UseDatabaseConnectionsParams) {
  const [connections, setConnections] = useState<DatabaseConnectionConfig[]>([]);
  const [activeConnectionId, setActiveConnectionId] = useState<string>('');
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingConn, setEditingConn] = useState<Partial<DatabaseConnectionConfig>>({
    type: 'oracle',
    name: 'Oracle Principal',
    host: 'localhost',
    port: 1521,
    database: 'XEPDB1',
    user: 'system',
    password: '',
    oracleMode: 'serviceName'
  });
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; version?: string } | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);

  const activeConnection = useMemo(() => {
    return connections.find((c) => c.id === activeConnectionId) || connections[0] || null;
  }, [connections, activeConnectionId]);

  // Carregar Configurações e Conexões
  const loadSettings = useCallback(async () => {
    if (window.electronAPI?.getSettings) {
      try {
        const st = await window.electronAPI.getSettings();
        setSettings(st);
        const conns = st.databaseConnections || [];
        setConnections(conns);

        if (st.savedSqlSnippets && Array.isArray(st.savedSqlSnippets) && st.savedSqlSnippets.length > 0) {
          setCustomSnippets(st.savedSqlSnippets);
        }

        if (conns.length > 0 && !activeConnectionId) {
          const defaultConn = conns.find((c) => c.isDefault) || conns[0];
          setActiveConnectionId(defaultConn.id);
          if (defaultConn.type === 'oracle') {
            setSql('SELECT 1 FROM DUAL');
          } else {
            setSql('SELECT 1');
          }
        }
      } catch (err) {
        console.error('Erro ao carregar configurações de conexões:', err);
      }
    }
  }, [activeConnectionId, setCustomSnippets, setSql]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings, settingsVersion]);

  const saveConnectionsToSettings = async (newConns: DatabaseConnectionConfig[]) => {
    setConnections(newConns);
    if (window.electronAPI?.saveSettings) {
      await window.electronAPI.saveSettings({ databaseConnections: newConns });
    }
  };

  // Testar Conexão do Formulário
  const handleTestConnection = async () => {
    if (!window.electronAPI?.testDbConnection) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const fullConfig: DatabaseConnectionConfig = {
        id: editingConn.id || 'temp',
        name: editingConn.name || 'Nova Conexão',
        type: editingConn.type || 'oracle',
        host: editingConn.host || 'localhost',
        port: Number(editingConn.port) || DEFAULT_PORTS[editingConn.type || 'oracle'],
        database: editingConn.database || '',
        user: editingConn.user || '',
        password: editingConn.password || '',
        oracleMode: editingConn.oracleMode || 'serviceName',
        oracleClientPath: editingConn.oracleClientPath,
        oracleThickMode: editingConn.oracleThickMode,
        ssl: editingConn.ssl,
        isProduction: editingConn.isProduction
      };

      const res = await window.electronAPI.testDbConnection(fullConfig);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Falha ao executar teste de conexão.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Salvar Conexão do Modal
  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConn.name || !editingConn.host || !editingConn.user) return;

    const fullConfig: DatabaseConnectionConfig = {
      id: editingConn.id || `conn_${Date.now()}`,
      name: editingConn.name.trim(),
      type: editingConn.type || 'oracle',
      host: editingConn.host.trim(),
      port: Number(editingConn.port) || DEFAULT_PORTS[editingConn.type || 'oracle'],
      database: (editingConn.database || '').trim(),
      user: editingConn.user.trim(),
      password: editingConn.password || '',
      hasPassword: editingConn.password ? true : editingConn.hasPassword,
      oracleMode: editingConn.oracleMode || 'serviceName',
      oracleClientPath: editingConn.oracleClientPath?.trim() || undefined,
      oracleThickMode: editingConn.oracleThickMode,
      ssl: editingConn.ssl,
      isDefault: editingConn.isDefault || false,
      isProduction: editingConn.isProduction || false
    };

    let updated: DatabaseConnectionConfig[];
    if (editingConn.id) {
      updated = connections.map((c) => (c.id === editingConn.id ? fullConfig : c));
    } else {
      updated = [...connections, fullConfig];
    }

    if (fullConfig.isDefault) {
      updated = updated.map((c) => ({ ...c, isDefault: c.id === fullConfig.id }));
    }

    await saveConnectionsToSettings(updated);
    setActiveConnectionId(fullConfig.id);
    setIsModalOpen(false);
  };

  const handleDeleteConnection = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta conexão?')) {
      const updated = connections.filter((c) => c.id !== id);
      await saveConnectionsToSettings(updated);
      if (activeConnectionId === id && updated.length > 0) {
        setActiveConnectionId(updated[0].id);
      }
    }
  };

  const handleOpenCreateModal = () => {
    setEditingConn({ ...NEW_CONNECTION_DRAFT });
    setTestResult(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (conn: DatabaseConnectionConfig) => {
    setEditingConn({ ...conn });
    setTestResult(null);
    setIsModalOpen(true);
  };

  return {
    connections,
    activeConnectionId,
    setActiveConnectionId,
    activeConnection,
    settings,
    setSettings,
    isModalOpen,
    setIsModalOpen,
    editingConn,
    setEditingConn,
    testResult,
    isTesting,
    handleTestConnection,
    handleSaveConnection,
    handleDeleteConnection,
    handleOpenCreateModal,
    handleOpenEditModal
  };
}

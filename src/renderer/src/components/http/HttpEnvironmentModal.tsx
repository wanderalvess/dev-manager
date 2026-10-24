import React, { useState } from 'react';
import { Plus, Trash2, ShieldCheck, Lock, RefreshCw, KeyRound, CheckSquare, Square } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { api } from '../../services/apiBridge';
import { showToast } from '../ToastHost';
import { HttpEnvironment, HttpEnvironmentVariable } from '../../../../shared/types';

interface HttpEnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  environments: HttpEnvironment[];
  selectedEnvId: string;
  onSaveEnvironments: (envs: HttpEnvironment[]) => void;
  onSelectEnvironment: (id: string) => void;
  onTokenUpdated?: (token: string) => void;
}

export const HttpEnvironmentModal: React.FC<HttpEnvironmentModalProps> = ({
  isOpen,
  onClose,
  environments,
  selectedEnvId,
  onSaveEnvironments,
  onSelectEnvironment,
  onTokenUpdated
}) => {
  const [envs, setEnvs] = useState<HttpEnvironment[]>(environments);
  const [activeEnvId, setActiveEnvId] = useState<string>(selectedEnvId || environments[0]?.id || '');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  if (!isOpen) return null;

  const currentEnv = envs.find((e) => e.id === activeEnvId) || envs[0];

  const handleAddEnv = () => {
    const newEnv: HttpEnvironment = {
      id: Math.random().toString(36).substring(2, 9),
      name: `Novo Ambiente (${envs.length + 1})`,
      variables: [
        { id: Math.random().toString(36).substring(2, 9), key: 'host', value: 'localhost', enabled: true },
        { id: Math.random().toString(36).substring(2, 9), key: 'port', value: '8181', enabled: true },
        { id: Math.random().toString(36).substring(2, 9), key: 'LOGIN', value: 'PCADMIN', enabled: true },
        { id: Math.random().toString(36).substring(2, 9), key: 'SENHA', value: '', enabled: true, isSecret: true },
        { id: Math.random().toString(36).substring(2, 9), key: 'TOKEN', value: '', enabled: true, isSecret: true }
      ]
    };
    const updated = [...envs, newEnv];
    setEnvs(updated);
    setActiveEnvId(newEnv.id);
    onSaveEnvironments(updated);
  };

  const handleDeleteEnv = (id: string) => {
    if (envs.length <= 1) {
      showToast('Deve haver ao menos um ambiente configurado.', 'info');
      return;
    }
    const filtered = envs.filter((e) => e.id !== id);
    setEnvs(filtered);
    setActiveEnvId(filtered[0]?.id || '');
    onSaveEnvironments(filtered);
  };

  const handleUpdateVariable = (varId: string, field: keyof HttpEnvironmentVariable, val: any) => {
    if (!currentEnv) return;
    const updatedVars = currentEnv.variables.map((v) => (v.id === varId ? { ...v, [field]: val } : v));
    const updatedEnvs = envs.map((e) => (e.id === currentEnv.id ? { ...e, variables: updatedVars } : e));
    setEnvs(updatedEnvs);
    onSaveEnvironments(updatedEnvs);
  };

  const handleAddVariable = () => {
    if (!currentEnv) return;
    const newVar: HttpEnvironmentVariable = {
      id: Math.random().toString(36).substring(2, 9),
      key: '',
      value: '',
      enabled: true
    };
    const updatedVars = [...currentEnv.variables, newVar];
    const updatedEnvs = envs.map((e) => (e.id === currentEnv.id ? { ...e, variables: updatedVars } : e));
    setEnvs(updatedEnvs);
    onSaveEnvironments(updatedEnvs);
  };

  const handleDeleteVariable = (varId: string) => {
    if (!currentEnv) return;
    const updatedVars = currentEnv.variables.filter((v) => v.id !== varId);
    const updatedEnvs = envs.map((e) => (e.id === currentEnv.id ? { ...e, variables: updatedVars } : e));
    setEnvs(updatedEnvs);
    onSaveEnvironments(updatedEnvs);
  };

  const handleWinThorLogin = async () => {
    if (!currentEnv) return;

    const loginVar = currentEnv.variables.find((v) => v.key.toUpperCase() === 'LOGIN');
    const senhaVar = currentEnv.variables.find((v) => v.key.toUpperCase() === 'SENHA');
    const hostVar = currentEnv.variables.find((v) => v.key.toLowerCase() === 'host');
    const portVar = currentEnv.variables.find((v) => v.key.toLowerCase() === 'port');

    if (!loginVar?.value || !senhaVar?.value) {
      showToast('Preencha as variáveis LOGIN e SENHA no ambiente para autenticar.', 'info');
      return;
    }

    const host = hostVar?.value || 'localhost';
    const port = portVar?.value || '8181';
    const loginUrl = `http://${host}:${port}/winthor/autenticacao/v1/login`;

    setIsLoggingIn(true);
    try {
      const res = await api.httpLoginWinThor({
        loginUrl,
        login: loginVar.value,
        senha: senhaVar.value,
        environmentId: currentEnv.id
      });

      if (res.success && res.accessToken) {
        showToast('Login WinThor efetuado! Variável TOKEN atualizada com sucesso.', 'success');
        if (onTokenUpdated) onTokenUpdated(res.accessToken);

        // Atualiza a variável no estado local
        const tokenVar = currentEnv.variables.find((v) => v.key.toUpperCase() === 'TOKEN');
        if (tokenVar) {
          handleUpdateVariable(tokenVar.id, 'value', res.accessToken);
        } else {
          handleAddVariable();
        }
      } else {
        showToast(res.error || 'Falha na autenticação do WinThor.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Erro inesperado ao conectar na API de autenticação.', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Gerenciar Ambientes & Variáveis" size="xl">
      <div className="flex gap-4 h-[420px] text-xs">
        {/* Painel lateral de ambientes */}
        <div className="w-52 border-r border-border pr-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-muted-foreground uppercase text-xs tracking-wider">Ambientes</span>
              <button
                type="button"
                onClick={handleAddEnv}
                className="p-1 hover:bg-muted rounded text-primary transition-colors"
                title="Novo Ambiente"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              {envs.map((env) => (
                <div
                  key={env.id}
                  onClick={() => {
                    setActiveEnvId(env.id);
                    onSelectEnvironment(env.id);
                  }}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition-colors ${
                    env.id === currentEnv?.id ? 'bg-primary/20 text-primary font-medium' : 'hover:bg-muted/60 text-foreground'
                  }`}
                >
                  <span className="truncate">{env.name}</span>
                  {envs.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEnv(env.id);
                      }}
                      className="p-0.5 text-muted-foreground hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Variáveis do Ambiente Ativo */}
        <div className="flex-1 flex flex-col justify-between overflow-hidden">
          {currentEnv && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <input
                  type="text"
                  value={currentEnv.name}
                  onChange={(e) => {
                    const updated = envs.map((env) => (env.id === currentEnv.id ? { ...env, name: e.target.value } : env));
                    setEnvs(updated);
                    onSaveEnvironments(updated);
                  }}
                  className="font-semibold text-sm bg-transparent border-b border-transparent hover:border-border focus:border-primary px-1 text-foreground focus:outline-none"
                />

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleWinThorLogin}
                    disabled={isLoggingIn}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded text-xs font-medium transition-colors"
                    title="Faz POST /winthor/autenticacao/v1/login e atualiza a variável TOKEN"
                  >
                    {isLoggingIn ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Lock className="w-3 h-3" />}
                    <span>Autenticar no WinThor</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddVariable}
                    className="flex items-center gap-1 px-2 py-1 bg-muted hover:bg-muted/80 rounded border border-border text-foreground transition-colors"
                  >
                    <Plus className="w-3 h-3 text-primary" />
                    <span>Variável</span>
                  </button>
                </div>
              </div>

              {/* Tabela de Variáveis */}
              <div className="flex-1 overflow-y-auto pt-3 space-y-2">
                {currentEnv.variables.map((v) => (
                  <div key={v.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateVariable(v.id, 'enabled', !v.enabled)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {v.enabled ? <CheckSquare className="w-3.5 h-3.5 text-primary" /> : <Square className="w-3.5 h-3.5 text-muted-foreground" />}
                    </button>
                    <input
                      type="text"
                      value={v.key}
                      onChange={(e) => handleUpdateVariable(v.id, 'key', e.target.value)}
                      placeholder="Nome (ex: host, LOGIN)"
                      className="w-1/3 px-2 py-1 bg-background border border-border rounded font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <input
                      type={v.isSecret ? 'password' : 'text'}
                      value={v.value}
                      onChange={(e) => handleUpdateVariable(v.id, 'value', e.target.value)}
                      placeholder="Valor"
                      className="flex-1 px-2 py-1 bg-background border border-border rounded font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteVariable(v.id)}
                      className="p-1 text-muted-foreground hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-primary text-primary-foreground font-medium rounded text-xs hover:opacity-90 transition-opacity"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

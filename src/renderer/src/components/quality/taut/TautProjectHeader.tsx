import React from 'react';
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Database,
  Zap,
  Settings
} from 'lucide-react';
import type { TautProjectStatus, TautSpecSummary } from '../../../../../shared/types';
import { countSpecTests } from '../../../utils/tautPanelUtils';

interface TautProjectHeaderProps {
  projectStatus: TautProjectStatus | null;
  specs: TautSpecSummary[];
  loading: boolean;
  syncingEnv: boolean;
  onSyncEnv: () => void;
  onReload: () => void;
  onNavigateToSettings?: () => void;
}

export const TautProjectHeader: React.FC<TautProjectHeaderProps> = ({
  projectStatus,
  specs,
  loading,
  syncingEnv,
  onSyncEnv,
  onReload,
  onNavigateToSettings
}) => (
  <div className="p-4 rounded-xl bg-card border border-border shadow-2xs space-y-3">
    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
      <div className="space-y-1">
        <div className="flex items-center space-x-2">
          <Zap className="w-5 h-5 text-success" />
          <h2 className="text-sm font-semibold text-foreground">
            Testes Automatizados (Cypress / TAUT) — Automação de API &amp; Integração
          </h2>
          {projectStatus?.exists ? (
            <span className="px-2 py-0.5 rounded text-2xs font-mono font-bold bg-success/10 text-success border border-success/20">
              Online
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-2xs font-mono font-bold bg-danger/10 text-danger border border-danger/20">
              Não Localizado
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground font-mono truncate max-w-2xl">
          Diretório: {projectStatus?.projectPath || 'Detectando...'}
        </p>
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        {onNavigateToSettings && (
          <button
            type="button"
            onClick={onNavigateToSettings}
            className="px-3 py-1.5 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/70 text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
            title="Configurar diretório do projeto TAUT nas Configurações"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Configurar Pasta</span>
          </button>
        )}

        <button
          type="button"
          onClick={onSyncEnv}
          disabled={syncingEnv || !projectStatus?.exists}
          className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 hover:border-primary/50 text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
          title="Gera ou atualiza as variáveis de ambiente (.env) do TAUT com a conexão Oracle ativa no Hub Manager"
        >
          <Database className={`w-3.5 h-3.5 ${syncingEnv ? 'animate-spin' : ''}`} />
          <span>Sincronizar .env com Oracle Ativo</span>
        </button>

        <button
          type="button"
          onClick={onReload}
          disabled={loading}
          className="p-2 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/70 transition cursor-pointer"
          title="Recarregar integridade do projeto" aria-label="Recarregar integridade do projeto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>

    {/* Alerta quando o projeto não for localizado */}
    {!projectStatus?.exists && (
      <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning text-xs flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            O repositório de <strong>testes automatizados (Cypress)</strong> não foi encontrado no caminho configurado nem na pasta de projetos.
          </span>
        </div>
        {onNavigateToSettings && (
          <button
            type="button"
            onClick={onNavigateToSettings}
            className="px-2.5 py-1 rounded bg-warning/20 hover:bg-warning/30 font-semibold text-warning transition cursor-pointer shrink-0"
          >
            Definir nas Configurações →
          </button>
        )}
      </div>
    )}

    {/* Badges de Verificação Técnica do Projeto */}
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 pt-2 border-t border-border/60 text-xs">
      <div className="p-2 rounded-lg bg-muted/30 border border-border/40 space-y-0.5">
        <span className="text-2xs text-muted-foreground">Framework E2E</span>
        <div className="font-semibold text-foreground flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${projectStatus?.cypressVersion ? 'bg-success' : 'bg-muted-foreground/40'}`} />
          <span>{projectStatus?.cypressVersion ? `Cypress ${projectStatus.cypressVersion}` : 'Cypress não detectado'}</span>
        </div>
      </div>

      <div className="p-2 rounded-lg bg-muted/30 border border-border/40 space-y-0.5">
        <span className="text-2xs text-muted-foreground">Arquivo de Configuração</span>
        <div className="font-semibold text-foreground flex items-center gap-1">
          {projectStatus?.hasCypressConfig ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              <span>cypress.config.ts</span>
            </>
          ) : (
            <>
              <XCircle className="w-3.5 h-3.5 text-danger" />
              <span>Ausente</span>
            </>
          )}
        </div>
      </div>

      <div className="p-2 rounded-lg bg-muted/30 border border-border/40 space-y-0.5">
        <span className="text-2xs text-muted-foreground">Banco Oracle (.env)</span>
        <div className="font-semibold text-foreground truncate" title={projectStatus?.envVariables?.oracleConnectString || 'Não configurado'}>
          {projectStatus?.envVariables?.hasOracleConnectString ? (
            <span className="text-success font-mono text-2xs">
              {projectStatus.envVariables.oracleConnectString}
            </span>
          ) : (
            <span className="text-warning">Pendente</span>
          )}
        </div>
      </div>

      <div className="p-2 rounded-lg bg-muted/30 border border-border/40 space-y-0.5">
        <span className="text-2xs text-muted-foreground">URL Base WTA (.env)</span>
        <div className="font-semibold text-foreground truncate" title={projectStatus?.envVariables?.baseUrl || 'Não configurado'}>
          <span className="font-mono text-2xs text-foreground">
            {projectStatus?.envVariables?.baseUrl || 'http://localhost:8889'}
          </span>
        </div>
      </div>

      <div className="p-2 rounded-lg bg-muted/30 border border-border/40 space-y-0.5 col-span-2 sm:col-span-4 lg:col-span-1">
        <span className="text-2xs text-muted-foreground">Suítes Cadastradas</span>
        <div className="font-semibold text-foreground">
          {specs.length} specs ({countSpecTests(specs)} testes)
        </div>
      </div>
    </div>
  </div>
);

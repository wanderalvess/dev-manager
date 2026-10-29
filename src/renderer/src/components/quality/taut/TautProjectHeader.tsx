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
}) => {
  // null = ainda detectando: não acusa "Não localizado" antes da primeira resposta
  const notFound = projectStatus !== null && !projectStatus.exists;
  return (
    <div className="p-4 rounded-[14px] bg-card border border-border shadow-xs space-y-3">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Zap className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">
              Testes Automatizados (Cypress / TAUT) — Automação de API &amp; Integração
            </h2>
            {projectStatus === null ? (
              <span className="px-2.5 py-0.5 rounded-full text-[13px] font-medium bg-muted text-muted-foreground">
                Detectando…
              </span>
            ) : projectStatus.exists ? (
              <span className="px-2.5 py-0.5 rounded-full text-[13px] font-medium bg-success/10 text-success">
                Online
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[13px] font-medium bg-warning/10 text-warning">
                Não localizado
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground font-mono truncate max-w-2xl">
            Diretório: {projectStatus?.projectPath || 'Detectando...'}
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {onNavigateToSettings && !notFound && (
            <button
              type="button"
              onClick={onNavigateToSettings}
              className="px-3 h-10 rounded-[10px] bg-card hover:bg-muted text-foreground border border-border text-sm font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Configurar diretório do projeto TAUT nas Configurações"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Configurar Pasta</span>
            </button>
          )}

          {!notFound && (
            <button
              type="button"
              onClick={onSyncEnv}
              disabled={syncingEnv || !projectStatus?.exists}
              className="px-4 h-10 rounded-[10px] bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Gera ou atualiza as variáveis de ambiente (.env) do TAUT com a conexão Oracle ativa no Hub Manager"
            >
              <Database className={`w-3.5 h-3.5 ${syncingEnv ? 'animate-spin' : ''}`} />
              <span>Sincronizar .env com Oracle Ativo</span>
            </button>
          )}

          <button
            type="button"
            onClick={onReload}
            disabled={loading}
            className="h-10 w-10 flex items-center justify-center rounded-[10px] bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors cursor-pointer"
            title="Recarregar integridade do projeto" aria-label="Recarregar integridade do projeto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Projeto não localizado: um único caminho de saída, em vez de controles que não funcionariam */}
      {notFound && (
        <div className="p-4 rounded-xl bg-warning/10 text-foreground text-[13px] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-warning" />
            <div className="space-y-1">
              <p className="font-semibold">Projeto de testes Cypress (TAUT) não encontrado</p>
              <p className="text-muted-foreground">
                Aponte a pasta do repositório em Configurações → Qualidade &amp; QA. Execução, cobertura, catálogo de
                specs e intake de CSV aparecem aqui assim que o projeto for localizado.
              </p>
            </div>
          </div>
          {onNavigateToSettings && (
            <button
              type="button"
              onClick={onNavigateToSettings}
              className="px-4 h-10 rounded-[10px] bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Configurar pasta do TAUT</span>
            </button>
          )}
        </div>
      )}

      {/* Badges de Verificação Técnica do Projeto */}
      {!notFound && (
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
      )}
    </div>
  );
};

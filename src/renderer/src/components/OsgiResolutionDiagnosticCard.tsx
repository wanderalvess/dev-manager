import React from 'react';
import {
  AlertTriangle,
  Play,
  Download,
  ListTree,
  X,
  Copy,
  Check,
  Package
} from 'lucide-react';
import { OsgiResolutionDiagnosticSummary } from '../../../shared/types';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';

interface OsgiResolutionDiagnosticCardProps {
  diagnostic: OsgiResolutionDiagnosticSummary;
  isDeploying?: boolean;
  runningStepId?: string | null;
  onExecuteMatchedProfile?: (profileIdOrName: string) => void;
  onInstallReleaseFeature?: () => void;
  onRunSuggestedDiagnostic?: () => void;
  onDismiss: () => void;
}

export const OsgiResolutionDiagnosticCard: React.FC<OsgiResolutionDiagnosticCardProps> = ({
  diagnostic,
  isDeploying = false,
  runningStepId = null,
  onExecuteMatchedProfile,
  onInstallReleaseFeature,
  onRunSuggestedDiagnostic,
  onDismiss
}) => {
  const { copy, copiedKey } = useCopyToClipboard(2000);
  const isCopied = copiedKey === 'missing-item';
  const isBusy = isDeploying || runningStepId !== null;

  return (
    <div
      className="mb-3 rounded-xl bg-[#0a0f1d] border border-amber-500/35 border-l-4 border-l-amber-500 shadow-md text-slate-200 overflow-hidden animate-fade-in"
      role="alert"
      aria-label="Diagnóstico de Resolução OSGi"
    >
      {/* Topo / Cabeçalho do Card */}
      <div className="px-3.5 py-2.5 bg-[#0e1627] border-b border-slate-800/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-100 tracking-tight">
                Dependência OSGi Não Resolvida
              </span>
              <span className="text-2xs px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono font-semibold uppercase tracking-wider">
                {diagnostic.requirementType}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              Falha de resolução no bundle <span className="font-mono text-slate-200 font-semibold">{diagnostic.failingBundle}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition cursor-pointer shrink-0"
          title="Dispensar aviso de diagnóstico"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Grid de Telemetria Técnica */}
      <div className="p-3.5 space-y-2.5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {/* Card 1: Requisito Ausente */}
          <div className="p-2.5 rounded-lg bg-[#080d17] border border-slate-800 flex flex-col justify-between space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-2xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                Pacote / Requisito Faltante:
              </span>
              <button
                type="button"
                onClick={() => copy(diagnostic.missingItem, 'missing-item')}
                className="text-2xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition font-mono cursor-pointer"
                title="Copiar nome do pacote ausente"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>

            <div className="font-mono text-xs text-amber-300 font-semibold break-all select-all bg-slate-950/60 p-2 rounded border border-slate-800/80">
              {diagnostic.missingItem}
            </div>

            {diagnostic.versionRangeDesc && (
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 pt-0.5">
                <span className="text-slate-400 text-2xs uppercase font-bold">Faixa Exigida:</span>
                <span className="text-sky-300 font-semibold">{diagnostic.versionRangeDesc}</span>
              </div>
            )}
          </div>

          {/* Card 2: Origem POM.XML */}
          <div className="p-2.5 rounded-lg bg-[#080d17] border border-slate-800 flex flex-col justify-between space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-2xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                Módulo Maven Declarado (pom.xml):
              </span>
              {diagnostic.matchedProfileName && (
                <span className="text-2xs px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-mono font-semibold">
                  Perfil Mapeado
                </span>
              )}
            </div>

            {diagnostic.matchedPomDependency ? (
              <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80 space-y-1">
                <div className="font-mono text-xs font-semibold text-emerald-300 break-all select-all flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{diagnostic.matchedPomDependency.artifactId}</span>
                </div>
                <div className="flex items-center justify-between text-2xs font-mono text-slate-400">
                  <span className="truncate">{diagnostic.matchedPomDependency.groupId}</span>
                  <span className="text-emerald-400 font-bold bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
                    v{diagnostic.matchedPomDependency.version}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/80 text-[11px] text-slate-400 font-mono italic">
                Dependência transitiva (não encontrada no pom.xml direto do projeto).
              </div>
            )}

            {diagnostic.matchedProjectName && (
              <div className="text-2xs font-mono text-slate-400 flex items-center gap-1 truncate pt-0.5">
                <span className="text-slate-400 uppercase font-bold">Projeto Local:</span>
                <span className="text-slate-300 truncate">{diagnostic.matchedProjectName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Alerta de Divergência de Versão (Release vs Snapshot) */}
        {diagnostic.versionMismatchWarning && (
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-300/90 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-snug">
              {diagnostic.versionMismatchWarning}
            </div>
          </div>
        )}

        {/* Faixa Inferior de Ações Rápidas em 1 Clique */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {diagnostic.matchedProfileName && onExecuteMatchedProfile && (
              <button
                type="button"
                onClick={() => onExecuteMatchedProfile(diagnostic.matchedProfileId || diagnostic.matchedProfileName!)}
                disabled={isBusy}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-40"
                title={`Disparar imediatamente o perfil de deploy "${diagnostic.matchedProfileName}" para construir e registrar a versão necessária no Karaf`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Executar Perfil "{diagnostic.matchedProfileName}"</span>
                <span className="ml-1 text-2xs font-mono bg-emerald-950/60 text-emerald-200 border border-emerald-400/40 px-1 py-0.2 rounded font-semibold uppercase tracking-wider">
                  Recomendado
                </span>
              </button>
            )}

            {diagnostic.suggestedKarafCommands?.installCommand && onInstallReleaseFeature && (
              <button
                type="button"
                onClick={onInstallReleaseFeature}
                disabled={isBusy}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-100 font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-40"
                title="Adicionar repositório e instalar a release remota via comandos Karaf (feature:repo-add e feature:install)"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span>Instalar Release do Nexus</span>
              </button>
            )}

            {diagnostic.suggestedKarafCommands?.diagnosticCommand && onRunSuggestedDiagnostic && (
              <button
                type="button"
                onClick={onRunSuggestedDiagnostic}
                disabled={isBusy}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-mono text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                title={`Executar diagnóstico ${diagnostic.suggestedKarafCommands.diagnosticCommand} no shell Karaf`}
              >
                <ListTree className="w-3.5 h-3.5 text-slate-400" />
                <span>{diagnostic.suggestedKarafCommands.diagnosticCommand}</span>
              </button>
            )}
          </div>

          <span className="text-2xs text-slate-400 font-mono hidden lg:inline">
            Clique em uma ação para remediar a falha
          </span>
        </div>
      </div>
    </div>
  );
};

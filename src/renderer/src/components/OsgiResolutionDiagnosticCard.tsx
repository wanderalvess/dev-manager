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
import { DeployProfile, OsgiResolutionDiagnosticSummary } from '../../../shared/types';
import { OsgiMatchedProfileSteps } from './OsgiMatchedProfileSteps';
import { OsgiVersionConflictPanel } from './OsgiVersionConflictPanel';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { buildOsgiDiagnosticExplanation } from '../utils/osgiDiagnosticUtils';

interface OsgiResolutionDiagnosticCardProps {
  diagnostic: OsgiResolutionDiagnosticSummary;
  isDeploying?: boolean;
  runningStepId?: string | null;
  /** Perfil cadastrado que o diagnóstico associou à dependência; habilita a escolha de etapas. */
  matchedProfile?: DeployProfile;
  onExecuteMatchedProfile?: (profileIdOrName: string) => void;
  onExecuteMatchedSteps?: (profileIdOrName: string, stepIds: string[]) => void;
  /** Divergência de versão instalada x exigida: pasta do projeto que falhou e atalhos para as saídas possíveis. */
  contextProjectPath?: string;
  onRunActiveProfile?: () => Promise<boolean> | void;
  onOpenBundles?: () => void;
  onOpenCatalog?: () => void;
  onInstallReleaseFeature?: () => void;
  onRunSuggestedDiagnostic?: () => void;
  onDismiss: () => void;
}

export const OsgiResolutionDiagnosticCard: React.FC<OsgiResolutionDiagnosticCardProps> = ({
  diagnostic,
  isDeploying = false,
  runningStepId = null,
  matchedProfile,
  onExecuteMatchedProfile,
  onExecuteMatchedSteps,
  contextProjectPath = '',
  onRunActiveProfile,
  onOpenBundles,
  onOpenCatalog,
  onInstallReleaseFeature,
  onRunSuggestedDiagnostic,
  onDismiss
}) => {
  const { copy, copiedKey } = useCopyToClipboard(2000);
  const isCopied = copiedKey === 'missing-item';
  const isBusy = isDeploying || runningStepId !== null;
  const explanation = buildOsgiDiagnosticExplanation(diagnostic);

  return (
    <div
      className="mb-3 rounded-xl bg-card border border-warning/35 border-l-4 border-l-amber-500 shadow-md text-foreground overflow-hidden animate-fade-in shrink-0"
      role="alert"
      aria-label="Diagnóstico de Resolução OSGi"
    >
      {/* Topo / Cabeçalho do Card */}
      <div className="px-3.5 py-2.5 bg-muted/50 border-b border-border/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1 rounded-md bg-warning/15 border border-warning/30 text-warning shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-foreground tracking-tight">
                Dependência OSGi Não Resolvida
              </span>
              <span className="text-2xs px-1.5 py-0.5 rounded bg-warning/15 border border-warning/30 text-warning font-mono font-semibold uppercase tracking-wider">
                {diagnostic.requirementType}
              </span>
            </div>
            <p className="text-2xs text-muted-foreground truncate mt-0.5">
              Falha de resolução no bundle <span className="font-mono text-foreground font-semibold">{diagnostic.failingBundle}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition cursor-pointer shrink-0"
          title="Dispensar aviso de diagnóstico"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Corpo do Diagnóstico */}
      <div className="p-3.5 space-y-2.5">
        {/* Explicação Clara: Causa e Solução */}
        <div className="p-3 rounded-lg bg-background/70 border border-border/90 space-y-2 text-xs">
          <div className="flex items-start gap-2">
            <span className="font-bold text-amber-500 uppercase font-mono text-2xs tracking-wider shrink-0 mt-0.5">
              Causa:
            </span>
            <span className="text-foreground/90 leading-relaxed">
              O bundle <strong className="font-mono text-foreground font-semibold">{diagnostic.failingBundle}</strong> exige que o {explanation.requirementLabel} <strong className="font-mono text-warning font-semibold">{diagnostic.missingItem}</strong>{diagnostic.versionRangeDesc ? ` (faixa ${diagnostic.versionRangeDesc})` : ''} esteja ativo no Karaf, mas ele ainda não foi publicado ou iniciado no contêiner local.
            </span>
          </div>

          <div className="flex items-start gap-2 pt-2 border-t border-border/50">
            <span className="font-bold text-emerald-500 uppercase font-mono text-2xs tracking-wider shrink-0 mt-0.5">
              Solução:
            </span>
            <span className="text-foreground/90 leading-relaxed font-medium">
              {explanation.solutionText}
            </span>
          </div>
        </div>

        {/* Grid de Telemetria Técnica */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {/* Card 1: Requisito Ausente */}
          <div className="p-2.5 rounded-lg bg-background/60 border border-border flex flex-col justify-between space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-2xs font-mono uppercase tracking-wider text-muted-foreground font-bold">
                Pacote / Requisito Faltante:
              </span>
              <button
                type="button"
                onClick={() => copy(diagnostic.missingItem, 'missing-item')}
                className="text-2xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition font-mono cursor-pointer"
                title="Copiar nome do pacote ausente" aria-label="Copiar nome do pacote ausente"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3 h-3 text-success" />
                    <span className="text-success font-semibold">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>

            <div className="font-mono text-xs text-warning font-semibold break-all select-all bg-background/60 p-2 rounded border border-border/80">
              {diagnostic.missingItem}
            </div>

            {diagnostic.versionRangeDesc && (
              <div className="flex items-center gap-1.5 text-2xs font-mono text-muted-foreground pt-0.5">
                <span className="text-muted-foreground text-2xs uppercase font-bold">Faixa Exigida:</span>
                <span className="text-info font-semibold">{diagnostic.versionRangeDesc}</span>
              </div>
            )}
          </div>

          {/* Card 2: Origem POM.XML */}
          <div className="p-2.5 rounded-lg bg-background/60 border border-border flex flex-col justify-between space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-2xs font-mono uppercase tracking-wider text-muted-foreground font-bold">
                Módulo Maven Declarado (pom.xml):
              </span>
              {diagnostic.matchedProfileName && (
                <span className="text-2xs px-1.5 py-0.2 rounded bg-success/10 text-success border border-success/25 font-mono font-semibold">
                  Perfil Mapeado
                </span>
              )}
            </div>

            {diagnostic.matchedPomDependency ? (
              <div className="bg-background/60 p-2 rounded border border-border/80 space-y-1">
                <div className="font-mono text-xs font-semibold text-success break-all select-all flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-success shrink-0" />
                  <span>{diagnostic.matchedPomDependency.artifactId}</span>
                </div>
                <div className="flex items-center justify-between text-2xs font-mono text-muted-foreground">
                  <span className="truncate">{diagnostic.matchedPomDependency.groupId}</span>
                  <span className="text-success font-bold bg-success/40 px-1.5 py-0.5 rounded border border-success/20 shrink-0">
                    v{diagnostic.matchedPomDependency.version}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-background/60 p-2.5 rounded border border-border/80 text-2xs text-muted-foreground font-mono italic">
                Dependência transitiva (não encontrada no pom.xml direto do projeto).
              </div>
            )}

            {diagnostic.matchedProjectName && (
              <div className="text-2xs font-mono text-muted-foreground flex items-center gap-1 truncate pt-0.5">
                <span className="text-muted-foreground uppercase font-bold">Projeto Local:</span>
                <span className="text-foreground truncate font-medium">{diagnostic.matchedProjectName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Alerta de Divergência de Versão (Release vs Snapshot) */}
        {diagnostic.versionMismatchWarning && (
          <div className="p-2 rounded-lg bg-warning/10 border border-warning/25 text-2xs text-warning/90 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
            <div className="leading-snug">
              {diagnostic.versionMismatchWarning}
            </div>
          </div>
        )}

        <OsgiVersionConflictPanel
          diagnostic={diagnostic}
          contextProjectPath={contextProjectPath}
          disabled={isBusy}
          onRunActiveProfile={onRunActiveProfile}
          onOpenBundles={onOpenBundles}
          onOpenCatalog={onOpenCatalog}
        />

        {matchedProfile && onExecuteMatchedSteps && matchedProfile.steps.length > 1 && (
          <OsgiMatchedProfileSteps
            profile={matchedProfile}
            disabled={isBusy}
            onExecute={(stepIds) => onExecuteMatchedSteps(matchedProfile.id, stepIds)}
          />
        )}

        {/* Faixa Inferior de Ações Rápidas em 1 Clique */}
        <div className="pt-2 border-t border-border/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {diagnostic.matchedProfileName && onExecuteMatchedProfile && (
              <button
                type="button"
                onClick={() => onExecuteMatchedProfile(diagnostic.matchedProfileId || diagnostic.matchedProfileName!)}
                disabled={isBusy}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all duration-150 cursor-pointer disabled:opacity-50"
                title={`Disparar imediatamente o perfil de deploy "${diagnostic.matchedProfileName}" para construir e registrar a versão necessária no Karaf`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Executar Perfil "{diagnostic.matchedProfileName}"</span>
                <span className="ml-1 text-2xs font-mono bg-black/25 text-white border border-white/20 px-1 py-0.2 rounded font-semibold uppercase tracking-wider">
                  Recomendado
                </span>
              </button>
            )}

            {diagnostic.suggestedKarafCommands?.installCommand && onInstallReleaseFeature && (
              <button
                type="button"
                onClick={onInstallReleaseFeature}
                disabled={isBusy}
                className="px-3 py-1.5 rounded-lg bg-muted hover:bg-muted active:bg-card border border-border hover:border-border text-foreground font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                title="Adicionar repositório e instalar a release remota via comandos Karaf (feature:repo-add e feature:install)"
              >
                <Download className="w-3.5 h-3.5 text-info" />
                <span>Instalar Release do Nexus</span>
              </button>
            )}

            {diagnostic.suggestedKarafCommands?.diagnosticCommand && onRunSuggestedDiagnostic && (
              <button
                type="button"
                onClick={onRunSuggestedDiagnostic}
                disabled={isBusy}
                className="px-2.5 py-1.5 rounded-lg bg-card/80 hover:bg-muted border border-border hover:border-border text-muted-foreground hover:text-foreground font-mono text-2xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                title={`Executar diagnóstico ${diagnostic.suggestedKarafCommands.diagnosticCommand} no shell Karaf`}
              >
                <ListTree className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{diagnostic.suggestedKarafCommands.diagnosticCommand}</span>
              </button>
            )}
          </div>

          <span className="text-2xs text-muted-foreground font-mono hidden lg:inline">
            Clique em uma ação para remediar a falha
          </span>
        </div>
      </div>
    </div>
  );
};

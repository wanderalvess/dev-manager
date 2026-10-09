import React from 'react';
import { UploadCloud, Package, ArrowRight, CheckCircle2, Filter, RotateCw } from 'lucide-react';

export const KarafDeployHistoryLoading: React.FC = () => (
  <div className="h-64 flex flex-col items-center justify-center text-xs text-muted-foreground space-y-2">
    <RotateCw className="w-6 h-6 animate-spin text-sky-400" />
    <span>Sincronizando auditoria de deploys do Karaf...</span>
  </div>
);

interface KarafDeployHistoryBlueprintProps {
  onInstall: () => void;
}

/** Estado vazio: blueprint do pipeline OSGi. */
export const KarafDeployHistoryBlueprint: React.FC<KarafDeployHistoryBlueprintProps> = ({ onInstall }) => (
  <div className="h-full min-h-[360px] flex flex-col items-center justify-center p-6 text-center">
    <div className="w-full max-w-lg p-6 rounded-xl bg-card/90 border border-border shadow-md relative">
      {/* Pipeline OSGi Diagram */}
      <div className="flex items-center justify-center gap-2 mb-5 font-mono text-2xs text-muted-foreground">
        <div className="px-2.5 py-1.5 rounded-lg bg-muted/80 border border-border/60 flex items-center gap-1.5 text-foreground">
          <Package className="w-3 h-3 text-sky-400" />
          <span>Maven JAR</span>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
        <div className="px-2.5 py-1.5 rounded-lg bg-muted/80 border border-border/60 flex items-center gap-1.5 text-foreground">
          <UploadCloud className="w-3 h-3 text-sky-400" />
          <span>Hot-Deploy</span>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
        <div className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1.5 text-emerald-400">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>Active OSGi</span>
        </div>
      </div>

      <h4 className="text-base font-bold text-foreground mb-1.5">
        Nenhum Deploy Registrado Nesta Sessão
      </h4>
      <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed mb-6">
        Cada compilação e deploy disparado através da interface ou por agentes MCP (<code className="text-sky-400 font-mono text-2xs">karaf_deploy_feature</code>) será gravado aqui com telemetria detalhada de duração, coordenadas Maven e diagnóstico de falhas.
      </p>

      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={onInstall}
          className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-2 cursor-pointer active:scale-95"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Instalar Bundle / Nova Versão</span>
        </button>
      </div>
    </div>
  </div>
);

interface KarafDeployHistoryNoResultsProps {
  onClearFilters: () => void;
}

export const KarafDeployHistoryNoResults: React.FC<KarafDeployHistoryNoResultsProps> = ({ onClearFilters }) => (
  <div className="py-16 text-center text-xs text-muted-foreground space-y-2">
    <Filter className="w-8 h-8 text-muted-foreground mx-auto mb-1" />
    <p className="text-muted-foreground font-medium">Nenhum registro encontrado para os critérios selecionados.</p>
    <p className="text-2xs text-muted-foreground">Tente ajustar o termo da busca ou alterar os filtros de status.</p>
    <button
      type="button"
      onClick={onClearFilters}
      className="mt-2 px-3 py-1 bg-muted hover:bg-muted border border-border rounded-lg text-2xs text-muted-foreground transition cursor-pointer"
    >
      Limpar Filtros
    </button>
  </div>
);

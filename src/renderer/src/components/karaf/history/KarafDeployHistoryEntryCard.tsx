import React from 'react';
import {
  CheckCircle,
  XCircle,
  Copy,
  Check,
  UploadCloud,
  Sparkles,
  Terminal,
  Clock,
  Activity,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { KarafDeployHistoryEntry } from '../../../../../shared/types';
import { buildKarafDeployMvnCoords } from '../../../utils/karafDeployHistoryUtils';

interface KarafDeployHistoryEntryCardProps {
  entry: KarafDeployHistoryEntry;
  isExpanded: boolean;
  isCopied: boolean;
  onToggleExpanded: () => void;
  onCopy: (coords: string) => void;
  onUseInInstaller?: (coords: string, version?: string) => void;
}

export const KarafDeployHistoryEntryCard: React.FC<KarafDeployHistoryEntryCardProps> = ({
  entry,
  isExpanded,
  isCopied,
  onToggleExpanded,
  onCopy,
  onUseInInstaller
}) => {
  const mvnCoords = buildKarafDeployMvnCoords(entry);

  return (
    <div
      className={`p-3.5 rounded-xl border transition-all duration-200 ${
        entry.success
          ? 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60'
          : 'border-rose-900/40 bg-rose-950/15 hover:border-rose-800/60 hover:bg-rose-950/25'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Status Pill */}
          <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
            entry.success
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
          }`}>
            {entry.success ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
          </div>

          {/* Info Principal */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-100 truncate" title={entry.artifactId || entry.projectName || entry.featureInstall}>
                {entry.artifactId || entry.projectName || entry.featureInstall}
              </span>

              {entry.version && (
                <span className="text-2xs font-mono text-sky-400 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded font-semibold">
                  v{entry.version}
                </span>
              )}

              {/* Trigger Tag */}
              <span className={`text-2xs uppercase font-bold tracking-wider px-2 py-0.5 rounded flex items-center gap-1 border ${
                entry.trigger === 'mcp'
                  ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              }`}>
                {entry.trigger === 'mcp' ? (
                  <>
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>MCP Agent</span>
                  </>
                ) : (
                  <>
                    <Terminal className="w-2.5 h-2.5" />
                    <span>Console UI</span>
                  </>
                )}
              </span>

              {/* Status Tag */}
              <span className={`text-2xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                entry.success
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-rose-500/15 text-rose-400'
              }`}>
                {entry.success ? 'Sucesso' : 'Falha'}
              </span>
            </div>

            {/* Coordenadas Maven / Feature */}
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <code className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800/80 truncate max-w-md select-all">
                {mvnCoords}
              </code>

              {/* Botão Copiar Coordenadas */}
              <button
                type="button"
                onClick={() => onCopy(mvnCoords)}
                className="p-1 px-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-2xs flex items-center gap-1 border border-slate-700 transition cursor-pointer"
                title="Copiar coordenadas Maven"
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

              {/* Botão para abrir no Instalador */}
              {onUseInInstaller && (
                <button
                  type="button"
                  onClick={() => onUseInInstaller(mvnCoords, entry.version)}
                  className="p-1 px-1.5 rounded bg-slate-800/60 hover:bg-slate-800 text-sky-400 hover:text-sky-300 text-2xs flex items-center gap-1 border border-slate-700/60 transition cursor-pointer"
                  title="Reutilizar coordenadas para novo deploy"
                >
                  <UploadCloud className="w-3 h-3" />
                  <span>Usar no Instalador</span>
                </button>
              )}
            </div>

            {/* Mensagem de Erro Expandível */}
            {!entry.success && entry.message && (
              <div className="mt-2.5">
                <button
                  type="button"
                  onClick={onToggleExpanded}
                  className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1.5 cursor-pointer"
                >
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  <span>{isExpanded ? 'Ocultar diagnóstico da falha' : 'Ver diagnóstico detalhado da falha'}</span>
                </button>

                {isExpanded && (
                  <div className="mt-2 p-2.5 rounded-lg bg-black/60 border border-rose-900/60 text-[11px] font-mono text-rose-300 whitespace-pre-wrap wrap-break-word max-h-40 overflow-y-auto">
                    {entry.message}
                  </div>
                )}
              </div>
            )}

            {/* Metadados */}
            <div className="flex items-center gap-3 mt-2 text-2xs text-slate-500 font-mono">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                {new Date(entry.startedAt).toLocaleString('pt-BR')}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3 text-slate-400" />
                {(entry.durationMs / 1000).toFixed(2)}s duração
              </span>
              {entry.repoUrl && (
                <>
                  <span>•</span>
                  <span className="truncate max-w-[200px]" title={entry.repoUrl}>
                    {entry.repoUrl}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

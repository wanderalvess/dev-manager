import React from 'react';
import { X, Server, Info, Copy, Check, Download, RotateCw } from 'lucide-react';
import type { Routine801Feature } from '../../../../shared/types';
import type { buildKarafInstallCommandsUi, findRepositoryForFeatureUi } from '../../utils/routine801UiUtils';
import type { Routine801Tab } from '../../utils/routine801ModalUtils';

interface Routine801InspectorProps {
  feature: Routine801Feature;
  effectiveFeature: Routine801Feature | null;
  customVersion: string;
  repo: ReturnType<typeof findRepositoryForFeatureUi>;
  commands: ReturnType<typeof buildKarafInstallCommandsUi> | null;
  copiedKey: string | null;
  activeTab: Routine801Tab;
  isExecuting: boolean;
  onChangeCustomVersion: (value: string) => void;
  onCopy: (text: string, key: string) => void;
  onClose: () => void;
  onExecute: (features: Routine801Feature[], action: 'install' | 'repo_add_only') => void;
}

const CopyButton: React.FC<{
  copied: boolean;
  label: string;
  onClick: () => void;
}> = ({ copied, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-1 text-2xs text-muted-foreground hover:text-foreground"
  >
    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
    <span>{copied ? 'Copiado!' : label}</span>
  </button>
);

export const Routine801Inspector: React.FC<Routine801InspectorProps> = ({
  feature,
  effectiveFeature,
  customVersion,
  repo,
  commands,
  copiedKey,
  activeTab,
  isExecuting,
  onChangeCustomVersion,
  onCopy,
  onClose,
  onExecute
}) => (
  <div className="w-[380px] lg:w-[420px] bg-card border-l border-border flex flex-col z-20 shadow-2xl animate-in slide-in-from-right-4 duration-150 overflow-hidden shrink-0">
    {/* Top bar do Drawer */}
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/20">
      <div className="flex items-center gap-2">
        <Info className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider font-mono">
          Feature Inspector HUD
        </span>
      </div>
      <button
        onClick={onClose}
        className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors"
        title="Fechar painel (Esc)"
      >
        <X className="w-4 h-4" />
      </button>
    </div>

    {/* Conteúdo Técnico */}
    <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
      {/* Cabeçalho da Feature */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`inline-flex items-center justify-center px-1.5 py-0.5 text-2xs font-mono font-bold rounded border ${
              feature.status === 'LIBERADO'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/35'
                : 'bg-amber-500/15 text-amber-400 border-amber-500/35'
            }`}
          >
            Canal: {feature.status === 'LIBERADO' ? 'Produção [P]' : 'Homologação [H]'}
          </span>
          <span className="px-1.5 py-0.5 text-2xs font-mono rounded bg-muted text-muted-foreground border border-border">
            {feature.tipoProjeto || 'SERVIÇO'}
          </span>
        </div>

        <h3 className="text-sm font-semibold text-foreground">
          {feature.codigoRotina > 0 && (
            <span className="text-primary mr-1.5 font-mono">{feature.codigoRotina} —</span>
          )}
          {feature.descricao}
        </h3>
        <div className="text-[11px] font-mono text-muted-foreground mt-0.5 select-all">
          {feature.nome}
        </div>
      </div>

      {/* Bloco de Versão */}
      <div className="p-2.5 rounded-md border border-border bg-muted/30 font-mono text-[11px] space-y-2">
        <div className="text-muted-foreground text-2xs uppercase tracking-wider">
          Versão do Artefato
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Catálogo WTA:</span>
          <strong className="text-emerald-400">{feature.versao}</strong>
        </div>
        {feature.versaoAnterior && (
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Versão Instalada:</span>
            <span className="line-through">{feature.versaoAnterior}</span>
          </div>
        )}

        {/* Input de Customização de Versão Alvo */}
        <div className="pt-2 border-t border-border/60">
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="inspected-version-input" className="text-2xs text-muted-foreground">
              Versão Alvo para Instalação / Registro:
            </label>
            {customVersion !== feature.versao && (
              <button
                type="button"
                onClick={() => onChangeCustomVersion(feature.versao)}
                className="text-2xs text-primary hover:underline"
              >
                Restaurar ({feature.versao})
              </button>
            )}
          </div>
          <input
            id="inspected-version-input"
            type="text"
            value={customVersion}
            onChange={(e) => onChangeCustomVersion(e.target.value)}
            placeholder={feature.versao}
            className="w-full px-2 py-1 bg-background border border-input rounded text-foreground font-mono text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
            title="Edite para forçar qualquer versão desejada (ex: 1.38.0.2)"
          />
        </div>
      </div>

      {/* Coordenadas Maven (GAV) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground">Coordenadas Maven</span>
          {repo && (
            <CopyButton
              copied={copiedKey === 'gav'}
              label="Copiar GAV"
              onClick={() => onCopy(`${repo.groupId}:${repo.artifactId}:${repo.version}`, 'gav')}
            />
          )}
        </div>

        <div className="p-2 rounded border border-border bg-background font-mono text-2xs text-foreground leading-relaxed select-all">
          {repo ? (
            <>
              <div><span className="text-muted-foreground">groupId:</span> {repo.groupId}</div>
              <div><span className="text-muted-foreground">artifactId:</span> {repo.artifactId}</div>
              <div><span className="text-muted-foreground">version:</span> {repo.version}</div>
            </>
          ) : (
            <span className="text-muted-foreground italic">Repositório Maven resolvido dinamicamente pelo Karaf</span>
          )}
        </div>
      </div>

      {/* URL Canônica Maven */}
      {repo?.featureMavenUrl && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">Repositório de Features</span>
            <CopyButton
              copied={copiedKey === 'mvnUrl'}
              label="Copiar URL"
              onClick={() => onCopy(repo.featureMavenUrl!, 'mvnUrl')}
            />
          </div>

          <div className="p-2 rounded border border-border bg-background font-mono text-2xs text-foreground break-all select-all">
            {repo.featureMavenUrl}
          </div>
        </div>
      )}

      {/* Comandos Karaf CLI */}
      {commands && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">Comandos Karaf CLI</span>
            <CopyButton
              copied={copiedKey === 'cli'}
              label="Copiar Comandos"
              onClick={() => onCopy(commands.fullSnippet, 'cli')}
            />
          </div>

          <div className="p-2 rounded border border-border bg-background font-mono text-2xs text-primary break-all select-all space-y-1">
            {commands.repoCommand && <div>$ {commands.repoCommand}</div>}
            <div>$ {commands.installCommand}</div>
          </div>
        </div>
      )}

      {/* Dependências Requeridas */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground">
            Dependências Declaradas ({feature.dependencias?.length || 0})
          </span>
        </div>

        {!feature.dependencias || feature.dependencias.length === 0 ? (
          <div className="p-2.5 rounded border border-border bg-muted/20 text-muted-foreground text-[11px] italic">
            Nenhuma dependência externa explícita informada pela API da 801. O Karaf resolverá dependências OSGi em cascata.
          </div>
        ) : (
          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
            {feature.dependencias.map((dep, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-1.5 rounded border border-border/80 bg-background font-mono text-2xs"
              >
                <span className="truncate mr-2 text-foreground">{dep.featureName}</span>
                <span className="text-muted-foreground shrink-0">{dep.version || '*'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

    {/* Ação no Rodapé do Drawer */}
    <div className="p-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center gap-2">
      <button
        onClick={onClose}
        className="w-full sm:w-auto px-3 py-1.5 rounded border border-border hover:bg-muted text-foreground transition-colors"
      >
        Fechar
      </button>

      <button
        onClick={() => effectiveFeature && onExecute([effectiveFeature], 'repo_add_only')}
        disabled={isExecuting}
        className="w-full sm:w-auto flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded font-medium border border-border bg-card hover:bg-muted text-foreground transition-colors disabled:opacity-50"
        title="Apenas adiciona o repositório Maven no Karaf (feature:repo-add) sem instalar"
      >
        <Server className="w-3.5 h-3.5 text-primary" />
        <span>Apenas Repositório</span>
      </button>

      <button
        onClick={() => effectiveFeature && onExecute([effectiveFeature], 'install')}
        disabled={isExecuting}
        className={`w-full sm:w-auto flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded font-medium transition-colors ${
          activeTab === 'updates'
            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
            : 'bg-primary hover:opacity-90 text-primary-foreground'
        } disabled:opacity-50`}
      >
        {activeTab === 'updates' ? <RotateCw className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
        <span>{activeTab === 'updates' ? 'Atualizar no Karaf' : 'Instalar no Karaf'}</span>
      </button>
    </div>
  </div>
);

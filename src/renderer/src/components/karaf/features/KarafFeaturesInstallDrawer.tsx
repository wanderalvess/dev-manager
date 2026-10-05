import React, { useState } from 'react';
import { UploadCloud, Sparkles, RotateCw, X, ChevronRight } from 'lucide-react';

interface KarafFeaturesInstallDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: (name: string, version?: string) => Promise<void>;
  isInstalling: boolean;
}

const COMMON_PRESETS = [
  'winthor-integracao-varejo',
  'winthor-pedidovenda-service',
  'winthor-faturamento-service',
  'winthor-precificacao-service'
];

export const KarafFeaturesInstallDrawer: React.FC<KarafFeaturesInstallDrawerProps> = ({
  isOpen,
  onClose,
  onInstall,
  isInstalling
}) => {
  const [featureName, setFeatureName] = useState('');
  const [featureVersion, setFeatureVersion] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!featureName.trim() || isInstalling) return;
    onInstall(featureName.trim(), featureVersion.trim() || undefined);
  };

  const handleSelectPreset = (preset: string) => {
    setFeatureName(preset);
  };

  const targetIdentifier = featureName.trim()
    ? `${featureName.trim()}${featureVersion.trim() ? `/${featureVersion.trim()}` : ''}`
    : '<nome-da-feature>';

  return (
    <div className="border-b border-border bg-muted/20 p-4 shrink-0 animate-in fade-in slide-in-from-top-2 duration-150">
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Cabeçalho do Drawer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h4 className="text-xs font-bold font-mono uppercase text-foreground">
              Instalação Manual de Feature OSGi
            </h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
            title="Fechar formulário"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Presets rápidos de Features WinThor */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-2xs font-mono text-muted-foreground uppercase tracking-wider mr-1">
            Atalhos:
          </span>
          {COMMON_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className="text-2xs font-mono px-2 py-0.5 rounded-md bg-background hover:bg-muted border border-border/80 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              + {preset}
            </button>
          ))}
        </div>

        {/* Campos de Input */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="sm:col-span-2">
            <label className="text-2xs font-mono uppercase font-semibold text-muted-foreground block mb-1">
              Nome da Feature <span className="text-rose-600 dark:text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={featureName}
              onChange={(e) => setFeatureName(e.target.value)}
              placeholder="Ex: winthor-integracao-varejo ou camel-core"
              className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-mono text-foreground focus:outline-hidden focus:border-indigo-500 transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="text-2xs font-mono uppercase font-semibold text-muted-foreground block mb-1">
              Versão (Opcional)
            </label>
            <input
              type="text"
              value={featureVersion}
              onChange={(e) => setFeatureVersion(e.target.value)}
              placeholder="Ex: 1.0.0-SNAPSHOT"
              className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-mono text-foreground focus:outline-hidden focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Rodapé com Prévia do Comando e Botões */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40">
          <div className="flex items-center space-x-1.5 text-[11px] font-mono text-muted-foreground">
            <ChevronRight className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>Comando:</span>
            <code className="text-indigo-700 dark:text-indigo-300 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
              feature:install -r -u {targetIdentifier}
            </code>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={!featureName.trim() || isInstalling}
              className="px-4 py-1.5 rounded-lg text-xs font-mono font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              {isInstalling ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Instalando...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Instalar no Karaf</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

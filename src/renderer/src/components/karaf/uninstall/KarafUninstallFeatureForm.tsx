import React from 'react';
import { Sparkles } from 'lucide-react';
import type { KarafFeatureInfo } from '../../../../../shared/types';
import { buildFeatureUninstallPreview } from '../../../utils/karafUninstallModalUtils';

interface KarafUninstallFeatureFormProps {
  featureName: string;
  featureVersion: string;
  installedFeatures: KarafFeatureInfo[];
  onNameChange: (value: string) => void;
  onVersionChange: (value: string) => void;
}

const INPUT_CLASS =
  'w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-rose-500';

export const KarafUninstallFeatureForm: React.FC<KarafUninstallFeatureFormProps> = ({
  featureName,
  featureVersion,
  installedFeatures,
  onNameChange,
  onVersionChange
}) => (
  <div className="p-3.5 bg-muted/20 border border-border rounded-xl space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        Parâmetros da Feature Karaf
      </span>
      {installedFeatures.length > 0 && (
        <span className="text-[10px] text-muted-foreground font-mono">
          {installedFeatures.length} features instaladas detectadas
        </span>
      )}
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <div className="sm:col-span-2">
        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
          Nome da Feature
        </label>
        <input
          type="text"
          list="karaf-installed-features-datalist"
          value={featureName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Ex: winthor-integracao-varejo"
          className={INPUT_CLASS}
        />
        <datalist id="karaf-installed-features-datalist">
          {installedFeatures.map((f) => (
            <option key={`${f.name}-${f.version}`} value={f.name}>
              {f.name} {f.version ? `(${f.version})` : ''}
            </option>
          ))}
        </datalist>
      </div>

      <div>
        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
          Versão (Opcional)
        </label>
        <input
          type="text"
          value={featureVersion}
          onChange={(e) => onVersionChange(e.target.value)}
          placeholder="Ex: 0.0.1-SNAPSHOT"
          className={INPUT_CLASS}
        />
      </div>
    </div>

    <div className="text-[10px] font-mono text-muted-foreground bg-muted/40 p-2 rounded-lg border border-border/50">
      Comando Karaf que será executado:
      <div className="text-rose-400 font-bold mt-0.5">
        {buildFeatureUninstallPreview(featureName, featureVersion)}
      </div>
    </div>
  </div>
);

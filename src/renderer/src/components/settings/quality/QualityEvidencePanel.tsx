import React from 'react';
import { Camera } from 'lucide-react';
import type { AppSettings } from '../../../../../shared/types';

interface QualityEvidencePanelProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

type AfterCapture = NonNullable<AppSettings['evidenceAfterCapture']>;

const OPTIONS: { value: AfterCapture; label: string; hint: string }[] = [
  { value: 'ask', label: 'Perguntar se quero provar com API/SQL', hint: 'O passo novo abre com um convite: chamar uma API, consultar o banco, colar texto ou seguir só com o print.' },
  { value: 'api', label: 'Abrir direto a prova de API', hint: 'O passo novo abre com a chamada de API pronta para executar, já preenchida com a última requisição da evidência.' },
  { value: 'off', label: 'Não sugerir nada', hint: 'O passo novo só aparece expandido; as provas são adicionadas manualmente.' }
];

/** Comportamento da tela de Evidências logo depois de um print. */
export const QualityEvidencePanel: React.FC<QualityEvidencePanelProps> = ({ settings, setSettings }) => {
  const value: AfterCapture = settings.evidenceAfterCapture ?? 'ask';
  const current = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0];

  return (
    <div id="field-evidenceAfterCapture" className="cockpit-panel rounded-xl p-5 space-y-4 border border-border">
      <div className="flex items-center justify-between pb-1 border-b border-border/60">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Camera className="w-3.5 h-3.5 text-success" /> Evidências
        </h3>
        <span className="text-2xs text-muted-foreground font-mono">Print, API e SQL</span>
      </div>
      <div className="space-y-1.5 text-xs">
        <label htmlFor="evidence-after-capture" className="text-xs font-semibold text-foreground">
          Depois de tirar um print:
        </label>
        <select
          id="evidence-after-capture"
          value={value}
          onChange={(e) => setSettings((prev) => ({ ...prev, evidenceAfterCapture: e.target.value as AfterCapture }))}
          className="w-full bg-background border border-input rounded-[10px] px-3 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
        >
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <p className="text-2xs text-muted-foreground">{current.hint}</p>
      </div>
    </div>
  );
};

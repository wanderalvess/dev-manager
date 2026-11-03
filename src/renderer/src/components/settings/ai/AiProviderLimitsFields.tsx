import React, { useState } from 'react';
import { Gauge } from 'lucide-react';
import type { LlmProviderConfig } from '../../../../../shared/types';
import { AI_USAGE_LOCAL_NOTE, parseOptionalNumber } from '../../../utils/aiUsageViewUtils';

interface AiProviderLimitsFieldsProps {
  provider: Partial<LlmProviderConfig>;
  onChange: (provider: Partial<LlmProviderConfig>) => void;
}

type LimitKey = 'dailyTokenLimit' | 'monthlyTokenLimit' | 'priceInPerMillion' | 'priceOutPerMillion';

const FIELDS: ReadonlyArray<{ key: LimitKey; label: string; placeholder: string; integer: boolean }> = [
  { key: 'dailyTokenLimit', label: 'Teto diário (tokens)', placeholder: 'Vazio = sem teto', integer: true },
  { key: 'monthlyTokenLimit', label: 'Teto mensal (tokens)', placeholder: 'Vazio = sem teto', integer: true },
  { key: 'priceInPerMillion', label: 'Preço de entrada (por 1 mi de tokens)', placeholder: 'Opcional, p/ custo estimado', integer: false },
  { key: 'priceOutPerMillion', label: 'Preço de saída (por 1 mi de tokens)', placeholder: 'Opcional, p/ custo estimado', integer: false }
];

/** Guarda o texto digitado e só converte para número a cada tecla; vazio limpa o campo. */
const NumberField: React.FC<{
  id: string;
  value: number | undefined;
  placeholder: string;
  integer: boolean;
  onCommit: (value: number | undefined) => void;
}> = ({ id, value, placeholder, integer, onCommit }) => {
  const [text, setText] = useState(value === undefined ? '' : String(value));
  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      value={text}
      placeholder={placeholder}
      onChange={(e) => {
        setText(e.target.value);
        onCommit(parseOptionalNumber(e.target.value, integer));
      }}
      className="w-full bg-card border border-input hover:border-primary/50 rounded-[10px] px-3 py-2.5 text-foreground font-mono text-sm focus:outline-hidden"
    />
  );
};

/** Teto de tokens por dia/mês e preço opcional por milhão de tokens (digitado pelo usuário; o Hub não traz tabela de preços). */
export const AiProviderLimitsFields: React.FC<AiProviderLimitsFieldsProps> = ({ provider, onChange }) => (
  <fieldset className="md:col-span-2 space-y-2 pt-2 border-t border-border/60">
    <legend className="font-semibold text-foreground flex items-center gap-1.5">
      <Gauge className="w-3.5 h-3.5 text-primary" /> Teto de uso
    </legend>
    <p className="text-2xs text-muted-foreground">
      Ao chegar a 80% o Hub avisa; ao atingir o teto, as chamadas a este motor são bloqueadas. {AI_USAGE_LOCAL_NOTE}
    </p>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {FIELDS.map((f) => (
        <div key={f.key} className="space-y-1">
          <label htmlFor={`ai-limit-${f.key}`} className="font-semibold text-foreground">{f.label}</label>
          <NumberField
            id={`ai-limit-${f.key}`}
            value={provider[f.key]}
            placeholder={f.placeholder}
            integer={f.integer}
            onCommit={(value) => onChange({ ...provider, [f.key]: value })}
          />
        </div>
      ))}
    </div>
  </fieldset>
);

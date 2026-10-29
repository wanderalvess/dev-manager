import React from 'react';
import { Layers } from 'lucide-react';
import { isValidWinthorVersion, winthorVersionPorts } from '../../../../../shared/infrWinthorVersion';

interface InfrVersionFieldProps {
  version: string;
  onChange: (value: string) => void;
}

/** Versão do WinThor do ambiente: vale para as três abas (banco, WTA e WSH da mesma versão). */
export const InfrVersionField: React.FC<InfrVersionFieldProps> = ({ version, onChange }) => {
  const ports = isValidWinthorVersion(version) ? winthorVersionPorts(version) : null;
  return (
    <div className="p-3 bg-card border border-border/80 rounded-xl flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-center gap-2 shrink-0">
        <Layers className="w-4 h-4 text-warning" />
        <label htmlFor="infr-winthor-version" className="text-xs font-semibold text-foreground">
          Versão do WinThor
        </label>
      </div>
      <input
        id="infr-winthor-version"
        type="text"
        inputMode="numeric"
        value={version}
        onChange={(e) => onChange(e.target.value)}
        placeholder="38, 39, 40 (vazio = imagem padrão)"
        className="w-full sm:w-56 bg-background border border-input/80 rounded-[10px] px-2.5 py-2 text-sm text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-warning"
      />
      <p className="text-2xs text-muted-foreground leading-relaxed">
        {ports
          ? `Ambiente ${version} com banco próprio: Oracle oracle-${version} (${ports.oracle}), WTA wta-${version} (${ports.web}), WSH pelo .env.${version} (${ports.wsh}).`
          : 'Informe para subir banco, WTA e WSH de uma versão, lado a lado com as outras.'}
      </p>
    </div>
  );
};

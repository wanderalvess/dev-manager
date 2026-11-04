import React from 'react';
import { isModuleEnabled } from '../../../../../shared/appModules';
import { NAV_THEME_GROUPS } from '../../header/headerNavConfig';

interface StartTabSelectProps {
  id: string;
  /** Vazio = última aba usada */
  value: string;
  onChange: (tab: string) => void;
  disabledModules: readonly string[];
  className?: string;
}

/** Escolha da aba aberta ao clicar em Entrar no cockpit: a última usada ou um módulo ligado. Usado nas Configurações e no onboarding. */
export const StartTabSelect: React.FC<StartTabSelectProps> = ({ id, value, onChange, disabledModules, className = '' }) => (
  <select
    id={id}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={`h-11 px-3 rounded-xl border border-border bg-background text-sm text-foreground cursor-pointer ${className}`}
  >
    <option value="">Última aba usada</option>
    {NAV_THEME_GROUPS.map((group) => {
      const items = group.items.filter((item) => isModuleEnabled(item.id, disabledModules));
      if (items.length === 0) return null;
      return (
        <optgroup key={group.id} label={group.title}>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </optgroup>
      );
    })}
    <option value="help">Central de Ajuda</option>
  </select>
);

import React from 'react';
import { AppSettings } from '../../../../shared/types';

interface UseDirsTabFieldsParams {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  validateSinglePath: (field: keyof AppSettings, value: string) => Promise<void>;
}

/** Atualizadores de campos da aba de diretórios (mantém o spread sobre o `settings` atual, como antes). */
export function useDirsTabFields({ settings, setSettings, validateSinglePath }: UseDirsTabFieldsParams) {
  const setField = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings({ ...settings, [key]: value });
  };

  // Campos de caminho revalidam a cada digitação para atualizar o badge de status.
  const setPathField = (field: keyof AppSettings, value: string) => {
    setSettings({ ...settings, [field]: value });
    validateSinglePath(field, value);
  };

  return { setField, setPathField };
}

import React from 'react';
import { FileCode2, FolderOpen, Layers } from 'lucide-react';
import type { AppSettings } from '../../../../../shared/types';
import { useDirsTabFields } from '../../../hooks/settings/useDirsTabFields';
import { DirsPathField } from '../dirs/DirsPathField';
import { SettingsAdvanced, SettingsCard } from '../SettingsCard';

interface KarafPathsPanelProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  renderPathStatusBadge: (field: keyof AppSettings) => React.ReactNode;
  validateSinglePath: (field: keyof AppSettings, value: string) => Promise<void>;
  handleBrowseDirectory: (field: keyof AppSettings) => Promise<void>;
  handleBrowseFile: (field: keyof AppSettings) => Promise<void>;
}

/** Onde o Karaf está instalado e como subir: fica junto das credenciais, na aba Karaf. */
export const KarafPathsPanel: React.FC<KarafPathsPanelProps> = ({
  settings,
  setSettings,
  renderPathStatusBadge,
  validateSinglePath,
  handleBrowseDirectory,
  handleBrowseFile
}) => {
  const { setField, setPathField } = useDirsTabFields({ settings, setSettings, validateSinglePath });

  return (
    <SettingsCard title="Instalação" description="A pasta do Karaf (a que tem bin/client.bat). Usada para iniciar, parar, abrir o console e fazer deploy.">
      <div className="space-y-4 text-xs">
        <DirsPathField
          fieldId="field-karafPath"
          labelIcon={<Layers className="w-3.5 h-3.5 text-warning" />}
          labelText="Diretório do Servidor Apache Karaf (OSGi):"
          labelTitle="Raiz da instalação do servidor Apache Karaf (a pasta que contém bin/client.bat). Usado para iniciar/parar o Karaf, abrir o console e rodar deploys."
          statusBadge={renderPathStatusBadge('karafPath')}
          inputValue={settings.karafPath}
          placeholder="Ex: C:\servers\runtime ou C:\app\server"
          onChange={(val) => setPathField('karafPath', val)}
          onBrowse={() => handleBrowseDirectory('karafPath')}
          browseIcon={<FolderOpen className="w-3.5 h-3.5 text-warning" />}
          browseTitle="Selecionar pasta do Karaf"
        />

        <SettingsAdvanced summary="Avançado: script de inicialização próprio" defaultOpen={Boolean(settings.karafScript)}>
        <DirsPathField
          labelIcon={<FileCode2 className="w-3.5 h-3.5 text-warning" />}
          labelText="Script de Inicialização do Karaf (Opcional):"
          inputValue={settings.karafScript || ''}
          placeholder="Ex: start.bat, run.bat ou caminho completo"
          onChange={(val) => setField('karafScript', val)}
          onBrowse={() => handleBrowseFile('karafScript')}
          browseIcon={<FileCode2 className="w-3.5 h-3.5 text-warning" />}
          browseTitle="Selecionar script .bat / .cmd"
          hint={
            <p className="text-2xs text-muted-foreground">
              Script usado para subir o servidor na automação. Se vazio, prioriza os scripts padrão detectados na raiz.
            </p>
          }
        />
        </SettingsAdvanced>
      </div>
    </SettingsCard>
  );
};

import React from 'react';
import { Folder, FolderOpen } from 'lucide-react';
import type { AppSettings } from '../../../../../shared/types';
import { useDirsTabFields } from '../../../hooks/settings/useDirsTabFields';
import { DirsPathField } from '../dirs/DirsPathField';
import { DirsRoutineExtensionsFields } from '../dirs/DirsRoutineExtensionsFields';
import { DirsWinthorStartPanel } from '../dirs/DirsWinthorStartPanel';
import { DirsCcwPanel } from '../dirs/DirsCcwPanel';
import { SettingsCard } from '../SettingsCard';

interface RoutinesTabProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  renderPathStatusBadge: (field: keyof AppSettings) => React.ReactNode;
  validateSinglePath: (field: keyof AppSettings, value: string) => Promise<void>;
  handleBrowseDirectory: (field: keyof AppSettings) => Promise<void>;
  launcherRows: { ext: string; path: string }[];
  handleAddLauncherRow: () => void;
  handleUpdateLauncherRow: (index: number, field: 'ext' | 'path', value: string) => void;
  handleRemoveLauncherRow: (index: number) => void;
  handleBrowseLauncherPath: (index: number) => Promise<void>;
  showWtaPassword: boolean;
  setShowWtaPassword: (show: boolean) => void;
}

/** Tudo que alimenta o Catálogo de Rotinas: pasta dos binários, WinThor Start / WTA e Central de Controle (CCW). */
export const RoutinesTab: React.FC<RoutinesTabProps> = ({
  settings,
  setSettings,
  renderPathStatusBadge,
  validateSinglePath,
  handleBrowseDirectory,
  launcherRows,
  handleAddLauncherRow,
  handleUpdateLauncherRow,
  handleRemoveLauncherRow,
  handleBrowseLauncherPath,
  showWtaPassword,
  setShowWtaPassword
}) => {
  const { setField, setPathField } = useDirsTabFields({ settings, setSettings, validateSinglePath });

  return (
    <div className="space-y-4">
      <SettingsCard title="Rotinas" description="O Catálogo de Rotinas lista os arquivos desta pasta com as extensões abaixo.">
        <div className="space-y-4 text-xs">
            <DirsPathField
              fieldId="field-appPath"
              labelIcon={<Folder className="w-3.5 h-3.5 text-success" />}
              labelText="Diretório Raiz das Rotinas / Binários (Prod):"
              statusBadge={renderPathStatusBadge('appPath')}
              inputValue={settings.appPath}
              placeholder="Ex: C:\app ou C:\ERP"
              onChange={(val) => setPathField('appPath', val)}
              onBrowse={() => handleBrowseDirectory('appPath')}
              browseIcon={<FolderOpen className="w-3.5 h-3.5 text-success" />}
              browseTitle="Selecionar pasta das Rotinas"
            />

            <DirsRoutineExtensionsFields
              settings={settings}
              onExtensionsChange={(list) => setField('routineFileExtensions', list)}
              launcherRows={launcherRows}
              handleAddLauncherRow={handleAddLauncherRow}
              handleUpdateLauncherRow={handleUpdateLauncherRow}
              handleRemoveLauncherRow={handleRemoveLauncherRow}
              handleBrowseLauncherPath={handleBrowseLauncherPath}
            />
        </div>
      </SettingsCard>

      <DirsWinthorStartPanel
        settings={settings}
        setField={setField}
        showWtaPassword={showWtaPassword}
        setShowWtaPassword={setShowWtaPassword}
      />

      <DirsCcwPanel settings={settings} setField={setField} />
    </div>
  );
};

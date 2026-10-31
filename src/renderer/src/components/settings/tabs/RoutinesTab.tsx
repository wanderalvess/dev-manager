import React from 'react';
import { Folder, FolderOpen } from 'lucide-react';
import type { AppSettings } from '../../../../../shared/types';
import { useDirsTabFields } from '../../../hooks/settings/useDirsTabFields';
import { DirsPathField } from '../dirs/DirsPathField';
import { DirsRoutineExtensionsFields } from '../dirs/DirsRoutineExtensionsFields';
import { DirsWinthorStartPanel } from '../dirs/DirsWinthorStartPanel';
import { DirsCcwPanel } from '../dirs/DirsCcwPanel';

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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
      <div className="lg:col-span-12 space-y-4 flex flex-col">
        <div className="cockpit-panel rounded-xl p-5 space-y-4 border border-border">
          <div className="flex items-center justify-between pb-1 border-b border-border/60">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Folder className="w-3.5 h-3.5 text-success" /> Rotinas, WinThor Start &amp; CCW
            </h3>
            <span className="text-2xs text-muted-foreground font-mono">Catálogo de Rotinas</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs items-start">
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

            <DirsWinthorStartPanel
              settings={settings}
              setField={setField}
              showWtaPassword={showWtaPassword}
              setShowWtaPassword={setShowWtaPassword}
            />

            <DirsCcwPanel settings={settings} setField={setField} />
          </div>
        </div>
      </div>
    </div>
  );
};

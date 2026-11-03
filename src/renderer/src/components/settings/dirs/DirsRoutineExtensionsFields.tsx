import React from 'react';
import { FolderOpen, Plus, Trash2 } from 'lucide-react';
import { AppSettings } from '../../../../../shared/types';
import { formatRoutineExtensions, parseRoutineExtensions } from '../../../utils/dirsTabParsers';
import { SETTINGS_BUTTON_CLASS, SETTINGS_INPUT_CLASS, SettingsAdvanced, SettingsField } from '../SettingsCard';

interface DirsRoutineExtensionsFieldsProps {
  settings: AppSettings;
  onExtensionsChange: (list: string[]) => void;
  launcherRows: { ext: string; path: string }[];
  handleAddLauncherRow: () => void;
  handleUpdateLauncherRow: (index: number, field: 'ext' | 'path', value: string) => void;
  handleRemoveLauncherRow: (index: number) => void;
  handleBrowseLauncherPath: (index: number) => Promise<void>;
}

const ICON_BUTTON = 'h-9 w-9 shrink-0 rounded-lg flex items-center justify-center cursor-pointer';

/** Extensões que contam como rotina e, em Avançado, o programa que abre cada formato que não roda sozinho. */
export const DirsRoutineExtensionsFields: React.FC<DirsRoutineExtensionsFieldsProps> = ({
  settings,
  onExtensionsChange,
  launcherRows,
  handleAddLauncherRow,
  handleUpdateLauncherRow,
  handleRemoveLauncherRow,
  handleBrowseLauncherPath
}) => (
  <>
    <SettingsField
      label="Extensões que contam como rotina"
      htmlFor="routine-extensions"
      hint="Separadas por vírgula. Arquivos com essas extensões aparecem no Catálogo de Rotinas."
    >
      <input
        id="routine-extensions"
        value={formatRoutineExtensions(settings.routineFileExtensions)}
        onChange={(e) => onExtensionsChange(parseRoutineExtensions(e.target.value))}
        className={SETTINGS_INPUT_CLASS}
        placeholder=".EXE, .BAT"
      />
    </SettingsField>

    <SettingsAdvanced summary="Avançado: abrir uma extensão com outro programa" defaultOpen={launcherRows.length > 0}>
      <p className="text-xs text-muted-foreground">
        Para formatos que não rodam sozinhos, aponte a extensão e o executável que deve abri-la.
      </p>
      {launcherRows.map((row, index) => (
        <div key={index} className="flex flex-wrap items-center gap-2">
          <input
            aria-label={`Extensão do launcher ${index + 1}`}
            value={row.ext}
            onChange={(e) => handleUpdateLauncherRow(index, 'ext', e.target.value)}
            placeholder=".PC"
            className={`${SETTINGS_INPUT_CLASS} w-24`}
          />
          <input
            aria-label={`Executável do launcher ${index + 1}`}
            value={row.path}
            onChange={(e) => handleUpdateLauncherRow(index, 'path', e.target.value)}
            placeholder="Caminho do executável"
            className={`${SETTINGS_INPUT_CLASS} flex-1 min-w-48`}
          />
          <button
            type="button"
            onClick={() => void handleBrowseLauncherPath(index)}
            className={`${ICON_BUTTON} border border-border bg-card hover:bg-muted text-muted-foreground`}
            title="Selecionar executável"
            aria-label="Selecionar executável"
          >
            <FolderOpen className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleRemoveLauncherRow(index)}
            className={`${ICON_BUTTON} text-muted-foreground hover:text-danger hover:bg-danger/10`}
            title="Remover"
            aria-label={`Remover o launcher ${index + 1}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={handleAddLauncherRow} className={`${SETTINGS_BUTTON_CLASS} self-start`}>
        <Plus className="w-3.5 h-3.5" /> {launcherRows.length ? 'Outra extensão' : 'Adicionar extensão'}
      </button>
    </SettingsAdvanced>
  </>
);

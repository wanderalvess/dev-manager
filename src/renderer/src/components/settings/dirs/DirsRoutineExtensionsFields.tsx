import React from 'react';
import { FileCode2, FolderOpen, Plus, Trash2 } from 'lucide-react';
import { AppSettings } from '../../../../../shared/types';
import { formatRoutineExtensions, parseRoutineExtensions } from '../../../utils/dirsTabParsers';

interface DirsRoutineExtensionsFieldsProps {
  settings: AppSettings;
  onExtensionsChange: (list: string[]) => void;
  launcherRows: { ext: string; path: string }[];
  handleAddLauncherRow: () => void;
  handleUpdateLauncherRow: (index: number, field: 'ext' | 'path', value: string) => void;
  handleRemoveLauncherRow: (index: number) => void;
  handleBrowseLauncherPath: (index: number) => Promise<void>;
}

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
    {/* Extensões e Launchers do Catálogo de Rotinas */}
    <div className="space-y-1.5">
      <label htmlFor="dirs-routine-extensions-fields-1" className="font-bold text-foreground flex items-center gap-1.5">
        <FileCode2 className="w-3.5 h-3.5 text-purple-500" />
        Extensões Reconhecidas como Rotina:
      </label>
      <input id="dirs-routine-extensions-fields-1"
        type="text"
        value={formatRoutineExtensions(settings.routineFileExtensions)}
        onChange={(e) => onExtensionsChange(parseRoutineExtensions(e.target.value))}
        className="w-full bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-colors shadow-sm"
        placeholder=".EXE, .BAT"
      />
      <p className="text-2xs text-muted-foreground">
        Separadas por vírgula. Arquivos com essas extensões aparecem no Catálogo de Rotinas.
      </p>
    </div>

    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="font-bold text-foreground flex items-center gap-1.5">
          <FileCode2 className="w-3.5 h-3.5 text-purple-500" />
          Launchers por Extensão (opcional):
        </span>
        <button
          type="button"
          onClick={handleAddLauncherRow}
          className="px-2 py-1 bg-card hover:bg-muted border border-border rounded-lg text-2xs font-semibold text-foreground transition-all flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          <span>Adicionar</span>
        </button>
      </div>
      <p className="text-2xs text-muted-foreground">
        Para formatos que não rodam sozinhos (ex: um arquivo de rotina que precisa ser aberto por outro
        programa), aponte aqui a extensão e o executável que deve abri-lo.
      </p>
      {launcherRows.map((row, index) => (
        <div key={index} className="flex items-center gap-2">
          <input aria-label={`Extensão do launcher ${index + 1}`}
            type="text"
            value={row.ext}
            onChange={(e) => handleUpdateLauncherRow(index, 'ext', e.target.value)}
            placeholder=".PC"
            className="w-20 bg-card border border-border rounded-lg px-2 py-1.5 text-foreground font-mono text-xs focus:outline-none focus:border-primary shadow-sm"
          />
          <input
            aria-label={`Executável do launcher ${index + 1}`}
            type="text"
            value={row.path}
            onChange={(e) => handleUpdateLauncherRow(index, 'path', e.target.value)}
            placeholder="Caminho do executável launcher"
            className="flex-1 bg-card border border-border rounded-lg px-2 py-1.5 text-foreground font-mono text-xs focus:outline-none focus:border-primary shadow-sm"
          />
          <button
            type="button"
            onClick={() => handleBrowseLauncherPath(index)}
            className="p-1.5 bg-card hover:bg-muted border border-border rounded-lg shrink-0"
            title="Selecionar executável"
          >
            <FolderOpen className="w-3.5 h-3.5 text-emerald-500" />
          </button>
          <button
            type="button"
            onClick={() => handleRemoveLauncherRow(index)}
            className="p-1.5 text-muted-foreground hover:text-rose-500 transition-colors shrink-0"
            title="Remover"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  </>
);

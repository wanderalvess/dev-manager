import React from 'react';
import { Zap } from 'lucide-react';
import type { DatabaseType } from '../../../../../shared/types';
import {
  BACKUP_CONNECTION_TAGS,
  BACKUP_FILE_TAGS,
  BACKUP_UTILITY_TAGS,
  appendCommandTag,
  getBackupCommandPresets
} from '../../../utils/backupModalUtils';

const TAG_BUTTON_CLASS =
  'px-2 py-0.5 rounded-md font-mono text-2xs bg-background border border-border text-foreground hover:bg-muted transition shadow-2xs cursor-pointer';

interface BackupCommandPresetsProps {
  type: DatabaseType;
  onSelect: (command: string) => void;
}

/** Presets rápidos de comando por tipo de banco. */
export const BackupCommandPresets: React.FC<BackupCommandPresetsProps> = ({ type, onSelect }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <span className="text-2xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        <Zap className="w-3 h-3 text-amber-500" /> Modelos Recomendados (Presets Rápidos):
      </span>
      <span className="text-2xs text-muted-foreground">Clique em um modelo para carregar</span>
    </div>
    <div className="flex flex-wrap gap-1.5">
      {getBackupCommandPresets(type).map((preset) => (
        <button
          key={preset.label}
          type="button"
          onClick={() => onSelect(preset.command)}
          className="px-2.5 py-1.5 bg-muted/80 hover:bg-muted text-foreground rounded-lg text-2xs font-mono border border-border/70 transition shadow-2xs hover:border-primary/50 cursor-pointer"
          title={preset.title}
        >
          {preset.label}
        </button>
      ))}
    </div>
  </div>
);

interface BackupVariableChipsProps {
  onInsert: (updater: (prev: string) => string) => void;
}

/** Chips com variáveis categorizadas que são anexadas ao comando customizado. */
export const BackupVariableChips: React.FC<BackupVariableChipsProps> = ({ onInsert }) => (
  <div className="space-y-2 p-3 bg-muted/30 border border-border/60 rounded-xl">
    <div className="flex items-center justify-between">
      <span className="text-2xs font-bold text-muted-foreground uppercase tracking-wider">
        Variáveis Disponíveis (clique para inserir):
      </span>
      <span className="text-2xs text-amber-500 font-mono font-semibold">
        * tag {'{filePath}'} ou {'{fileName}'} é obrigatória
      </span>
    </div>

    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 flex-wrap text-2xs">
        <span className="text-muted-foreground font-semibold shrink-0 w-20">Arquivo:</span>
        {BACKUP_FILE_TAGS.map((item) => (
          <button
            key={item.tag}
            type="button"
            onClick={() => onInsert((prev) => appendCommandTag(prev, item.tag))}
            className={`px-2 py-0.5 rounded-md font-mono text-2xs border transition flex items-center gap-1 shadow-2xs cursor-pointer ${
              item.req
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 font-semibold'
                : 'bg-background border-border text-foreground hover:bg-muted'
            }`}
            title={item.tip}
          >
            <span>{item.tag}</span>
            {item.req && <span className="text-2xs opacity-75 font-sans">(obrigatório)</span>}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap text-2xs">
        <span className="text-muted-foreground font-semibold shrink-0 w-20">Conexão:</span>
        {BACKUP_CONNECTION_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onInsert((prev) => appendCommandTag(prev, tag))}
            className={TAG_BUTTON_CLASS}
            title={`Inserir ${tag}`}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap text-2xs">
        <span className="text-muted-foreground font-semibold shrink-0 w-20">Utilitários:</span>
        {BACKUP_UTILITY_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onInsert((prev) => appendCommandTag(prev, tag))}
            className={TAG_BUTTON_CLASS}
            title={`Inserir ${tag}`}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  </div>
);

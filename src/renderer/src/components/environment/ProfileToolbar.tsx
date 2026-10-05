import React from 'react';
import type { ChangeEvent, RefObject } from 'react';
import { Plus, Edit3, Copy, Download, Upload, Trash2 } from 'lucide-react';
import type { AutomationProfile } from '../../../../shared/types';

interface ProfileToolbarProps {
  profiles: AutomationProfile[];
  activeProfile: AutomationProfile | null;
  importFileInputRef: RefObject<HTMLInputElement>;
  onNew: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onDelete: (id: string) => void;
  onImportFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

const BTN = 'flex items-center gap-1 px-2 py-1 text-muted-foreground hover:text-foreground font-semibold rounded-lg hover:bg-card transition-colors';

/** Botões do perfil: Novo, Editar, Duplicar, Exportar, Importar, Excluir. */
export const ProfileToolbar: React.FC<ProfileToolbarProps> = ({
  profiles,
  activeProfile,
  importFileInputRef,
  onNew,
  onEdit,
  onDuplicate,
  onExport,
  onDelete,
  onImportFileChange
}) => (
  <>
    <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/60 text-xs gap-0.5" data-tour="profile-toolbar">
      <button
        type="button"
        onClick={onNew}
        className="flex items-center gap-1 px-2.5 py-1 text-muted-foreground hover:text-foreground font-semibold rounded-lg hover:bg-card transition-colors"
        title="Criar um novo perfil de ambiente personalizado"
      >
        <Plus className="w-3.5 h-3.5 text-primary" />
        <span>Novo</span>
      </button>

      <button
        type="button"
        onClick={onEdit}
        className="flex items-center gap-1 px-2.5 py-1 text-muted-foreground hover:text-foreground font-semibold rounded-lg hover:bg-card transition-colors"
        title="Editar os passos, comandos e portas do perfil ativo"
      >
        <Edit3 className="w-3.5 h-3.5 text-amber-500" />
        <span>Editar</span>
      </button>

      <button type="button" onClick={onDuplicate} className={BTN} title="Duplicar este perfil ativo">
        <Copy className="w-3.5 h-3.5" />
        <span>Duplicar</span>
      </button>

      <button type="button" onClick={onExport} className={BTN} title="Exportar este perfil como arquivo JSON">
        <Download className="w-3.5 h-3.5 text-emerald-500" />
        <span>Exportar</span>
      </button>

      <button
        type="button"
        onClick={() => importFileInputRef.current?.click()}
        className={BTN}
        title="Importar perfil a partir de arquivo JSON"
      >
        <Upload className="w-3.5 h-3.5 text-blue-500" />
        <span>Importar</span>
      </button>

      {profiles.length > 1 && activeProfile && (
        <button
          type="button"
          onClick={() => onDelete(activeProfile.id)}
          className="flex items-center gap-1 px-2 py-1 text-rose-500 hover:text-rose-600 font-semibold rounded-lg hover:bg-rose-500/10 transition-colors"
          title={`Excluir perfil "${activeProfile.name}"`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Excluir</span>
        </button>
      )}
    </div>

    <input
      type="file"
      ref={importFileInputRef}
      accept=".json,application/json"
      onChange={onImportFileChange}
      className="hidden"
    />
  </>
);

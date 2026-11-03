import React from 'react';
import { Download, Upload } from 'lucide-react';
import { SECTION_TITLE_CLASS } from '../../ui/PageHeader';

interface OverviewTransferCardProps {
  fileInputRef: React.RefObject<HTMLInputElement>;
  onExport: (sanitizePasswords: boolean) => void;
  onImportFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const OPTION = 'rounded-xl border p-4 flex flex-col gap-2';
const BUTTON =
  'self-start h-9 px-3 rounded-lg border border-border bg-card hover:bg-muted text-sm font-medium text-foreground transition-colors flex items-center gap-1.5 cursor-pointer';

/** Exportar para o time, guardar um backup completo ou trazer de um arquivo: três escolhas à vista, sem menu escondido. */
export const OverviewTransferCard: React.FC<OverviewTransferCardProps> = ({ fileInputRef, onExport, onImportFileChange }) => (
  <section data-tour="settings-transfer" aria-labelledby="overview-transfer" className="rounded-xl border border-border bg-card p-5 space-y-4">
    <div>
      <h3 id="overview-transfer" className={SECTION_TITLE_CLASS}>
        Levar as configurações para outro lugar
      </h3>
      <p className="text-xs text-muted-foreground">Exportar gera um arquivo .json. Importar substitui o que está aqui e grava na hora.</p>
    </div>
    <input type="file" ref={fileInputRef} accept=".json,application/json" onChange={onImportFileChange} className="hidden" />
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className={`${OPTION} border-border`}>
        <span className="text-sm font-semibold text-foreground">Para o time</span>
        <span className="text-xs text-muted-foreground flex-1">Sem as senhas do banco e do Karaf.</span>
        <button type="button" onClick={() => onExport(true)} className={BUTTON}>
          <Download className="w-3.5 h-3.5 text-muted-foreground" /> Exportar sem senhas
        </button>
      </div>
      <div className={`${OPTION} border-border`}>
        <span className="text-sm font-semibold text-foreground">Backup deste PC</span>
        <span className="text-xs text-muted-foreground flex-1">Com todas as senhas. Guarde em lugar seguro.</span>
        <button type="button" onClick={() => onExport(false)} className={BUTTON}>
          <Download className="w-3.5 h-3.5 text-muted-foreground" /> Exportar completo
        </button>
      </div>
      <div className={`${OPTION} border-dashed border-input`}>
        <span className="text-sm font-semibold text-foreground">Trazer de um arquivo</span>
        <span className="text-xs text-muted-foreground flex-1">Aplica o arquivo e grava na hora.</span>
        <button type="button" onClick={() => fileInputRef.current?.click()} className={BUTTON}>
          <Upload className="w-3.5 h-3.5 text-muted-foreground" /> Importar .json
        </button>
      </div>
    </div>
  </section>
);

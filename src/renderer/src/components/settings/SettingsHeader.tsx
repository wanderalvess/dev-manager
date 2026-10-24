import React from 'react';
import { CheckCircle2, HelpCircle, RotateCcw, Save, Upload } from 'lucide-react';
import { SettingsExportMenu } from './SettingsExportMenu';

const SECONDARY_BUTTON =
  'h-10 px-3 bg-card hover:bg-muted text-foreground border border-border rounded-[10px] text-sm font-medium transition-colors flex items-center space-x-1.5';

interface SettingsHeaderProps {
  onOpenTour: () => void;
  importExport: {
    exportMenuOpen: boolean;
    setExportMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
    fileInputRef: React.RefObject<HTMLInputElement>;
    handleExportSettings: (sanitizePasswords: boolean) => void;
    handleImportFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  };
  isDetecting: boolean;
  onAutoDetect: () => void;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  savedSuccess: boolean;
  onSave: () => void;
}

/** Cabeçalho da página: título, importar/exportar, auto-detectar e o botão de salvar com o aviso de "não salvo". */
export const SettingsHeader: React.FC<SettingsHeaderProps> = ({
  onOpenTour,
  importExport,
  isDetecting,
  onAutoDetect,
  hasUnsavedChanges,
  isSaving,
  savedSuccess,
  onSave
}) => (
  <div className="flex flex-wrap items-end justify-between gap-4">
    <div className="flex items-center space-x-3">
      <div>
        <h1 className="text-[26px] leading-tight font-semibold tracking-tight text-foreground flex items-center gap-2">
          Configurações do Ambiente &amp; Diretórios
          <button
            type="button"
            onClick={onOpenTour}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
            title="Rever o tour guiado desta página"
            aria-label="Rever o tour guiado desta página"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure os diretórios base, serviços Windows, processos de encerramento, portas e preferências de automação.
        </p>
      </div>
    </div>

    <div className="flex items-center space-x-2">
      {/* Input oculto para importação de JSON */}
      <input
        type="file"
        ref={importExport.fileInputRef}
        accept=".json,application/json"
        onChange={importExport.handleImportFileChange}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => importExport.fileInputRef.current?.click()}
        className={SECONDARY_BUTTON}
        title="Importar configurações de um arquivo JSON compartilhado pela equipe"
      >
        <Upload className="w-3.5 h-3.5 text-muted-foreground" />
        <span>Importar</span>
      </button>

      <SettingsExportMenu
        isOpen={importExport.exportMenuOpen}
        onToggle={() => importExport.setExportMenuOpen((prev) => !prev)}
        onClose={() => importExport.setExportMenuOpen(false)}
        onExport={importExport.handleExportSettings}
      />

      <button
        data-tour="auto-detect-button"
        type="button"
        onClick={onAutoDetect}
        disabled={isDetecting}
        className={`${SECONDARY_BUTTON} disabled:opacity-50`}
      >
        <RotateCcw className={`w-3.5 h-3.5 text-muted-foreground ${isDetecting ? 'animate-spin' : ''}`} />
        <span>{isDetecting ? 'Detectando...' : 'Auto-detectar'}</span>
      </button>

      <div className="relative flex items-center">
        {hasUnsavedChanges && !isSaving && (
          <span
            className="mr-2 flex items-center gap-1.5 text-[13px] font-medium text-warning bg-warning/10 px-2.5 py-1 rounded-full"
            title="Existem alterações que ainda não foram salvas"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-warning" />
            Não salvo
          </span>
        )}
        <button
          data-tour="save-settings-button"
          type="button"
          onClick={onSave}
          disabled={isSaving}
          aria-busy={isSaving}
          className="h-10 px-5 bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm rounded-[10px] transition-colors flex items-center space-x-2 disabled:opacity-60"
        >
          {savedSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>Salvo!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Salvar Configurações</span>
            </>
          )}
        </button>
      </div>
    </div>
  </div>
);

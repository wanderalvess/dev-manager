import React from 'react';
import { Plus, X } from 'lucide-react';

interface KarafFeaturesManagerAddRepoFormProps {
  newRepoUrl: string;
  onUrlChange: (value: string) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export const KarafFeaturesManagerAddRepoForm: React.FC<KarafFeaturesManagerAddRepoFormProps> = ({
  newRepoUrl,
  onUrlChange,
  isSubmitting,
  onSubmit,
  onClose
}) => (
  <form
    onSubmit={onSubmit}
    className="p-3.5 bg-muted/20 border-b border-border flex flex-col space-y-2.5 animate-in fade-in duration-150"
  >
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-foreground font-mono uppercase tracking-wide flex items-center gap-1.5">
        <Plus className="w-3.5 h-3.5 text-primary" /> Registrar Repositório Maven
      </span>
      <button
        type="button"
        onClick={onClose}
        className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>

    <div className="flex flex-col space-y-1">
      <label className="text-2xs font-mono uppercase tracking-wider text-muted-foreground">
        Coordenada Maven (mvn:groupId/artifactId/version/xml/features) ou URI:
      </label>
      <input
        type="text"
        placeholder="mvn:br.com.totvs.winthor/features/1.0.0/xml/features"
        value={newRepoUrl}
        onChange={(e) => onUrlChange(e.target.value)}
        className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
        autoFocus
      />
    </div>

    <div className="flex items-center justify-between pt-0.5">
      <button
        type="button"
        onClick={() => onUrlChange('mvn:br.com.totvs.winthor/winthor-features/LATEST/xml/features')}
        className="text-2xs text-primary hover:underline cursor-pointer font-mono"
      >
        + Inserir template WinThor
      </button>

      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={onClose}
          className="px-2.5 py-1 rounded-md text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!newRepoUrl.trim() || isSubmitting}
          className="px-3.5 py-1 rounded-md text-xs font-mono font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-40"
        >
          {isSubmitting ? 'Registrando...' : 'Registrar'}
        </button>
      </div>
    </div>
  </form>
);

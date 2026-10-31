import React from 'react';
import { AlertTriangle, Sparkles, X } from 'lucide-react';

const FIELD_LABELS: Record<string, string> = {
  projectsPath: 'repositórios Git',
  intellijPath: 'executável da IDE',
  jdkPath: 'Java JDK',
  karafPath: 'pasta do Karaf',
  karafScript: 'script do Karaf',
  appPath: 'pasta das rotinas',
  tautProjectPath: 'projeto Cypress (TAUT)'
};

interface AutoDetectResultProps {
  result: { filled: string[]; error?: string } | null;
  onDismiss: () => void;
}

/** Diz o que a auto-detecção preencheu (ou que não achou nada novo), em vez de mudar os campos em silêncio. */
export const AutoDetectResult: React.FC<AutoDetectResultProps> = ({ result, onDismiss }) => {
  if (!result) return null;
  const { filled, error } = result;
  const tone = error ? 'border-danger/30 bg-danger/10' : filled.length ? 'border-primary/40 bg-accent' : 'border-border bg-card';
  const names = filled.map((key) => FIELD_LABELS[key] ?? key).join(', ');
  return (
    <div role="status" className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-xs ${tone}`}>
      {error ? <AlertTriangle className="w-4 h-4 text-danger shrink-0" /> : <Sparkles className="w-4 h-4 text-primary shrink-0" />}
      <div className="flex-1 leading-relaxed text-foreground">
        {error ? (
          <>A detecção automática falhou: {error}. Preencha os caminhos à mão.</>
        ) : filled.length ? (
          <>
            <strong>
              {filled.length === 1 ? 'Encontrei 1 caminho novo' : `Encontrei ${filled.length} caminhos novos`}:
            </strong>{' '}
            {names}. Confira e salve na barra do rodapé.
            <span className="block text-muted-foreground">Nada do que você já tinha preenchido foi trocado.</span>
          </>
        ) : (
          <>Nada novo para preencher: os caminhos que achei já estavam configurados.</>
        )}
      </div>
      <button type="button" onClick={onDismiss} aria-label="Fechar aviso" className="text-muted-foreground hover:text-foreground cursor-pointer">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

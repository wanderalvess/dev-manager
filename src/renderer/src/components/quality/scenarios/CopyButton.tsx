import React from 'react';
import { Copy, Download } from 'lucide-react';
import { showToast } from '../../ToastHost';
import { copyText } from '../../../hooks/useCopyToClipboard';
import { downloadTextFile } from '../../../utils/downloadText';

const BASE =
  'h-8 px-2.5 border border-border rounded-[8px] bg-card hover:bg-muted text-xs font-medium text-foreground flex items-center gap-1.5 whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

interface CopyButtonProps {
  label: string;
  /** Texto copiado, calculado na hora do clique (o passo a passo muda enquanto roda). */
  getText: () => string;
  /** Aviso depois de copiar, ex.: "Passo a passo copiado." */
  done: string;
  disabled?: boolean;
  /** Só o ícone (o rótulo vira aria-label). */
  iconOnly?: boolean;
}

/** Botão de copiar da Validação de Cenários: usa o caminho que funciona no app desktop e avisa se deu certo. */
export const CopyButton: React.FC<CopyButtonProps> = ({ label, getText, done, disabled, iconOnly }) => {
  const onClick = async () => {
    const text = getText();
    if (!text) return;
    if (await copyText(text)) showToast(done);
    else showToast('Não foi possível copiar.', 'error');
  };
  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        title={label}
        className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={BASE}>
      <Copy className="w-3.5 h-3.5" />
      {label}
    </button>
  );
};

interface DownloadButtonProps {
  fileName: string;
  getText: () => string;
  disabled?: boolean;
}

export const DownloadMdButton: React.FC<DownloadButtonProps> = ({ fileName, getText, disabled }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() => {
      downloadTextFile(fileName, getText());
      showToast(`Relatório salvo como ${fileName}.`);
    }}
    className={BASE.replace('h-8', 'h-9')}
  >
    <Download className="w-3.5 h-3.5" />
    Baixar .md
  </button>
);

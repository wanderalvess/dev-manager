import React, { useMemo, useState } from 'react';
import { ClipboardCopy } from 'lucide-react';
import { PR_DESCRIPTION_MAX_CHARS, buildPrDescription } from '../../../../shared/evidencePrDescription';
import type { EvidenceSession } from '../../../../shared/evidenceTypes';
import { Modal } from '../ui/Modal';

const BTN =
  'h-10 px-3 border border-border rounded-[10px] bg-card hover:bg-muted text-sm font-medium text-foreground flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_PRIMARY =
  'h-10 px-4 rounded-[10px] bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Sem permissão da Clipboard API: cai no copiar do navegador via seleção.
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

/** Resumo em Markdown para colar na descrição do pull request, dentro do limite do campo; dá para ajustar antes de copiar. */
export const PrDescriptionModal: React.FC<{ session: EvidenceSession; onClose: () => void }> = ({ session, onClose }) => {
  const generated = useMemo(() => buildPrDescription(session), [session]);
  const [text, setText] = useState(generated);
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null);
  const over = text.length > PR_DESCRIPTION_MAX_CHARS;

  const copy = async () => setCopied((await copyText(text)) ? 'ok' : 'fail');

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title="Descrição do pull request"
      description={`Resumo para o revisor saber o que foi feito, no limite de ${PR_DESCRIPTION_MAX_CHARS} caracteres. Edite se quiser e cole no campo Descrição do PR.`}
      footer={
        <>
          <button type="button" className={BTN} onClick={() => { setText(generated); setCopied(null); }} disabled={text === generated}>
            Refazer do zero
          </button>
          <button type="button" className={BTN} onClick={onClose}>
            Fechar
          </button>
          <button type="button" className={BTN_PRIMARY} onClick={() => void copy()} disabled={!text.trim()}>
            <ClipboardCopy className="w-4 h-4" /> {copied === 'ok' ? 'Copiado!' : 'Copiar'}
          </button>
        </>
      }
    >
      <div className="space-y-2 pb-2">
        <textarea
          data-autofocus
          className="w-full h-96 resize-y px-3 py-2 border border-input rounded-[10px] bg-card text-xs font-mono text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
          spellCheck={false}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setCopied(null);
          }}
        />
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className={over ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
            {text.length}/{PR_DESCRIPTION_MAX_CHARS} caracteres{over ? `: passou ${text.length - PR_DESCRIPTION_MAX_CHARS}, o PR vai recusar` : ''}
          </span>
          {copied === 'fail' && <span className="text-red-600">Não consegui copiar; selecione o texto e use Ctrl+C.</span>}
        </div>
      </div>
    </Modal>
  );
};

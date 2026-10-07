import React from 'react';
import { Download, ExternalLink, X } from 'lucide-react';
import { Modal } from '../../ui/Modal';

interface DocsModelHelpModalProps {
  onClose: () => void;
}

export const DocsModelHelpModal: React.FC<DocsModelHelpModalProps> = ({ onClose }) => (
  <Modal
    open
    onClose={onClose}
    bare
    panelClassName="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-fade-in"
    closeOnBackdrop={false}
  >
    <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
      <div className="flex items-center space-x-2.5 min-w-0">
        <div className="p-2 rounded-xl bg-primary/10 border border-primary/30 text-primary shrink-0">
          <Download className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-bold text-foreground">Instalação Manual do Modelo de IA (Offline)</h4>
      </div>
      <button
        onClick={onClose}
        className="p-1.5 hover:bg-muted rounded-xl text-muted-foreground hover:text-foreground transition cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>

    <div className="p-5 text-xs text-foreground/90 space-y-3">
      <p>
        Em redes corporativas (com proxy, Zscaler ou firewall), o download automático do modelo de IA pelo aplicativo pode ser bloqueado. Para instalar manualmente:
      </p>
      <ol className="list-decimal pl-4 space-y-2 text-muted-foreground">
        <li>
          Baixe o modelo pelo navegador no link:
          <div className="mt-1">
            <a
              href="https://storage.googleapis.com/qdrant-fastembed/sentence-transformers-all-MiniLM-L6-v2.tar.gz"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline font-mono break-all inline-flex items-center gap-1 font-semibold"
            >
              sentence-transformers-all-MiniLM-L6-v2.tar.gz <ExternalLink className="w-3 h-3 inline" />
            </a>
          </div>
        </li>
        <li>
          No Windows Explorer, acesse a pasta:
          <div className="bg-muted p-2 rounded-lg font-mono text-[11px] text-foreground mt-1 select-all break-all border border-border/70">
            %APPDATA%\dev-manager\models\fast-all-MiniLM-L6-v2
          </div>
        </li>
        <li>
          Extraia todo o conteúdo do arquivo <code>.tar.gz</code> dentro dessa pasta <code>fast-all-MiniLM-L6-v2</code> (devem conter arquivos como <code>model.onnx</code>, <code>tokenizer.json</code>, etc).
        </li>
        <li>
          Volte nesta aba e clique em <strong>Indexar Documentação</strong> para gerar os embeddings neurais!
        </li>
      </ol>
    </div>

    <div className="p-3 border-t border-border bg-muted/20 flex justify-end">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-1.5 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition cursor-pointer"
      >
        Entendido
      </button>
    </div>
  </Modal>
);

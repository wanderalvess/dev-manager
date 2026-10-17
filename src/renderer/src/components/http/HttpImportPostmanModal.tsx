import React, { useState } from 'react';
import { Upload, FileCode, Check, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { api } from '../../services/apiBridge';
import { showToast } from '../ToastHost';
import { PostmanImportResult } from '../../../../shared/types';

interface HttpImportPostmanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (result: PostmanImportResult) => void;
}

export const HttpImportPostmanModal: React.FC<HttpImportPostmanModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess
}) => {
  const [jsonContent, setJsonContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonContent(content || '');
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!jsonContent.trim()) {
      setError('Por favor, selecione um arquivo ou cole o JSON da coleção do Postman.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await api.httpImportPostman(jsonContent.trim());
      if (result.success) {
        showToast(
          `Coleção "${result.collectionName}" importada com ${result.foldersCount} pastas e ${result.requestsCount} requisições!`,
          'success'
        );
        onImportSuccess(result);
        onClose();
      } else {
        setError(result.error || 'Falha ao interpretar a coleção do Postman.');
      }
    } catch (err: any) {
      setError(err?.message || 'Erro inesperado ao importar coleção.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Importar Coleção do Postman" size="lg">
      <div className="space-y-4 text-xs">
        <p className="text-muted-foreground">
          Importe coleções completas exportadas do Postman (formato v2.1 ou v2.0). Todas as pastas, rotas, corpos, parâmetros e variáveis serão convertidos automaticamente.
        </p>

        {/* Upload de arquivo */}
        <div className="border-2 border-dashed border-border rounded-lg p-5 text-center hover:border-primary/50 transition-colors bg-card/30">
          <input
            type="file"
            accept=".json"
            id="postman-file-upload"
            onChange={handleFileUpload}
            className="hidden"
          />
          <label htmlFor="postman-file-upload" className="cursor-pointer flex flex-col items-center justify-center">
            <Upload className="w-8 h-8 text-primary mb-2" />
            <span className="font-semibold text-foreground">
              {fileName ? fileName : 'Clique aqui para selecionar o arquivo .json da Coleção'}
            </span>
            <span className="text-[11px] text-muted-foreground mt-0.5">
              Exportado como Collection v2.1 (recomendado) ou v2.0
            </span>
          </label>
        </div>

        {/* Ou colar JSON */}
        <div>
          <label className="block font-medium text-foreground mb-1">Ou cole o JSON da Coleção aqui:</label>
          <textarea
            value={jsonContent}
            onChange={(e) => {
              setJsonContent(e.target.value);
              setError(null);
            }}
            placeholder='{ "info": { "name": "Minha Coleção" }, "item": [...] }'
            rows={8}
            className="w-full px-3 py-2 bg-background border border-border rounded font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded text-xs text-muted-foreground hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={isLoading || !jsonContent.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground font-medium rounded text-xs hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {isLoading ? 'Importando...' : 'Importar Coleção'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

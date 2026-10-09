import React, { useState, useEffect } from 'react';
import { X, Database, Globe, FileCode, Check } from 'lucide-react';
import { QaCorePayloadItem } from '../../../../../shared/types';
import { showToast } from '../../ToastHost';
import { QaOraclePayloadTab } from './QaOraclePayloadTab';
import { QaApiPayloadTab } from './QaApiPayloadTab';
import { Modal } from '../../ui/Modal';

interface QaFetchPayloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPayload: (rawJson: string) => void;
  connectionId?: string;
  defaultFilial?: string;
  defaultCupom?: string;
}

type PayloadSourceTab = 'oracle' | 'api';

export const QaFetchPayloadModal: React.FC<QaFetchPayloadModalProps> = ({
  isOpen,
  onClose,
  onSelectPayload,
  connectionId,
  defaultFilial = '1',
  defaultCupom = ''
}) => {
  const [activeTab, setActiveTab] = useState<PayloadSourceTab>('oracle');
  const [selectedOracleItem, setSelectedOracleItem] = useState<QaCorePayloadItem | null>(null);
  const [oracleResultsCount, setOracleResultsCount] = useState<number>(0);
  const [apiRawJson, setApiRawJson] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setSelectedOracleItem(null);
      setOracleResultsCount(0);
      setApiRawJson('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPreviewJson =
    activeTab === 'oracle' ? selectedOracleItem?.rawJson || '' : apiRawJson;

  const handleConfirm = () => {
    if (!currentPreviewJson.trim()) return;

    onSelectPayload(currentPreviewJson);
    const sourceLabel =
      activeTab === 'oracle' ? 'PCINTEGRACAOCORE' : 'API externa';
    showToast(`Payload carregado de ${sourceLabel} com sucesso!`, 'success');
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      bare
      panelClassName="flex flex-col w-full max-w-4xl h-[620px] bg-card border border-border rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      closeOnBackdrop={false}
      closeOnEscape={false}
      ariaLabel="Obter Payload de Entrada"
    >
        {/* Cabeçalho com Abas Principais */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/40">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-foreground font-mono">
              Obter Payload de Entrada
            </h2>
            <div className="flex items-center gap-1 bg-background/80 p-0.5 rounded border border-border text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('oracle')}
                className={`px-3 py-1 rounded text-2xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'oracle'
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Banco Oracle (PCINTEGRACAOCORE)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('api')}
                className={`px-3 py-1 rounded text-2xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'api'
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>API REST Externa</span>
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo: Lado Esquerdo (Controles da Origem) + Lado Direito (Preview) */}
        <div className="flex-1 flex overflow-hidden">
          <div className="w-[450px] border-r border-border flex flex-col overflow-hidden">
            {activeTab === 'oracle' ? (
              <QaOraclePayloadTab
                connectionId={connectionId}
                defaultFilial={defaultFilial}
                defaultCupom={defaultCupom}
                selectedItem={selectedOracleItem}
                onSelectItem={setSelectedOracleItem}
                onResultsChange={setOracleResultsCount}
              />
            ) : (
              <QaApiPayloadTab onPayloadLoaded={setApiRawJson} />
            )}
          </div>

          {/* Lado Direito: Preview do JSON */}
          <div className="flex-1 flex flex-col bg-background overflow-hidden p-3">
            {currentPreviewJson ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between pb-2 border-b border-border text-2xs text-muted-foreground">
                  <span className="font-mono">
                    Visualização do Payload ({currentPreviewJson.length} caracteres)
                  </span>
                  <span className="font-mono text-emerald-400 font-semibold">JSON Válido</span>
                </div>
                <pre className="flex-1 overflow-auto mt-2 p-2 bg-card border border-border rounded font-mono text-2xs text-foreground leading-relaxed select-text">
                  {currentPreviewJson}
                </pre>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-xs font-mono">
                <FileCode className="w-8 h-8 opacity-30 mb-2" />
                <span>Nenhum payload carregado para visualização.</span>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-muted/30">
          <span className="text-2xs text-muted-foreground font-mono">
            {activeTab === 'oracle' && oracleResultsCount > 0
              ? `${oracleResultsCount} registro(s) encontrado(s)`
              : ''}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded border border-border text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!currentPreviewJson.trim()}
              onClick={handleConfirm}
              className="px-4 py-1.5 rounded bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Carregar no Teste Regressivo</span>
            </button>
          </div>
        </div>
    </Modal>
  );
};

import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  Copy,
  Check,
  Download,
  Upload,
  Layers,
  Code2,
  CheckCircle2,
  Table,
  Zap
} from 'lucide-react';
import {
  QA_ASSERTION_TYPES,
  QA_TEMPLATE_WORKFLOW_STEPS,
  SAMPLE_TEMPLATE_JSON
} from '../qaTemplatesHelpData';
import { useCopyToClipboard } from '../../../hooks/useCopyToClipboard';
import { showToast } from '../../ToastHost';

interface QaRegressionTemplatesHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type HelpTab = 'workflow' | 'assertions' | 'export' | 'sample';

export const QaRegressionTemplatesHelpModal: React.FC<QaRegressionTemplatesHelpModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<HelpTab>('workflow');
  const { copy, copiedKey } = useCopyToClipboard(2000);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopySample = () => {
    copy(SAMPLE_TEMPLATE_JSON, 'sample-json');
    showToast('Exemplo de template JSON copiado para a área de transferência!', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[88vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-border bg-card/80 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>Guia Prático: Como Usar Templates de Regressivo</span>
                <span className="px-1.5 py-0.2 rounded text-2xs font-mono bg-emerald-500/20 text-emerald-400 font-semibold">
                  Oracle QA
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Aprenda a estruturar cenários, configurar queries, definir asserções e exportar templates.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas Internas */}
        <div className="flex items-center border-b border-border bg-muted/40 px-5 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('workflow')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'workflow'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Fluxo Passo a Passo</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('assertions')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'assertions'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Tipos de Asserção</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'export'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportação &amp; Compartilhamento</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sample')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'sample'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Exemplo de JSON</span>
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="flex-1 overflow-y-auto p-5 text-xs text-foreground space-y-4">
          {/* ABA 1: Fluxo Passo a Passo */}
          {activeTab === 'workflow' && (
            <div className="space-y-3">
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-primary text-xs leading-relaxed">
                <strong>O que é um Template de Regressivo?</strong> É uma suíte declarativa em formato <code className="font-mono font-bold">.json</code> contendo consultas SQL Oracle com variáveis de bind e regras de validação para checar se as tabelas do WinThor foram gravadas corretamente após a execução de rotinas ou serviços da API.
              </div>

              <div className="space-y-2.5">
                {QA_TEMPLATE_WORKFLOW_STEPS.map((s) => (
                  <div
                    key={s.step}
                    className="p-3 rounded-lg border border-border bg-card/60 flex items-start gap-3"
                  >
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 font-mono text-[11px] mt-0.5">
                      {s.step}
                    </span>
                    <div>
                      <h4 className="font-bold text-foreground text-xs">{s.title}</h4>
                      <p className="text-muted-foreground mt-0.5 leading-relaxed text-[11px]">
                        {s.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA 2: Tipos de Asserção */}
          {activeTab === 'assertions' && (
            <div className="space-y-3">
              <p className="text-muted-foreground leading-relaxed text-xs">
                Em cada query de um passo do template, você pode vincular uma ou mais <strong>asserções</strong> para auditar os valores das colunas retornadas:
              </p>

              <div className="space-y-2.5">
                {QA_ASSERTION_TYPES.map((a) => (
                  <div
                    key={a.type}
                    className="p-3 rounded-lg border border-border bg-card/60 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        {a.label}
                      </span>
                      <code className="text-2xs font-mono px-1.5 py-0.2 rounded bg-muted text-primary border border-border">
                        tipo: {a.type}
                      </code>
                    </div>
                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                      {a.description}
                    </p>
                    <div className="pt-1 flex items-center gap-2 font-mono text-2xs text-muted-foreground">
                      <span>Exemplo de valor esperado:</span>
                      <code className="px-1.5 py-0.2 rounded bg-background border border-border text-foreground font-semibold">
                        {a.example}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA 3: Exportação & Compartilhamento */}
          {activeTab === 'export' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-lg border border-border bg-card space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 mt-0.5">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-xs">Exportar o Template Ativo</h4>
                    <p className="text-muted-foreground text-[11px] mt-1 leading-relaxed">
                      Na barra superior do <strong>Validador Regressivo</strong> ou durante a edição de um template no Gerenciador, clique em <strong>"Exportar Template"</strong> para fazer o download imediato do arquivo <code className="font-mono text-primary font-semibold">.json</code>. Esse arquivo contém todos os passos, queries SQL, binds padrão e asserções.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 pt-2 border-t border-border">
                  <div className="p-1.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0 mt-0.5">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-xs">Exportar Todos (Backup em Lote)</h4>
                    <p className="text-muted-foreground text-[11px] mt-1 leading-relaxed">
                      No Gerenciador de Templates, use o botão <strong>"Exportar Todos"</strong> para gerar um arquivo único de backup contendo todos os cenários da equipe. É perfeito para versionar no Git do projeto ou restaurar o ambiente.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 pt-2 border-t border-border">
                  <div className="p-1.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0 mt-0.5">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-xs">Importar Template JSON</h4>
                    <p className="text-muted-foreground text-[11px] mt-1 leading-relaxed">
                      Recebeu um template de outro colega ou baixou do repositório? Clique em <strong>"Importar JSON"</strong> no Gerenciador de Templates para adicioná-lo instantaneamente à sua suíte de validação local.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 4: Exemplo de JSON */}
          {activeTab === 'sample' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Estrutura canônica de um arquivo de template de regressivo:
                </span>
                <button
                  type="button"
                  onClick={handleCopySample}
                  className="px-2.5 py-1 rounded bg-background hover:bg-muted text-foreground border border-border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {copiedKey === 'sample-json' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                  <span>Copiar JSON</span>
                </button>
              </div>

              <div className="rounded-lg border border-border bg-background p-3 overflow-x-auto max-h-72">
                <pre className="font-mono text-[11px] text-foreground leading-relaxed">
                  {SAMPLE_TEMPLATE_JSON}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com Fechar */}
        <div className="px-5 py-3 border-t border-border bg-card/80 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-muted-foreground font-mono">
            Dev Manager · Módulo de Qualidade &amp; Regressivo
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-colors cursor-pointer"
          >
            Entendi, fechar
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Globe, BookOpen } from 'lucide-react';
import { useHttpClientState } from '../hooks/http/useHttpClientState';
import { HttpSidebar } from '../components/http/HttpSidebar';
import { HttpRequestBar } from '../components/http/HttpRequestBar';
import { HttpRequestEditorTabs } from '../components/http/HttpRequestEditorTabs';
import { HttpResponseViewer } from '../components/http/HttpResponseViewer';
import { HttpEnvironmentModal } from '../components/http/HttpEnvironmentModal';
import { HttpImportPostmanModal } from '../components/http/HttpImportPostmanModal';
import { HttpCurlModal } from '../components/http/HttpCurlModal';
import { HttpAiDiagnosticModal } from '../components/http/HttpAiDiagnosticModal';

interface HttpClientPageProps {
  onNavigateToSettings?: () => void;
  onNavigateToQaRegression?: (rawJson: string) => void;
  settingsVersion?: number;
  isActive?: boolean;
}

export const HttpClientPage: React.FC<HttpClientPageProps> = ({
  onNavigateToQaRegression
}) => {
  const state = useHttpClientState();

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background">
      {/* Topo / Header do Módulo */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-card border-b border-border select-none">
        <div className="flex items-center gap-2.5">
          <Globe className="w-5 h-5 text-muted-foreground" />
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight leading-tight">API Studio</h1>
            <p className="text-[13px] text-muted-foreground">
              Teste e homologação de APIs REST WinThor/Karaf com coleções Postman, variáveis e autenticação automática.
            </p>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal Dividido: Sidebar vs Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Esquerda: Coleções, Pastas e Ambientes */}
        <HttpSidebar
          collections={state.collections}
          environments={state.environments}
          selectedEnvId={state.selectedEnvId}
          onSelectEnv={state.setSelectedEnvId}
          onOpenEnvModal={() => state.setIsEnvModalOpen(true)}
          onOpenImportModal={() => state.setIsImportModalOpen(true)}
          activeRequestId={state.currentRequest.id}
          onSelectRequest={state.setCurrentRequest}
          onNewRequest={state.handleNewRequest}
          onNewCollection={() => state.setIsImportModalOpen(true)}
          onDeleteRequest={state.handleDeleteRequest}
          onDeleteCollection={state.handleDeleteCollection}
          onRestoreHistory={state.handleRestoreHistory}
          onClearHistory={state.handleClearHistory}
          history={state.history}
        />

        {/* Workspace Central */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Barra de Requisição: Método, URL e Botão Enviar */}
          <HttpRequestBar
            method={state.currentRequest.method}
            setMethod={(method) => state.setCurrentRequest({ ...state.currentRequest, method })}
            url={state.currentRequest.url}
            setUrl={(url) => state.setCurrentRequest({ ...state.currentRequest, url })}
            onSend={state.handleExecute}
            onSave={state.handleSaveRequest}
            onOpenCurlModal={(mode) => {
              state.setCurlModalMode(mode);
              state.setIsCurlModalOpen(true);
            }}
            isLoading={state.isLoading}
          />

          {/* Painéis: Editor de Parâmetros/Body vs Visualizador de Resposta */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Editor de Requisição */}
            <div className="flex-1 flex flex-col overflow-hidden min-h-[300px]">
              <HttpRequestEditorTabs
                request={state.currentRequest}
                onRequestChange={state.setCurrentRequest}
                activeToken={state.activeToken}
                onLoginWinThorPrompt={() => state.setIsEnvModalOpen(true)}
              />
            </div>

            {/* Visualizador de Resposta */}
            <div className="flex-1 flex flex-col overflow-hidden min-h-[300px]">
              <HttpResponseViewer
                response={state.response}
                isLoading={state.isLoading}
                onSendToQaRegression={onNavigateToQaRegression}
                onUpdateActiveToken={state.handleUpdateActiveToken}
                onOpenAiDiagnostic={() => state.setIsAiModalOpen(true)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modais Globais do Módulo */}
      <HttpEnvironmentModal
        isOpen={state.isEnvModalOpen}
        onClose={() => state.setIsEnvModalOpen(false)}
        environments={state.environments}
        selectedEnvId={state.selectedEnvId}
        onSaveEnvironments={state.handleSaveEnvironments}
        onSelectEnvironment={state.setSelectedEnvId}
        onTokenUpdated={(token) => {
          state.loadData();
        }}
      />

      <HttpImportPostmanModal
        isOpen={state.isImportModalOpen}
        onClose={() => state.setIsImportModalOpen(false)}
        onImportSuccess={state.handleImportSuccess}
      />

      <HttpCurlModal
        isOpen={state.isCurlModalOpen}
        onClose={() => state.setIsCurlModalOpen(false)}
        mode={state.curlModalMode}
        currentRequest={state.currentRequest}
        activeToken={state.activeToken}
        onImportSuccess={state.handleImportCurl}
      />

      {state.response && (
        <HttpAiDiagnosticModal
          isOpen={state.isAiModalOpen}
          onClose={() => state.setIsAiModalOpen(false)}
          request={state.currentRequest}
          response={state.response}
        />
      )}
    </div>
  );
};

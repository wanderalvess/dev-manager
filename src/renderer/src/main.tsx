import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { initApiBridge } from './services/apiBridge';
import './index.css';

// Inicializa a ponte API para suporte tanto em Electron quanto em Web/Docker
initApiBridge();

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[React Error Boundary] Erro não tratado:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || String(this.state.error);

      return (
        <div className="h-screen w-screen bg-[#080c14] text-white flex flex-col items-center justify-center p-6 select-text">
          <div className="max-w-xl w-full bg-[#111928] border border-red-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-wide">Erro de Renderização da Interface</h2>
                <span className="text-2xs text-rose-400 font-mono">React Runtime Exception</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Ocorreu uma falha inesperada durante a execução da interface. Detalhes técnicos do erro:
            </p>

            <div className="bg-[#070a10] p-4 rounded-xl border border-red-500/30 font-mono text-xs text-rose-300 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-48">
              {errorMessage}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white font-semibold text-xs rounded-xl border border-slate-600 hover:border-slate-500 transition-all shadow-md cursor-pointer"
              >
                Limpar Cache Local &amp; Recarregar
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(errorMessage);
                  }}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl font-medium border border-slate-600 transition-colors"
                  title="Copiar mensagem de erro"
                >
                  Copiar Erro
                </button>

                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white text-xs rounded-xl font-bold transition-all shadow-lg shadow-orange-600/30 border border-orange-400/40 hover:scale-[1.02] cursor-pointer"
                >
                  Recarregar Painel
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

console.log('[React] Inicializando Dev Manager...');

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
  console.log('[React] Renderização concluída com sucesso.');
} else {
  console.error('[React] Erro: Elemento #root não foi encontrado no HTML.');
}

import React from 'react';
import { BookOpen } from 'lucide-react';
import { useMarkdownReader } from '../hooks/markdown/useMarkdownReader';
import { MarkdownBlocks } from './markdown/MarkdownBlocks';
import { MarkdownReaderHeader } from './markdown/MarkdownReaderHeader';
import { MarkdownReaderToolbar } from './markdown/MarkdownReaderToolbar';
import { MarkdownTocDrawer } from './markdown/MarkdownTocDrawer';

interface MarkdownReaderProps {
  title: string;
  filePath: string;
  content: string;
  isLoading?: boolean;
  onClose: () => void;
  onOpenInEditor?: (filePath: string) => void;
  onOpenInFolder?: (filePath: string) => void;
  headerCenter?: React.ReactNode;
  headerLeftExtra?: React.ReactNode;
  hideBadge?: boolean;
  bannerExtra?: React.ReactNode;
  footerExtra?: React.ReactNode;
}

const FONT_SIZE_CLASS = {
  sm: 'text-xs md:text-[13px]',
  base: 'text-[14px] md:text-[15px]',
  lg: 'text-[16px] md:text-[17px]'
} as const;

export const MarkdownReader: React.FC<MarkdownReaderProps> = ({
  title,
  filePath,
  content,
  isLoading = false,
  onClose,
  onOpenInEditor,
  onOpenInFolder,
  headerCenter,
  headerLeftExtra,
  hideBadge = false,
  bannerExtra,
  footerExtra
}) => {
  const reader = useMarkdownReader(content, onClose);
  const { viewMode, headings, isTocOpen } = reader;

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 transition-all duration-300 animate-in fade-in-0`}
    >
      <div
        className={`bg-card border border-border/80 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          reader.isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-5xl h-[90vh] rounded-3xl'
        }`}
      >
        <MarkdownReaderHeader
          title={title}
          filePath={filePath}
          hideBadge={hideBadge}
          headerLeftExtra={headerLeftExtra}
          headerCenter={headerCenter}
          viewMode={viewMode}
          onViewModeChange={reader.setViewMode}
          headingsCount={headings.length}
          isTocOpen={isTocOpen}
          onToggleToc={() => reader.setIsTocOpen(!isTocOpen)}
          copiedAll={reader.copiedAll}
          onCopyAll={reader.handleCopyAll}
          onOpenInEditor={onOpenInEditor}
          onOpenInFolder={onOpenInFolder}
          isFullscreen={reader.isFullscreen}
          onToggleFullscreen={() => reader.setIsFullscreen(!reader.isFullscreen)}
          onClose={onClose}
        />

        <MarkdownReaderToolbar
          searchTerm={reader.searchTerm}
          onSearchChange={reader.setSearchTerm}
          viewMode={viewMode}
          fontSizeLevel={reader.fontSizeLevel}
          onFontSizeChange={reader.setFontSizeLevel}
          stats={reader.stats}
        />

        {/* Banner Opcional de Informação Contextual */}
        {bannerExtra && <div className="border-b border-border/60 bg-primary/5 shrink-0">{bannerExtra}</div>}

        {/* Área de leitura (com painel de tópicos opcional) */}
        <div className="flex-1 flex overflow-hidden relative">
          {isTocOpen && headings.length > 0 && viewMode === 'formatted' && (
            <MarkdownTocDrawer
              headings={headings}
              onSelect={reader.scrollToHeading}
              onClose={() => reader.setIsTocOpen(false)}
            />
          )}

          <main className="flex-1 overflow-y-auto p-4 sm:p-5 md:px-8 md:py-4 scroll-smooth">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span className="text-xs font-bold uppercase tracking-widest text-primary">Carregando documento...</span>
              </div>
            ) : viewMode === 'raw' ? (
              <div className="font-mono text-xs leading-relaxed text-foreground bg-muted/20 p-5 rounded-2xl border border-border/80 select-text whitespace-pre-wrap">
                {content || '(Arquivo vazio)'}
              </div>
            ) : (
              <article className={`max-w-4xl mx-auto ${FONT_SIZE_CLASS[reader.fontSizeLevel]} select-text`}>
                {content ? (
                  <MarkdownBlocks
                    blocks={reader.blocks}
                    searchTerm={reader.searchTerm}
                    copiedCodeIndex={reader.copiedCodeIndex}
                    onCopyCode={reader.handleCopyCodeBlock}
                  />
                ) : (
                  <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                    <BookOpen className="w-8 h-8 text-muted-foreground/50 mb-1" />
                    <span className="font-semibold text-sm">Nenhum conteúdo para exibir</span>
                    <span className="text-xs text-muted-foreground/80">O documento selecionado não possui texto ou seções formatadas.</span>
                  </div>
                )}
              </article>
            )}
          </main>
        </div>

        <footer className="px-5 py-2.5 border-t border-border/80 bg-muted/30 flex items-center justify-between text-xs shrink-0">
          <div className="text-muted-foreground flex items-center gap-2 text-[11px]">
            <span className="font-bold text-foreground">Dica:</span> Pressione <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono font-bold">Esc</kbd> para fechar o leitor.
          </div>
          <div className="flex items-center gap-2">
            {footerExtra}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold transition cursor-pointer active:scale-95 shadow-2xs"
            >
              Concluir Leitura
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

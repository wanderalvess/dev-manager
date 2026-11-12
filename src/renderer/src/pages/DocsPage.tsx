import React, { useEffect, useState } from 'react';
import { FileSearch, BookOpen } from 'lucide-react';
import type { DocSearchResult, DocsIndexStatus } from '../../../shared/types';
import type { SettingsTab } from '../components/settings/settingsSearchData';
import { MarkdownReader } from '../components/MarkdownReader';

export const DocsPage: React.FC<{ onNavigateToSettings: (tab: SettingsTab) => void; settingsVersion: number }> = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DocSearchResult[]>([]);
  const [status, setStatus] = useState<DocsIndexStatus | null>(null);
  const [reading, setReading] = useState<{ title: string; path: string; content: string } | null>(null);

  const search = async (q = query) => {
    const [res, st] = await Promise.all([
      window.electronAPI.searchDocs(q),
      window.electronAPI.getDocsIndexStatus()
    ]);
    if (Array.isArray(res)) setResults(res);
    setStatus(st);
  };

  useEffect(() => {
    void search('');
  }, []);

  const openDoc = async (doc: DocSearchResult) => {
    const res = await fetch(`/api/docs/read?path=${encodeURIComponent(doc.path)}`).then((r) => r.json());
    setReading({ title: doc.title, path: doc.path, content: res.content || doc.snippet });
  };

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-foreground flex items-center gap-2">
            <FileSearch className="w-5 h-5 text-primary" /> Documentação &amp; Busca Semântica
          </h1>
          <p className="text-xs text-muted-foreground">
            {status ? `${status.totalFiles} arquivos Markdown indexados no repositório.` : 'Carregando índice...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void search()}
            placeholder="Buscar em README, decisões, guias..."
            className="px-3 py-1.5 rounded-xl border border-border bg-card text-xs w-72 focus:outline-none focus:border-primary"
          />
          <button type="button" onClick={() => void search()} className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold cursor-pointer">
            Buscar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {results.map((doc) => (
          <button
            key={doc.id}
            type="button"
            onClick={() => void openDoc(doc)}
            className="bg-card border border-border hover:border-primary/40 rounded-xl p-4 text-left space-y-1.5 transition cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-foreground flex items-center gap-1.5 truncate">
                <BookOpen className="w-4 h-4 text-primary shrink-0" /> {doc.title}
              </span>
              <span className="text-2xs font-mono text-primary shrink-0">{Math.round(doc.score * 100)}%</span>
            </div>
            <div className="text-2xs font-mono text-muted-foreground">{doc.path}</div>
            <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-line">{doc.snippet}</p>
          </button>
        ))}
      </div>

      {reading && (
        <MarkdownReader
          title={reading.title}
          filePath={reading.path}
          content={reading.content}
          onClose={() => setReading(null)}
        />
      )}
    </div>
  );
};

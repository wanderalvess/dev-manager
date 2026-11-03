import React, { useState } from 'react';
import { ArrowRight, ChevronDown, LifeBuoy, Search, X } from 'lucide-react';
import { FaqItem } from '../helpData';
import { helpPageVisibleCategories } from '../../../utils/helpPageUtils';

interface HelpFaqTabProps {
  faqCategories: string[];
  categoryCounts: Record<string, number>;
  faqCategoryFilter: string;
  setFaqCategoryFilter: (cat: string) => void;
  filteredFaqs: FaqItem[];
  expandedFaqs: Record<string, boolean>;
  toggleFaq: (id: string, currentlyOpen: boolean) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onNavigate?: (tab: string) => void;
}

/** Resolver problemas: filtro por texto e assunto, e a resposta de cada pergunta abrindo no lugar. */
export const HelpFaqTab: React.FC<HelpFaqTabProps> = ({
  faqCategories,
  categoryCounts,
  faqCategoryFilter,
  setFaqCategoryFilter,
  filteredFaqs,
  expandedFaqs,
  toggleFaq,
  searchQuery,
  setSearchQuery,
  onNavigate
}) => {
  // Com um termo digitado as respostas já vêm abertas; sem ele, só as que o usuário abriu
  const openByDefault = Boolean(searchQuery.trim());
  const [showAllTopics, setShowAllTopics] = useState(false);
  const visibleCategories = helpPageVisibleCategories(faqCategories, categoryCounts, faqCategoryFilter, showAllTopics);
  const hiddenTopics = faqCategories.length - visibleCategories.length;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-primary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            aria-label="Filtrar problemas"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar: porta em uso, missing requirement, client.bat…"
            className="w-full h-10 bg-card border border-input rounded-[10px] pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Limpar filtro"
              aria-label="Limpar filtro"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div role="group" aria-label="Assunto" className="flex flex-wrap gap-1.5">
          {visibleCategories.map((cat) => {
            const active = faqCategoryFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setFaqCategoryFilter(cat)}
                aria-pressed={active}
                className={`h-8 px-3 rounded-full text-xs font-semibold transition-colors border cursor-pointer flex items-center gap-1.5 ${
                  active
                    ? 'bg-accent text-accent-foreground border-primary/40'
                    : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted'
                }`}
              >
                {cat === 'all' ? 'Todas' : cat}
                <span className="font-mono text-2xs opacity-80">{categoryCounts[cat] ?? 0}</span>
              </button>
            );
          })}
          {(hiddenTopics > 0 || showAllTopics) && (
            <button
              type="button"
              onClick={() => setShowAllTopics((v) => !v)}
              className="h-8 px-3 rounded-full text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              {showAllTopics ? 'Mostrar menos' : `Mais ${hiddenTopics} assuntos`}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2.5" aria-live="polite">
        {filteredFaqs.length === 0 ? (
          <div className="cockpit-panel rounded-[14px] p-8 text-center border border-border space-y-2">
            <LifeBuoy className="w-8 h-8 text-muted-foreground mx-auto" />
            <h3 className="text-sm font-semibold text-foreground">Nenhum problema com esses filtros</h3>
            <p className="text-xs text-muted-foreground">
              Tente uma palavra da mensagem de erro, como "porta", "uac", "karaf", "mcp" ou "git".
            </p>
            {(searchQuery || faqCategoryFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setFaqCategoryFilter('all');
                }}
                className="mt-2 h-8 px-3 bg-primary text-primary-foreground rounded-lg text-xs font-semibold cursor-pointer"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          filteredFaqs.map((faq) => {
            const isOpen = expandedFaqs[faq.id] ?? openByDefault;
            return (
              <div
                key={faq.id}
                id={`help-faq-${faq.id}`}
                className={`cockpit-panel rounded-[14px] border overflow-hidden scroll-mt-2 transition-colors ${
                  isOpen ? 'border-primary/40' : 'border-border'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(faq.id, isOpen)}
                  aria-expanded={isOpen}
                  className="w-full px-4 py-3 text-left flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors cursor-pointer"
                >
                  <span className="min-w-0 space-y-1">
                    <span className="block text-sm font-semibold text-foreground leading-snug">{faq.question}</span>
                    <span className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full bg-accent text-accent-foreground">
                      {faq.category}
                    </span>
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {isOpen && <div className="px-4 pb-4 pt-2 border-t border-border/60 bg-card/40">{faq.answer}</div>}
              </div>
            );
          })
        )}
      </div>

      {onNavigate && (
        <div className="rounded-[14px] border border-primary/30 bg-accent/40 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="max-w-xl">
            <h3 className="text-sm font-semibold text-foreground">Não achou o que procurava?</h3>
            <p className="text-xs text-muted-foreground">
              Pergunte à IA em Documentação: ela responde com base nos manuais indexados e cita a fonte.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('docs')}
            className="h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 cursor-pointer"
          >
            Abrir Documentação <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

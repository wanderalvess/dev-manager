import React from 'react';
import {
  LifeBuoy,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { FaqItem } from '../helpData';

interface HelpFaqTabProps {
  faqCategories: string[];
  faqCategoryFilter: string;
  setFaqCategoryFilter: (cat: string) => void;
  filteredFaqs: FaqItem[];
  expandedFaqs: Record<string, boolean>;
  toggleFaq: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const HelpFaqTab: React.FC<HelpFaqTabProps> = ({
  faqCategories,
  faqCategoryFilter,
  setFaqCategoryFilter,
  filteredFaqs,
  expandedFaqs,
  toggleFaq,
  searchQuery,
  setSearchQuery
}) => {
  return (
    <div className="space-y-4">
      {/* Filtros por Categoria do FAQ */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 shrink-0 scrollbar-none">
        {faqCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFaqCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 border cursor-pointer ${
              faqCategoryFilter === cat
                ? 'bg-primary/15 text-primary border-primary/30 font-bold'
                : 'bg-card/50 text-muted-foreground border-border hover:text-foreground hover:bg-card'
            }`}
          >
            {cat === 'all' ? 'Todas as Perguntas' : cat}
          </button>
        ))}
      </div>

      {/* Lista Accordion */}
      <div className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <div className="cockpit-panel rounded-xl p-8 text-center border border-border space-y-2">
            <LifeBuoy className="w-8 h-8 text-muted-foreground mx-auto" />
            <h4 className="text-xs font-bold text-foreground">Nenhuma pergunta encontrada</h4>
            <p className="text-2xs text-muted-foreground">
              Nenhum tópico correspondeu aos filtros atuais. Tente pesquisar por termos como "porta", "uac", "karaf", "mcp" ou "git".
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 px-3 py-1 bg-primary text-primary-foreground rounded-lg text-xs font-bold cursor-pointer"
              >
                Limpar Termo de Busca
              </button>
            )}
          </div>
        ) : (
          filteredFaqs.map((faq) => {
            const isExpanded = expandedFaqs[faq.id] ?? true;
            return (
              <div
                key={faq.id}
                className="cockpit-panel rounded-xl border border-border overflow-hidden transition-all shadow-md"
              >
                <button
                  onClick={() => toggleFaq(faq.id)}
                  className="w-full p-4 text-left flex items-start justify-between gap-3 hover:bg-card/70 transition-colors cursor-pointer"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {faq.category}
                      </span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5 pt-0.5">
                      {faq.question}
                    </h4>
                  </div>
                  <div className="p-1.5 rounded-lg bg-muted text-muted-foreground shrink-0 mt-0.5">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-border/60 bg-card/40">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Grid,
  GitPullRequest,
  Terminal,
  Layers,
  Settings,
  HelpCircle,
  RefreshCw,
  Zap,
  X,
  Star,
  Box,
  ScrollText,
  Database,
  FileSearch,
  GitBranch
} from 'lucide-react';
import { AppLogo } from './AppLogo';
import { GitProjectInfo, RoutineItem } from '../../../shared/types';
import { fuzzyMatchBest } from '../utils/fuzzyMatch';

interface QuickLauncherItem {
  id: string;
  category: 'action' | 'routine' | 'repo';
  title: string;
  subtitle?: string;
  badge?: string;
  icon: React.ElementType;
  onSelect: () => void;
  isFavorite?: boolean;
  /** Score de relevância fuzzy (maior = melhor). Ausente/0 quando a busca está vazia. */
  score?: number;
  /** Índices do título que casaram com a busca, para highlight. */
  titleMatchIndices?: number[];
}

/** Renderiza o título destacando os caracteres que casaram com a busca fuzzy. */
const HighlightedText: React.FC<{ text: string; matchedIndices?: number[] }> = ({
  text,
  matchedIndices
}) => {
  if (!matchedIndices || matchedIndices.length === 0) return <>{text}</>;
  const matchSet = new Set(matchedIndices);
  return (
    <>
      {text.split('').map((char, idx) =>
        matchSet.has(idx) ? (
          <mark key={idx} className="bg-transparent text-amber-400 font-extrabold">
            {char}
          </mark>
        ) : (
          <React.Fragment key={idx}>{char}</React.Fragment>
        )
      )}
    </>
  );
};

interface QuickLauncherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  projects: GitProjectInfo[];
  onRefreshAll: () => void;
}

export const QuickLauncherModal: React.FC<QuickLauncherModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  projects,
  onRefreshAll
}) => {
  const [search, setSearch] = useState<string>('');
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Carregar rotinas Delphi
  useEffect(() => {
    if (isOpen && window.electronAPI) {
      window.electronAPI.listRoutines().then((data) => {
        setRoutines(data || []);
      });
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Lista agregada e filtrada de itens
  const filteredItems = useMemo<QuickLauncherItem[]>(() => {
    const q = search.trim().toLowerCase();
    const items: QuickLauncherItem[] = [];

    // 1. Ações Globais do Sistema
    const defaultActions: QuickLauncherItem[] = [
      {
        id: 'act-env',
        category: 'action',
        title: 'Ambiente Dev (Cockpit)',
        subtitle: 'Parar serviços, matar processos e abrir IDE + Servidor Debug',
        badge: 'Alt+1',
        icon: Terminal,
        onSelect: () => {
          onNavigate('env');
          onClose();
        }
      },
      {
        id: 'act-database',
        category: 'action',
        title: 'Banco de Dados',
        subtitle: 'Conexão e SQL runner Oracle, MySQL e Postgres',
        badge: 'Alt+2',
        icon: Database,
        onSelect: () => {
          onNavigate('database');
          onClose();
        }
      },
      {
        id: 'act-containers',
        category: 'action',
        title: 'Containers',
        subtitle: 'Gerenciamento de containers (Docker / Podman), métricas e logs',
        badge: 'Alt+3',
        icon: Box,
        onSelect: () => {
          onNavigate('containers');
          onClose();
        }
      },
      {
        id: 'act-deploy',
        category: 'action',
        title: 'Deploy',
        subtitle: 'Perfis de deploy sequenciais — Karaf, Containers ou comando genérico',
        badge: 'Alt+4',
        icon: Layers,
        onSelect: () => {
          onNavigate('deploy');
          onClose();
        }
      },
      {
        id: 'act-git',
        category: 'action',
        title: 'Git & Azure DevOps Hub',
        subtitle: 'Sincronizar repositórios e gerar Pull Requests',
        badge: 'Alt+5',
        icon: GitPullRequest,
        onSelect: () => {
          onNavigate('git');
          onClose();
        }
      },
      {
        id: 'act-routines',
        category: 'action',
        title: 'Catálogo de Rotinas',
        subtitle: 'Executar executáveis (.EXE e .PC)',
        badge: 'Alt+6',
        icon: Grid,
        onSelect: () => {
          onNavigate('routines');
          onClose();
        }
      },
      {
        id: 'act-docs',
        category: 'action',
        title: 'Documentação Semântica',
        subtitle: 'Busca semântica RAG na documentação dos projetos',
        badge: 'Alt+7',
        icon: FileSearch,
        onSelect: () => {
          onNavigate('docs');
          onClose();
        }
      },
      {
        id: 'act-logs',
        category: 'action',
        title: 'Logs em Tempo Real (Tail -f)',
        subtitle: 'Monitorar em tempo real os arquivos de log configurados',
        badge: 'Alt+8',
        icon: ScrollText,
        onSelect: () => {
          onNavigate('logs');
          onClose();
        }
      },
      {
        id: 'act-help',
        category: 'action',
        title: 'Ajuda & Diagnósticos',
        subtitle: 'FAQ, diagnósticos de rede e atalhos de teclado',
        badge: 'Alt+9',
        icon: HelpCircle,
        onSelect: () => {
          onNavigate('help');
          onClose();
        }
      },
      {
        id: 'act-settings',
        category: 'action',
        title: 'Configurações do Sistema',
        subtitle: 'Gerenciar caminhos, portas e serviços monitorados',
        icon: Settings,
        onSelect: () => {
          onNavigate('settings');
          onClose();
        }
      },
      {
        id: 'act-refresh',
        category: 'action',
        title: 'Recarregar Status Geral',
        subtitle: 'Atualizar portas, serviços e repositórios em tempo real',
        icon: RefreshCw,
        onSelect: () => {
          onRefreshAll();
          onClose();
        }
      }
    ];

    /** Aplica fuzzy match (título + subtítulo) e retorna o item enriquecido, ou null se não casar. */
    const withFuzzyMatch = (item: QuickLauncherItem): QuickLauncherItem | null => {
      if (!q) return item;
      const best = fuzzyMatchBest(q, [item.title, item.subtitle ?? '']);
      if (best.fieldIndex === -1) return null;
      return {
        ...item,
        score: best.score,
        titleMatchIndices: best.fieldIndex === 0 ? best.matchedIndices : undefined
      };
    };

    defaultActions.forEach((act) => {
      const matched = withFuzzyMatch(act);
      if (matched) items.push(matched);
    });

    // 2. Rotinas (Executáveis)
    routines.forEach((r) => {
      const matched = withFuzzyMatch({
        id: `rt-${r.id}`,
        category: 'routine',
        title: `Rotina ${r.name}`,
        subtitle: `Módulo ${r.module} • ${r.sizeMb} • ${r.id}`,
        badge: r.id,
        icon: Grid,
        isFavorite: r.isFavorite,
        onSelect: async () => {
          if (window.electronAPI) {
            await window.electronAPI.launchRoutine(r.fullPath);
          }
          onClose();
        }
      });
      if (matched) items.push(matched);
    });

    // 3. Repositórios Git
    projects.forEach((p) => {
      const matched = withFuzzyMatch({
        id: `repo-${p.name}`,
        category: 'repo',
        title: `Projeto ${p.name}`,
        subtitle: `Branch: ${p.currentBranch} ${p.uncommittedCount ? `(${p.uncommittedCount} mods)` : ''}`,
        badge: 'Git',
        icon: GitBranch,
        onSelect: () => {
          onNavigate('git');
          onClose();
        }
      });
      if (matched) items.push(matched);
    });

    // Favoritos primeiro, depois por relevância fuzzy (só importa quando há busca ativa).
    if (q) {
      items.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    }

    return items;
  }, [search, routines, projects, onNavigate, onRefreshAll, onClose]);

  // Resetar índice quando os resultados mudarem
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems.length]);

  // Rolar item selecionado para a visão
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].onSelect();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Campo de Busca Input */}
        <div className="p-4 border-b border-border/80 flex items-center space-x-3 bg-muted/30">
          <AppLogo size="xs" />
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Digite o número da rotina, nome do projeto ou ação..."
            className="w-full bg-transparent text-sm text-foreground font-sans placeholder:text-muted-foreground focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-[10px] bg-muted px-2 py-1 rounded border border-border/60 text-muted-foreground font-mono">
            ESC para fechar
          </span>
        </div>

        {/* Lista de Resultados */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs">
              Nenhum resultado encontrado para <code className="font-mono text-foreground">{search}</code>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={item.onSelect}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                      : 'hover:bg-muted/60 text-foreground'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isSelected
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-muted border border-border/60 text-muted-foreground'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold truncate">
                          <HighlightedText text={item.title} matchedIndices={item.titleMatchIndices} />
                        </span>
                        {item.isFavorite && (
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                        )}
                      </div>
                      {item.subtitle && (
                        <p
                          className={`text-[11px] truncate ${
                            isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                          }`}
                        >
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border shrink-0 ${
                        isSelected
                          ? 'bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30'
                          : 'bg-muted text-muted-foreground border-border/60'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé com Dicas de Navegação */}
        <div className="px-4 py-2 bg-muted/40 border-t border-border/80 text-[11px] text-muted-foreground flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/60 font-mono text-[10px]">
                ↑↓
              </kbd>{' '}
              Navegar
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/60 font-mono text-[10px]">
                ↵
              </kbd>{' '}
              Executar
            </span>
          </div>
          <div className="flex items-center space-x-1 font-mono text-[10px]">
            <Zap className="w-3 h-3 text-amber-500" />
            <span>{filteredItems.length} resultados</span>
          </div>
        </div>
      </div>
    </div>
  );
};

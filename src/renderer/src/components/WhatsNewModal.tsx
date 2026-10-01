import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  History,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Calendar,
  Sparkles,
  Layers,
  Search,
  RotateCcw,
  Tag
} from 'lucide-react';
import { MarkdownReader } from './MarkdownReader';
import { parseChangelogVersions, ChangelogVersion } from '../utils/changelogUtils';

export interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
  changelogContent: string;
  currentAppVersion?: string;
  initialVersion?: string;
}

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({
  isOpen,
  onClose,
  changelogContent,
  currentAppVersion,
  initialVersion
}) => {
  const parsedVersions = useMemo<ChangelogVersion[]>(() => {
    return parseChangelogVersions(changelogContent);
  }, [changelogContent]);

  const defaultVersion = useMemo(() => {
    if (initialVersion) return initialVersion;
    if (currentAppVersion) {
      const match = parsedVersions.find(
        (v) => v.version.toLowerCase() === currentAppVersion.toLowerCase().replace(/^v/, '')
      );
      if (match) return match.version;
    }
    return parsedVersions[0]?.version || 'all';
  }, [initialVersion, currentAppVersion, parsedVersions]);

  const [selectedVersion, setSelectedVersion] = useState<string>(defaultVersion);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [dropdownSearch, setDropdownSearch] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sincroniza versão padrão caso mude o conteúdo
  useEffect(() => {
    setSelectedVersion(defaultVersion);
  }, [defaultVersion]);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  const currentIndex = useMemo(() => {
    return parsedVersions.findIndex((v) => v.version === selectedVersion);
  }, [parsedVersions, selectedVersion]);

  const isAllVersions = selectedVersion === 'all';
  const isLatestVersion = currentIndex === 0;
  const latestVersion = parsedVersions[0]?.version;
  const currentVersionItem = currentIndex >= 0 ? parsedVersions[currentIndex] : null;

  // No array ordenado de versões (recente -> antiga):
  // Próximo índice (+1) = versão anterior/mais antiga
  // Índice anterior (-1) = versão seguinte/mais nova
  const hasOlderVersion = !isAllVersions && currentIndex >= 0 && currentIndex < parsedVersions.length - 1;
  const hasNewerVersion = !isAllVersions && currentIndex > 0;

  const goToOlderVersion = () => {
    if (hasOlderVersion) {
      setSelectedVersion(parsedVersions[currentIndex + 1].version);
    }
  };

  const goToNewerVersion = () => {
    if (hasNewerVersion) {
      setSelectedVersion(parsedVersions[currentIndex - 1].version);
    }
  };

  // Suporte a atalhos de teclado de navegação entre releases
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        goToOlderVersion();
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        goToNewerVersion();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasOlderVersion, hasNewerVersion, currentIndex, parsedVersions]);

  // Lista de versões filtradas para o dropdown
  const filteredVersions = useMemo(() => {
    const q = dropdownSearch.trim().toLowerCase();
    if (!q) return parsedVersions;
    return parsedVersions.filter(
      (v) => v.version.toLowerCase().includes(q) || (v.date && v.date.includes(q))
    );
  }, [parsedVersions, dropdownSearch]);

  if (!isOpen) return null;

  const displayTitle = isAllVersions
    ? 'Histórico Completo de Mudanças'
    : 'Novidades da Versão';

  const displayContent = isAllVersions
    ? changelogContent
    : currentVersionItem?.content || changelogContent;

  // Controles de versão integrados ao cabeçalho (ao lado do título)
  const headerVersionControls = (
    <div className="flex items-center gap-1 relative shrink-0" ref={dropdownRef}>
      {/* Botão de versão anterior (mais antiga) */}
      <button
        type="button"
        onClick={goToOlderVersion}
        disabled={!hasOlderVersion}
        className="p-1 rounded-lg border border-border/80 bg-background hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
        title="Ver versão anterior mais antiga (Alt + Seta Esquerda)"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      {/* Gatilho do Dropdown de Versões */}
      <button
        type="button"
        onClick={() => {
          setIsDropdownOpen((prev) => !prev);
          setDropdownSearch('');
        }}
        className={`px-2.5 py-0.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
          isDropdownOpen
            ? 'bg-primary/15 border-primary text-primary'
            : 'bg-background hover:bg-muted border-border/80 text-foreground'
        }`}
        title="Alternar entre versões lançadas"
      >
        <History className="w-3.5 h-3.5 text-primary" />
        <span className="font-mono">
          {isAllVersions ? 'Todas as Versões' : `v${selectedVersion}`}
        </span>
        {isLatestVersion && (
          <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-sans font-bold">
            Atual
          </span>
        )}
        <ChevronDown
          className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${
            isDropdownOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {/* Botão de versão seguinte (mais recente) */}
      <button
        type="button"
        onClick={goToNewerVersion}
        disabled={!hasNewerVersion}
        className="p-1 rounded-lg border border-border/80 bg-background hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
        title="Ver versão seguinte mais recente (Alt + Seta Direita)"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>

      {/* Menu Suspenso (Dropdown Popover) */}
      {isDropdownOpen && (
        <div className="absolute top-full mt-1.5 left-0 w-72 bg-card border border-border/90 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in-0 zoom-in-95 duration-150 flex flex-col">
          {/* Campo de Busca Rápida no Dropdown */}
          <div className="relative mb-1.5">
            <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar versão (ex: 1.22)..."
              value={dropdownSearch}
              onChange={(e) => setDropdownSearch(e.target.value)}
              className="w-full bg-muted/50 border border-border/80 rounded-xl pl-7 pr-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              autoFocus
            />
          </div>

          {/* Opção Rápida: Ver Histórico Completo */}
          <button
            type="button"
            onClick={() => {
              setSelectedVersion('all');
              setIsDropdownOpen(false);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
              isAllVersions
                ? 'bg-primary text-primary-foreground font-bold'
                : 'hover:bg-muted text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span>Ver Histórico Completo</span>
            </div>
            {isAllVersions && <Check className="w-3.5 h-3.5" />}
          </button>

          <div className="my-1 border-t border-border/60" />

          {/* Lista de Versões */}
          <div className="max-h-56 overflow-y-auto space-y-0.5 text-xs pr-1">
            {filteredVersions.length === 0 ? (
              <div className="py-4 text-center text-muted-foreground text-xs">
                Nenhuma versão encontrada
              </div>
            ) : (
              filteredVersions.map((v, idx) => {
                const isSelected = selectedVersion === v.version;
                const isLatest = idx === 0;

                return (
                  <button
                    key={v.version}
                    type="button"
                    onClick={() => {
                      setSelectedVersion(v.version);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition cursor-pointer text-left ${
                      isSelected
                        ? 'bg-primary text-primary-foreground font-bold'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Tag className="w-3 h-3 shrink-0 opacity-70" />
                      <span className="font-mono font-bold truncate">v{v.version}</span>
                      {v.date && (
                        <span
                          className={`text-[10px] font-mono truncate ${
                            isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                          }`}
                        >
                          {v.date}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isLatest && (
                        <span
                          className={`px-1.5 py-0.2 rounded-md text-[9px] font-bold ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          Atual
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );

  // Banner compacto quando visualizando versão histórica
  const bannerContent =
    !isAllVersions && !isLatestVersion && currentVersionItem ? (
      <div className="px-5 py-2 flex items-center justify-between gap-3 text-xs bg-amber-500/10 border-b border-amber-500/30 text-amber-700 dark:text-amber-300">
        <div className="flex items-center gap-2 min-w-0">
          <History className="w-4 h-4 shrink-0 text-amber-500" />
          <span className="truncate">
            Você está visualizando as notas históricas da versão <strong>v{selectedVersion}</strong>
            {currentVersionItem.date ? ` (lançada em ${currentVersionItem.date})` : ''}.
          </span>
        </div>
        {latestVersion && (
          <button
            type="button"
            onClick={() => setSelectedVersion(latestVersion)}
            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 border border-amber-500/40 text-[11px] font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Voltar para v{latestVersion} (Mais recente)</span>
          </button>
        )}
      </div>
    ) : isAllVersions && latestVersion ? (
      <div className="px-5 py-2 flex items-center justify-between gap-3 text-xs bg-primary/10 border-b border-primary/20 text-primary">
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="w-4 h-4 shrink-0 text-primary" />
          <span className="truncate">
            Visualizando o <strong>histórico completo</strong> com todas as versões registradas.
          </span>
        </div>
        <button
          type="button"
          onClick={() => setSelectedVersion(latestVersion)}
          className="px-2.5 py-1 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 text-[11px] font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <Sparkles className="w-3 h-3" />
          <span>Ver apenas a versão atual (v{latestVersion})</span>
        </button>
      </div>
    ) : null;

  // Botões contextuais no rodapé à esquerda de "Concluir Leitura"
  const footerExtraButtons = (
    <div className="flex items-center gap-2">
      {isLatestVersion && parsedVersions.length > 1 && (
        <button
          type="button"
          onClick={() => {
            // Se estiver na mais recente, vai para a versão anterior ou abre histórico
            if (parsedVersions[1]) {
              setSelectedVersion(parsedVersions[1].version);
            } else {
              setSelectedVersion('all');
            }
          }}
          className="px-3 py-1.5 bg-card hover:bg-muted border border-border/80 text-foreground rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 text-xs shadow-xs"
          title="Ver o que mudou nas versões anteriores"
        >
          <History className="w-3.5 h-3.5 text-primary" />
          <span>Ver Versões Anteriores</span>
        </button>
      )}

      {!isLatestVersion && !isAllVersions && latestVersion && (
        <>
          <button
            type="button"
            onClick={() => setSelectedVersion(latestVersion)}
            className="px-3 py-1.5 bg-card hover:bg-muted border border-border/80 text-foreground rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 text-xs shadow-xs"
            title="Retornar para a versão mais recente"
          >
            <RotateCcw className="w-3.5 h-3.5 text-emerald-500" />
            <span>Voltar para v{latestVersion}</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedVersion('all')}
            className="px-3 py-1.5 bg-card hover:bg-muted border border-border/80 text-muted-foreground hover:text-foreground rounded-xl font-semibold transition cursor-pointer flex items-center gap-1.5 text-xs"
            title="Rolar por todo o changelog"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Histórico Completo</span>
          </button>
        </>
      )}
    </div>
  );

  return (
    <MarkdownReader
      title={displayTitle}
      filePath="CHANGELOG.md • Histórico oficial de releases"
      content={displayContent}
      onClose={onClose}
      headerLeftExtra={headerVersionControls}
      hideBadge={true}
      bannerExtra={bannerContent}
      footerExtra={footerExtraButtons}
    />
  );
};

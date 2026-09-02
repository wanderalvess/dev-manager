import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Flame, Zap, Check, Palette } from 'lucide-react';
import { useTheme, ThemeVariant } from '../context/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { mode, variant, setMode, setVariant } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown ao clicar fora ou ao pressionar Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const variantsList: {
    id: ThemeVariant;
    label: string;
    description: string;
    icon: typeof Flame;
    colorClass: string;
    bgPreview: string;
  }[] = [
    {
      id: 'default',
      label: 'Cockpit Âmbar',
      description: 'Laranja Solar & Slate Cockpit',
      icon: Flame,
      colorClass: 'text-orange-500',
      bgPreview: 'bg-orange-500'
    },
    {
      id: 'midnight',
      label: 'Midnight Tech',
      description: 'Azul Elétrico & Pitch Black',
      icon: Zap,
      colorClass: 'text-blue-400',
      bgPreview: 'bg-blue-500'
    }
  ];

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* Botão Acionador */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-lg border transition-all duration-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 ${
          isOpen
            ? 'bg-primary/15 border-primary/40 text-primary shadow-sm'
            : 'bg-card/70 hover:bg-card border-border/70 hover:border-border text-foreground'
        }`}
        title="Personalizar Tema e Aparência"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <div className="relative flex items-center justify-center w-4 h-4">
          {mode === 'dark' ? (
            <Moon className="w-3.5 h-3.5 text-blue-400 transition-transform duration-300" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-amber-500 transition-transform duration-300" />
          )}
        </div>

        {/* Indicador de cor do estilo ativo */}
        <span
          className={`w-2 h-2 rounded-full ring-2 ring-background ${
            variant === 'midnight'
              ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]'
              : 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]'
          }`}
        />

        <Palette className="w-3.5 h-3.5 text-muted-foreground" />
      </button>

      {/* Painel Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-72 origin-top-right rounded-xl bg-card border border-border/80 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
          role="menu"
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-border/60">
            <div className="flex items-center space-x-1.5">
              <Palette className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold tracking-tight text-foreground">
                Aparência & Tema
              </span>
            </div>
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
              {variant}
            </span>
          </div>

          {/* Seção 1: Modo de Exibição */}
          <div className="mb-3">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Modo de Exibição
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/60 rounded-lg border border-border/40">
              <button
                type="button"
                onClick={() => setMode('light')}
                className={`flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all ${
                  mode === 'light'
                    ? 'bg-card text-amber-600 shadow-sm border border-border/80 font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Modo Claro</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('dark')}
                className={`flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all ${
                  mode === 'dark'
                    ? 'bg-card text-blue-400 shadow-sm border border-border/80 font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-blue-400" />
                <span>Modo Escuro</span>
              </button>
            </div>
          </div>

          {/* Seção 2: Estilo Visual */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Estilo Visual
            </label>
            <div className="space-y-1.5">
              {variantsList.map((item) => {
                const Icon = item.icon;
                const isSelected = variant === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setVariant(item.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all border ${
                      isSelected
                        ? 'bg-primary/10 border-primary/40 shadow-sm'
                        : 'bg-muted/30 hover:bg-muted/70 border-transparent hover:border-border/60'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center border ${
                          isSelected
                            ? 'bg-primary/20 border-primary/40'
                            : 'bg-card border-border/60'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${item.colorClass}`} />
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-bold text-foreground leading-tight">
                            {item.label}
                          </span>
                          <span className={`w-2 h-2 rounded-full ${item.bgPreview}`} />
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

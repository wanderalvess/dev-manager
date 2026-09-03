import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark';
export type ThemeVariant = 'default' | 'midnight';

interface ThemeContextType {
  mode: ThemeMode;
  variant: ThemeVariant;
  setMode: (mode: ThemeMode) => void;
  setVariant: (variant: ThemeVariant) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = 'theme';
const VARIANT_KEY = 'theme-variant';

const getInitialMode = (): ThemeMode => {
  try {
    const savedMode = localStorage.getItem(THEME_KEY) as ThemeMode | null;
    if (savedMode === 'light' || savedMode === 'dark') {
      return savedMode;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
  } catch (e) {
    console.error('Erro ao ler preferência de tema do localStorage:', e);
  }
  return 'dark'; // Fallback padrão dark para o ambiente de desenvolvimento
};

const getInitialVariant = (): ThemeVariant => {
  try {
    const savedVariant = localStorage.getItem(VARIANT_KEY) as ThemeVariant | null;
    if (savedVariant === 'default' || savedVariant === 'midnight') {
      return savedVariant;
    }
  } catch (e) {
    console.error('Erro ao ler preferência de variante do localStorage:', e);
  }
  return 'default';
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(getInitialMode);
  const [variant, setVariantState] = useState<ThemeVariant>(getInitialVariant);

  const applyThemeClasses = (targetMode: ThemeMode, targetVariant: ThemeVariant) => {
    const root = document.documentElement;

    // Aplica/Remove classe dark
    if (targetMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Remove todas as variantes possíveis
    ['default', 'midnight', 'nebula', 'cyberpunk', 'nordic'].forEach((v) => {
      root.classList.remove(`theme-${v}`);
    });

    // Adiciona a variante selecionada
    root.classList.add(`theme-${targetVariant}`);
  };

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(THEME_KEY, newMode);
    } catch (e) {
      console.error('Erro ao salvar tema no localStorage:', e);
    }
    applyThemeClasses(newMode, variant);
  };

  const setVariant = (newVariant: ThemeVariant) => {
    setVariantState(newVariant);
    try {
      localStorage.setItem(VARIANT_KEY, newVariant);
    } catch (e) {
      console.error('Erro ao salvar variante no localStorage:', e);
    }
    applyThemeClasses(mode, newVariant);
  };

  const toggleMode = () => {
    const nextMode: ThemeMode = mode === 'dark' ? 'light' : 'dark';
    setMode(nextMode);
  };

  // Efeito inicial para garantir que o DOM esteja sincronizado
  useEffect(() => {
    applyThemeClasses(mode, variant);
  }, [mode, variant]);

  // Listener para mudanças no tema do sistema operacional se o usuário não tiver escolha salva
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const hasSavedTheme = localStorage.getItem(THEME_KEY);
      if (!hasSavedTheme) {
        setMode(e.matches ? 'dark' : 'light');
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setMode is redefined every render (closes over variant); the mode/variant effect above re-applies theme classes right after, so a stale closure here is harmless and re-subscribing each render would be pure churn
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, variant, setMode, setVariant, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components -- hook colocated with its provider on purpose
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser utilizado dentro de um ThemeProvider');
  }
  return context;
};

export default ThemeProvider;

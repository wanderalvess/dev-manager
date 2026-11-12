import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';
export type ThemeVariant = 'default' | 'paper' | 'midnight' | 'cyberpunk' | 'nebula' | 'nordic';

interface ThemeContextValue {
  mode: ThemeMode;
  variant: ThemeVariant;
  setMode: (mode: ThemeMode) => void;
  setVariant: (variant: ThemeVariant) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const VARIANTS: ThemeVariant[] = ['default', 'paper', 'midnight', 'cyberpunk', 'nebula', 'nordic'];

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('theme');
      return saved === 'light' || saved === 'dark' ? saved : 'dark';
    } catch {
      return 'dark';
    }
  });

  const [variant, setVariantState] = useState<ThemeVariant>(() => {
    try {
      const saved = localStorage.getItem('theme-variant') as ThemeVariant;
      return VARIANTS.includes(saved) ? saved : 'default';
    } catch {
      return 'default';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(mode);
    root.style.colorScheme = mode;
    for (const v of VARIANTS) root.classList.remove(`theme-${v}`);
    root.classList.add(`theme-${variant}`);
    try {
      localStorage.setItem('theme', mode);
      localStorage.setItem('theme-variant', variant);
    } catch {
      // ignore
    }
  }, [mode, variant]);

  const setMode = (next: ThemeMode) => setModeState(next);
  const setVariant = (next: ThemeVariant) => setVariantState(next);
  const toggleMode = () => setModeState((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ mode, variant, setMode, setVariant, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return ctx;
}

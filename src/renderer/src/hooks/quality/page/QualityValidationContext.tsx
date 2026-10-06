import React from 'react';
import { QualityValidationContext } from './qualityValidationContextValue';
import { useQualityValidationItems } from './useQualityValidationItems';

// Matriz de validação única para todas as páginas de Qualidade (Homologação e Test Runners ficam
// montadas ao mesmo tempo; sem estado compartilhado, o sync do runner não chegaria na Matriz).
export const QualityValidationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = useQualityValidationItems();
  return <QualityValidationContext.Provider value={value}>{children}</QualityValidationContext.Provider>;
};

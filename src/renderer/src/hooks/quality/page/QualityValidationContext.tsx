import React, { createContext, useContext } from 'react';

const QualityValidationContext = createContext<Record<string, any>>({});

export const QualityValidationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <QualityValidationContext.Provider value={{}}>{children}</QualityValidationContext.Provider>
);

export function useQualityValidation() {
  return useContext(QualityValidationContext);
}

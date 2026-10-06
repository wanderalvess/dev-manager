import { useContext } from 'react';
import { QualityValidationContext, type QualityValidation } from './qualityValidationContextValue';

export function useQualityValidation(): QualityValidation {
  const ctx = useContext(QualityValidationContext);
  if (!ctx) throw new Error('useQualityValidation deve ser usado dentro de QualityValidationProvider');
  return ctx;
}

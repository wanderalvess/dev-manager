import { createContext } from 'react';
import type { useQualityValidationItems } from './useQualityValidationItems';

export type QualityValidation = ReturnType<typeof useQualityValidationItems>;

export const QualityValidationContext = createContext<QualityValidation | null>(null);

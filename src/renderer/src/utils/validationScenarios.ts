import { Lock, type LucideIcon } from 'lucide-react';

/**
 * Cenários da página Validação de Cenários (Qualidade). Cenário novo: um item aqui e o painel dele no mapa da
 * QualityScenariosPage. A ordem é a das abas.
 */
export type ValidationScenarioId = 'auth-lockout';

export interface ValidationScenario {
  id: ValidationScenarioId;
  label: string;
  icon: LucideIcon;
  /** Uma frase sobre o que o cenário valida, no título da aba e na Ajuda. */
  description: string;
}

export const VALIDATION_SCENARIOS: readonly ValidationScenario[] = [
  {
    id: 'auth-lockout',
    label: 'Bloqueio de Login',
    icon: Lock,
    description: 'Regras de bloqueio do login do WinThor (limiar, duração, logoff, concorrência) e o registro nos logs.'
  }
];

export const VALIDATION_SCENARIO_STORAGE_KEY = 'devManager:quality:validationScenarioV1';

/** Aba lembrada nesta máquina; id desconhecido (cenário removido) volta para o primeiro. */
export function resolveScenarioId(stored: string | null | undefined): ValidationScenarioId {
  return VALIDATION_SCENARIOS.find((s) => s.id === stored)?.id ?? VALIDATION_SCENARIOS[0].id;
}

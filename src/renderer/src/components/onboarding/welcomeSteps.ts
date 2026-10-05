import { LucideIcon, Sparkles } from 'lucide-react';

export interface WelcomeStep {
  id?: string;
  eyebrow: string;
  title: string;
  /** Parte do título destacada em azul (primary) */
  highlight: string;
  desc: string;
  icon: LucideIcon;
}

export const WELCOME_STORAGE_KEY = 'devManager:welcomeIntroV2';

// Uma tela só: a versão anterior exigia 3 cliques (Avançar, Avançar, Começar) antes de o
// usuário conseguir usar o app — as duas primeiras eram só texto de efeito, sem decisão
// nenhuma. Aqui já entra com a única escolha real (tema) e um clique pra começar.
export const WELCOME_STEPS: WelcomeStep[] = [
  {
    id: 'theme',
    eyebrow: 'PRAZER, EU SOU',
    title: 'O seu',
    highlight: 'Hub Manager',
    desc: 'Cockpit Integrado de Operação, Desenvolvimento e Qualidade para o ecossistema WinThor. Escolha o tema — dá pra trocar depois pelo cabeçalho — e use Ctrl+K a qualquer momento para a busca rápida.',
    icon: Sparkles
  }
];

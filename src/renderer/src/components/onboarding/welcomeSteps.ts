import { LucideIcon, Sparkles, Palette, Rocket } from 'lucide-react';

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

export const WELCOME_STEPS: WelcomeStep[] = [
  {
    id: 'intro',
    eyebrow: 'PRAZER, EU SOU',
    title: 'O seu',
    highlight: 'Dev Manager',
    desc: 'Mais que um painel — um cockpit que organiza seu ambiente WinThor, cuida da infraestrutura e fala a sua língua. A partir de agora, trabalhamos juntos.',
    icon: Sparkles
  },
  {
    id: 'theme',
    eyebrow: 'APARÊNCIA',
    title: 'Qual tema você',
    highlight: 'prefere?',
    desc: 'Escolha a aparência ideal para o seu dia a dia. Você pode alterar essa preferência quando quiser pelo cabeçalho.',
    icon: Palette
  },
  {
    id: 'ready',
    eyebrow: 'TUDO PRONTO',
    title: 'Vamos',
    highlight: 'começar?',
    desc: 'Use Ctrl+K para a busca rápida a qualquer momento. Agora vamos te mostrar rapidamente onde fica cada recurso.',
    icon: Rocket
  }
];

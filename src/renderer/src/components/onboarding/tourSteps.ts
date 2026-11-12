export interface TourStep {
  target: string;
  title: string;
  content: string;
}

export const TOUR_STORAGE_KEY = 'hubManager.tour.seen';
export const DEFAULT_TOUR_STEPS: TourStep[] = [
  { target: 'nav-infra', title: 'Infraestrutura & Ambiente', content: 'Gerencie serviços locais, portas, containers, deploy e Karaf OSGi.' },
  { target: 'nav-data', title: 'Banco de Dados & Backups', content: 'Execute consultas SQL multi-vendor e agende backups.' },
  { target: 'search', title: 'Busca Rápida (Ctrl+K)', content: 'Acesse qualquer módulo, rotina ou repositório pelo teclado.' }
];

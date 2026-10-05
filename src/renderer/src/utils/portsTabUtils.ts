export interface QuickPortPreset {
  port: number;
  label: string;
  buttonLabel: string;
  // Classe completa (não montada dinamicamente) para o Tailwind enxergá-la no build.
  hoverBorderClass: string;
}

export const QUICK_PORT_PRESETS: QuickPortPreset[] = [
  { port: 8889, label: 'Portal Web Local', buttonLabel: '+ :8889 (Portal Web)', hoverBorderClass: 'hover:border-primary/40' },
  { port: 8181, label: 'Karaf Web Alternativo', buttonLabel: '+ :8181 (Karaf Web)', hoverBorderClass: 'hover:border-primary/40' },
  { port: 8101, label: 'Karaf SSH (client.bat)', buttonLabel: '+ :8101 (Karaf SSH)', hoverBorderClass: 'hover:border-amber-500/40' },
  { port: 8080, label: 'Tomcat / Web', buttonLabel: '+ :8080 (Web)', hoverBorderClass: 'hover:border-primary/40' },
  { port: 5005, label: 'Java Remote Debug', buttonLabel: '+ :5005 (Debug JVM)', hoverBorderClass: 'hover:border-emerald-500/40' },
  { port: 1521, label: 'Oracle DB Listener', buttonLabel: '+ :1521 (Oracle DB)', hoverBorderClass: 'hover:border-blue-500/40' },
  { port: 6379, label: 'Redis Cache', buttonLabel: '+ :6379 (Redis)', hoverBorderClass: 'hover:border-rose-500/40' },
  { port: 8085, label: 'Serviço API Local', buttonLabel: '+ :8085 (API Local)', hoverBorderClass: 'hover:border-emerald-500/40' }
];

/** Texto digitado -> número de porta; vazio/inválido vira 0 (como o campo já tratava). */
export function parsePortInput(raw: string): number {
  return parseInt(raw) || 0;
}

/** Caminho digitado (sem a barra inicial exibida no campo) -> valor salvo com "/" ou vazio. */
export function normalizeWebPath(raw: string): string {
  return raw ? `/${raw.replace(/^\//, '')}` : '';
}

/** Valor salvo -> texto do campo, sem a barra inicial (ela é um prefixo visual). */
export function webPathToInput(webPath: string | undefined): string {
  return webPath?.replace(/^\//, '') ?? '';
}

import type { KarafBundleInfo } from '../../../shared/types';

/** Texto que identifica o bundle nas linhas de log do Karaf: o nome simbólico (o que o pax-logging imprime) ou o nome de exibição. */
export function bundleLogFilter(bundle: Pick<KarafBundleInfo, 'name' | 'symbolicName'>): string {
  return (bundle.symbolicName || bundle.name || '').trim();
}

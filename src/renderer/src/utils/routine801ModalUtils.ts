import type { Routine801Feature } from '../../../shared/types';

export type Routine801Tab = 'updates' | 'installs';
export type Routine801DirectType = 'SERVICO' | 'ROTINA';

export const ROUTINE801_DEFAULT_URL = 'http://localhost:8889';
export const ROUTINE801_MAX_LOG_LINES = 2500;

export const buildFeatureKey = (item: Pick<Routine801Feature, 'nome' | 'versao'>): string =>
  `${item.nome}@${item.versao}`;

// Mantém só as últimas linhas para o console não crescer sem limite.
export const appendLogChunk = (prev: string[], chunk: string): string[] => {
  const next = [...prev, chunk];
  return next.length > ROUTINE801_MAX_LOG_LINES ? next.slice(next.length - ROUTINE801_MAX_LOG_LINES) : next;
};

export const isErrorFilterLine = (line: string): boolean =>
  line.includes('[ERRO]') || line.includes('✖') || line.includes('Error') || line.includes('Exception');

export const filterLogLines = (logs: string[], filter: 'ALL' | 'ERRORS'): string[] =>
  filter === 'ERRORS' ? logs.filter(isErrorFilterLine) : logs;

export const getLogLineClass = (log: string): string => {
  if (log.includes('[ERRO]') || log.includes('✖') || log.includes('Error')) return 'text-rose-400 font-semibold';
  if (log.includes('✔') || log.includes('Sucesso') || log.includes('success')) return 'text-emerald-400 font-medium';
  if (log.includes('[AVISO]') || log.includes('Warn')) return 'text-amber-400';
  if (log.startsWith('$')) return 'text-primary font-semibold';
  return 'text-foreground/80';
};

export const buildDirectInstallFeature = (
  nome: string,
  versao: string,
  tipo: Routine801DirectType
): Routine801Feature => ({
  nome: nome.trim(),
  versao: versao.trim(),
  codigoRotina: 0,
  codigoModulo: 0,
  tipoProjeto: tipo,
  descricao: `${nome.trim()} (Instalação Direta)`,
  status: 'LIBERADO'
});

export const buildExecutingTargetName = (features: Routine801Feature[]): string =>
  features.length === 1 ? features[0].nome : `${features.length} artefato(s)`;

export const resolveEffectiveFeature = (
  feature: Routine801Feature | null,
  customVersion: string
): Routine801Feature | null => {
  if (!feature) return null;
  return { ...feature, versao: (customVersion && customVersion.trim()) || feature.versao };
};

const rejectionDetail = (r: PromiseSettledResult<unknown>): string | false =>
  r.status === 'rejected' && ((r.reason as { message?: string } | undefined)?.message || String(r.reason));

export const getCatalogFailureDetail = (
  updates: PromiseSettledResult<unknown>,
  installs: PromiseSettledResult<unknown>
): string => rejectionDetail(installs) || rejectionDetail(updates) || 'Não foi possível estabelecer conexão.';

export const buildCatalogFailureMessage = (targetUrl: string, detail: string): string =>
  `Falha na comunicação com a Rotina 801 em ${targetUrl}: ${detail}. Verifique se o Karaf/WTA está em execução e se a porta está acessível.`;

/**
 * Processos online do PDVOmni (levantamento WORKFLOW_PDVSYNC, seção 4): chamadas em tempo real que o PDV faz direto
 * ao WTA, sem passar pelo WSH. Por isso não ficam na PCINTEGRACAOCORE e o Monitor do WSH não as vê.
 * As tabelas Oracle de cada processo ainda não foram mapeadas: o mapeamento é pela captura do Statement Tracer
 * (DB Studio) durante uma operação real no PDV.
 */

export type OnlineMethod = 'GET' | 'POST' | 'PUT';
export type OnlineKind = 'leitura' | 'escrita';

export interface OnlineProcess {
  /** Nome do endpoint na configuração do PDVOmni ("EndpointPreVendaEnvio"). */
  id: string;
  name: string;
  category: string;
  method: OnlineMethod;
  apiPath: string;
  apiProject: string;
  /** Tabelas Oracle que o WTA lê (leitura) ou grava (escrita) neste processo; vazio enquanto não for mapeado. */
  oracleTables?: string[];
}

export const ONLINE_CATEGORY_ORDER = ['Pré-venda e pedidos', 'Crédito do cliente', 'Estoque e notas', 'Cliente e PDV'] as const;

const ORDERS = '/winthor/varejo/matcon/v1/orders/pdvsync';
const STOCK = '/api/stock-vtex/v1/available/pdv-sync';
const CREDIT = '/winthor/varejo/v1/credito-cliente';

const online = (p: OnlineProcess) => p;

export const ONLINE_PROCESSES: OnlineProcess[] = [
  online({ id: 'EndpointPreVendaEnvio', name: 'Envio da pré-venda', category: 'Pré-venda e pedidos', method: 'POST', apiPath: ORDERS, apiProject: 'winthor-integracao-matcon' }),
  online({ id: 'EndpointPreVendaAtualiza', name: 'Atualização da pré-venda', category: 'Pré-venda e pedidos', method: 'PUT', apiPath: ORDERS, apiProject: 'winthor-integracao-matcon' }),
  online({ id: 'EndpointPreVendaConsultaPedido', name: 'Consulta de um pedido', category: 'Pré-venda e pedidos', method: 'GET', apiPath: `${ORDERS}/consulta`, apiProject: 'winthor-integracao-matcon' }),
  online({ id: 'EndpointPreVendaConsultaListaPedido', name: 'Consulta da lista de pedidos', category: 'Pré-venda e pedidos', method: 'GET', apiPath: `${ORDERS}/consulta`, apiProject: 'winthor-integracao-matcon' }),
  online({ id: 'EndpointCreditoConsumo', name: 'Consumo de crédito', category: 'Crédito do cliente', method: 'POST', apiPath: CREDIT, apiProject: 'winthor-integracao-varejo' }),
  online({ id: 'EndpointCreditoConsulta', name: 'Consulta de crédito', category: 'Crédito do cliente', method: 'GET', apiPath: `${CREDIT}/list`, apiProject: 'winthor-integracao-varejo' }),
  online({ id: 'EndpointReservaEstoqueEnvio', name: 'Reserva de estoque', category: 'Estoque e notas', method: 'POST', apiPath: ORDERS, apiProject: 'winthor-integracao-matcon' }),
  online({ id: 'EndpointEstoqueConsulta', name: 'Consulta de estoque', category: 'Estoque e notas', method: 'GET', apiPath: STOCK, apiProject: 'winthor-estoque-vtex' }),
  online({ id: 'EndpointNotaEntradaEnvio', name: 'Envio de nota de entrada', category: 'Estoque e notas', method: 'POST', apiPath: ORDERS, apiProject: 'winthor-integracao-matcon' }),
  // Como no levantamento: o envio da nota de saída usa o endpoint de disponibilidade de estoque
  online({ id: 'EndpointNotaSaidaEnvio', name: 'Envio de nota de saída', category: 'Estoque e notas', method: 'POST', apiPath: STOCK, apiProject: 'winthor-estoque-vtex' }),
  online({ id: 'EndpointFormasCondicoesCliente', name: 'Formas e condições de pagamento do cliente', category: 'Cliente e PDV', method: 'GET', apiPath: '/winthor/cliente/v1/payments/pdvsync', apiProject: 'winthor-integracao-cliente' }),
  online({ id: 'EndpointIdentificadorPDV', name: 'Identificação do PDV', category: 'Cliente e PDV', method: 'GET', apiPath: '/winthor/varejo/matcon/v1/pdv/detalhepdv', apiProject: 'winthor-integracao-matcon' })
];

/** GET só lê; POST e PUT gravam no WinThor. */
export const onlineKind = (p: Pick<OnlineProcess, 'method'>): OnlineKind => (p.method === 'GET' ? 'leitura' : 'escrita');

/**
 * Outros processos que chamam o mesmo método e caminho: no log ou no APM eles se confundem e só o corpo (POST, PUT) ou
 * os parâmetros (GET) diferenciam (a pré-venda, a nota de entrada e a reserva de estoque são o mesmo POST).
 */
export function sameEndpoint(p: OnlineProcess): OnlineProcess[] {
  return ONLINE_PROCESSES.filter((other) => other.id !== p.id && other.method === p.method && other.apiPath === p.apiPath);
}

/** Acha o processo pela chamada vista (método e caminho, sem a query); pode haver mais de um. */
export function findOnlineProcesses(method: string, path: string): OnlineProcess[] {
  const cleanPath = path.split('?')[0].replace(/\/+$/, '').toLowerCase();
  return ONLINE_PROCESSES.filter((p) => p.method === method.toUpperCase() && p.apiPath.toLowerCase() === cleanPath);
}

export const isMapped = (p: OnlineProcess) => Boolean(p.oracleTables?.length);

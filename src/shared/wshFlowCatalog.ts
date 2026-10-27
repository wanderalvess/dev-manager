/**
 * Catálogo dos fluxos PDVSync do WSH (winthor-integracao-core), a partir do levantamento WORKFLOW_PDVSYNC
 * (rotas do repositório winthor-smart-hub-layouts). Liga a rota gravada na PCINTEGRACAOCORE ao fluxo, ao sentido,
 * às tabelas e às dependências: um fluxo só integra bem se os fluxos de que depende já estão no PDVSync.
 */

export type WshFlowDirection = 'envio' | 'recebimento' | 'monitor' | 'utilitario';

export interface WshFlow {
  /** Número do fluxo com dois dígitos ("09"). */
  id: string;
  name: string;
  category: string;
  direction: WshFlowDirection;
  /** Rota que cria a linha na PCINTEGRACAOCORE (BUSCAR no WTA para envio; BUSCAR no PDVSync para recebimento). */
  searchRoute: string;
  sendRoute?: string;
  apiPath?: string;
  apiProject?: string;
  oracleTables?: string[];
  pdvTables?: string[];
  /** Fluxos que precisam estar integrados antes deste. */
  dependsOn?: string[];
  /** Campo do erro do PDVSync → fluxo que o preenche (o Produto embute impostos, PIS/COFINS e NCM). */
  fieldHints?: Record<string, string>;
  /**
   * Campo da saída → de onde o JOLT o tira na entrada, conferido num par real de entrada e saída do mesmo registro.
   * Aponta onde olhar quando o destino recusa um valor.
   */
  fieldOrigins?: Record<string, string>;
  /** Roda por agendamento. O intervalo é de cada cliente (PCINTEGRACAOAGENDAMENTO), por isso o catálogo não fixa um valor. */
  scheduled?: boolean;
}

const flow = (f: WshFlow) => f;

/**
 * Vendas (FLUXO-16): de onde sai cada campo enviado ao WinThor. Conferido no par real da venda 50277 / cupom 10905
 * (2026-10-23): a entrada é o `conteudo` em Base64 que o PDVSync devolve, decodificado pela custom-totvs.
 */
const VENDA_ORIGINS: Record<string, string> = {
  numCupom: 'Ccf',
  idInterno: 'NumeroLoja-SerieNota-Ccf (filial-série-cupom)',
  idExterno: '"pdvsync-vendamensagem-" + id + dataAtualizacao da mensagem no PDVSync',
  chaveNfce: 'ChaveAcesso',
  chaveNfe: 'ChaveAcesso',
  serieNota: 'SerieNota',
  codFilial: 'Loja.IdRetaguarda',
  numCaixa: 'NumeroPdv',
  codFuncCx: 'Operador.IdRetaguarda',
  codEmitente: 'Operador.IdRetaguarda',
  codCli: 'Cliente.IdRetaguarda',
  codCob: 'VendaPagamentos[].PagamentoForma.IdRetaguarda',
  codPlPag: 'VendaPagamentos[].PagamentoCondicao.IdRetaguarda',
  codProd: 'VendaItems[].Produto.IdRetaguarda',
  codAuxiliar: 'VendaItems[].IdProdutoEmbalagemRetaguarda',
  codUsur: 'VendaItems[].Vendedor.IdRetaguarda, sem o prefixo "RCA-"',
  idPreVenda: 'IdPreVenda',
  numero: 'PreVenda.Numero',
  vlTabela: 'ValorBruto',
  vlTotal: 'ValorLiquido',
  vlAtend: 'ValorLiquido',
  xml: 'VendaCustodiaXml[].Xml (XML em Base64, repassado como veio)'
};

export const WSH_FLOWS: readonly WshFlow[] = [
  flow({ id: '01', name: 'Compartilhamento Master', category: 'Compartilhamentos e filiais', direction: 'envio', searchRoute: 'WTA - PDVSYNC COMPARTILHAMENTO MASTER', sendRoute: 'PDVSYNC - ENVIAR COMPARTILHAMENTOS', pdvTables: ['compartilhamento'] }),
  flow({ id: '02', name: 'Filiais Lojas', category: 'Compartilhamentos e filiais', direction: 'envio', searchRoute: 'WTA - Buscar Filiais Lojas', sendRoute: 'PDVSYNC - ENVIAR LOJAS', apiPath: '/api/branch/v1/', apiProject: 'winthor-filiais', oracleTables: ['PCFILIAL'], pdvTables: ['loja'] }),
  flow({ id: '03', name: 'Compartilhamento Lojas', category: 'Compartilhamentos e filiais', direction: 'envio', searchRoute: 'WTA - Buscar Filiais Compartilhamento', sendRoute: 'PDVSYNC - ENVIAR COMPARTILHAMENTOS', apiPath: '/api/branch/v1/', apiProject: 'winthor-filiais', oracleTables: ['PCFILIAL'], pdvTables: ['compartilhamento'] }),
  flow({ id: '04', name: 'Perfil', category: 'Perfil e usuários', direction: 'envio', searchRoute: 'WTA - BUSCAR PERFIL PADRAO', sendRoute: 'PDVSYNC - SALVAR PERFIL', pdvTables: ['perfil'] }),
  flow({ id: '08', name: 'Usuário Operador', category: 'Perfil e usuários', direction: 'envio', searchRoute: 'WTA - Buscar Usuario Operador', sendRoute: 'PDVSYNC - SALVAR USUARIO OPERADOR', apiPath: '/winthor/ferramenta/usuario/v1/listar/detalhes', apiProject: 'winthor-ferramenta-usuario', oracleTables: ['PCUSUARI', 'PCEMPR'], pdvTables: ['usuario'], dependsOn: ['04'] }),
  flow({ id: '23', name: 'RCA', category: 'Perfil e usuários', direction: 'envio', searchRoute: 'WTA - CONSULTA RCA', apiPath: '/winthor/varejo/matcon/v1/rca/consulta', apiProject: 'winthor-integracao-matcon', dependsOn: ['04'] }),
  flow({ id: '05', name: 'NCM CEST', category: 'Fiscal e tributação', direction: 'envio', searchRoute: 'WTA - Buscar Imposto NCM PDV', sendRoute: 'PDVSYNC - SALVAR IMPOSTO NCM', apiPath: '/winthor/tributacao/v0/saida/ncm/consultar', apiProject: 'winthor-tributacao', oracleTables: ['PCPRODUT'], pdvTables: ['ncm'] }),
  flow({ id: '06', name: 'PIS/COFINS', category: 'Fiscal e tributação', direction: 'envio', searchRoute: 'WTA - Buscar Pis Cofins', sendRoute: 'PDVSYNC - ENVIAR PIS COFINS', apiPath: '/winthor/tributacao/v0/saida/piscofins/consultar', apiProject: 'winthor-tributacao', oracleTables: ['PCTRIBPISCOFINS', 'PCTABTRIB'], pdvTables: ['pis_cofins'] }),
  flow({ id: '07', name: 'ICMS', category: 'Fiscal e tributação', direction: 'envio', searchRoute: 'WTA - Buscar ICMS', sendRoute: 'PDVSYNC - ENVIAR ICMS', apiPath: '/winthor/tributacao/v0/saida/icms/consultar', apiProject: 'winthor-tributacao', oracleTables: ['PCTABTRIB', 'PCTRIBUT'], pdvTables: ['imposto'] }),
  flow({ id: '34', name: 'Imposto Reforma Tributária', category: 'Fiscal e tributação', direction: 'envio', searchRoute: 'WTA - BUSCAR IMPOSTO REFORMA TRIBUTARIA', sendRoute: 'PDVSYNC - ENVIAR IMPOSTO REFORMA', apiPath: '/winthor/tributacao/v0/saida/tributacao/consultar/pdvsync', apiProject: 'winthor-tributacao', oracleTables: ['PCTRIBUTACAO'], pdvTables: ['imposto_fiscal'] }),
  flow({ id: '35', name: 'Filtro NCM Reforma Tributária', category: 'Fiscal e tributação', direction: 'envio', searchRoute: 'WTA - BUSCAR NCM REFORMA TRIBUTARIA', sendRoute: 'PDVSYNC - ENVIAR NCM REFORMA TRIBUTARIA', apiPath: '/winthor/tributacao/v0/saida/tributacao/excecao/consultar/pdvsync', apiProject: 'winthor-tributacao', oracleTables: ['PCTRIBUTACAO', 'PCNCM'], pdvTables: ['imposto_fiscal_ncm'], dependsOn: ['34'] }),
  flow({ id: '36', name: 'Filtro Produto Reforma Tributária', category: 'Fiscal e tributação', direction: 'envio', searchRoute: 'WTA - BUSCAR PRODUTO REFORMA TRIBUTARIA', sendRoute: 'PDVSYNC - ENVIAR PRODUTO REFORMA TRIBUT', apiPath: '/winthor/tributacao/v0/saida/tributacao/excecao/consultar/pdvsync', apiProject: 'winthor-tributacao', oracleTables: ['PCTRIBUTACAO'], pdvTables: ['imposto_fiscal_produto'], dependsOn: ['09', '34'] }),
  flow({ id: '38', name: 'Filtro CFOP Reforma Tributária', category: 'Fiscal e tributação', direction: 'envio', searchRoute: 'WTA - BUSCAR CFOP REFORMA TRIBUTARIA', sendRoute: 'PDVSYNC - ENVIAR CFOP REFORMA TRIBUTARIA', apiProject: 'winthor-tributacao', oracleTables: ['PCTRIBUTACAO'], pdvTables: ['imposto_fiscal_cfop'], dependsOn: ['34'] }),
  flow({ id: '09', name: 'Produto', category: 'Produtos e estoque', direction: 'envio', searchRoute: 'WTA - Buscar Produto PDV', sendRoute: 'PDVSYNC - SALVAR PRODUTO', apiPath: '/winthor/tributacao/v0/saida/produtotributacao/consultar', apiProject: 'winthor-tributacao', oracleTables: ['PCPRODUT', 'PCTRIBUT', 'PCTRIBPISCOFINS', 'PCTABTRIB'], pdvTables: ['produto'], dependsOn: ['07', '06', '05'], fieldHints: { impostos: '07', piscofins: '06', ncms: '05', ncm: '05' } }),
  flow({ id: '10', name: 'Estoque', category: 'Produtos e estoque', direction: 'envio', searchRoute: 'WTA - Buscar Estoque', sendRoute: 'PDVSYNC - ENVIAR ESTOQUE DISPONIVEL', apiPath: '/api/stock-vtex/v1/available/list', apiProject: 'winthor-estoque-vtex', oracleTables: ['PCEST'], pdvTables: ['estoque'], dependsOn: ['09', '02'] }),
  flow({ id: '11', name: 'Preço', category: 'Preços', direction: 'envio', searchRoute: 'WTA - Buscar Preco Produto', sendRoute: 'PDVSYNC - ENVIAR PRECO PRODUTO', apiPath: '/api/wholesale/v1/price/discount-policy', apiProject: 'winthor-pedido-venda', oracleTables: ['PCDESCONTO', 'PCDESCONTOITEM'], pdvTables: ['preco'], dependsOn: ['09'] }),
  flow({ id: '29', name: 'Preço Região', category: 'Preços', direction: 'envio', searchRoute: 'WTA - Buscar Preco Regiao', sendRoute: 'PDVSYNC - ENVIAR PRECO REGIAO', apiPath: '/winthor/precos/v1/precos-regioes', apiProject: 'winthor-integracao-precos', oracleTables: ['PCTABPR'], pdvTables: ['preco'], dependsOn: ['09', '27'] }),
  flow({ id: '30', name: 'Preço Embalagem', category: 'Preços', direction: 'envio', searchRoute: 'WTA - Buscar Preco Embalagem', sendRoute: 'PDVSYNC - ENVIAR PRECO EMBALAGEM', apiPath: '/winthor/precos/v1/precos-embalagens', apiProject: 'winthor-integracao-precos', oracleTables: ['PCEMBALAGEM'], pdvTables: ['preco'], dependsOn: ['09', '02'] }),
  flow({ id: '32', name: 'Preço Fixo', category: 'Preços', direction: 'envio', searchRoute: 'WTA - Buscar Preco Fixo', sendRoute: 'PDVSYNC - ENVIAR PRECO FIXO', apiPath: '/winthor/precos/v1/precos-fixos', apiProject: 'winthor-integracao-precos', oracleTables: ['PCPRECOPROM'], pdvTables: ['preco_promocional'], dependsOn: ['09', '17', '28', '31'] }),
  flow({ id: '33', name: 'Política de Desconto e Acréscimo', category: 'Preços', direction: 'envio', searchRoute: 'WTA - Buscar Desconto e Acrescimo', sendRoute: 'PDVSYNC - ENVIAR DESCONTO E ACRESCIMO', apiPath: '/winthor/precos/v1/politica-desconto', apiProject: 'winthor-integracao-precos', oracleTables: ['PCDESCONTO'], pdvTables: ['regra_desconto_acrescimo'], dependsOn: ['09', '27', '28', '17'] }),
  flow({ id: '12', name: 'Operadora Cartão', category: 'Formas de pagamento', direction: 'envio', searchRoute: 'WTA - Buscar Operadora PDV', sendRoute: 'PDVSYNC - SALVAR OPERADORA', apiPath: '/winthor/venda/v0/operadoras', apiProject: 'winthor-venda', oracleTables: ['PCOPERADORACARTAO'], pdvTables: ['pagamento_operadora', 'pagamento_forma_operadora'] }),
  flow({ id: '13', name: 'Planos de Pagamento', category: 'Formas de pagamento', direction: 'envio', searchRoute: 'WTA - Buscar planos de pgto', sendRoute: 'PDVSYNC - ENVIAR PLANOS DE PGTO', apiPath: '/winthor/venda/v0/planos-pagamentos', apiProject: 'winthor-venda', oracleTables: ['PCPLPAG', 'PCPLPAGFILIAL'], pdvTables: ['pagamento_condicao', 'pagamento_forma', 'pagamento_preco'] }),
  flow({ id: '14', name: 'Cobranças Forma Pgto', category: 'Formas de pagamento', direction: 'envio', searchRoute: 'WTA - Buscar Tipos Cobrancas', sendRoute: 'PDVSYNC - ENVIAR FORMAS DE PGTO', apiPath: '/winthor/venda/v0/tipos-cobrancas/pdv-sync', apiProject: 'winthor-venda', oracleTables: ['PCCOB'], dependsOn: ['12', '13', '21'] }),
  flow({ id: '21', name: 'Pagamento Dados Complementares', category: 'Formas de pagamento', direction: 'envio', searchRoute: 'WTA - DADOS PAGAMENTO', sendRoute: 'PDVSYNC - DADOS PAGAMENTO', pdvTables: ['pagamento_dado_complementar', 'pagamento_forma_dado_complementar'] }),
  flow({ id: '17', name: 'Clientes', category: 'Clientes e cadastros', direction: 'envio', searchRoute: 'WTA - Buscar Clientes', sendRoute: 'PDVSYNC - SALVAR CLIENTES', apiPath: '/api/wholesale/v1/customer/list', apiProject: 'winthor-pedido-venda', oracleTables: ['PCCLIENT'], pdvTables: ['cliente'], dependsOn: ['26', '27', '28'] }),
  flow({ id: '26', name: 'Profissional', category: 'Clientes e cadastros', direction: 'envio', searchRoute: 'WTA - Buscar Profissionais', sendRoute: 'PDVSYNC - SALVAR PROFISSIONAL', apiPath: '/winthor/cadastros/v1/profissional', apiProject: 'winthor-integracao-cadastros', oracleTables: ['PCPROFISSIONAL'], pdvTables: ['usuario'], dependsOn: ['04'] }),
  flow({ id: '27', name: 'Região', category: 'Clientes e cadastros', direction: 'envio', searchRoute: 'WTA - Buscar Regiao PDV', sendRoute: 'PDVSYNC - SALVAR REGIAO', apiPath: '/winthor/cliente/v1/regiao', apiProject: 'winthor-integracao-cliente', oracleTables: ['PCREGIAO'], pdvTables: ['regiao'], dependsOn: ['02'] }),
  flow({ id: '28', name: 'Ramo de Atividade', category: 'Clientes e cadastros', direction: 'envio', searchRoute: 'WTA - Buscar Ramo Atividade', sendRoute: 'PDVSYNC - SALVAR RAMO ATIVIDADE', apiPath: '/winthor/cliente/v1/ramoatividade', apiProject: 'winthor-integracao-cliente', oracleTables: ['PCATIVI'], pdvTables: ['ramo_atividade'] }),
  flow({ id: '31', name: 'Grupo Campanha Cliente', category: 'Clientes e cadastros', direction: 'envio', searchRoute: 'WTA - Buscar Grupo Campanha Cliente', sendRoute: 'PDVSYNC - SALVAR GRUPO CAMPANHA CLIENTE', apiPath: '/winthor/cliente/v1/grupoCampanha', apiProject: 'winthor-integracao-cliente', oracleTables: ['PCGRUPOSCAMPANHAC', 'PCGRUPOSCAMPANHAI'], pdvTables: ['grupo_cliente'], dependsOn: ['17', '02'] }),
  flow({ id: '15', name: 'Movimentações de Caixa', category: 'Recebimento pelo ERP', direction: 'recebimento', searchRoute: 'PDVSYNC - BUSCAR MOVIMENTACOES CAIXA', sendRoute: 'WTA - Enviar movimentacao caixa', apiPath: '/winthor/varejo/v1/movimentacao', apiProject: 'winthor-integracao-varejo', dependsOn: ['14', '13'], scheduled: true }),
  flow({ id: '16', name: 'Vendas', category: 'Recebimento pelo ERP', direction: 'recebimento', searchRoute: 'PDVSYNC - BUSCAR VENDAS', sendRoute: 'WTA - Enviar venda', apiPath: '/winthor/varejo/v1/movimentacao/venda', apiProject: 'winthor-integracao-varejo', dependsOn: ['09', '17', '14'], scheduled: true, fieldOrigins: VENDA_ORIGINS }),
  flow({ id: '19', name: 'Pedido Recebido', category: 'Recebimento pelo ERP', direction: 'recebimento', searchRoute: 'PDVSYNC - BUSCAR PEDIDOS RECEBIDO', sendRoute: 'WTA - ENVIAR PEDIDO RECEBIDO', apiPath: '/winthor/varejo/matcon/v1/orders/pdvsync', apiProject: 'winthor-integracao-matcon', dependsOn: ['09', '17'], scheduled: true }),
  flow({ id: '20', name: 'Pedido Cancelado', category: 'Recebimento pelo ERP', direction: 'recebimento', searchRoute: 'PDVSYNC - BUSCAR PEDIDOS CANCELADA', sendRoute: 'WTA - ENVIAR PEDIDO CANCELADO', apiPath: '/winthor/varejo/matcon/v1/orders/pdvsync', apiProject: 'winthor-integracao-matcon', dependsOn: ['09', '17'], scheduled: true }),
  flow({ id: '37', name: 'Cadastrar Cliente Retaguarda', category: 'Recebimento pelo ERP', direction: 'recebimento', searchRoute: 'PDVSYNC - BUSCAR CLIENTES', sendRoute: 'WTA - ENVIAR CLIENTE', dependsOn: ['17'] }),
  flow({ id: '18', name: 'Status Pedido', category: 'Monitor e status', direction: 'monitor', searchRoute: 'WTA - Buscar status pedido', apiPath: '/api/wholesale/v1/orders/list', apiProject: 'winthor-pedido-venda' }),
  flow({ id: '24', name: 'Atualizar Status Lote Retaguarda', category: 'Monitor e status', direction: 'monitor', searchRoute: 'WTA - Buscar lote PDV', apiPath: '/winthor/integracao/fulfillment/v1/lote', apiProject: 'winthor-integracao-config', scheduled: true }),
  flow({ id: '25', name: 'Atualizar Status Venda Retaguarda', category: 'Monitor e status', direction: 'monitor', searchRoute: 'WTA - Buscar Venda Monitor', apiPath: '/winthor/varejo/v1/retorno/venda', apiProject: 'winthor-integracao-varejo', scheduled: true }),
  flow({ id: '22', name: 'Registrar IP', category: 'Utilitários', direction: 'utilitario', searchRoute: 'WTA - Busca Registrar IP Inquilino' })
];

export const WSH_CATEGORY_ORDER = [
  'Compartilhamentos e filiais', 'Perfil e usuários', 'Fiscal e tributação', 'Produtos e estoque', 'Preços',
  'Formas de pagamento', 'Clientes e cadastros', 'Recebimento pelo ERP', 'Monitor e status', 'Utilitários'
] as const;

/** Nome de rota comparável: maiúsculas, sem acento e com espaços simples (o banco mistura "Buscar" e "BUSCAR"). */
export function normalizeRouteName(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
}

const BY_SEARCH_ROUTE = new Map(WSH_FLOWS.map((f) => [normalizeRouteName(f.searchRoute), f]));
const BY_ID = new Map(WSH_FLOWS.map((f) => [f.id, f]));

export function findFlowByRoute(routeName: string | undefined): WshFlow | undefined {
  return routeName ? BY_SEARCH_ROUTE.get(normalizeRouteName(routeName)) : undefined;
}

export function findFlowById(id: string): WshFlow | undefined {
  return BY_ID.get(id);
}

/** Sentido do dado: pelo catálogo; fora dele, pelo prefixo da rota (busca no PDVSync = recebimento pelo ERP). */
export function flowDirection(routeName: string | undefined): WshFlowDirection {
  const known = findFlowByRoute(routeName);
  if (known) return known.direction;
  return routeName && normalizeRouteName(routeName).startsWith('PDVSYNC') ? 'recebimento' : 'envio';
}

export const flowLabel = (f: Pick<WshFlow, 'id' | 'name'>) => `FLUXO-${f.id} · ${f.name}`;

/** Dependências que o erro aponta, pelo campo recusado (ex.: `impostos` vazio no Produto → ICMS). */
export function hintedDependencies(f: WshFlow | undefined, fields: string[]): string[] {
  if (!f?.fieldHints) return [];
  const hinted = fields.map((field) => f.fieldHints![field.toLowerCase()]).filter((id): id is string => Boolean(id));
  return [...new Set(hinted)];
}

import { QaRegressionTemplate } from '../../shared/types';

/**
 * Templates padrão de validação regressiva pré-configurados com a esteira
 * de testes do WinThor / PDV Omni / WSH Mississauga.
 */
export function getDefaultQaTemplates(): QaRegressionTemplate[] {
  const now = new Date().toISOString();

  return [
    {
      id: 'wsh-venda-pdv-completa',
      name: 'Venda PDV — Integração WSH Mississauga (Fim-a-Fim)',
      description:
        'Bateria completa de asserções pós-integração de venda do PDV: Fila de Mensagens, Nota Fiscal (PCNFSAID), Cabeçalhos (PCPEDC/ECF), Consumidor (PCVENDACONSUM), Itens e Movimentação (PCMOV/PCPEDI), Financeiro (PCPREST/ECF) e consistência de RCA (PCEMPR).',
      category: 'Vendas PDV',
      author: 'QA Team / WinThor',
      version: '1.0.0',
      createdAt: now,
      updatedAt: now,
      defaultVariables: {
        codFilial: '1',
        numCupom: '4387'
      },
      sampleJson: JSON.stringify(
        {
          codFilial: '1',
          numCupom: 4387,
          vlTotal: 768.7,
          vlTabela: 0,
          codCob: 'D',
          codEmitente: 1,
          chaveNfe: '35240510190260000120650010000043871000043871',
          consumidorFinal: {
            cliente: 'CONSUMIDOR FINAL',
            cgcEnt: '10190260000120'
          },
          produtos: [
            {
              codProd: 1184,
              codAuxiliar: '78910001184',
              qt: 2,
              pVenda: 384.35,
              pTabela: 384.35,
              vlSubTotItem: 768.7,
              numSeq: 1,
              data: '2024-05-13'
            }
          ],
          pagamentos: [
            {
              codCob: 'D',
              codCobOrigem: 'DH',
              valor: 768.7,
              duplic: '1'
            }
          ]
        },
        null,
        2
      ),
      steps: [
        {
          id: 'step-fila-mensagem',
          title: 'Mensageria — Histórico da Fila',
          tableName: 'PCFILAMENSAGEMHISTORICO',
          description: 'Valida se a mensagem de venda foi gravada e processada na fila.',
          enabled: true,
          query: `SELECT
CODFILIAL,
NUMNOTA,
CHAVESEFAZ,
NUMCAIXA,
TIPOOPERACAO,
CASE WHEN p.MENSAGEM IS NULL THEN 'N' ELSE 'S' END PREENCHIDO
FROM PCFILAMENSAGEMHISTORICO p WHERE CHAVESEFAZ = (SELECT CHAVENFE FROM PCNFSAID WHERE CODFILIAL = :codFilial AND NUMCUPOM = :numCupom)`,
          assertions: [
            { id: 'ass-fila-filial', column: 'CODFILIAL', expectedType: 'jsonPath', expectedValue: '$.codFilial' },
            { id: 'ass-fila-preenchido', column: 'PREENCHIDO', expectedType: 'literal', expectedValue: 'S' }
          ]
        },
        {
          id: 'step-doc-eletronico',
          title: 'Documento Eletrônico — XML NFC-e',
          tableName: 'PCDOCELETRONICO',
          description: 'Valida se o CLOB/XML da NFC-e foi persistido.',
          enabled: true,
          query: `SELECT
CASE WHEN PCDOCELETRONICO.XMLNFCE IS NULL THEN 'N' ELSE 'S' END PREENCHIDO
FROM PCDOCELETRONICO
WHERE NUMTRANSACAO = (SELECT NUMTRANSVENDA FROM PCNFSAID WHERE CODFILIAL = :codFilial AND NUMNOTA = :numCupom)`,
          assertions: [
            { id: 'ass-doc-preenchido', column: 'PREENCHIDO', expectedType: 'literal', expectedValue: 'S' }
          ]
        },
        {
          id: 'step-nfsaid',
          title: 'Nota Fiscal de Saída — Cabeçalho',
          tableName: 'PCNFSAID',
          description: 'Valida totais, cobrança, emissor e conferência de RCA.',
          enabled: true,
          query: `SELECT
CASE WHEN PCNFSAID.CODUSUR = (SELECT PCEMPR.CODUSUR FROM PCEMPR WHERE PCEMPR.MATRICULA = PCNFSAID.CODEMITENTE) THEN
'S'
ELSE
'N'
END RCA_NF_IGUAL_RCA_EMPR,
CODFILIAL,
CODUSUR,
CODCOB,
NUMCUPOM,
NUMFECHAMENTOMOVCX,
VLTOTGER,
VLTABELA,
VLTOTAL,
CODEMITENTE,
CHAVENFE
FROM PCNFSAID
WHERE CODFILIAL = :codFilial
AND NUMNOTA = :numCupom`,
          assertions: [
            { id: 'ass-nf-rca', column: 'RCA_NF_IGUAL_RCA_EMPR', expectedType: 'literal', expectedValue: 'S' },
            { id: 'ass-nf-filial', column: 'CODFILIAL', expectedType: 'jsonPath', expectedValue: '$.codFilial' },
            { id: 'ass-nf-vltotal', column: 'VLTOTAL', expectedType: 'jsonPath', expectedValue: '$.vlTotal' },
            { id: 'ass-nf-chave', column: 'CHAVENFE', expectedType: 'notNull', expectedValue: '<S>' }
          ],
          extractVariables: [
            { variableName: 'chaveNfeBanco', column: 'CHAVENFE' }
          ]
        },
        {
          id: 'step-pedcecf',
          title: 'Cabeçalho da Venda ECF (PCPEDCECF)',
          tableName: 'PCPEDCECF',
          description: 'Valida dados de caixa, fechamento e totais da ECF.',
          enabled: true,
          query: `SELECT
CODFILIAL,
CODFUNCCX,
TO_CHAR(DATA,'YYYY-MM-DD') DATA,
NUMCAIXA,
CODCOB,
NUMCUPOM,
NUMFECHAMENTOMOVCX,
VLATEND,
VLTABELA,
VLTOTAL,
CODEMITENTE,
CONTINGENCIASERVIDOR
FROM PCPEDCECF
WHERE CODFILIAL = :codFilial
AND NUMCUPOM = :numCupom`,
          assertions: [
            { id: 'ass-pedcecf-filial', column: 'CODFILIAL', expectedType: 'jsonPath', expectedValue: '$.codFilial' },
            { id: 'ass-pedcecf-cupom', column: 'NUMCUPOM', expectedType: 'jsonPath', expectedValue: '$.numCupom' },
            { id: 'ass-pedcecf-vltotal', column: 'VLTOTAL', expectedType: 'jsonPath', expectedValue: '$.vlTotal' }
          ]
        },
        {
          id: 'step-pedc',
          title: 'Cabeçalho do Pedido de Venda (PCPEDC)',
          tableName: 'PCPEDC',
          description: 'Valida registro consolidado do pedido de venda.',
          enabled: true,
          query: `SELECT
CODFILIAL,
CODFUNCCX,
TO_CHAR(DATA,'YYYY-MM-DD') DATA,
NUMCAIXA,
CODCOB,
NUMCUPOM,
NUMFECHAMENTOMOVCX,
VLATEND,
VLTABELA,
VLTOTAL,
CODEMITENTE
FROM PCPEDC
WHERE NUMCUPOM = :numCupom
AND CODFILIAL = :codFilial`,
          assertions: [
            { id: 'ass-pedc-filial', column: 'CODFILIAL', expectedType: 'jsonPath', expectedValue: '$.codFilial' },
            { id: 'ass-pedc-vltotal', column: 'VLTOTAL', expectedType: 'jsonPath', expectedValue: '$.vlTotal' }
          ]
        },
        {
          id: 'step-vendaconsum',
          title: 'Dados do Consumidor (PCVENDACONSUM)',
          tableName: 'PCVENDACONSUM',
          description: 'Valida se o CPF/CNPJ e nome do consumidor foram gravados.',
          enabled: true,
          query: `SELECT
NUMPED,
CGCENT,
CLIENTE
FROM PCVENDACONSUM p
WHERE NUMPED = (SELECT NUMPED FROM PCPEDC WHERE CODFILIAL = :codFilial AND NUMCUPOM = :numCupom)`,
          assertions: [
            { id: 'ass-consum-cgcent', column: 'CGCENT', expectedType: 'jsonPath', expectedValue: '$.consumidorFinal.cgcEnt' },
            { id: 'ass-consum-cliente', column: 'CLIENTE', expectedType: 'jsonPath', expectedValue: '$.consumidorFinal.cliente' }
          ]
        },
        {
          id: 'step-mov',
          title: 'Movimentação Fiscal e Estoque (PCMOV)',
          tableName: 'PCMOV',
          description: 'Valida baixa e movimentação física/fiscal dos produtos.',
          enabled: true,
          query: `SELECT
PRODUTO.CODFILIAL,
PRODUTO.CODAUXILIAR,
PRODUTO.CODAUXILIAR ||'-'|| PRODUTO.CODPROD AS CODPROD,
PRODUTO.PTABELA,
PRODUTO.QT,
PRODUTO.QTCONT,
PRODUTO.NUMSEQ,
PRODUTO.PUNIT,
(PRODUTO.QT * PRODUTO.PUNITCONT) AS PUNITCONT
FROM PCMOV PRODUTO WHERE NUMTRANSVENDA = (SELECT NUMTRANSVENDA FROM PCNFSAID WHERE CODFILIAL = :codFilial AND NUMNOTA = :numCupom)`,
          assertions: [
            { id: 'ass-mov-filial', column: 'CODFILIAL', expectedType: 'jsonPath', expectedValue: '$.produtos.[*].codFilial' },
            { id: 'ass-mov-qt', column: 'QT', expectedType: 'jsonPath', expectedValue: '$.produtos.[*].qt' }
          ]
        },
        {
          id: 'step-pediecf',
          title: 'Itens da Venda ECF (PCPEDIECF)',
          tableName: 'PCPEDIECF',
          description: 'Valida quantidades, preços unitários e subtotais por item na ECF.',
          enabled: true,
          query: `SELECT
NUMPED,
NUMPEDECF,
CODFILIAL,
CODFUNCCX,
CODAUXILIAR,
CODAUXILIAR ||'-'|| CODPROD AS CODAUXILIAR_CODPROD,
NUMCAIXA,
PTABELA,
PVENDA,
QT,
NUMSEQ,
VLSUBTOTITEM,
VLITEM,
TO_CHAR(DATA,'YYYY-MM-DD') DATA,
NUMCAIXAFISCAL
FROM PCPEDIECF WHERE NUMPEDECF = (SELECT NUMPEDECF FROM PCPEDCECF WHERE CODFILIAL = :codFilial AND NUMCUPOM = :numCupom)`,
          assertions: [
            { id: 'ass-pediecf-pvenda', column: 'PVENDA', expectedType: 'jsonPath', expectedValue: '$.produtos.[*].pVenda' },
            { id: 'ass-pediecf-qt', column: 'QT', expectedType: 'jsonPath', expectedValue: '$.produtos.[*].qt' }
          ]
        },
        {
          id: 'step-pedi',
          title: 'Itens do Pedido de Venda (PCPEDI)',
          tableName: 'PCPEDI',
          description: 'Valida gravação dos itens com situação tributária (CODST).',
          enabled: true,
          query: `SELECT
p.CODAUXILIAR,
p.CODAUXILIAR ||'-'|| CODPROD AS CODAUXILIAR_CODPROD,
p.NUMCAIXA,
p.PTABELA,
p.PVENDA,
p.QT,
p.NUMSEQ,
p.VLSUBTOTITEM,
CASE
WHEN CODST IS NOT NULL THEN 'CODST Gravado'
ELSE 'CODST Não Gravado'
END AS STATUS_CODST,
TO_CHAR(DATA,'YYYY-MM-DD') DATA
FROM PCPEDI p WHERE NUMPED = (SELECT NUMPED FROM PCPEDC WHERE CODFILIAL = :codFilial AND NUMCUPOM = :numCupom)`,
          assertions: [
            { id: 'ass-pedi-pvenda', column: 'PVENDA', expectedType: 'jsonPath', expectedValue: '$.produtos.[*].pVenda' },
            { id: 'ass-pedi-codst', column: 'STATUS_CODST', expectedType: 'literal', expectedValue: 'CODST Gravado' }
          ]
        },
        {
          id: 'step-prest',
          title: 'Financeiro / Prestação de Contas (PCPREST)',
          tableName: 'PCPREST',
          description: 'Valida duplicatas, cobrança, TEF, NSU e bandeira.',
          enabled: true,
          query: `SELECT
CODCOB,
(SELECT 'S' FROM PCCOB WHERE PCCOB.CODCOB = PCPREST.CODCOB) COD_COB_EXISTE,
CODCOBORIG,
CODFILIAL,
CODFUNCCHECKOUT,
TO_CHAR(DTEMISSAO,'YYYY-MM-DD') DTEMISSAO,
TO_CHAR(DTEMISSAOORIG,'YYYY-MM-DD') DTEMISSAOORIG,
TO_CHAR(DTMOVIMENTOCX ,'YYYY-MM-DD')DTMOVIMENTOCX,
DUPLIC,
NUMCAIXAFISCAL,
NUMCHECKOUT,
NUMFECHAMENTOMOVCX,
VALOR,
VALORORIG,
TO_CHAR(DTVENC,'YYYY-MM-DD') DTVENC,
TO_CHAR(DTVENCORIG,'YYYY-MM-DD') DTVENCORIG,
CODBANDEIRATEF,
CODADMCARTAO,
NSUTEF,
NSUHOST,
CODAUTORIZACAOTEF,
NUMCARTAO,
NUMTRANSVENDA
FROM
PCPREST WHERE NUMTRANSVENDA = (SELECT NUMTRANSVENDA FROM PCNFSAID WHERE CODFILIAL = :codFilial AND NUMNOTA = :numCupom)`,
          assertions: [
            { id: 'ass-prest-cobexiste', column: 'COD_COB_EXISTE', expectedType: 'literal', expectedValue: 'S' },
            { id: 'ass-prest-valor', column: 'VALOR', expectedType: 'jsonPath', expectedValue: '$.pagamentos.[*].valor' }
          ]
        },
        {
          id: 'step-rca-consistencia',
          title: 'Consistência de RCA / Operador x Matrícula (PCEMPR)',
          tableName: 'PCEMPR',
          description: 'Garante que os códigos de RCA em cabeçalho, itens e financeiro coincidem com a PCEMPR.',
          enabled: true,
          query: `SELECT
CASE WHEN PCNFSAID.CODUSUR = (SELECT PCEMPR.CODUSUR FROM PCEMPR WHERE PCEMPR.MATRICULA = PCNFSAID.CODEMITENTE) THEN 'S' ELSE 'N' END RCA_NF_IGUAL_RCA_EMPR,
(SELECT CASE WHEN PCPREST.CODUSUR = (SELECT PCEMPR.CODUSUR FROM PCEMPR WHERE PCEMPR.MATRICULA = PCPREST.CODFUNCCHECKOUT) THEN 'S' ELSE 'N' END FROM PCPREST WHERE NUMTRANSVENDA = PCNFSAID.NUMTRANSVENDA AND ROWNUM = 1) RCA_PREST_IGUAL_EMPR,
(SELECT CASE WHEN PCPEDC.CODUSUR = (SELECT PCEMPR.CODUSUR FROM PCEMPR WHERE PCEMPR.MATRICULA = PCPEDC.CODFUNCCX) THEN 'S' ELSE 'N' END FROM PCPEDC WHERE NUMPED = PCNFSAID.NUMPED) RCA_PEDC_IGUAL_EMPR
FROM PCNFSAID WHERE CODFILIAL = :codFilial AND NUMNOTA = :numCupom`,
          assertions: [
            { id: 'ass-rca-nf', column: 'RCA_NF_IGUAL_RCA_EMPR', expectedType: 'literal', expectedValue: 'S' },
            { id: 'ass-rca-prest', column: 'RCA_PREST_IGUAL_EMPR', expectedType: 'literal', expectedValue: 'S' },
            { id: 'ass-rca-pedc', column: 'RCA_PEDC_IGUAL_EMPR', expectedType: 'literal', expectedValue: 'S' }
          ]
        }
      ]
    },
    {
      id: 'wsh-cancelamento-venda',
      name: 'Cancelamento de Venda PDV — Integração WSH Mississauga',
      description:
        'Validação de fluxo de estorno/cancelamento de venda: conferência de PCNFCAN, PCNFCANITEM (quantidades estornadas com sinal invertido) e flag DTCANCEL na PCNFSAID.',
      category: 'Cancelamento',
      author: 'QA Team / WinThor',
      version: '1.0.0',
      createdAt: now,
      updatedAt: now,
      defaultVariables: {
        codFilial: '1',
        numCupom: '4387'
      },
      steps: [
        {
          id: 'step-nfcan',
          title: 'Cancelamento de Nota Fiscal (PCNFCAN)',
          tableName: 'PCNFCAN',
          description: 'Valida se o registro de cancelamento foi gravado com data preenchida.',
          enabled: true,
          query: `SELECT
CASE WHEN PCNFCAN.DATACANC IS NULL THEN 'N' ELSE 'S' END DATACANC_PREENCHIDO,
VLTOTAL,
CODCLI,
CODFILIAL,
CODPLPAG,
CODCOB,
ORIGEMPED,
CONDVENDA
FROM PCNFCAN
WHERE NUMTRANSVENDA = (SELECT NUMTRANSVENDA FROM PCNFSAID WHERE CODFILIAL = :codFilial AND NUMNOTA = :numCupom)`,
          assertions: [
            { id: 'ass-can-preenchido', column: 'DATACANC_PREENCHIDO', expectedType: 'literal', expectedValue: 'S' },
            { id: 'ass-can-filial', column: 'CODFILIAL', expectedType: 'jsonPath', expectedValue: '$.codFilial' }
          ]
        },
        {
          id: 'step-nfcanitem',
          title: 'Itens Cancelados (PCNFCANITEM)',
          tableName: 'PCNFCANITEM',
          description: 'Valida estorno de itens e preenchimento de data de cancelamento.',
          enabled: true,
          query: `SELECT
CASE WHEN PCNFCANITEM.DATACANC IS NULL THEN 'N' ELSE 'S' END DTCANCEL_PREENCHIDO,
NUMSEQ,
CODPROD,
(QT * -1) AS QT,
PVENDA,
PTABELA,
CODFUNCCANC,
NUMTRANSVENDA,
DATACANC,
NUMPED
FROM PCNFCANITEM
WHERE NUMTRANSVENDA = (SELECT NUMTRANSVENDA FROM PCNFSAID WHERE CODFILIAL = :codFilial AND NUMNOTA = :numCupom)`,
          assertions: [
            { id: 'ass-canitem-preenchido', column: 'DTCANCEL_PREENCHIDO', expectedType: 'literal', expectedValue: 'S' }
          ]
        },
        {
          id: 'step-nfsaid-cancel',
          title: 'Data de Cancelamento na Nota (PCNFSAID.DTCANCEL)',
          tableName: 'PCNFSAID',
          description: 'Valida se o campo DTCANCEL da nota fiscal foi atualizado.',
          enabled: true,
          query: `SELECT
CASE WHEN PCNFSAID.DTCANCEL IS NULL THEN 'N' ELSE 'S' END DTCANCEL_PREENCHIDO,
CODFILIAL,
CODCOB,
NUMCUPOM,
NUMFECHAMENTOMOVCX,
VLTOTGER,
VLTABELA,
VLTOTAL,
CODEMITENTE,
CHAVENFE
FROM PCNFSAID
WHERE CODFILIAL = :codFilial
AND NUMNOTA = :numCupom`,
          assertions: [
            { id: 'ass-nfsaid-dtcancel', column: 'DTCANCEL_PREENCHIDO', expectedType: 'literal', expectedValue: 'S' }
          ]
        }
      ]
    },
    {
      id: 'wsh-venda-kit-cesta',
      name: 'Venda com Kit / Cesta — Integração WSH Mississauga',
      description:
        'Validação de decomposição de produtos em Cesta/Kit (PCPEDICESTA e PCEMBALAGEM), garantindo rateio de componentes, totalização e preços líquidos.',
      category: 'Kits e Cestas',
      author: 'QA Team / WinThor',
      version: '1.0.0',
      createdAt: now,
      updatedAt: now,
      defaultVariables: {
        codFilial: '1',
        numCupom: '4387'
      },
      steps: [
        {
          id: 'step-pedicesta',
          title: 'Componentes de Kit / Cesta (PCPEDICESTA)',
          tableName: 'PCPEDICESTA',
          description: 'Valida itens componentes do kit, embalagem e valor líquido total.',
          enabled: true,
          query: `SELECT
c.NUMSEQ,
TO_CHAR(c.DATA, 'YYYY-MM-DD') AS DATA,
c.NUMPED,
c.CODAUXILIAR || '-' || c.CODPRODMP AS CODPRODITEMKIT,
c.CODPROD,
c.CODPRODMP,
c.QTMP,
c.PVENDA,
c.PTABELA,
c.PBASERCA,
c.BASEICST,
c.ST,
c.VLCUSTOFIN,
c.VLCUSTOREAL,
c.PERCOM,
c.CODAUXILIAR,
c.CODST,
e.CODAUXILIAR || '-' || e.CODPROD AS codProdKit,
e.EMBALAGEM,
e.QTUNIT,
(c.PVENDA * c.QTMP) AS TOTAL_ITEM,
SUM(c.PVENDA) OVER (PARTITION BY c.NUMPED) AS VALORLIQUIDOTOTAL
FROM
PCPEDICESTA c
INNER JOIN
PCEMBALAGEM e ON e.CODPROD = c.CODPRODMP
AND e.CODFILIAL = :codFilial
WHERE
c.NUMPED IN (
SELECT
NUMPED
FROM
PCPEDI i
WHERE
NUMPED = (
SELECT
NUMPED
FROM
PCNFSAID sd
WHERE
CODFILIAL = :codFilial
AND NUMNOTA = :numCupom
)
)
ORDER BY
c.NUMPED, c.CODPROD`,
          assertions: [
            { id: 'ass-kit-codprod', column: 'CODPRODMP', expectedType: 'notNull', expectedValue: '<S>' },
            { id: 'ass-kit-total', column: 'VALORLIQUIDOTOTAL', expectedType: 'notNull', expectedValue: '<S>' }
          ]
        }
      ]
    }
  ];
}

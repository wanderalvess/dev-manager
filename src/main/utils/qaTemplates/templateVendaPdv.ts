import { QaRegressionTemplate } from '../../../shared/types';

/**
 * Template de Venda PDV — WSH Mississauga (Fim-a-Fim)
 */
export function getTemplateVendaPdv(now: string): QaRegressionTemplate {
  return {
    id: 'wsh-venda-pdv-completa',
    name: 'Venda PDV — Integração WSH Mississauga (Fim-a-Fim)',
    description:
      'Bateria completa de asserções pós-integração de venda do PDV: Fila de Mensagens, Nota Fiscal (PCNFSAID), Cabeçalhos (PCPEDC/ECF), Consumidor (PCVENDACONSUM), Itens e Embalagem Ajustada (PCPEDI/ECF), Custos e Movimentação (PCMOV), Baixa de Estoque (PCLOGESTOQUE), Financeiro com Troco e TEF (PCPREST/ECF) e consistência de RCA (PCEMPR).',
    category: 'Vendas PDV',
    author: 'QA Team / WinThor',
    version: '1.2.0',
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
        id: 'step-pedi-ajustado',
        title: 'Itens do Pedido com Embalagem Ajustada (PCPEDI)',
        tableName: 'PCPEDI',
        description: 'Valida gravação dos itens ajustados pela embalagem (QTUNIT) e situação tributária (CODST).',
        enabled: true,
        query: `SELECT
p.PERCOM,
p.NUMPED,
p.CODAUXILIAR,
p.CODAUXILIAR || '-' || p.CODPROD AS CODAUXILIAR_CODPROD,
p.NUMCAIXA,
p.QT,
p.PTABELA * NVL(emb.QTUNIT, 1) AS PTABELA_AJUSTADO,
p.PVENDA * NVL(emb.QTUNIT, 1) AS PVENDA_AJUSTADO,
p.QT / NVL(emb.QTUNIT, 1) AS QT_AJUSTADO,
p.NUMSEQ,
p.VLSUBTOTITEM,
p.CODST,
CASE WHEN p.CODST IS NOT NULL THEN 'CODST Gravado' ELSE 'CODST Não Gravado' END AS STATUS_CODST,
CASE WHEN p.PERCOM > 0 THEN 'Desconto Aplicado' ELSE 'Sem Desconto' END AS STATUS_PERCOM,
TO_CHAR(p.DATA, 'YYYY-MM-DD') AS DATA
FROM PCPEDI p
LEFT JOIN (
  SELECT CODAUXILIAR, MAX(QTUNIT) AS QTUNIT
  FROM PCEMBALAGEM
  GROUP BY CODAUXILIAR
) emb ON p.CODAUXILIAR = emb.CODAUXILIAR
WHERE p.NUMPED = (SELECT NUMPED FROM PCPEDC WHERE CODFILIAL = :codFilial AND NUMCUPOM = :numCupom)`,
        assertions: [
          { id: 'ass-pedi-pvenda', column: 'PVENDA_AJUSTADO', expectedType: 'jsonPath', expectedValue: '$.produtos.[*].pVenda' },
          { id: 'ass-pedi-codst', column: 'STATUS_CODST', expectedType: 'literal', expectedValue: 'CODST Gravado' }
        ]
      },
      {
        id: 'step-mov-custos',
        title: 'Movimentação e Custos do Item (PCMOV)',
        tableName: 'PCMOV',
        description: 'Valida movimentação fiscal, baixa física e composição de custos (financeiro, contábil, reposição e real).',
        enabled: true,
        query: `SELECT
PRODUTO.CODFILIAL,
PRODUTO.CODAUXILIAR,
PRODUTO.CODAUXILIAR || '-' || PRODUTO.CODPROD AS CODPROD,
PRODUTO.PTABELA * NVL(EMB.QTUNIT, 1) AS PTABELA_AJUSTADO,
PRODUTO.QT / NVL(EMB.QTUNIT, 1) AS QT_AJUSTADO,
PRODUTO.QTCONT,
PRODUTO.NUMSEQ,
PRODUTO.CUSTOFIN,
PRODUTO.CUSTOCONT,
PRODUTO.CUSTOREP,
PRODUTO.CUSTOREAL,
PRODUTO.PUNIT * NVL(EMB.QTUNIT, 1) AS PUNIT_AJUSTADO,
(PRODUTO.QT * PRODUTO.PUNIT) AS PUNITCONT_AJUSTADO
FROM PCMOV PRODUTO
LEFT JOIN (
  SELECT CODAUXILIAR, MAX(QTUNIT) AS QTUNIT
  FROM PCEMBALAGEM
  GROUP BY CODAUXILIAR
) EMB ON PRODUTO.CODAUXILIAR = EMB.CODAUXILIAR
WHERE PRODUTO.NUMTRANSVENDA = (SELECT NUMTRANSVENDA FROM PCNFSAID WHERE CODFILIAL = :codFilial AND NUMNOTA = :numCupom)`,
        assertions: [
          { id: 'ass-mov-filial', column: 'CODFILIAL', expectedType: 'jsonPath', expectedValue: '$.produtos.[*].codFilial' },
          { id: 'ass-mov-qt', column: 'QT_AJUSTADO', expectedType: 'jsonPath', expectedValue: '$.produtos.[*].qt' }
        ]
      },
      {
        id: 'step-logestoque',
        title: 'Conferência de Baixa no Estoque (PCLOGESTOQUE)',
        tableName: 'PCLOGESTOQUE',
        description: 'Garante que a movimentação provocou redução efetiva no estoque físico da filial.',
        enabled: true,
        query: `SELECT
L.CODFILIAL,
L.CODPROD,
L.QTESTGERANT,
L.QTESTGER,
(L.QTESTGERANT - L.QTESTGER) AS BAIXOU
FROM PCLOGESTOQUE L
WHERE L.CODFILIAL = :codFilial
  AND L.IDENTIFICADOR = (SELECT NUMTRANSVENDA FROM PCNFSAID WHERE CODFILIAL = :codFilial AND NUMNOTA = :numCupom)
  AND (L.QTESTGERANT - L.QTESTGER) <> 0
ORDER BY L.DATA`,
        assertions: [
          { id: 'ass-logestoque-baixou', column: 'BAIXOU', expectedType: 'notNull', expectedValue: '<S>' }
        ]
      },
      {
        id: 'step-prestecf-pagamentos',
        title: 'Financeiro, Troco e Pagamento Digital/TEF (PCPRESTECF)',
        tableName: 'PCPRESTECF',
        description: 'Valida formas de pagamento, troco calculado, TEF, NSU e autorização de carteira digital.',
        enabled: true,
        query: `SELECT
(SELECT 'S' FROM PCCOB WHERE PCCOB.CODCOB = PCPRESTECF.CODCOB) AS COD_COB_EXISTE,
CODCOB,
CODCOBORIG,
CODFILIAL,
CODFUNCCHECKOUT,
VALOR,
VALORORIG,
(VALOR - VALORORIG) AS VALOR_TROCO,
CODBANDEIRATEF,
CODADMCARTAO,
NSUTEF,
NSUHOST,
CODAUTORIZACAOTEF,
PROCESSADORTRANSPAGDIGITAL,
CARTEIRADIGITAL,
NOMECARTEIRADIGITAL,
COALESCE(NULLIF(CODBANDEIRATEF, ''), NOMECARTEIRADIGITAL) AS CODBANDEIRA_AJUSTADO,
COALESCE(NULLIF(NSUHOST, ''), NSUPAGDIGITAL) AS NSU_AJUSTADO
FROM PCPRESTECF
WHERE NUMTRANSVENDA = (SELECT NUMTRANSVENDA FROM PCNFSAID WHERE CODFILIAL = :codFilial AND NUMNOTA = :numCupom)`,
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
  };
}

import { QaRegressionTemplate } from '../../../shared/types';

/**
 * Template de Cancelamento de Venda PDV — WSH Mississauga
 */
export function getTemplateCancelamento(now: string): QaRegressionTemplate {
  return {
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
  };
}

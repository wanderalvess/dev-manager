import { QaRegressionTemplate } from '../../../shared/types';

/**
 * Template de Venda com Kit / Cesta — WSH Mississauga
 */
export function getTemplateKitCesta(now: string): QaRegressionTemplate {
  return {
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
  };
}

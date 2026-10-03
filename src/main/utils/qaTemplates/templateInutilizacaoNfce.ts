import { QaRegressionTemplate } from '../../../shared/types';

/**
 * Template de Inutilização de Numeração NFC-e (SEFAZ)
 */
export function getTemplateInutilizacaoNfce(now: string): QaRegressionTemplate {
  return {
    id: 'wsh-inutilizacao-nfce',
    name: 'Inutilização de Numeração NFC-e (SEFAZ)',
    description:
      'Validação do registro de inutilização de faixas de numeração fiscal de NFC-e na PCINUTILIZACAONFCE, conferindo retorno de protocolo da SEFAZ, justificativa e datas de processamento.',
    category: 'Documentos Fiscais',
    author: 'QA Team / WinThor',
    version: '1.0.0',
    createdAt: now,
    updatedAt: now,
    defaultVariables: {
      codFilial: '1'
    },
    steps: [
      {
        id: 'step-inutilizacao-nfce',
        title: 'Protocolo de Inutilização de Numeração (PCINUTILIZACAONFCE)',
        tableName: 'PCINUTILIZACAONFCE',
        description: 'Valida se o protocolo de autorização de inutilização da SEFAZ foi gravado com número inicial e final.',
        enabled: true,
        query: `SELECT
CASE WHEN p.PROTOCOLOINUTILIZACAO IS NULL THEN 'N' ELSE 'S' END AS PREENCHIDO_INUTILIZACAO,
p.PROTOCOLOINUTILIZACAO,
p.NUMNOTAINICIAL,
p.NUMNOTAFINAL,
p.DTHORAPROCESSAMENTO,
p.JUSTIFICATIVA
FROM PCINUTILIZACAONFCE p
WHERE EXTRACT(YEAR FROM p.DTHORAPROCESSAMENTO) = (
  SELECT MAX(EXTRACT(YEAR FROM DTHORAPROCESSAMENTO))
  FROM PCINUTILIZACAONFCE
)
AND p.NUMNOTAINICIAL = (
  SELECT MAX(NUMNOTAINICIAL)
  FROM PCINUTILIZACAONFCE
  WHERE EXTRACT(YEAR FROM DTHORAPROCESSAMENTO) = (
    SELECT MAX(EXTRACT(YEAR FROM DTHORAPROCESSAMENTO))
    FROM PCINUTILIZACAONFCE
  )
)`,
        assertions: [
          { id: 'ass-inut-proto', column: 'PREENCHIDO_INUTILIZACAO', expectedType: 'literal', expectedValue: 'S' },
          { id: 'ass-inut-nota-ini', column: 'NUMNOTAINICIAL', expectedType: 'notNull', expectedValue: '<S>' },
          { id: 'ass-inut-nota-fim', column: 'NUMNOTAFINAL', expectedType: 'notNull', expectedValue: '<S>' }
        ]
      }
    ]
  };
}

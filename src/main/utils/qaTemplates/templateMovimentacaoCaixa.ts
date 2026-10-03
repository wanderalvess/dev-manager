import { QaRegressionTemplate } from '../../../shared/types';

/**
 * Template de Movimentação de Caixa — Sangria e Suprimento
 */
export function getTemplateMovimentacaoCaixa(now: string): QaRegressionTemplate {
  return {
    id: 'wsh-movimentacao-caixa',
    name: 'Movimentação de Caixa — Sangria e Suprimento (PDV / ECF)',
    description:
      'Validação das operações de movimentação financeira de frente de caixa: fila de mensagens de caixa (PCFILAMENSAGEM / PCFILAMENSAGEMHISTORICO com tipo SANG/SUPR) e lançamento de vales de caixa (PCVALECXECF e PCVALECX).',
    category: 'Caixa & Tesouraria',
    author: 'QA Team / WinThor',
    version: '1.0.0',
    createdAt: now,
    updatedAt: now,
    defaultVariables: {
      codFilial: '1',
      numCaixa: '1'
    },
    steps: [
      {
        id: 'step-caixa-fila-hist',
        title: 'Mensagens de Caixa — Histórico (PCFILAMENSAGEMHISTORICO)',
        tableName: 'PCFILAMENSAGEMHISTORICO',
        description: 'Valida se as mensagens de Sangria (SANG) e Suprimento (SUPR) do PDV foram processadas com mensagem preenchida.',
        enabled: true,
        query: `SELECT
F.IDEXTERNO,
F.TIPOOPERACAO,
F.DATATRANSACAO,
F.MENSAGEM,
F.NUMCAIXA,
F.CODFILIAL,
F.PDVORIGEM,
CASE WHEN F.MENSAGEM IS NOT NULL THEN 'S' ELSE 'N' END AS MENSAGEM_PREENCHIDA
FROM PCFILAMENSAGEMHISTORICO F
WHERE F.IDEXTERNO LIKE '%caixamensagem%'
  AND F.DATATRANSACAO >= TRUNC(SYSDATE)
  AND F.CODFILIAL = :codFilial
  AND (F.NUMCAIXA = :numCaixa OR :numCaixa IS NULL)
ORDER BY F.DATATRANSACAO DESC`,
        assertions: [
          { id: 'ass-caixa-hist-msg', column: 'MENSAGEM_PREENCHIDA', expectedType: 'literal', expectedValue: 'S' }
        ]
      },
      {
        id: 'step-caixa-valecxecf',
        title: 'Vales de Caixa ECF — Sangria e Suprimento (PCVALECXECF)',
        tableName: 'PCVALECXECF',
        description: 'Valida se os vales foram gerados com Tipo A (Sangria) ou Tipo U (Suprimento) para a data corrente.',
        enabled: true,
        query: `SELECT
CASE
  WHEN P.TIPO = 'A' THEN 'SANGRIA'
  WHEN P.TIPO = 'U' THEN 'SUPRIMENTO'
  ELSE 'OUTRO'
END AS OPERACAO,
P.VALOR,
P.CODCOB,
P.NUMVALE,
P.NUMCAIXA,
P.CODFUNC,
P.TIPO,
TO_CHAR(P.DTLANC, 'YYYY-MM-DD') AS DTLANC,
P.HISTORICO
FROM PCVALECXECF P
WHERE P.DTLANC >= TRUNC(SYSDATE)
  AND (P.NUMCAIXA = :numCaixa OR :numCaixa IS NULL)
ORDER BY P.NUMVALE DESC`,
        assertions: [
          { id: 'ass-valecxecf-valor', column: 'VALOR', expectedType: 'notNull', expectedValue: '<S>' },
          { id: 'ass-valecxecf-tipo', column: 'TIPO', expectedType: 'notNull', expectedValue: '<S>' }
        ]
      },
      {
        id: 'step-caixa-valecx',
        title: 'Vales de Caixa Retaguarda (PCVALECX)',
        tableName: 'PCVALECX',
        description: 'Valida se o vale de caixa foi replicado para o módulo de tesouraria/retaguarda.',
        enabled: true,
        query: `SELECT
P.VALOR,
P.CODCOB,
P.NUMVALE,
P.CODFUNC,
P.TIPO,
TO_CHAR(P.DTLANC, 'YYYY-MM-DD') AS DTLANC,
P.HISTORICO
FROM PCVALECX P
WHERE P.DTLANC >= TRUNC(SYSDATE)
ORDER BY P.NUMVALE DESC`,
        assertions: [
          { id: 'ass-valecx-numvale', column: 'NUMVALE', expectedType: 'notNull', expectedValue: '<S>' }
        ]
      }
    ]
  };
}

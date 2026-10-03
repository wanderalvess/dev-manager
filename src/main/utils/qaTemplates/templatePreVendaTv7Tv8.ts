import { QaRegressionTemplate } from '../../../shared/types';

/**
 * Template de Pré-Venda Balcão Omni (TV7 e TV8 — Entrega / Encomenda / Retira)
 */
export function getTemplatePreVendaTv7Tv8(now: string): QaRegressionTemplate {
  return {
    id: 'wsh-prevenda-tv7-tv8',
    name: 'Pré-Venda Balcão Omni (TV7 e TV8 — Entrega / Encomenda / Retira)',
    description:
      'Validação completa de pré-vendas balcão e entrega futura (TV7 e TV8 gerados pelo PDVSync): conferência de cabeçalho (PCPEDC), desdobramento de itens com tipo de entrega (RI/RP/EN/EF), número de carregamento (NUMCAR), itens futuros (TV8), cadastro do cliente (PCCLIENT/PCCIDADE) e status da mensageria (PCINTEGRACAOCORE).',
    category: 'Pré-Venda & Balcão',
    author: 'QA Team / WinThor',
    version: '1.0.0',
    createdAt: now,
    updatedAt: now,
    defaultVariables: {
      codFilial: '1',
      numped: '5001882'
    },
    steps: [
      {
        id: 'step-prevenda-pedc',
        title: 'Cabeçalho do Pedido TV7 / TV8 (PCPEDC)',
        tableName: 'PCPEDC',
        description: 'Valida filial, condição de venda, status de faturamento/montagem e totais do pedido.',
        enabled: true,
        query: `SELECT
CODFILIAL,
NUMTRANSVENDA,
NUMNOTA,
NUMCUPOM,
CODPROFISSIONAL,
NUMPEDHUBE,
NUMPED,
NUMPEDENTFUT,
CODCOB,
CODPLPAG,
CONDVENDA,
POSICAO,
CASE WHEN POSICAO IS NOT NULL THEN 'FATURADO' ELSE 'MONTADO' END AS STATUS_POSICAO,
VLTOTAL,
VLTABELA,
VLATEND,
VLDESCONTO,
CODCLI,
CODUSUR,
CODFUNCCX
FROM PCPEDC
WHERE NUMPED = :numped OR NUMPEDENTFUT = :numped`,
        assertions: [
          { id: 'ass-pedc-codfilial', column: 'CODFILIAL', expectedType: 'literal', expectedValue: '1' },
          { id: 'ass-pedc-posicao', column: 'STATUS_POSICAO', expectedType: 'notNull', expectedValue: '<S>' },
          { id: 'ass-pedc-vltotal', column: 'VLTOTAL', expectedType: 'notNull', expectedValue: '<S>' }
        ]
      },
      {
        id: 'step-prevenda-itens-tv7',
        title: 'Itens do Pedido TV7 — Tipos de Entrega e Carga (PCPEDI)',
        tableName: 'PCPEDI',
        description: 'Valida itens do pedido TV7, tipo de entrega (RI, RP, EN, EF), gravação de NUMCAR e CODST.',
        enabled: true,
        query: `SELECT
p.NUMSEQ,
p.NUMPED,
p.CODPROD,
p.NUMCAR,
CASE WHEN p.NUMCAR IS NOT NULL THEN 'NUMCAR Gravado' ELSE 'NUMCAR Não Gravado' END AS STATUS_NUMCAR,
p.QT,
p.PVENDA,
p.PTABELA,
p.CODAUXILIAR,
p.POSICAO,
p.TIPOENTREGA,
CASE
  WHEN p.TIPOENTREGA = 'RI' THEN 'Retira Imediata'
  WHEN p.TIPOENTREGA = 'RP' THEN 'Retira Posterior'
  WHEN p.TIPOENTREGA = 'EN' THEN 'Entrega'
  WHEN p.TIPOENTREGA = 'EF' THEN 'Encomenda'
  ELSE 'Indefinido'
END AS TIPOENTREGA_DESCRICAO,
p.VLFRETE,
p.PERDESC,
p.CODFILIALRETIRA,
p.CODST,
CASE WHEN p.CODST IS NOT NULL THEN 'CODST Gravado' ELSE 'CODST Não Gravado' END AS STATUS_CODST
FROM PCPEDI p
WHERE p.NUMPED = :numped
ORDER BY p.NUMSEQ`,
        assertions: [
          { id: 'ass-tv7-codprod', column: 'CODPROD', expectedType: 'notNull', expectedValue: '<S>' },
          { id: 'ass-tv7-codst', column: 'STATUS_CODST', expectedType: 'literal', expectedValue: 'CODST Gravado' }
        ]
      },
      {
        id: 'step-prevenda-itens-tv8',
        title: 'Itens do Pedido TV8 — Entrega Futura (PCPEDI)',
        tableName: 'PCPEDI',
        description: 'Valida os itens gerados na entrega futura vinculados via NUMPEDENTFUT.',
        enabled: true,
        query: `SELECT
p.NUMSEQ,
p.NUMPED,
p.CODPROD,
p.QT,
p.PVENDA,
p.PTABELA,
p.TIPOENTREGA,
p.CODFILIALRETIRA,
p.CODST
FROM PCPEDI p
WHERE p.NUMPED IN (SELECT c.NUMPED FROM PCPEDC c WHERE c.NUMPEDENTFUT = :numped)
ORDER BY p.NUMSEQ`,
        assertions: [
          { id: 'ass-tv8-numped', column: 'NUMPED', expectedType: 'notNull', expectedValue: '<S>' }
        ]
      },
      {
        id: 'step-prevenda-cliente',
        title: 'Dados Cadastrais do Cliente (PCCLIENT / PCCIDADE)',
        tableName: 'PCCLIENT',
        description: 'Valida se o cadastro do cliente (tipo pessoa, endereço, cidade e atualização) confere com o pedido.',
        enabled: true,
        query: `SELECT
pc.CLIENTE,
pc.CGCENT,
pc.CODCLI,
pc.BAIRROENT,
pc.CEPENT,
(SELECT NOMECIDADE FROM PCCIDADE c WHERE c.CODCIDADE = pc.CODCIDADE) AS NOMECIDADE,
pc.DTULTALTER,
pc.TIPOFJ,
CASE
  WHEN pc.TIPOFJ = 'F' THEN 'Pessoa Física'
  WHEN pc.TIPOFJ = 'J' THEN 'Pessoa Jurídica'
  ELSE 'Indeterminado'
END AS TIPO_PESSOA
FROM PCCLIENT pc
WHERE pc.CODCLI = (SELECT p.CODCLI FROM PCPEDC p WHERE p.NUMPED = :numped)`,
        assertions: [
          { id: 'ass-cli-nome', column: 'CLIENTE', expectedType: 'notNull', expectedValue: '<S>' },
          { id: 'ass-cli-cnpj', column: 'CGCENT', expectedType: 'notNull', expectedValue: '<S>' }
        ]
      },
      {
        id: 'step-prevenda-status-core',
        title: 'Mensageria PDVSync — Situação da Pré-Venda (PCINTEGRACAOCORE)',
        tableName: 'PCINTEGRACAOCORE',
        description: 'Valida se a pré-venda foi sincronizada com status SUCESSO (RECEBIDO ou RESGATADA).',
        enabled: true,
        query: `SELECT
ID,
IDEXTERNO,
CASE
  WHEN DADOSTRANSFORMADOS LIKE '%DISPONIVEL%' THEN 'FALHA'
  WHEN DADOSTRANSFORMADOS LIKE '%RECEBIDO%' THEN 'SUCESSO'
  WHEN DADOSTRANSFORMADOS LIKE '%RESGATADA%' THEN 'SUCESSO'
  ELSE 'OUTRO'
END AS STATUS_PRE_VENDA,
TO_CHAR(DATACRIACAO, 'YYYY-MM-DD') AS DATA_CRIACAO
FROM PCINTEGRACAOCORE
WHERE ID = (
  SELECT MAX(ID) FROM PCINTEGRACAOCORE
  WHERE IDEXTERNO LIKE '%pdvsync-status-prevenda%'
    AND (DADOSTRANSFORMADOS LIKE '%' || :numped || '%' OR DADOSTRANSFORMADOS LIKE '%RECEBIDO%' OR DADOSTRANSFORMADOS LIKE '%RESGATADA%')
)`,
        assertions: [
          { id: 'ass-core-status', column: 'STATUS_PRE_VENDA', expectedType: 'literal', expectedValue: 'SUCESSO' }
        ]
      }
    ]
  };
}

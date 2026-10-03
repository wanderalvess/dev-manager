export interface QaAssertionTypeInfo {
  type: string;
  label: string;
  syntax: string;
  example: string;
  description: string;
}

export const QA_ASSERTION_TYPES: QaAssertionTypeInfo[] = [
  {
    type: 'jsonPath',
    label: 'JSONPath (Payload API/PDV)',
    syntax: '$.caminho.campo',
    example: '$.vlTotal ou $.itens[0].codProd',
    description: 'Compara a coluna retornada do banco Oracle com um valor extraído dinamicamente do payload JSON informado na aba "Payload JSON". Ideal para validar se o total gravado bate com o total enviado pela API.'
  },
  {
    type: 'literal',
    label: 'Literal (Valor Fixo)',
    syntax: 'Texto ou número exato',
    example: '"1", "S", "4387"',
    description: 'Compara a coluna contra um valor fixo previamente conhecido. Útil para validar flags de status (ex: STATUS = "A"), tipo de operação ou valores constantes esperados na regra de negócio.'
  },
  {
    type: 'notNull',
    label: 'Preenchido (<S>)',
    syntax: 'Sem valor esperado',
    example: 'Nenhum valor necessário',
    description: 'Valida se o campo no banco não é NULL nem string vazia. Recomendado para chaves primárias geradas por sequence (ex: NUMTRANSVENDA), chaves de NFe geradas ou timestamps de gravação.'
  },
  {
    type: 'null',
    label: 'Vazio / Nulo (<N>)',
    syntax: 'Sem valor esperado',
    example: 'Nenhum valor necessário',
    description: 'Valida se o campo no banco é obrigatoriamente NULL ou vazio. Ideal para checar que colunas de cancelamento ou estorno ainda não foram preenchidas no fluxo inicial de venda.'
  },
  {
    type: 'zero',
    label: 'Zero Numérico (<0>)',
    syntax: 'Sem valor esperado',
    example: 'Nenhum valor necessário',
    description: 'Valida se a coluna numérica retornou valor igual a 0. Útil para conferir saldo pendente, valor de troco ou taxas zeradas.'
  },
  {
    type: 'regex',
    label: 'Expressão Regular (Regex)',
    syntax: '^padrao$',
    example: '^[0-9]{44}$ (Chave NFe 44 dígitos)',
    description: 'Compara a coluna contra uma expressão regular. Perfeito para validar formatos de chave de acesso SEFAZ, máscaras de CNPJ/CPF, códigos de barras ou protocolos.'
  }
];

export const QA_TEMPLATE_WORKFLOW_STEPS = [
  {
    step: '1',
    title: 'Escolha a Conexão Oracle de Homologação',
    description: 'Selecione no menu de conexões o banco de dados Oracle onde o teste foi ou será realizado. O Dev Manager se conecta diretamente ao schema para consultar as tabelas.'
  },
  {
    step: '2',
    title: 'Selecione ou Crie um Cenário / Template',
    description: 'Escolha um template no dropdown "Cenário" ou clique em "Gerenciar Templates" para criar uma nova esteira de validação composta por múltiplas queries (ex: PCPEDC, PCNFSAID, PCEST).'
  },
  {
    step: '3',
    title: 'Informe o Payload JSON ou Binds Manuais',
    description: 'Cole o payload JSON retornado pela API ou PDV e clique em "Mapear Binds" para preencher parâmetros comuns automaticamente, ou adicione variáveis como :codFilial e :numCupom na aba "Binds & Variáveis".'
  },
  {
    step: '4',
    title: 'Execute a Validação Regressiva',
    description: 'Clique em "Executar Validação Regressiva". O Dev Manager executa cada consulta SQL, substitui os binds com segurança, valida todas as asserções e destaca em verde ou vermelho cada campo com discrepância.'
  },
  {
    step: '5',
    title: 'Exporte o Relatório e Evidências para o Jira',
    description: 'Clique em "Exportar Markdown" ou "Tabela Jira" para copiar a evidência completa formatada com data, hora, tabelas e contadores para colar no Jira, Confluence ou Teams.'
  },
  {
    step: '6',
    title: 'Exporte e Compartilhe o Template com a Equipe',
    description: 'Use o botão "Exportar Template" para baixar o arquivo .json do cenário e compartilhar com outros QAs ou desenvolvedores, garantindo que qualquer membro do time repita exatamente os mesmos testes.'
  }
];

export const SAMPLE_TEMPLATE_JSON = `{
  "id": "wsh-venda-pdv-completa",
  "name": "Validação de Venda PDV Completa",
  "description": "Valida a gravação completa do cabeçalho da nota (PCNFSAID), itens (PCPEDC) e movimentação de estoque.",
  "category": "Vendas PDV",
  "author": "QA Team",
  "version": "1.0.0",
  "createdAt": "2026-10-01T12:00:00.000Z",
  "updatedAt": "2026-10-02T07:30:00.000Z",
  "defaultVariables": {
    "codFilial": "1",
    "numCupom": "4387"
  },
  "sampleJson": "{\\n  \\"codFilial\\": \\"1\\",\\n  \\"numCupom\\": 4387,\\n  \\"vlTotal\\": 768.70\\n}",
  "steps": [
    {
      "id": "step-nota-fiscal",
      "title": "Passo 1 — Cabeçalho da Nota Fiscal",
      "tableName": "PCNFSAID",
      "enabled": true,
      "query": "SELECT NUMNOTA, CODFILIAL, VLTOTAL, DTHUSAIDA, CHAVENFE FROM PCNFSAID WHERE CODFILIAL = :codFilial AND NUMNOTA = :numCupom",
      "assertions": [
        {
          "id": "ass-filial",
          "column": "CODFILIAL",
          "expectedType": "literal",
          "expectedValue": "1",
          "description": "Filial deve ser 1"
        },
        {
          "id": "ass-total",
          "column": "VLTOTAL",
          "expectedType": "jsonPath",
          "expectedValue": "$.vlTotal",
          "description": "Total gravado no banco deve bater com o total do payload"
        },
        {
          "id": "ass-data",
          "column": "DTHUSAIDA",
          "expectedType": "notNull",
          "description": "Data de saída deve estar gravada"
        }
      ]
    }
  ]
}`;

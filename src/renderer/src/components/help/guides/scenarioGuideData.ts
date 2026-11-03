/**
 * Conteúdo do manual "Validação de Cenários" (Central de Ajuda → Guias e o botão Como usar da página). As tabelas
 * de checagens e de regras saem dos mesmos catálogos que a tela usa, então o manual não fica desatualizado.
 */
import { API_RULE_KIND_LABELS, API_RULE_OPERATORS, API_RULE_OPERATOR_LABELS, LEAK_RULE_SCOPE } from '../../../../../shared/apiRuleText';
import type { ApiRuleKind } from '../../../../../shared/apiScenarioTypes';
import { AUTH_LOCKOUT_CHECKS } from '../../../../../shared/authLockoutCatalog';
import { AUTH_LOCKOUT_STATUS_LABELS } from '../../../../../shared/authLockoutReport';
import type { AuthLockoutCheckStatus } from '../../../../../shared/authLockoutTypes';

export interface GuideRow {
  /** Primeira coluna (o nome). */
  name: string;
  text: string;
  /** Terceira coluna, quando a tabela tem. */
  extra?: string;
}

/** O que preencher em Configurações antes do primeiro teste. */
export const SCENARIO_GUIDE_SETUP: GuideRow[] = [
  {
    name: 'URL do Portal WTA',
    text: 'Configurações → Rotinas WinThor. É o {{wtaUrl}} dos cenários e a URL padrão do Bloqueio de Login.',
    extra: 'Os dois cenários'
  },
  {
    name: 'Usuário WTA e Senha / Hash WTA',
    text: 'Configurações → Rotinas WinThor. Digite a senha normal: o Hub manda o MD5 em maiúsculas que o WTA espera.',
    extra: 'Validação de API com "Login do WTA de Configurações"'
  },
  {
    name: 'Diretório do Apache Karaf',
    text: 'Configurações → Karaf. O winthor.log é lido em <pasta do Karaf>/data/log/winthor.log.',
    extra: 'Regra "Registrado no log" e correlação de logs do Bloqueio'
  },
  {
    name: 'Conexão do banco',
    text: 'DB Studio → nova conexão (Oracle ou PostgreSQL de homologação).',
    extra: 'Regra "Campo × banco"'
  },
  {
    name: 'Dois usuários de teste',
    text: 'Usuários dedicados no WinThor de homologação, que podem ficar bloqueados. Nunca use um usuário de alguém.',
    extra: 'Bloqueio de Login'
  }
];

/** As checagens do Bloqueio de Login, como a tela mostra. */
export const SCENARIO_GUIDE_LOCKOUT_CHECKS: GuideRow[] = AUTH_LOCKOUT_CHECKS.map((check) => ({
  name: check.title,
  text: check.attempt,
  extra: `${check.expectation}${check.slow ? ' (espera minutos)' : ''}${check.needsUserB ? ' (usa o usuário B)' : ''}`
}));

const STATUS_MEANING: Partial<Record<AuthLockoutCheckStatus, string>> = {
  passed: 'O servidor fez o que a regra pede.',
  failed: 'O servidor não fez: abra a regra e veja as evidências.',
  warning: 'Passou, mas há algo para olhar (ex.: versão do servidor no cabeçalho).',
  info: 'O teste observou e registrou o comportamento, sem regra fechada para comparar.',
  manual: 'Precisa de uma ação fora do Hub (ex.: derrubar o destino de logs). A regra explica o que fazer.',
  skipped: 'Não foi selecionada ou não pôde rodar (ex.: sem o usuário B). O motivo aparece na linha.'
};

export const SCENARIO_GUIDE_STATUSES: GuideRow[] = (Object.keys(STATUS_MEANING) as AuthLockoutCheckStatus[]).map((status) => ({
  name: AUTH_LOCKOUT_STATUS_LABELS[status],
  text: STATUS_MEANING[status] as string
}));

const RULE_EXAMPLES: Record<ApiRuleKind, string> = {
  status: '200, ou 2xx, ou 200, 201, ou 4xx para erro forçado',
  duration: 'menor que 2000 (ms)',
  header: 'content-type contém json',
  body: 'não contém Exception; expressão "(message|erro)"\\s*:',
  json: '$.total maior que 0; $.itens[0].codigo existe; $.code diferente de UNK-ERR',
  db: '$.nome igual ao SELECT FANTASIA FROM PCFILIAL WHERE CODIGO = :valor, com :valor vindo de $.codigo',
  leak: LEAK_RULE_SCOPE,
  log: '{{requestId}} no winthor.log ou na API de logs'
};

/** Os tipos de regra da Validação de API com os operadores de cada um. */
export const SCENARIO_GUIDE_API_RULES: GuideRow[] = (Object.keys(API_RULE_KIND_LABELS) as ApiRuleKind[]).map((kind) => ({
  name: API_RULE_KIND_LABELS[kind],
  text: API_RULE_OPERATORS[kind].map((op) => API_RULE_OPERATOR_LABELS[op]).join(', '),
  extra: RULE_EXAMPLES[kind]
}));

/** Como forçar uma exceção não mapeada: o que mandar e o que o WTA costuma devolver quando não trata. */
export const SCENARIO_GUIDE_EXCEPTION_RECIPES: GuideRow[] = [
  {
    name: 'Texto onde vai número',
    text: 'GET {{wtaUrl}}/winthor/<rota>?numero=NUMERO',
    extra: 'UNK-ERR com For input string: "NUMERO"'
  },
  {
    name: 'Data inválida',
    text: 'GET {{wtaUrl}}/winthor/<rota>?data=NAO-E-DATA',
    extra: 'UNK-ERR com Failed to convert value of type [java.lang.String] to required type [java.time.LocalDateTime]...'
  },
  {
    name: 'Campo que não existe',
    text: 'POST com corpo { "campoQueNaoExiste": "{{requestId}}" } (é o corpo do modelo Exceção)',
    extra: '"Unrecognized field" ou o campo ignorado'
  },
  {
    name: 'Tipo errado no corpo',
    text: 'POST com { "codigo": "abc" } onde a API espera número',
    extra: '"Cannot deserialize value of type"'
  },
  {
    name: 'JSON quebrado',
    text: 'POST com corpo { "codigo": 1 (sem fechar a chave)',
    extra: '"JSON parse error"'
  },
  {
    name: 'Parâmetro obrigatório ausente',
    text: 'Chamar a rota sem o parâmetro que ela exige',
    extra: '"Required request parameter ... is not present"'
  },
  {
    name: 'Valor fora da lista',
    text: 'Mandar uma situação ou tipo que não existe (ex.: "situacao": "X")',
    extra: '"No enum constant"'
  }
];

/** Cada botão de copiar ou baixar: o que leva e onde fica. */
export const SCENARIO_GUIDE_BUTTONS: GuideRow[] = [
  { name: 'Copiar relatório (Jira)', text: 'O relatório em Markdown: resultado, cada regra com esperado e obtido, evidências e passo a passo.', extra: 'Resultado dos dois cenários' },
  { name: 'Baixar .md', text: 'O mesmo relatório num arquivo com o nome do cenário e a data (ex.: bloqueio-de-login-teste-a-teste-b-2026-10-30-1042.md).', extra: 'Resultado e Histórico' },
  { name: 'Copiar passo a passo', text: 'A atividade com hora. Com "Mostrar cada requisição" desligado, só os passos e os resultados.', extra: 'Passo a passo dos dois cenários' },
  { name: 'Copiar evidências', text: 'A regra, o status, como foi testado e as evidências.', extra: 'Cada regra do Bloqueio (aberta)' },
  { name: 'Ícone ao lado do identificador', text: 'O requestId da execução (ex.: dm-mf3k2a-1b2c3d), para procurar no winthor.log ou citar no Jira.', extra: 'Resultado da Validação de API' },
  { name: 'Copiar como cURL', text: 'A requisição enviada (URL, cabeçalhos e corpo). O token sai como <TOKEN_DO_WTA>: troque pelo seu antes de rodar.', extra: 'Requisição enviada' },
  { name: 'Copiar cabeçalhos / Copiar corpo', text: 'A resposta como chegou, com tokens mascarados.', extra: 'Cabeçalhos e Corpo da resposta' }
];

export const SCENARIO_GUIDE_PROBLEMS: GuideRow[] = [
  {
    name: 'Login do WTA recusado (401) antes de chamar a API',
    text: 'Usuário ou senha de Configurações errados, ou a senha foi colada já em MD5 com "Texto puro".',
    extra: 'Confira Configurações → Rotinas WinThor e faça login no WTA com o mesmo usuário.'
  },
  {
    name: '"winthor.log não configurado" ou "não encontrado"',
    text: 'Diretório do Apache Karaf vazio ou apontando para outra pasta.',
    extra: 'Configurações → Karaf. No Bloqueio, dá para informar o caminho do arquivo direto no campo "Arquivo de log".'
  },
  {
    name: 'Registrado no log não acha o requestId',
    text: 'O servidor não grava os cabeçalhos X-Request-Id / X-Correlation-Id no log.',
    extra: 'Ponha {{requestId}} no corpo ou na URL, ou procure por um trecho da mensagem de erro.'
  },
  {
    name: 'API de logs responde 401 ou 403',
    text: 'A API exige um perfil que o usuário de Configurações não tem.',
    extra: 'Use a fonte "winthor.log" na regra ou peça o acesso ao usuário.'
  },
  {
    name: 'Campo × banco: "conexão não encontrada"',
    text: 'A conexão do cenário foi apagada ou renomeada no DB Studio.',
    extra: 'Escolha a conexão de novo na regra e salve.'
  },
  {
    name: 'Usuário de teste continua bloqueado depois do teste',
    text: 'É o esperado: o bloqueio dura o tempo da regra (4 ou 5 minutos).',
    extra: 'Espere o prazo ou desbloqueie pelo WinThor. O fim do passo a passo diz quem pode continuar bloqueado.'
  },
  {
    name: 'Cenário de Exceção antigo sem a regra do UNK-ERR',
    text: 'Os cenários salvos não mudam quando o modelo ganha regra nova.',
    extra: 'Acrescente "Campo do JSON" $.code diferente de UNK-ERR, ou recrie pelo botão Exceção.'
  }
];

export const SCENARIO_GUIDE_LOCATIONS: GuideRow[] = [
  { name: 'Página', text: 'Qualidade → Validação de Cenários (Ctrl+K: "cenários")' },
  { name: 'Cenários de API salvos', text: 'api-scenarios.json, ao lado do config.json (sem senha nem token)' },
  { name: 'Histórico (últimas 50 execuções)', text: 'pasta scenario-runs, ao lado do config.json (um arquivo por execução, mascarado)' },
  { name: 'Pelo MCP', text: 'qa_run_auth_lockout_test, qa_run_api_scenario, qa_save_api_scenario, qa_list_scenario_runs, qa_get_scenario_run' },
  { name: 'Pelo modo Web', text: '/api/auth-lockout, /api/api-scenarios e /api/scenario-history' }
];

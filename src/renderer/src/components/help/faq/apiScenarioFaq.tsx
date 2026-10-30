import React from 'react';
import type { FaqItem } from '../helpData';

const code = (text: string) => <code className="font-mono text-primary">{text}</code>;
const strong = (text: string) => <strong className="text-foreground">{text}</strong>;

/** Validação de Cenários → Validação de API: chamar uma API e confrontar status e campos do JSON com o esperado. */
export function getApiScenarioFaq(): FaqItem[] {
  return [
    {
      id: 'api-scenario-check',
      question: 'Como confiro se uma API responde o que deveria (status, tempo, campos do JSON, valor no banco)?',
      category: 'Qualidade & Homologação',
      tags: ['api', 'validação', 'status', 'json', 'jsonpath', 'campo', 'resposta', 'esperado', 'obtido', 'wta', 'cenário', 'assert', 'asserção', 'tempo', 'cabeçalho', 'header', 'regex', 'banco', 'sql', 'oracle'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            Em {strong('Validação de Cenários → Validação de API')}, monte a requisição (método, URL, cabeçalhos e corpo) e diga o que a
            resposta precisa ter. {strong('Rodar')} chama a API e mostra, regra a regra, o esperado, o obtido e se passou.
          </p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li>
              {strong('URL:')} {code('{{wtaUrl}}')} vira a URL do WTA de Configurações, então o mesmo cenário serve para outro ambiente
              (ex.: {code('{{wtaUrl}}/winthor/ferramenta/servidor/v1/logs')}).
            </li>
            <li>
              {strong('Autenticação:')} com {strong('Login do WTA de Configurações')}, o Dev Manager entra antes no WTA (senha em MD5) e
              manda o token no Authorization e no cookie suukie. Nenhum segredo fica salvo no cenário.
            </li>
            <li>
              {strong('Status:')} igual, diferente ou um destes, com lista ({code('200, 201')}) ou faixa ({code('2xx')}).
            </li>
            <li>
              {strong('Campo do JSON:')} pelo caminho ({code('$.total')}, {code('$.itens[0].codigo')}): igual, diferente, contém, existe,
              não existe, não está vazio, maior, menor e quantidade de itens. Números aceitam vírgula ou ponto e S/N vale como
              verdadeiro/falso, como no Validador Regressivo.
            </li>
            <li>
              {strong('Tempo de resposta:')} menor (ou maior) que N milissegundos. {strong('Cabeçalho:')} existe, não existe, igual ou
              contém, sem diferenciar maiúsculas no nome (ex.: {code('content-type')} contém {code('json')}). {strong('Texto do corpo:')}{' '}
              contém, não contém ou casa com uma expressão regular (até 300 caracteres).
            </li>
            <li>
              {strong('Campo × banco:')} compara um campo da resposta com o valor de uma consulta numa conexão do DB Studio (a primeira
              coluna da primeira linha vira o esperado). Só SELECT. Para buscar o registro certo, outro campo da resposta entra na consulta
              como {code(':valor')}: {code('$.nome')} igual ao banco com {code('SELECT FANTASIA FROM PCFILIAL WHERE CODIGO = :valor')} e{' '}
              {code(':valor')} vindo de {code('$.codigo')}.
            </li>
            <li>
              {strong('Rodar sem salvar')} testa o rascunho antes de salvar; {strong('Rodar todos')} roda os cenários salvos em sequência.
              O passo a passo mostra cada etapa, e {strong('Copiar relatório (Jira)')} leva a tabela de regras e o corpo da resposta com
              tokens mascarados.
            </li>
          </ul>
          <p>
            Os cenários ficam num arquivo ao lado do {code('config.json')} ({code('api-scenarios.json')}), e o assistente de IA usa os
            mesmos pelas tools MCP {code('qa_list_api_scenarios')}, {code('qa_run_api_scenario')}, {code('qa_save_api_scenario')} e{' '}
            {code('qa_delete_api_scenario')}.
          </p>
        </div>
      )
    },
    {
      id: 'api-scenario-unmapped-exception',
      question: 'Como testo uma exceção não mapeada (forçar a API a cair num erro que o código não trata)?',
      category: 'Qualidade & Homologação',
      tags: ['exceção', 'exception', 'não mapeada', 'erro', '500', 'stack trace', 'vazamento', 'middleware', 'log', 'winthor.log', 'requestId', 'correlation'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            Em {strong('Validação de Cenários → Validação de API')}, clique em {strong('Exceção')}. O modelo vem pronto; informe só a rota e o
            corpo (ou parâmetro) que força o erro: campo que não existe, tipo errado, valor fora da faixa, JSON quebrado.
          </p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li>{strong('Status um destes 4xx:')} o erro forçado precisa voltar como erro tratado, não como 500.</li>
            <li>{strong('Cabeçalho e corpo:')} a resposta é JSON e tem o formato de erro ({code('message')}, {code('mensagem')} ou {code('erro')}).</li>
            <li>
              {strong('Sem vazamento de erro:')} reprova se a resposta (corpo ou cabeçalhos) trouxer stack trace Java, erro ORA- ou de SQL,
              string de conexão, a senha usada ou token. Mesmo sem essa regra, o passo a passo avisa quando algo vaza.
            </li>
            <li>
              {strong('Registrado no log:')} cada execução tem um identificador novo ({code('{{requestId}}')}, ex.: {code('dm-mf3k2a-1b2c3d')}),
              enviado nos cabeçalhos {code('X-Request-Id')} e {code('X-Correlation-Id')} e usável no corpo e na URL. A regra procura esse texto
              (ou outro que você escrever) só nas linhas do {code('winthor.log')} escritas depois da chamada e/ou na API de logs, tentando por
              alguns segundos porque o log chega com atraso. Se o servidor não registra esses cabeçalhos, ponha o {code('{{requestId}}')} no
              corpo ou procure pela mensagem de erro.
            </li>
          </ul>
        </div>
      )
    },
    {
      id: 'scenario-copy-history',
      question: 'Como copio o passo a passo, a requisição como cURL ou reabro uma execução antiga da Validação de Cenários?',
      category: 'Qualidade & Homologação',
      tags: ['copiar', 'curl', 'postman', 'histórico', 'baixar', 'markdown', '.md', 'evidências', 'requestId', 'jira'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <ul className="list-disc pl-4 space-y-1.5">
            <li>
              {strong('Copiar:')} o passo a passo tem {strong('Copiar passo a passo')} (com {strong('Mostrar cada requisição')} desligado, copia só
              os passos); cada regra do Bloqueio de Login, {strong('Copiar evidências')}; na Validação de API, o identificador da execução, o
              corpo e os cabeçalhos da resposta têm o seu botão.
            </li>
            <li>
              {strong('Requisição enviada:')} mostra o que o Hub mandou como cURL. {strong('Copiar como cURL')} leva URL, cabeçalhos e corpo, mas
              nunca o token: {code('Authorization')} e {code('Cookie')} saem como {code('<TOKEN_DO_WTA>')}. Troque pelo seu antes de rodar
              (ou importe no Postman).
            </li>
            <li>{strong('Baixar .md:')} salva o relatório do Jira num arquivo com o nome do cenário e a data.</li>
            <li>
              {strong('Histórico:')} o botão no alto da página lista as últimas 50 execuções dos dois cenários, com filtro por tipo.{' '}
              {strong('Abrir')} mostra a execução como ficou, com os mesmos botões de copiar; dá para baixar o .md, apagar uma ou limpar tudo. O
              histórico fica em {code('scenario-runs/')}, ao lado do {code('config.json')}, com senhas e tokens mascarados, e é o mesmo no app,
              no modo Web e no MCP ({code('qa_list_scenario_runs')} e {code('qa_get_scenario_run')}).
            </li>
          </ul>
        </div>
      )
    }
  ];
}

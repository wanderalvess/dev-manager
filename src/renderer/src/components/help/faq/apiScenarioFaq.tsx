import React from 'react';
import type { FaqItem } from '../helpData';

const code = (text: string) => <code className="font-mono text-primary">{text}</code>;
const strong = (text: string) => <strong className="text-foreground">{text}</strong>;

/** Validação de Cenários → Validação de API: chamar uma API e confrontar status e campos do JSON com o esperado. */
export function getApiScenarioFaq(): FaqItem[] {
  return [
    {
      id: 'api-scenario-check',
      question: 'Como confiro se uma API responde o que deveria (status e campos do JSON)?',
      category: 'Qualidade & Homologação',
      tags: ['api', 'validação', 'status', 'json', 'jsonpath', 'campo', 'resposta', 'esperado', 'obtido', 'wta', 'cenário', 'assert', 'asserção'],
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
    }
  ];
}

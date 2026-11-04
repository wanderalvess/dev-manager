import React from 'react';
import type { FaqItem } from '../helpData';

export function getStartScreenFaq(): FaqItem[] {
  return [
    {
      id: 'start-screen-jira',
      question: 'O que aparece na tela de início e como ligo o Jira nela?',
      category: 'Tela de início',
      tags: ['tela de início', 'início', 'abertura', 'jira', 'sprint', 'worklog', 'horas', 'issues', 'continuar de onde parou', 'clima', 'tela ao entrar', 'aba inicial', 'ultima aba'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            Ao abrir o Hub você vê a saudação com o resumo do dia e os cartões: <strong className="text-foreground">Continuar de onde parou</strong>,{' '}
            <strong className="text-foreground">Jira · hoje</strong>, <strong className="text-foreground">Ambientes</strong>,{' '}
            <strong className="text-foreground">Sua semana</strong>, <strong className="text-foreground">Este PC</strong> e{' '}
            <strong className="text-foreground">Clima</strong>, além da faixa de novidades da versão. A tela acompanha o tema escolhido (claro ou escuro)
            e fica aberta até você clicar em <strong className="text-foreground">Entrar no cockpit</strong>.
          </p>
          <p>
            O Jira usa a credencial cadastrada em <strong className="text-foreground">Documentação › Confluence &amp; Jira</strong> (a primeira fonte
            Jira ativa, com URL e token). Com ela, a tela mostra:
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li>a issue em que você lançou horas por último, com o total que você lançou naquele dia;</li>
            <li>suas issues em andamento e as que têm prazo até hoje (clique para abrir no Jira);</li>
            <li>a sprint ativa, com o progresso do time e quantos dias faltam;</li>
            <li>as horas que você lançou desde segunda, dia a dia.</li>
          </ul>
          <p>
            Só leitura: o Hub não altera nada no Jira. A consulta fica guardada por 5 minutos, o token nunca aparece na tela e a descrição e os
            comentários das issues não são lidos. Dá para ligar o Jira também na etapa <strong className="text-foreground">Tela de início</strong> do
            onboarding. Sem fonte Jira, a tela mostra seus módulos mais usados na semana (cada um abre a sua aba) e as barras da semana contam as
            automações do Hub.
          </p>
          <p>
            <strong className="text-foreground">Para onde o Entrar no cockpit leva:</strong> a aba escolhida em{' '}
            <strong className="text-foreground">Configurações › Aparência › Tela ao entrar</strong>; sem escolha, a última aba que você usou.
          </p>
        </div>
      )
    }
  ];
}

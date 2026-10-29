import React from 'react';
import type { FaqItem } from '../helpData';

const code = (text: string) => <code className="font-mono text-primary">{text}</code>;
const strong = (text: string) => <strong className="text-foreground">{text}</strong>;

/** Homologação → Bloqueio de Login: como validar as regras de bloqueio do login do WinThor e o registro de logs. */
export function getAuthLockoutFaq(): FaqItem[] {
  return [
    {
      id: 'auth-lockout-test',
      question: 'Como valido o bloqueio de login do WinThor (5 falhas, duração, logoff, logs) em homologação?',
      category: 'Qualidade & Homologação',
      tags: ['bloqueio', 'login', 'senha', 'md5', '401', 'tentativas', 'lockout', 'brute force', 'teste de carga', 'logoff', 'janela', 'winthor.log', 'logs', 'segurança', 'concorrência'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            Em {strong('Homologação → Bloqueio de Login')}, informe a URL do WTA, a API de logs (padrão{' '}
            {code('/winthor/ferramenta/servidor/v1/logs')}), o {code('winthor.log')} (padrão: a pasta do Karaf de Configurações) e dois
            usuários de teste. {strong('Rodar teste')} faz as tentativas controladas contra {code('/winthor/autenticacao/v1/login')} e
            preenche a tabela de 12 regras com o resultado observado e as evidências de cada uma.
          </p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li>
              {strong('Senha:')} digite a senha normal. O login do WTA recebe o MD5 dela em hexadecimal maiúsculo (senha{' '}
              {code('1')} → {code('C4CA4238A0B923820DCC509A6F75849B')}), e o Dev Manager faz essa conversão; o hash pronto também é
              aceito. Só troque para {strong('Texto puro')} se o seu WTA receber a senha sem hash.
            </li>
            <li>
              {strong('Passo a passo:')} cada checagem abre explicando o que vai ser feito, com os seus usuários e números. Cada
              requisição mostra o que foi enviado, o que o WTA respondeu e o que se esperava: em verde quando bateu, em vermelho quando
              não bateu. Cada espera diz o motivo, e o fim traz o placar e quem pode continuar bloqueado. Abra uma regra para ver
              {' '}{strong('Como foi testado')} e as evidências; o relatório do Jira leva tudo isso.
            </li>
            <li>
              {strong('Ordem:')} o usuário A erra 4 vezes (não pode bloquear), espera a janela e erra 5 (tem de bloquear). Com A bloqueado,
              o mesmo bloqueio serve para a senha certa (sem token nem cookie de sessão), outro cliente HTTP, o usuário B na mesma origem e o
              logoff. B recebe as falhas simultâneas da concorrência.
            </li>
            <li>
              {strong('Lentas:')} a duração do bloqueio sonda A antes e depois de cada duração candidata (padrão 4 e 5 min) e a janela de
              contagem distribui falhas antes e depois dos 60 s e diz se o servidor se comporta como janela fixa, deslizante ou contagem
              acumulada. Com as duas, o teste leva uns 8 minutos; {strong('Só as rápidas')} leva uns 2.
            </li>
            <li>
              {strong('Logs:')} só o trecho do {code('winthor.log')} escrito durante o teste é lido. Cada falha usa uma senha errada
              diferente: se alguma aparecer no log ou na API de logs, o teste reprova (o servidor está gravando a senha digitada). A API de
              logs sem autenticação tem de responder 401 ou 403; com autenticação, usa o login do WTA de Configurações.
            </li>
            <li>
              {strong('Destino de logs indisponível:')} o Dev Manager não derruba o log por conta própria. Torne-o indisponível por um
              mecanismo autorizado (ex.: appender apontando para uma pasta sem gravação), marque a confirmação e rode só essa checagem.
            </li>
            <li>
              {strong('Bloqueio x senha errada:')} se o servidor responde os dois com 401, a confirmação é sempre pela senha certa. Para
              diferenciar pela mensagem, ajuste o texto da resposta de bloqueio em {strong('Regra e caminhos')}.
            </li>
          </ul>
          <p>
            As contas ficam bloqueadas de propósito: use só em homologação e com usuários dedicados. As senhas não são salvas e o
            relatório ({strong('Copiar relatório (Jira)')}) sai com senhas e tokens mascarados. O assistente de IA tem o mesmo teste pelas
            tools MCP {code('qa_list_auth_lockout_checks')} e {code('qa_run_auth_lockout_test')} (esta pede confirmação).
          </p>
        </div>
      )
    }
  ];
}

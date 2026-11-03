import React from 'react';
import { GUIDE_CODE, GUIDE_H2, GUIDE_H3, GUIDE_OL, GUIDE_P, GuideNote, GuideSectionNav, GuideTable } from './guideParts';
import {
  SCENARIO_GUIDE_API_RULES,
  SCENARIO_GUIDE_BUTTONS,
  SCENARIO_GUIDE_LOCATIONS,
  SCENARIO_GUIDE_LOCKOUT_CHECKS,
  SCENARIO_GUIDE_PROBLEMS,
  SCENARIO_GUIDE_SETUP,
  SCENARIO_GUIDE_STATUSES
} from './scenarioGuideData';
import { ScenarioGuideExceptions } from './ScenarioGuideExceptions';

export const SCENARIO_GUIDE_PREFIX = 'cenarios-guia';

const SECTIONS = [
  ['pagina', 'Em uma página'],
  ['antes', 'Antes de começar'],
  ['bloqueio', 'Bloqueio de Login'],
  ['api', 'Validação de API'],
  ['excecao', 'Exceção não mapeada'],
  ['resultado', 'Resultado e evidências'],
  ['historico', 'Histórico'],
  ['problemas', 'Problemas comuns'],
  ['onde', 'Onde está cada coisa']
] as const;

const id = (section: string) => `${SCENARIO_GUIDE_PREFIX}-${section}`;
const c = (text: string) => <code className={GUIDE_CODE}>{text}</code>;

/**
 * Manual de uso da Validação de Cenários: o que preparar, como rodar cada cenário, como forçar uma exceção não
 * mapeada e como ler e levar o resultado para o Jira. Aparece na Central de Ajuda (Guias) e no botão Como usar.
 */
export const ScenarioValidationGuide: React.FC = () => (
  <article className="max-w-4xl space-y-3">
    <header className="space-y-2">
      <h1 className="text-xl font-bold text-foreground">Validação de Cenários: manual de uso</h1>
      <p className={GUIDE_P}>
        Testes de comportamento do WinThor em homologação, com evidência pronta para o Jira. Cada aba é um cenário: o{' '}
        <strong>Bloqueio de Login</strong> confere as regras de bloqueio do login do WTA, e a <strong>Validação de API</strong> chama uma API e confronta
        a resposta com o que se espera, inclusive quando o QA força um erro que o código não trata.
      </p>
      <GuideSectionNav sections={SECTIONS} prefix={SCENARIO_GUIDE_PREFIX} />
    </header>

    <h2 id={id('pagina')} className={GUIDE_H2}>Em uma página</h2>
    <ol className={GUIDE_OL}>
      <li>Abra <strong>Qualidade → Validação de Cenários</strong> (ou Ctrl+K e digite "cenários").</li>
      <li>Escolha a aba do cenário. O botão <strong>Histórico</strong>, no fim da barra de abas, vale para os dois.</li>
      <li>Preencha o formulário da esquerda e rode. O resultado aparece regra a regra, com o passo a passo embaixo.</li>
      <li>Leve para o Jira com <strong>Copiar relatório (Jira)</strong> ou <strong>Baixar .md</strong>. Senhas e tokens já saem mascarados.</li>
    </ol>

    <h2 id={id('antes')} className={GUIDE_H2}>Antes de começar</h2>
    <p className={GUIDE_P}>Preencha uma vez. Sem isso os cenários ainda rodam, mas algumas regras não têm onde procurar.</p>
    <GuideTable head={['O quê', 'Onde', 'Usado por']} rows={SCENARIO_GUIDE_SETUP} />
    <GuideNote tone="warning">
      Use só <strong>homologação</strong>. O Bloqueio de Login bloqueia as contas de propósito, e a Validação de API chama a API de verdade: um POST
      grava, um DELETE apaga.
    </GuideNote>

    <h2 id={id('bloqueio')} className={GUIDE_H2}>Bloqueio de Login</h2>
    <p className={GUIDE_P}>
      Faz tentativas controladas de login no WTA com dois usuários de teste e confere cada regra pelas respostas, pelo {c('winthor.log')} e pela API
      de logs. As senhas não são salvas e nunca aparecem no relatório.
    </p>
    <h3 className={GUIDE_H3}>Passo a passo</h3>
    <ol className={GUIDE_OL}>
      <li>
        <strong>Ambiente:</strong> confira a <strong>URL do WTA</strong> (vem de Configurações), a <strong>API de logs</strong> e o{' '}
        <strong>Arquivo de log (winthor.log)</strong>. Só o que for escrito no log durante o teste é lido.
      </li>
      <li>
        <strong>Usuários de teste:</strong> informe <strong>Usuário A</strong> e <strong>Senha de A</strong> (fica bloqueado quase o teste todo) e{' '}
        <strong>Usuário B</strong> e <strong>Senha de B</strong> (bloqueio por usuário e concorrência). Sem o B, essas duas regras não rodam.
      </li>
      <li>
        <strong>Senha enviada ao WTA:</strong> deixe <strong>MD5 em maiúsculas</strong> e digite a senha normal (senha 1 vira {c('C4CA4238…')}).
      </li>
      <li>
        <strong>Regras:</strong> marque as que quer rodar. Duração e janela esperam minutos, e o botão de rodar mostra o tempo estimado (ex.:{' '}
        <strong>Rodar teste (~8 min)</strong>).
      </li>
      <li>
        <strong>Regra e caminhos</strong> (opcional): falhas que bloqueiam, janela em segundos, durações a conferir, logins simultâneos, caminhos de
        login e logoff e o texto da resposta de bloqueio.
      </li>
      <li>Rode. <strong>Interromper</strong> para no meio; as regras que já terminaram ficam com o resultado.</li>
    </ol>
    <h3 className={GUIDE_H3}>As regras</h3>
    <GuideTable head={['Regra', 'O que o teste faz', 'O que precisa acontecer']} rows={SCENARIO_GUIDE_LOCKOUT_CHECKS} />
    <h3 className={GUIDE_H3}>O que cada status quer dizer</h3>
    <GuideTable head={['Status', 'Significado']} rows={SCENARIO_GUIDE_STATUSES} />
    <p className={GUIDE_P}>
      Clique numa regra para ver <strong>Como foi testado</strong> (com os seus usuários e números) e as <strong>Evidências</strong>. No fim do passo a
      passo, o teste diz quem pode continuar bloqueado.
    </p>

    <h2 id={id('api')} className={GUIDE_H2}>Validação de API</h2>
    <p className={GUIDE_P}>Um cenário é uma requisição e a lista do que a resposta precisa ter. Fica salvo para rodar de novo a cada build.</p>
    <h3 className={GUIDE_H3}>Passo a passo</h3>
    <ol className={GUIDE_OL}>
      <li>
        Clique em <strong>Novo</strong> (cenário em branco) ou <strong>Exceção</strong> (modelo de erro forçado, ver a próxima seção).
      </li>
      <li>
        Dê um <strong>Nome do cenário</strong> e monte a <strong>Requisição</strong>: método, URL (use {c('{{wtaUrl}}')}, trocado pela URL do WTA de
        Configurações), cabeçalhos e corpo. {c('{{requestId}}')} vira o identificador da execução em qualquer um deles.
      </li>
      <li>
        <strong>Autenticação:</strong> <strong>Login do WTA de Configurações</strong> entra no WTA antes e manda o token no {c('Authorization')} e no
        cookie {c('suukie')}; <strong>Sem autenticação</strong> chama direto. Não ponha senha nem token nos cabeçalhos: eles ficam salvos em texto.
      </li>
      <li>
        Em <strong>O que a resposta precisa ter</strong>, escolha o tipo em <strong>+ Adicionar regra…</strong> e preencha operador e valor esperado
        (tabela abaixo).
      </li>
      <li>
        <strong>Rodar sem salvar</strong> testa o rascunho; <strong>Salvar</strong> guarda o cenário; <strong>Rodar todos</strong> roda os salvos, um
        depois do outro, e marca cada um na lista com ✔ ou ✘.
      </li>
    </ol>
    <h3 className={GUIDE_H3}>Tipos de regra</h3>
    <GuideTable head={['Tipo', 'Operadores', 'Exemplo']} rows={SCENARIO_GUIDE_API_RULES} />
    <p className={GUIDE_P}>
      Na comparação, número como texto ({c('"10"')} = {c('10')}), vírgula decimal e S/N contam como iguais. No <strong>Campo × banco</strong> só vale{' '}
      {c('SELECT')}, e o campo escolhido entra na consulta como {c(':valor')} (bind, nunca colado no SQL).
    </p>

    <ScenarioGuideExceptions sectionId={id('excecao')} />

    <h2 id={id('resultado')} className={GUIDE_H2}>Resultado e evidências</h2>
    <p className={GUIDE_P}>
      Cada regra mostra <strong>Esperado</strong>, <strong>Obtido</strong> e ✔/✘. O <strong>Passo a passo</strong> conta o que foi feito, em verde quando a
      resposta foi a esperada e em vermelho quando não foi. Na Validação de API, <strong>Requisição enviada</strong> mostra o que o Hub mandou, e os
      blocos de cabeçalhos e corpo mostram o que voltou.
    </p>
    <GuideTable head={['Botão', 'O que leva', 'Onde fica']} rows={SCENARIO_GUIDE_BUTTONS} />

    <h2 id={id('historico')} className={GUIDE_H2}>Histórico</h2>
    <p className={GUIDE_P}>
      Toda execução entra sozinha no <strong>Histórico</strong>, rodada pela tela, pelo modo Web ou pelo MCP. Ficam as últimas 50, com filtro por
      cenário. <strong>Abrir</strong> mostra a execução como ficou, com os mesmos botões de copiar; o ícone de download salva o .md; a lixeira apaga
      uma; <strong>Limpar histórico</strong> apaga todas (pede confirmação).
    </p>

    <h2 id={id('problemas')} className={GUIDE_H2}>Problemas comuns</h2>
    <GuideTable head={['Sintoma', 'Causa', 'Como resolver']} rows={SCENARIO_GUIDE_PROBLEMS} />

    <h2 id={id('onde')} className={GUIDE_H2}>Onde está cada coisa</h2>
    <GuideTable head={['O quê', 'Onde']} rows={SCENARIO_GUIDE_LOCATIONS} mono={[1]} />
  </article>
);

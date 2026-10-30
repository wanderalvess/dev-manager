import React from 'react';
import { GUIDE_CODE, GUIDE_H2, GUIDE_H3, GUIDE_OL, GUIDE_P, GuideNote, GuideTable } from './guideParts';
import { SCENARIO_GUIDE_EXCEPTION_RECIPES } from './scenarioGuideData';

const c = (text: string) => <code className={GUIDE_CODE}>{text}</code>;
const PRE = 'p-3 rounded-xl bg-muted/50 border border-border/80 text-xs font-mono text-foreground/90 whitespace-pre-wrap break-all';

/** Seção do manual sobre exceção não mapeada, separada para o guia caber na leitura. */
export const ScenarioGuideExceptions: React.FC<{ sectionId: string }> = ({ sectionId }) => (
  <>
    <h2 id={sectionId} className={GUIDE_H2}>Exceção não mapeada</h2>
    <p className={GUIDE_P}>
      Quando a API recebe algo que o código não trata, o WTA cai no tratador genérico e devolve {c('"code": "UNK-ERR"')} com a mensagem original da
      exceção em {c('detailedMessage')}. É isso que o modelo <strong>Exceção</strong> pega:
    </p>
    <pre className={PRE}>
      {`{
    "code": "UNK-ERR",
    "message": "Erro de Requisição",
    "detailedMessage": "For input string: \\"NUMERO\\"",
    "details": []
}`}
    </pre>
    <h3 className={GUIDE_H3}>Passo a passo</h3>
    <ol className={GUIDE_OL}>
      <li>
        Na Validação de API, clique em <strong>Exceção</strong>. O modelo vem com as regras prontas; só falta a rota.
      </li>
      <li>
        Troque a URL ({c('{{wtaUrl}}/winthor/')}) pela rota que vai receber o erro e ajuste o corpo ou os parâmetros para forçar a exceção (receitas
        abaixo).
      </li>
      <li>Rode. Um erro bem tratado passa em tudo; uma exceção não mapeada reprova o código, o vazamento e, quase sempre, o log.</li>
      <li>Salve um cenário por rota e por tipo de erro, para rodar todos de novo depois da correção.</li>
    </ol>
    <h3 className={GUIDE_H3}>O que o modelo confere</h3>
    <ul className="list-disc pl-5 space-y-1 text-sm text-foreground/85">
      <li>
        <strong>Status um destes 4xx:</strong> erro do cliente volta como 4xx, não como 500.
      </li>
      <li>
        <strong>Campo $.code diferente de UNK-ERR:</strong> o erro precisa ter um código próprio. Se a resposta nem tem {c('code')}, a regra também
        reprova.
      </li>
      <li>
        <strong>Cabeçalho content-type contém json</strong> e <strong>Corpo casa com a expressão</strong>: a resposta é JSON no formato de erro.
      </li>
      <li>
        <strong>Sem vazamento de erro:</strong> nada de stack trace, mensagem crua da exceção ({c('For input string')}, {c('Failed to convert')},{' '}
        {c('nested exception is')}, tipos {c('java.lang.String')}...), erro ORA-/SQL, string de conexão, senha ou token. O <strong>Obtido</strong> mostra
        o trecho que vazou, por exemplo {c('expôs mensagem interna da exceção (Java/Spring) ("detailedMessage": "For input string: "NUMERO"",)')}.
      </li>
      <li>
        <strong>Registrado no log:</strong> o identificador da execução ({c('{{requestId}}')}, ex.: {c('dm-mf3k2a-1b2c3d')}) vai nos cabeçalhos{' '}
        {c('X-Request-Id')} e {c('X-Correlation-Id')} e no corpo do modelo. A regra procura esse texto só nas linhas do {c('winthor.log')} escritas
        depois da chamada e/ou na API de logs, por alguns segundos.
      </li>
    </ul>
    <h3 className={GUIDE_H3}>Como forçar o erro</h3>
    <GuideTable head={['Erro', 'O que mandar', 'O que volta quando não é tratado']} rows={SCENARIO_GUIDE_EXCEPTION_RECIPES} mono={[1]} />
    <GuideNote>
      Para levar ao desenvolvedor: <strong>Copiar como cURL</strong> reproduz a chamada (troque {c('<TOKEN_DO_WTA>')} pelo token), e o identificador
      ao lado do resultado acha a linha no {c('winthor.log')}.
    </GuideNote>
  </>
);

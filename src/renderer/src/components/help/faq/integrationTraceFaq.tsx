import React from 'react';
import type { FaqItem } from '../helpData';

/** Rastreio de Integração ponta a ponta (decisão 0003): configuração, pré-voo das camadas e rastreio de um lote de saída. */
export function getIntegrationTraceFaq(onNavigate?: (tab: string) => void): FaqItem[] {
  return [
    {
      id: 'integration-trace-wsh-monitor',
      question: 'Um dado não chegou ao PDV: como uso o Monitor do WSH para descobrir por quê?',
      category: 'Segurança & Configurações',
      tags: ['monitor', 'wsh', 'smart hub', 'pcintegracaocore', 'observacao', 'status', 'erro', 'produto', 'preço', 'cobrança', 'pdvsync', 'não chegou', 'não desceu'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            Em <strong className="text-foreground">Rastreio de Integração → Monitor do WSH</strong>, escolha o fluxo (como{' '}
            <em>FLUXO-09 · Produto</em>), digite o dado (o código do produto, por exemplo) e o status, e clique em Buscar. É a
            mesma busca do monitor do WSH (o dado procura no IDEXTERNO e no IDINTERNO, então o cupom acha a venda: o IDINTERNO da venda é
            filial-série-cupom, como 1-3-10905), lida direto da <code className="font-mono text-primary">PCINTEGRACAOCORE</code> pela conexão
            Oracle escolhida na camada WinThor. Não precisa de senha nem de chave do PDVSync.
          </p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li><strong className="text-foreground">Status:</strong> 2 é integrado e 3 é erro (os únicos confirmados até agora); outro código aparece como está.</li>
            <li><strong className="text-foreground">Resposta do PDVSync:</strong> vem da OBSERVACAO, com o campo e a mensagem de cada erro.</li>
            <li>
              <strong className="text-foreground">Recusado junto com o envio:</strong> o PDVSync recusa a requisição inteira quando um item
              tem erro. Se o item aberto não tem erro próprio, o Hub mostra quais outros itens do mesmo envio derrubaram tudo.
            </li>
            <li>
              <strong className="text-foreground">Como resolver:</strong> num item com erro, o primeiro bloco diz o que fazer, em ordem:
              corrigir os itens que derrubaram o envio, o valor fora da lista aceita pelo PDVSync, o campo que foi vazio e a dependência
              que não integrou, com o link do TDN quando o PDVSync manda. Logo abaixo, <em>Como o WSH monta</em> mostra as regras do JOLT
              da rota (lidas do Oracle do ambiente) que escrevem o campo recusado, com a regra que valeu para o item destacada. Ex.: a
              cobrança PIXS cai na regra <code className="font-mono text-primary">PIX*</code> → <code className="font-mono text-primary">tipo = 8</code>.
            </li>
            <li>
              <strong className="text-foreground">Dependências:</strong> o fluxo só integra bem se os fluxos de que ele depende já
              chegaram ao PDVSync. O painel <em>Depende destes fluxos</em> mostra a última integração de cada um e marca a causa provável
              pelo campo recusado: <code className="font-mono text-primary">impostos</code> vazio no Produto aponta o ICMS (FLUXO-07).
            </li>
            <li>
              <strong className="text-foreground">Agendamento deste ambiente:</strong> ao abrir a <em>Ficha do fluxo</em>, o Hub lê do
              Oracle de quanto em quanto tempo o fluxo roda neste cliente (ex.: a cada 5 min), se o passo da rota está ativo e quantos
              passos do fluxo estão ligados. Rota com o passo desligado (<code className="font-mono text-primary">ATIVO = N</code>) ou fora
              de qualquer fluxo aparece em destaque: o WSH não a executa e nada novo chega.
            </li>
            <li>
              <strong className="text-foreground">Dois sentidos:</strong> envio (WinThor → PDVSync) e recebimento pelo ERP (vendas, pedidos e
              caixa: PDVSync → WinThor). O percurso animado desenha o sentido do fluxo.
            </li>
            <li>
              <strong className="text-foreground">O que não aparece:</strong> a abertura e o fechamento do lote e a baixa nas lojas não ficam
              na PCINTEGRACAOCORE; no percurso animado esses passos aparecem como <em>sem evidência</em>. Os processos online do PDVOmni
              (pré-venda, crédito, estoque) vão direto ao WinThor, sem o WSH: estão na aba <em>Online do PDV</em>, com o endpoint de cada um e
              como mapear as tabelas que ele usa pelo Statement Tracer do Banco de Dados.
            </li>
          </ul>
          <p>
            <strong className="text-foreground">Copiar resumo (Jira)</strong> gera o resumo do item em Markdown. O assistente de IA tem a
            mesma consulta pela tool MCP <code className="font-mono text-primary">integration_check_wsh</code>.
          </p>
        </div>
      )
    },
    {
      id: 'integration-trace-config',
      question: 'O que é a aba "Integração ponta a ponta" das Configurações e o que preencher nela?',
      category: 'Segurança & Configurações',
      tags: ['integracao', 'ponta a ponta', 'rastreio', 'winthor', 'wsh', 'smart hub', 'commerce hub', 'pdvsync', 'ch', 'pdv', 'lote', 'fluxo', 'jolt', 'rac', 'client_secret'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            Para o <strong className="text-foreground">Monitor do WSH</strong> basta o bloco de cima,{' '}
            <strong className="text-foreground">Conexão Oracle do WSH</strong>: o Oracle onde o WSH grava a PCINTEGRACAOCORE, o mesmo da
            retaguarda. Sem senha nem chave do PDVSync. O resto da aba é opcional e fica recolhido:
          </p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li>
              <strong className="text-foreground">Pré-voo das camadas:</strong> para conferir se WinThor, WSH, CH e PDV estão de pé antes
              de um teste (serviço Windows, processo, porta, health, login e log). A camada WinThor reaproveita o que já está em outras
              telas: a URL e o login do WinThor de <em>Diretórios &amp; IDE → WinThor Start</em> e o log dos serviços na pasta do Karaf. Os
              campos de serviço, processo, porta e log sugerem o que já está em Serviços &amp; Processos, Portas e Logs. O que ficar vazio é
              pulado, nunca inventado.
            </li>
            <li>
              <strong className="text-foreground">PDVSync na camada CH:</strong> escolha a autenticação{' '}
              <em>Login do PDVSync (RAC)</em> e informe usuário, senha, <code className="font-mono text-primary">client_id</code> e{' '}
              <code className="font-mono text-primary">client_secret</code> (os mesmos das variáveis do WSH), o endereço do login, o
              inquilino e os endereços de consulta do lote e do status por loja. O atalho de ambiente preenche os endereços de
              produção ou homologação. Senha e <code className="font-mono text-primary">client_secret</code> ficam protegidos, e o
              Hub só lê: nunca abre nem fecha lote.
            </li>
            <li>
              <strong className="text-foreground">Rastrear lote pelo PDVSync:</strong> só para seguir um lote pelo número. Um fluxo por
              fluxo de <strong className="text-foreground">saída</strong> que você testa (ex.: produto ou preço); só o nome é obrigatório,
              e a consulta no Postgres do PDV é uma confirmação opcional. A venda é de entrada (PDV → WinThor) e não usa lote. As consultas só podem ler (SELECT) e aceitam os
              binds de texto <code className="font-mono text-primary">:lote</code>, <code className="font-mono text-primary">:inicio</code> e{' '}
              <code className="font-mono text-primary">:fim</code> (datas como <code className="font-mono text-primary">AAAA-MM-DD HH:MM:SS</code>,
              hora local; no Oracle use <code className="font-mono text-primary">TO_DATE</code>). Com <code className="font-mono text-primary">count(*)</code> vale
              o número; em qualquer outra consulta valem as linhas devolvidas.
            </li>
          </ul>
          <p>
            Senhas, tokens e <code className="font-mono text-primary">client_secret</code> das camadas ficam criptografados no{' '}
            <code className="font-mono text-primary">config.json</code>, como os outros segredos, e a interface só mostra &quot;salvo e
            protegido&quot;. Trocar o endereço do login sem digitar o segredo de novo descarta o segredo salvo, para ele não ser enviado a outro
            destino. A decisão completa está em <code className="font-mono text-primary">docs/decisions/0003</code> do repositório.
          </p>
        </div>
      )
    },
    {
      id: 'integration-trace-readiness',
      question: 'O que o pré-voo do Rastreio de Integração confere e o que significam Pronta, Com aviso e Com falha?',
      category: 'Segurança & Configurações',
      tags: ['pré-voo', 'pre-voo', 'rastreio', 'integracao', 'winthor', 'wsh', 'ch', 'pdv', 'pdvsync', 'health', 'porta', 'serviço', 'login', 'conferir'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            Na aba <strong className="text-foreground">Pré-voo</strong>, o botão <strong className="text-foreground">Conferir agora</strong> verifica,
            em paralelo, cada camada que você preencheu em <strong className="text-foreground">Configurações → Integração ponta a ponta</strong>.
            Para cada uma ele testa só o que existe no cadastro:
          </p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li><strong className="text-foreground">Serviço e processo:</strong> o serviço Windows está em execução e o processo está aberto.</li>
            <li><strong className="text-foreground">Rede:</strong> o caminho de health responde com sucesso; sem ele, o Hub testa só a porta (a da URL ou a informada).</li>
            <li><strong className="text-foreground">Login do WinThor:</strong> na camada WinThor com autenticação &quot;Login do WinThor&quot;, o Hub faz o login real e confirma que um token foi emitido (o token não é exibido nem guardado).</li>
            <li><strong className="text-foreground">Login do PDVSync:</strong> na camada CH com autenticação &quot;Login do PDVSync (RAC)&quot;, o Hub faz o login e confirma que as credenciais funcionam. Campo faltando vira aviso e diz qual é.</li>
            <li><strong className="text-foreground">Banco:</strong> a conexão do DB Studio escolhida (Oracle no WinThor, Postgres no PDV) conecta.</li>
            <li><strong className="text-foreground">Log:</strong> o arquivo existe; mostra a última escrita e o tamanho.</li>
          </ul>
          <p>
            <strong className="text-success">Pronta</strong>: tudo que foi conferido passou.{' '}
            <strong className="text-warning">Com aviso</strong>: nada falhou, mas algo não pôde ser provado (URL sem caminho de health,
            login sem usuário ou senha, log que ainda não existe).{' '}
            <strong className="text-danger">Com falha</strong>: uma verificação falhou; o detalhe diz qual e por quê.{' '}
            <strong className="text-foreground">Não configurada</strong>: a camada está em branco e é ignorada. Cada verificação tem
            limite de 12 segundos, então uma camada travada não segura o resultado das outras.
          </p>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('integration-trace')}
              className="text-2xs font-semibold text-primary hover:underline cursor-pointer"
            >
              Abrir Rastreio de Integração
            </button>
          )}
        </div>
      )
    },
    {
      id: 'integration-trace-batch',
      question: 'Como o rastreio de lote descobre onde a integração parou, e o que significa "sem evidência"?',
      category: 'Segurança & Configurações',
      tags: ['rastrear lote', 'lote', 'rastreio', 'pdv', 'pdvsync', 'chegou', 'desceu', 'loja', 'filial', 'sem evidência', 'apm', 'log', 'histórico', 'jira', 'relatório', 'ch', 'wsh'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            Na aba <strong className="text-foreground">Rastrear lote</strong>, escolha o fluxo de saída, informe o número do lote que o
            PDVSync devolveu, a janela de busca e, se quiser, uma filial. O Hub mostra os oito passos na ordem real do WSH: login no
            WinThor, busca na API, JOLT, login no PDVSync, abertura do lote, envio, fechamento e chegada nas lojas.
          </p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li><strong className="text-foreground">PDVSync (camada CH):</strong> prova que o lote existe (abertura), que saiu de <em>EmPreparacao</em> (fechamento) e quantas lojas já baixaram. Se alguma loja falhou, aparece o motivo de cada erro.</li>
            <li><strong className="text-foreground">Banco do PDV:</strong> roda a consulta do fluxo no Postgres. Quando o PDVSync ainda diz que as lojas estão baixando, o Hub espera pelo tempo do fluxo, e um dado que ainda não apareceu fica <em>pendente</em>, não falha.</li>
            <li><strong className="text-foreground">Busca no WinThor:</strong> vem do APM (a chamada da API do fluxo, com status e duração). A consulta Oracle acrescenta a contagem de registros, mas sozinha não prova que a API foi chamada.</li>
            <li><strong className="text-foreground">Logs:</strong> das últimas linhas dos logs do WSH e do CH, ficam só as que citam o lote. Linhas de erro ficam em vermelho.</li>
          </ul>
          <p>
            <strong className="text-foreground">Sem evidência</strong> quer dizer que não há fonte para provar aquele passo, e nunca vale como
            sucesso. O login no WinThor, o JOLT, o login no PDVSync e o envio são feitos por dentro do WSH e não deixam rastro que o Hub
            leia; o resultado do envio aparece no status do lote. Sem o PDVSync configurado, abertura, fechamento e chegada ficam sem evidência
            (a chegada ainda pode vir do banco do PDV). Erro de SQL ou de login também deixa o passo sem evidência e a causa aparece em Observações.
          </p>
          <p>
            O <strong className="text-foreground">Percurso do lote</strong>, acima dos passos, anima o mesmo resultado: o lote só ganha cor
            onde o rastreio provou alguma coisa, cada passo aparece com nome e ícone dentro do sistema em que acontece (a legenda explica
            os ícones), trechos sem evidência ficam tracejados, o que vem depois da quebra fica como <em>não alcançado</em> e cada loja
            pode ser clicada (ou acionada pelo teclado) para ver o status e os erros. <em>Replay</em> toca de novo e <em>Vista 3D</em> inclina o desenho. Enquanto a chegada está <em>pendente</em>, o modo ao
            vivo reconsulta o PDVSync a cada 15 s e atualiza o mesmo rastreio do histórico; ele para sozinho quando as lojas terminam, quando
            falha ou depois de 40 consultas, e o botão <em>Parar</em> encerra antes.
          </p>
          <p>
            O rastreio só lê: as consultas precisam ser SELECT e o Hub recusa qualquer outra coisa. Os últimos 50 rastreios ficam guardados em
            arquivo nesta máquina, com os trechos de log, então podem conter dados do negócio; apague pelo histórico quando não precisar.
            <strong className="text-foreground"> Copiar relatório (Jira)</strong> gera o resumo em Markdown. O mesmo rastreio está disponível ao
            assistente de IA pela tool MCP <code className="font-mono text-primary">integration_check_batch</code>.
          </p>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('integration-trace')}
              className="text-2xs font-semibold text-primary hover:underline cursor-pointer"
            >
              Abrir Rastreio de Integração
            </button>
          )}
        </div>
      )
    }
  ];
}

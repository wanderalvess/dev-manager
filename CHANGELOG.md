# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

Cada versão abaixo corresponde a um commit específico em `main`, do `v1.0.0` até aqui — tags criadas retroativamente sobre o histórico já existente (sem reescrever nenhum commit).

## [1.46.0] - 2026-10-29
### Adicionado
- **INFR-Docker: ambiente por versão do WinThor**: no assistente de bootstrap (WinThor & WSL → Assistente INFR), o novo campo *Versão do WinThor* (38, 39, 40...) vale para as três abas. Cada versão tem o seu banco: a aba Oracle sugere `oracle-38` na porta 1538, o WTA lê o `wta.env.38` (com `DB_HOST=oracle-38`) e o WSH o `.env.38`. O WTA sobe da imagem `linux-winthor:<versão>-debian`, com as features do manifesto `versions/<versão>.features` já instaladas, e o terminal gera a imagem antes (`build_version.sh`) se ela ainda não existir. Container e portas derivam da versão (`wta-38`, web 8038, SSH 8138, JMX 1038, Artemis 61638) enquanto não forem personalizados, para as versões rodarem lado a lado; a prévia mostra o comando exato. Na aba WSH, a versão faz o script usar o `.env.<versão>`, com o jar do WSH daquela versão. Depende da branch `feature/imagem-por-versao` do INFR-Docker.
- **Homologação: teste de bloqueio de login do WinThor**: nova aba **Bloqueio de Login** em Homologação, que valida as 12 regras de bloqueio do login com tentativas controladas contra o WTA (`/winthor/autenticacao/v1/login`) e dois usuários de teste. Confere se 4 falhas não bloqueiam e 5 em menos de 60 s bloqueiam, se a senha certa durante o bloqueio não emite token nem cookie de sessão, se outro cliente HTTP (sem cookie ou com o cookie da sessão anterior), o logoff e o usuário B na mesma origem não contornam o bloqueio, se falhas simultâneas não perdem incremento nem deixam entrar, quanto tempo o bloqueio dura (sondas antes e depois de 4 e 5 min, sem presumir) e como o servidor conta a janela (fixa, deslizante ou acumulada). Também provoca falhas simultâneas em APIs diferentes (sem dados cruzados nem 5xx), procura stack trace, senha, token e string de conexão em status, corpo e cabeçalhos, e correlaciona cada falha com o trecho do `winthor.log` escrito durante o teste e com a API `/winthor/ferramenta/servidor/v1/logs`, que precisa recusar acesso sem autenticação e nunca registrar a senha digitada (cada falha usa uma senha errada única). A checagem de falha no destino de logs roda depois que a pessoa o derruba por um mecanismo autorizado. Cada regra mostra o resultado e as evidências, a atividade aparece ao vivo e *Copiar relatório (Jira)* gera o Markdown com senhas e tokens mascarados. As senhas não são salvas. Também pelas tools MCP `qa_list_auth_lockout_checks` e `qa_run_auth_lockout_test` (agora 172 tools, 92 de leitura; a de execução é destrutiva e pede confirmação) e pelas rotas REST `/api/auth-lockout/*`. Conta como uso em Meu uso (linha de base padrão de 60 min, estimativa).
- **Backup Oracle: Como resolver na própria tela**: quando o `expdp`/`impdp` falha, o resultado diz em uma frase o que aconteceu e mostra os passos e o SQL ou comando pronto para copiar, com a saída original do Oracle recolhida embaixo. Cobre ORACLE_HOME ausente, listener (ORA-12541), service name/SID (ORA-12514/12504/12505), senha (ORA-01017), conta bloqueada ou senha expirada (ORA-28000/28001), DIRECTORY (ORA-39002/39070/39087/29283), privilégios do Data Pump (ORA-31626/31633/01031/01950), compactação fora do Enterprise (ORA-00439), dump fora da pasta do servidor (ORA-31640) e objetos já existentes (ORA-31684). No erro de DIRECTORY, o Dev Manager consulta `ALL_DIRECTORIES` e lista os que o usuário pode usar; se o DIRECTORY existe, o problema é a pasta no servidor e vem o `icacls` para a conta do serviço do Oracle. Vale para backup, restauração, restore drill e comando personalizado com `exp`/`expdp`.
- **Backup Postgres: Como resolver na própria tela**: o mesmo painel do Oracle para o `pg_dump`, o `psql` e o `pg_restore`, com as mensagens do servidor em inglês ou em português. Cobre executável ausente, `pg_dump` mais antigo que o servidor (com as duas versões), regra faltando no `pg_hba.conf`, usuário ou senha incorretos (o PostgreSQL responde igual quando o usuário não existe), usuário ou dono dos objetos inexistente, banco inexistente, servidor fora do ar, falta de leitura nas tabelas no backup ou de dono na restauração, pasta de destino sem gravação, SQL puro mandado ao `pg_restore`, arquivo inválido e objetos que já existem. Quando o banco não existe, o Dev Manager consulta o `pg_database` pelo banco `postgres` e lista os bancos do servidor. Conferido com o `pg_dump` oficial 16.11 contra servidores 16 e 17.
- **Karaf: o app lê a instalação**: em Configurações → Karaf, o cartão *O que a instalação diz* lê do `etc/` da pasta salva a versão, a instância, a porta SSH, a porta HTTP do WTA e o log principal, o JDK fixado no `bin/winthor.bat` e o serviço Windows do wrapper yajsw (com o estado). Aponta o que difere das configurações do app e copia os valores com um clique. O log lido quando o buffer do Karaf está vazio passa a ser o do `etc/`, e a tool MCP `karaf_is_running` devolve a mesma leitura em `install`.
- **Analisador de log: padrões do Karaf do WinThor**: numa cadeia *Unable to resolve ... [caused by: ...]* aponta o último elo (o pacote que ninguém exporta e a faixa de versão), reconhece o HealthService do ferramenta-servidor tentando reiniciar bundles que não resolvem e explica o ORA-00904 com a coluna e a tabela (banco mais antigo que a versão da rotina).
- **Rastreio de Integração: aba Online do PDV (decisão 0003)**: os 12 processos que o PDVOmni chama direto no WinThor, sem o WSH (pré-venda, crédito, estoque, notas, formas de pagamento do cliente e identificação do PDV), agrupados por assunto, com método, endpoint, projeto do WTA e se só leem ou gravam. Avisa quando processos dividem o mesmo endpoint (pré-venda, nota de entrada e reserva de estoque são o mesmo POST) e explica como mapear as tabelas de cada um pelo Statement Tracer do Banco de Dados. Busca os pedidos online na PCLOGPEDIDOAPI, por número do pedido (todo o histórico) ou por período: operação (inclusão, alteração, cancelamento), status (aceito, rejeitado, processando), posição e o JSON gravado. O rejeitado mostra o motivo do WinThor na linha (código WT-... e mensagem), e o envio que ficou em processando sem aceito nem rejeitado aparece como Sem resposta. Só leitura, pela conexão Oracle da camada WinThor.
- **Monitor do WSH: agendamento real e Preço Oferta**: aberta, a Ficha do fluxo lê do Oracle do ambiente de quanto em quanto tempo o fluxo roda neste cliente (ex.: *a cada 5 min pelo agendamento "pdvsync - vendas"*, com o atraso inicial), se o passo da rota está ativo e quantos passos do fluxo estão ligados, no lugar da frase genérica. Passo desligado (`ATIVO = N`) ou rota fora de qualquer fluxo aparecem em destaque, porque nada novo chega. Também pela rota REST `POST /api/integration/wsh/schedule` e no `schedule` da tool `integration_check_wsh` quando ela recebe o fluxo. O catálogo ganhou *Preço Oferta* (`WTA - Buscar Preco Oferta`), visto no ambiente e fora do levantamento, sem número de fluxo e dependente do Produto.
- **Monitor do WSH: vendas pelo cupom e origem dos campos**: o campo *Dado* procura também no `IDINTERNO`, que nas vendas é filial-série-cupom (ex.: `1-3-10905`), e a lista mostra esse identificador; o cupom acha a venda sem ler o dado do cliente. O catálogo ganhou, para Vendas (FLUXO-16), de onde o JOLT tira cada campo enviado ao WinThor, conferido num par real de entrada e saída (ex.: `codCob` ← `PagamentoForma.IdRetaguarda`, `codUsur` ← `Vendedor.IdRetaguarda` sem o prefixo `RCA-`). Quando o WinThor recusa um desses campos, o *Como resolver* diz onde olhar no PDVSync, e a Ficha do fluxo lista a origem de todos.
- **Monitor do WSH: Como resolver**: num item com erro, o primeiro bloco do detalhe diz o que fazer, em ordem: corrigir os itens que derrubaram o envio (o PDVSync recusa a requisição inteira), o valor fora da lista aceita (Enum), o campo que foi vazio e a dependência que não integrou ou está com erro, com o link do TDN que o PDVSync manda junto com o erro. Logo abaixo, *Como o WSH monta* lê o JOLT das rotas do item direto do Oracle do ambiente (`LAYOUTTRANSFORMACAO`) e mostra as regras que escrevem o campo recusado, destacando a que valeu para o item (ex.: a cobrança PIXS cai em `PIX*` → `tipo = "8"`, texto até o `=toInteger` do passo seguinte). A operação `custom-totvs` (que só decodifica Base64) é ignorada e valores como `{{MASTER_ID_PROPRIETARIO}}` aparecem como variável do WSH. A tool MCP `integration_check_wsh` devolve as sugestões em cada item; a rota REST `POST /api/integration/wsh/layout` dá as regras do layout.
- **Rastreio de Integração: Monitor do WSH (decisão 0003)**: nova aba, a primeira da página, que lê o que o WSH gravou na `PCINTEGRACAOCORE` pela conexão Oracle da camada WinThor, só leitura e sem credencial do PDVSync. Filtra por rota (o fluxo), pelo dado (trecho do `IDEXTERNO`, como o código do produto), pelo status (2 integrado, 3 erro) e pelo período, como o monitor do próprio WSH. Cada item mostra quando foi buscado e enviado, as tentativas, a requisição do envio e a resposta do PDVSync lida da `OBSERVACAO`, separando o erro do próprio item dos erros de outros itens que derrubaram o mesmo envio (o PDVSync recusa a requisição inteira). O percurso animado mostra onde o item parou, e *Copiar resumo (Jira)* gera o resumo em Markdown. Também pela tool MCP `integration_check_wsh` (agora 170 tools, 91 de leitura) e pelas rotas REST `/api/integration/wsh/*`. Os JSONs de dados e as variáveis do WSH nunca são lidos.
- **Rastreio de Integração: percurso animado do lote e modo ao vivo (decisão 0003)**: o resultado de um rastreio ganhou a vista **Percurso do lote**, em que o lote anda de WinThor para WSH e PDVSync e se ramifica até cada loja, no ritmo das durações medidas. Cada trecho ganha a cor do que o rastreio provou (tracejado quando é *sem evidência*), a animação para no passo que quebrou e cada loja é clicável para ver o status no PDVSync e os erros (até 6 lojas; as demais viram um grupo com o pior status). **Replay** toca de novo, inclusive ao reabrir um rastreio do histórico, e **Vista 3D** inclina o trilho em perspectiva só com CSS (a escolha fica salva nesta máquina). Com movimento reduzido no sistema, mostra direto o estado final. Enquanto as lojas ainda baixam o lote, o **modo ao vivo** reconsulta o PDVSync a cada 15 s no mesmo rastreio do histórico (sem criar outro), com contagem até a próxima consulta, e para sozinho quando as lojas terminam, quando falha ou depois de 40 consultas; também dá para parar e retomar. A reconsulta tem rota REST própria (`POST /api/integration/traces/:id/refresh`) e não conta como uso novo em Meu uso.
- **Rastreio de Integração: cliente do PDVSync e modelo de passos corrigido (decisão 0003)**: lendo o repositório de layouts do WSH, o rastreio passou a seguir a ordem real de um fluxo de **saída** (produto, preço, estoque...): login no WinThor, busca, JOLT, login no PDVSync, abertura do lote, envio, fechamento e chegada nas lojas. A venda é de entrada (PDV → WinThor), não usa lote e ainda não tem rastreio. Na camada CH, a nova autenticação **Login do PDVSync (RAC)** (usuário, senha, `client_id` e `client_secret`, este protegido como os demais segredos) e os endereços de consulta, com atalho de produção e homologação, permitem ao Hub consultar o lote (`LoteExternoRetornos`) e o status por loja (`LojaLoteStatusretorno`), só leitura. O rastreio agora prova a abertura (o lote existe), o fechamento (saiu de *EmPreparacao*) e quantas lojas baixaram o lote, mostrando o motivo de cada erro; lojas ainda baixando deixam a chegada *pendente* em vez de falha, e o banco do PDV vira confirmação (uma consulta só quando o PDVSync já deu a resposta final). O pré-voo testa o login do PDVSync, e o formulário aceita uma filial opcional (também no MCP, `branchId`). Trocar o endereço do login descarta o segredo salvo. Rastreios antigos continuam abrindo.
- **Rastreio de Integração: rastreio parcial de um lote (decisão 0003)**: nova aba **Rastrear lote** na página Rastreio de Integração. Escolha o fluxo, informe o número do lote devolvido pelo CH e a janela de busca, e o Hub mostra os oito passos da cadeia com o passo em que quebrou em destaque. Prova a chegada no PDV por consulta SQL somente leitura (repete com espera crescente até o tempo configurado no fluxo), o dado na retaguarda Oracle, a chamada da API do WinThor no APM e as linhas dos logs do WSH e do CH que citam o lote (erros em vermelho). O que não tem fonte aparece como *sem evidência*, nunca como ok. Os últimos 50 rastreios ficam em arquivo, podem ser reabertos e apagados, e *Copiar relatório (Jira)* gera o resumo em Markdown. Também pelas tools MCP `integration_check_batch`, `integration_list_traces` e `integration_get_trace` (agora 169 tools, 90 de leitura) e pelas rotas REST `/api/integration/*`. Consulta que não seja SELECT é recusada, e o log só é lido se for arquivo de log fora da pasta de dados do app. Conta como uso em Meu uso (linha de base padrão de 20 min, estimativa).
- **Rastreio de Integração, fase 1: pré-voo das camadas (decisão 0003)**: nova página **Rastreio de Integração** (grupo Infraestrutura do menu lateral e Ctrl+K) com o botão *Conferir agora*, que verifica em paralelo WinThor, WSH, CH e PDV conforme o cadastro de Configurações → Integração ponta a ponta: serviço Windows, processo, porta, health HTTP, login real do WinThor (o token não é exibido), conexão Oracle/Postgres do DB Studio e arquivo de log. Cada camada sai como *Pronta*, *Com aviso*, *Com falha* ou *Não configurada*, com detalhe e duração por verificação, e um veredito em uma frase diz se já dá para testar. O que ficou em branco é ignorado, e o que não dá para provar vira aviso, nunca ok. Cada verificação tem limite de 12 s. Também disponível pela tool MCP `integration_check_readiness` (agora 166 tools, 87 de leitura) e pela rota REST `POST /api/integration/readiness`. Conta como uso em Meu uso (linha de base padrão de 10 min, estimativa).
- **Rastreio de Integração ponta a ponta, fase 0 (decisão 0003)**: nova aba **Integração ponta a ponta** em Configurações com o catálogo das camadas WinThor → WSH → CH → PDV (URL, health, porta, serviço, processo, conexão do DB Studio, log e autenticação) e dos fluxos do WSH (tipo de lote no CH, disparo, API do WinThor, consultas de evidência no Oracle e no Postgres, espera pela descida ao PDV). Senhas e tokens das camadas ficam criptografados como os demais segredos e nunca voltam pela API. O pré-voo e a linha do tempo do lote vêm nas próximas fases; a base pura da linha do tempo (oito passos, primeiro passo quebrado, relatório Markdown para o Jira) já está implementada e testada.
- **Contagem de tools do MCP** no cartão da tela Integrações (lida do catálogo `mcpCatalog`, a mesma fonte da Ajuda e do README).
- **Estilo visual "Papel"** (novo padrão em instalações novas): cinza neutro, cartões limpos, azul como único acento e texto secundário mais escuro, no modo claro e no escuro. Quem já escolheu outro estilo continua com ele; para trocar, use o seletor de tema do cabeçalho.
- **Menu lateral com todos os módulos**: a partir de telas largas (lg), os módulos ficam sempre visíveis à esquerda, agrupados em Infraestrutura, Dados & Rotinas, Desenvolvimento e Qualidade, com os atalhos Alt+N ao lado. Substitui os quatro menus suspensos do cabeçalho; em janelas estreitas continua o seletor compacto. Os módulos desligados em Configurações → Módulos seguem fora do menu.
- **Tela Integrações**: novo item no fim do menu lateral (e no Ctrl+K) que reúne MCP, provedores de LLM, Confluence, Jira, Azure DevOps, GitLab/GitHub, WinThor CCW, fontes de teste, OpenTelemetry e webhooks, cada um com o estado atual e um atalho direto para a aba certa de Configurações.
- **Ajuda e acabamento**: cartão da tela Integrações no Guia dos Módulos (agora 13) e o restante dos modais e painéis (Memória JVM, APM, Docs, API Studio, Homologação e os modais da raiz) com rótulos em frase, campos de 40 px e selos sem borda colorida.

### Alterado
- **Conexão Postgres do PDV no topo da Integração ponta a ponta**: o banco do PDV, antes só dentro da camada PDV em *Pré-voo das camadas* (recolhido), agora aparece também no cartão do essencial, abaixo do Oracle do WSH, marcado como opcional. É o mesmo campo: o pré-voo testa esse banco e o Rastrear lote confirma a chegada nele.
- **Configurações → Integração ponta a ponta reorganizada**: em cima, o essencial do Monitor do WSH, só a conexão Oracle onde o WSH grava. Recolhidos e marcados como opcionais, o Pré-voo das camadas e o Rastrear lote pelo PDVSync, cada um dizendo para que serve. A camada WinThor reaproveita o que já está nas outras telas: a URL e o login do WinThor de Diretórios & IDE → WinThor Start (nova opção *Login do WinThor das Configurações*, o padrão) e o log dos serviços na pasta do Karaf; o que for preenchido na camada vence. Serviço, processo, porta e log sugerem o que já está cadastrado em Serviços & Processos, Portas e Logs. Nos fluxos, só o nome é obrigatório: tipo de lote e consulta do PDV viraram opcionais.
- **Telas mais compactas**: margem menor em todas as telas, título de página em 18 px e a descrição fixa do cabeçalho só para leitor de tela (Rotinas mantém a pasta das rotinas numa linha menor). Em Configurações, a busca foi para a linha do título e o checklist inicial virou uma linha com a contagem e só os itens pendentes. As telas de Qualidade (Homologação, Regressivo, Runners e TAUT) seguem o mesmo padrão, com botões do cabeçalho de 32 px e indicadores menores.
- **Menu lateral recolhível**: o botão no pé do menu o recolhe numa faixa de ícones (o nome do módulo e o atalho ficam no tooltip), devolvendo espaço às telas largas. A escolha fica salva nesta máquina.
- **Rastreio de Integração: Monitor do WSH sem rolar a página**: título, abas e Configurar numa linha só; filtros numa barra de uma linha com a contagem de itens; em tela larga, a lista e o detalhe ocupam a altura toda e rolam cada um no seu quadro, com o veredito do item preso no topo. O percurso começa recolhido numa faixa com os sistemas e o ícone de cada passo; *Ver animação* abre a animação completa (Replay, Vista 3D) e *Recolher* volta à faixa, com a escolha salva. Erros e dependências ficam lado a lado, e a ficha do fluxo e a resposta crua do PDVSync ficam recolhidas no fim.
- **Rastreio de Integração: Monitor do WSH conhece os fluxos (decisão 0003)**: com o catálogo dos 38 fluxos PDVSync do WSH (levantamento WORKFLOW_PDVSYNC), o filtro mostra "FLUXO-09 · Produto" agrupado por categoria, e o detalhe traz a ficha do fluxo (sentido, API do WinThor, tabelas Oracle e do PDVOmni e se roda por agendamento, cujo intervalo é de cada cliente). O percurso animado respeita o sentido: envio (WinThor → PDVSync) ou recebimento pelo ERP (vendas, pedidos e caixa: PDVSync → WinThor). Num item, o painel **Depende destes fluxos** mostra a última integração e os erros dos últimos 30 dias de cada dependência, avisa quando uma nunca integrou no banco e marca a causa provável pelo campo recusado (ex.: `impostos` vazio no Produto aponta o ICMS). A tool `integration_check_wsh` devolve as dependências quando recebe o fluxo. Os processos online do PDVOmni, que não passam pelo WSH, ficam para depois.
- **Rastreio de Integração: Percurso do lote mais legível e acessível**: depois de uma revisão de design, cada passo aparece como um chip com nome e ícone dentro de WinThor, WSH e PDVSync (antes eram pontinhos sem nome), e cada estado tem forma própria além da cor (check, X, relógio, tracejado e "não alcançado" em cinza claro), com legenda acima do desenho. Os nomes ficam em tamanho real: em coluna estreita o desenho rola na horizontal em vez de encolher. As lojas viraram botões de verdade, com anel de foco no teclado, e a linha do ao vivo resume as lojas ("1 de 2 lojas baixaram"). *Pendente* passou a ser âmbar também na lista de passos.
- **Tela de Backups usa a largura toda**: o painel deixou de ficar limitado a ~1000 px e encolhido à esquerda. Em telas largas, "Executar Backup" ganha duas colunas (configuração à esquerda, resumo e botão à direita), "Agendamento & Retenção" também, e as listas de Arquivos e Histórico crescem com a altura da janela. Campos e botões no padrão Papel.
- **Abertura do Hub mais rápida para quem já usa o app**: de ~5,4 s para ~2 s (animação enxuta e saída automática); quem abre pela primeira vez continua vendo a abertura completa.
- **Onboarding e tour atualizados para o menu lateral e as Integrações**: o passo "Checklist" dizia "Quatro itens" para uma lista de cinco (agora usa a contagem real), textos que falavam em "cabeçalho" agora dizem "menu lateral", o passo de IA & MCP e o final apontam para a tela Integrações, o tour guiado ganhou o passo "Integrações" e o convite dos tutoriais por tela não diz mais "Tour geral concluído" para quem pulou o tour.
- **Telas Rotinas, Backups, Logs e APM no visual Papel**: título sem cartão, *Atualizar rotina (CCW)* como ação principal em Rotinas, abas sublinhadas em Backups, barras de Logs e APM com fundo sólido e estado do receptor OTLP com a ação *Trocar porta do receptor* em destaque. Os selos do Karaf (WTA) em Rotinas passam a usar as cores semânticas de sucesso e perigo.
- **Telas Docs, API Studio, Homologação e Configurações no visual Papel**: títulos sem cartão, botões e campos de 40 px com anel de foco, abas sublinhadas (Homologação e Configurações), indicadores de Homologação com rótulos em frase e números maiores, checklist de configuração em chips com cor e palavra. A mudança vale também para Regressivo, Runners e TAUT, que compartilham o cabeçalho de Homologação.
- **Telas WinThor, Karaf, Regressivo, Runners, TAUT e Ajuda no visual Papel**: títulos sem cartão, botões e campos de 40 px, status do Karaf em selo com palavra, atalhos das ferramentas Karaf em cartões simples, abas sublinhadas na Ajuda e no TAUT, controles do Validador Regressivo e do TAUT com a ação principal em azul, selos de tipo dos Runners nas cores semânticas e rótulos da Ajuda em frase, sem maiúsculas.
- **Ajustes após revisão com dados reais**: barra do Validador Regressivo passa a quebrar linha sem sobrepor botões, rótulo "Branch de destino" do Git não quebra mais, painel de topologia do WinThor/Containers e listas de Rotinas e Runners no visual Papel.
- **Modais e painéis internos no visual Papel**: Karaf (bundles, features, histórico, desinstalação), Central de Controle WinThor, Git, Deploy, Containers e Configurações. Rótulos em frase em vez de maiúsculas mono, selos sem borda colorida, campos de formulário de 40 px com anel de foco, títulos de modal maiores e selos de status do Karaf/WSH nas cores semânticas.
- **Status do Karaf no Gerenciador de Bundles**: com o Karaf parado, o modal mostrava "Karaf Online" com lista vazia; agora a listagem falha e a tela mostra "Karaf Offline". Texto mínimo da interface sobe de 11 px para 12 px.
- **Cores semânticas em todo o app**: as cores cruas (emerald, rose, amber, sky, violet etc.) foram trocadas pelos tokens de sucesso, perigo, aviso, informação e destaque, que se adaptam aos temas claro e escuro. Consoles e blocos de código escuros mantêm as cores originais.
- **Telas Containers, Deploy e Banco de Dados no visual Papel**: mesmo padrão do Ambiente e do Git (título sem cartão, ação principal única, botões secundários discretos, avisos em palavras). Em Containers, *Novo grupo* é a ação em destaque; em Deploy, *Executar perfil*; no Banco, o aviso de primeiro uso e a barra lateral de conexões e tabelas.
- **Telas Ambiente Dev e Git no visual Papel**: título de página sem cartão, uma única ação principal por tela (*Subir ambiente*, *Commit e push*), botões secundários discretos, status escritos em palavras (*Aberta*, *Fechada*, *só local*) em vez de chips em maiúsculas, e portas e rede como listas na coluna da direita do Ambiente. Nenhuma ação mudou de lugar de forma que quebre o tour guiado.

### Corrigido
- **Deploy no Karaf com a mesma versão**: com versão fixa, o `feature:install` responde *No deployment change* e mantém o jar antigo, e o deploy dizia *finalizado com sucesso*. Agora ele roda `bundle:update` nos bundles do projeto (mesmo grupo e versão do pom) e `bundle:refresh`; sem bundle do projeto no contêiner, termina com erro dizendo que nada novo foi carregado.
- **Diagnóstico de resolução OSGi no formato do log em runtime**: `missing requirement [bundle [835](R 835.0)] osgi.wiring.package; (&(...))` era lido como requisito genérico, sem o pacote; agora acha o pacote, a faixa de versão e o bundle sem o id.
- **Karaf ao lado do serviço Windows**: o início pelo app recusa subir por cima do serviço da mesma instalação (ex.: *WinThor*) que já está rodando, e o *Parar Karaf* usa as portas configuradas (SSH e debug), não 8101 e 5005 fixos, e não mata o processo do serviço. Os rótulos com `:8101` fixo saíram.
- **Início do Karaf com o script fora de `bin/`**: o console embutido rodava o script sempre a partir de `bin/` e falhava com `winthor.bat` na raiz ou num caminho customizado; agora roda na pasta do próprio script.
- **Busca automática da pasta do Karaf e do JDK**: procura também `C:\pcsist\produtos\winthor` e `winthor-jdk`, o padrão do instalador do WinThor.
- **Backup e restauração Oracle sem ORACLE_HOME**: `exp`, `imp`, `expdp` e `impdp` de uma instalação completa do Oracle falhavam com *Message 206 not found* ou *UDE-00019* quando o `ORACLE_HOME` não estava definido. Agora o Dev Manager define o `ORACLE_HOME` com a pasta da instalação do próprio executável (a que tem `rdbms\mesg`), no backup padrão, na restauração e no comando personalizado. Quando não dá para descobrir, a mensagem explica o que configurar em vez de repetir a saída crua do Oracle.
- **Backup e restauração Oracle com ORA-12504**: o `expdp`/`exp` recebia `usuario@host:porta/servico` e lia a `/` como separador da senha, então o serviço se perdia e o listener respondia ORA-12504 (o descritor TNS entre parênteses também não serve na linha de comando: LRM-00116). Agora o backup e a restauração passam ao executável só o usuário, e a conexão vai na variável `LOCAL` (Windows) ou `TWO_TASK` (demais), com o descritor completo (`SERVICE_NAME`, ou `SID` no modo SID). No comando personalizado vale a mesma variável quando o comando não traz a conexão, e o modelo sugerido passou a ser `{user}/{password}@{connectString}`.
- **Backup e restauração Oracle pedindo a senha**: no Windows o `expdp`/`impdp` lê a senha do console, não do stdin, e a tela mostrava o pedido de senha. Usuário e senha agora vão num parfile temporário (`parfile=...`), legível só pelo usuário atual e apagado ao terminar; a senha continua fora da linha de comando. Sem senha na conexão, o backup avisa antes de chamar o Data Pump.

## [1.45.0] - 2026-10-23
### Adicionado
- **Filtros e alertas na lista de repositórios (Git)**: chips *Todos*, *Com alterações*, *Só locais* e *Sem push*, cada um com a contagem, combinados com a busca. Os cartões mostram `SÓ LOCAL`, `↑ N sem push` e `● N alterações`, e o cabeçalho resume quantos repositórios estão só locais ou com alterações. A contagem de commits sem push lê as refs já baixadas (sem rede); use *Fetch* para atualizá-la.
- **Etapas do Pull Request**: o painel de PR mostra *Branch local → Publicar no origin → Abrir Pull Request*, deixando claro quando falta publicar a branch ou enviar commits antes de abrir o formulário.
- **PR só depois de publicar a branch (corrige o erro TF401175 do Azure DevOps)**: ao abrir o Pull Request, o Hub consulta o `origin` (`git ls-remote`); se a branch existe só no seu computador, pergunta e publica com `git push --set-upstream origin` antes de abrir o formulário, e avisa quando há commits locais sem push. O botão do painel vira *Publicar Branch e Abrir Pull Request* e a branch ganha o selo *SÓ LOCAL*.
- **Botão Publicar / Push**: na barra da branch, envia a branch (ou os commits já feitos) para o `origin` sem criar commit novo. *Commit & Push* passa a ficar desativado quando não há alterações pendentes.
- **Comandos rápidos personalizáveis**: na aba *Rápidos* dos Diagnósticos do Deploy, *Personalizar* permite adicionar, remover, renomear e reordenar os comandos Karaf. A mesma lista aparece no novo menu *Comandos* da barra do console (ao lado de *Tail do log*), para rodar `bundle:list`, `feature:list`, `log:display` etc. direto no console. *Restaurar padrão* volta à lista original.
- **Filtro `| grep`**: o shell Karaf aceita `<comando> | grep [flags] <termo>` (ex.: `feature:repo-list | grep winthor`) no prompt, nos comandos rápidos e nos novos botões *Repos* e *Listar* da aba *Features*. Qualquer outro `|` continua bloqueado.
- **Recolher os Diagnósticos**: o painel de diagnósticos tem o botão *Recolher/Expandir* (lembra o estado).

- **Divergência de versão instalada x exigida**: quando o diagnóstico OSGi aponta um pacote fora da faixa e o módulo está instalado em outra versão (ex.: `0.0.1.SNAPSHOT` de uma branch de desenvolvimento contra `[1.39.0, 2.0.0)`), o card identifica o bundle instalado e oferece duas saídas: *Alterar pom* (alinha a dependência do pom.xml à versão instalada, com `.bak` e confirmação, e opcionalmente executa o perfil) ou trocar por uma release (atalhos para Bundles OSGi e Catálogo 801). Nada muda sem o operador confirmar. Ver [decisão 0002](docs/decisions/0002-divergencia-de-versao-osgi-guiada.md).
- **Alerta para não commitar o pom alterado**: depois de *Alterar pom*, a tela Deploy mostra um alerta fixo ("NÃO COMMITE ESSA ALTERAÇÃO") com a dependência, o de/para e o botão *Reverter* (volta ao valor original, inclusive quando a versão vem de uma propriedade). O alerta sobrevive a reinícios e some ao reverter ou dispensar. O toast e o console também avisam, e o *Commit & Push Rápido* do Git mostra o aviso e só libera o envio depois de marcar "Entendi, quero commitar mesmo assim", quando o pom alterado (ou o `.bak`) está entre os arquivos.
- **Reverter o pom sozinho depois de instalar**: em *Alterar e executar perfil* há a opção (marcada por padrão) de voltar o pom.xml ao valor original quando o perfil terminar com sucesso. O instalado no Karaf não muda, o alerta some e o `pom.xml.bak` é apagado (reverter até o conteúdo do `.bak` agora o remove, para o `git add -A` não levá-lo). Se o perfil falhar, o pom continua alterado e o alerta fica.
- **Escolher etapas do perfil sugerido**: o card do diagnóstico OSGi permite rodar só algumas etapas do perfil (*Só esta* / *Executar selecionadas*), em vez do perfil inteiro.

- **Controle remoto pelo celular**: em *Configurações → Portas*, o cartão *Controle Remoto pelo Celular* liga um servidor na rede local e mostra um QR. O celular (mesmo Wi-Fi ou Tailscale) abre uma página leve, sem instalar nada, para preparar o ambiente, abrir a IDE e o servidor debug, ver portas e serviços, iniciar/parar o Karaf com log ao vivo, controlar containers Docker, rodar perfis de deploy e fazer backup de banco. Ações destrutivas pedem confirmação no celular. Só no app desktop.

### Alterado
- **Abertura do Hub mais rápida para quem já usa o app**: de ~5,4 s para ~2 s (animação enxuta e saída automática); quem abre pela primeira vez continua vendo a abertura completa.
- **Onboarding e tour atualizados para o menu lateral e as Integrações**: o passo "Checklist" dizia "Quatro itens" para uma lista de cinco (agora usa a contagem real), textos que falavam em "cabeçalho" agora dizem "menu lateral", o passo de IA & MCP e o final apontam para a tela Integrações, o tour guiado ganhou o passo "Integrações" e o convite dos tutoriais por tela não diz mais "Tour geral concluído" para quem pulou o tour.
- **Tela Git mais clara**: Stash e Pop ganharam rótulo, todos os botões da barra mostram o estado desativado e a barra quebra linha em janelas estreitas. O *Commit & Push Rápido* mostra o comando real (`git push` ou `git push -u origin`). O modal *Trocar / Nova* informa de qual branch a nova parte e cria com Enter, e depois de criar uma branch por tarefa o terminal avisa que ela ainda é só local.
- **Containers ganhou a tela WinThor & WSL**: a topologia da stack (Oracle XE, WTA, WSH), o botão *Subir WinThor*, os *Snapshots WSL* e o *Assistente INFR* saíram da tela Containers e foram para a nova tela *WinThor & WSL* (menu Infra), com seletor de runtime WSL, terminal e desligar distro. Containers ficou com lista, grupos, lote, Compose e métricas; os cartões continuam abrindo as ferramentas Oracle/WTA/WSH. O módulo se liga/desliga em Configurações → Módulos; sem atalho Alt novo.
- **Telas menos cheias: Karaf e Backups ganharam tela própria**: a nova tela *Karaf & OSGi* (menu Infra) reúne Bundles OSGi, Features & Repositórios, Catálogo 801, Memória JVM e os diagnósticos rápidos, que antes ficavam no cabeçalho e no painel do Deploy (o Deploy ficou com perfis, etapas e fila de build, e ganhou o botão *Karaf*). A nova tela *Backups de Banco* (menu Dados) passa a mostrar o antigo modal de Backup & Restore em página inteira, com seletor de conexão; o botão *Backup* do Studio SQL abre nela, na conexão ativa. As duas são módulos que se ligam/desligam em Configurações → Módulos; sem atalhos Alt novos (acesso pelo menu e por Ctrl+K).
- **Build com TLS seguro por padrão**: o empacotamento agora valida o certificado TLS e baixa o Electron e os binários do electron-builder dos hosts oficiais. Atrás de proxy corporativo com SSL inspection, use `CORP_PROXY_INSECURE=1` (desliga a validação e usa o mirror npmmirror.com); `ELECTRON_MIRROR` e `ELECTRON_BUILDER_BINARIES_MIRROR` continuam configuráveis. Removido o `strictSSL: false` fixo do `electron-builder.json5`.
- **Configurações reorganizadas por assunto**: nova aba *Rotinas WinThor* (pasta das rotinas, extensões e launchers, WinThor Start/WTA e CCW); a pasta e o script do Karaf foram para a aba *Karaf*, junto das credenciais; o projeto TAUT e o prefixo Zephyr foram para *Qualidade & QA*. *Diretórios & IDE* ficou só com repositórios, JDK e IDE. A barra de abas ganhou rótulos de grupo (Geral, Ambiente, Monitoramento, Recursos), o checklist inicial separa *Diretório de Repositórios* de *Diretório do Karaf*, e a busca, o tour e a Ajuda apontam para os novos lugares.
- **Configurações menos confusas**: o *Diretório Base dos Repositórios Git* era editável em duas abas (Diretórios & IDE e Azure & Git); agora só em Diretórios & IDE, e a aba Azure mostra o valor com um atalho. *Perfis de Ambiente* (presets de caminhos e portas) virou *Presets de Ambiente* e foi para o fim da aba Diretórios, para não se confundir com os perfis de esteira.
- **Código compartilhado entre telas**: o modal de Documentação deixou de editar provedores de IA e passou a mostrar só o provedor ativo, com atalho para *Configurações → IA & LLM* (a edição existia nos dois lugares e gravava o mesmo dado). Logs (Karaf, containers, saída embedded), consoles de Taut/Test Runners/Rotina 801 e os editores de perfil de Ambiente/Deploy passaram a usar componentes e hooks comuns; o antigo *Histórico do Karaf Embedded* agora se chama *Saída do Karaf Embedded* no código, sem mudança visual.
- **Console do Karaf**: a barra inteira abre/fecha o console e ganhou o botão explícito *Recolher/Expandir*. O botão *Listar* do `bundle:watch` agora se chama *Listar watches*.
- **Diagnósticos**: removidos os botões repetidos das abas *Features* e *Bundles* (já estão em *Rápidos*). Comandos que apagam estado (`log:clear`, `feature:uninstall`, `bundle:uninstall`...) pedem confirmação.
- **Prompt Karaf único**: o campo duplicado do painel de Diagnósticos saiu; o comando livre é digitado no campo do Console Karaf (histórico ↑/↓ e Ctrl+C), e o painel traz o atalho *Abrir console*.
- **Cancelar durante o perfil**: com o perfil inteiro rodando, a etapa em andamento mostra só "Executando…"; o cancelamento fica no *Cancelar* do cabeçalho, que é o que interrompe o deploy. Em execução de etapa isolada o botão da etapa continua.
- **Daqui em diante**: o botão das etapas fica sempre visível, com texto, e não só ao passar o mouse.

### Corrigido
- **Branch por Tarefa partindo de uma base só remota**: escolher uma base "(remota)" (ex.: `release/39.0`) falhava com "not a commit". Agora a branch parte de `origin/<base>`, sem herdar a base como upstream (`--no-track`), para o push seguinte publicar a branch com o nome dela.
- **DB Studio: excluir/alterar linha com data na chave dava `ORA-01861`** (literal does not match format string). A grid recebe `DATE`/`TIMESTAMP` do Oracle como texto ISO UTC e o texto ia como bind contra a coluna, que o Oracle tenta converter pelo `NLS_DATE_FORMAT`. Agora, quando o `WHERE` tem esse tipo de texto, o app consulta os tipos da tabela e compara as colunas `DATE` com `TO_DATE` e as `TIMESTAMP` com `TO_TIMESTAMP` (janela de 1 ms), na hora local em que o driver leu o valor. Colunas de texto continuam comparadas como texto.
- **DB Studio: exclusão/alteração que não afetou nenhuma linha** era contada como aplicada; agora vira falha explicando que a chave pode não casar (data, número grande ou texto formatado), e a pendência fica para nova tentativa.
- **Notificações quase transparentes**: os toasts usavam fundo a 10% de opacidade sobre a tela; agora têm fundo opaco (cor do card com um toque do tipo), faixa lateral colorida e texto na cor padrão.
- **Edição de versão no pom**: quando a dependência usa `${propriedade}`, a propriedade é alterada (antes a referência era trocada por um literal); propriedade que vem do pai é recusada com aviso, e versões com caracteres de XML são rejeitadas.
- **Diagnóstico OSGi**: o comando sugerido era `bundle:list -s | grep` com o pacote sem os pontos (`combrcompcsist…`), que nunca casava; agora é `package:exports | grep <pacote>`. Com vários perfis possíveis, vence o nome mais específico do pacote, não o primeiro da lista.
- **Rodar de uma etapa em diante / etapas escolhidas** mantêm o projeto de contexto herdado da etapa anterior (antes a etapa Karaf podia perder o projeto do build).
- **Comando ignorado no console**: com o Karaf embedded parado e outro comando em execução, o comando digitado era descartado em silêncio. Agora avisa, e Ctrl+C / Esc interrompem o comando em execução (antes só funcionava com o embedded ativo ou em tail).
- **Diagnósticos com o console recolhido**: rodar um diagnóstico agora abre o console, que antes ficava recolhido e escondia a saída, e acrescenta ao que já estava lá em vez de apagar o buffer.
- **Barra de progresso do Deploy**: mostrava 33% na etapa 1 de 3 antes de concluir qualquer etapa; agora conta só as etapas concluídas.
- **Ajuda do MCP**: a Central de Ajuda e o README citavam 159 tools; são 165. O card do MCP no *Guia dos Módulos* mandava copiar `npm run mcp`, que só funciona com o código-fonte; agora copia o comando de registro do release (`claude mcp add ... dev-manager-mcp.cmd`). O card e a pergunta frequente do MCP explicam o que a IA pode fazer: modo completo (as 25 tools destrutivas pedem aprovação), modo somente leitura (`HUB_MCP_MODE=readonly`, 86 tools, com o comando pronto para copiar) e bloqueio de SQL de escrita em conexão de produção. A contagem fica em `src/shared/mcpCatalog.ts`, com um teste que falha se divergir das tools registradas.

### Segurança
- **Controle remoto**: chave aleatória no endereço (nova a cada vez que liga), só origem da rede local, `Host` com nome de domínio recusado (DNS rebinding), checagem de `Origin` e lista fechada de ações, sem comando livre.

## [1.44.0] - 2026-10-22
### Adicionado
- **Ciclos de evolução modernos da CCW**: o modal de download e instalação de rotinas da Central de Controle WinThor (CCW) passa a suportar os ciclos de evolução reais do ecossistema TOTVS WinThor (38.00, 37.00, 36.00...), substituindo o seletor rígido de versões legadas (30, 31, 29).
- **Consulta e sincronização de ciclos**: novo botão de sincronização e busca integrada com a API oficial da CCW (`/api/rotinas/listarCicloEvolucaoPaginado`), permitindo consultar automaticamente os ciclos liberados ou digitar qualquer versão livremente via autocomplete.
- **Download oficial com resolução de dependências**: suporte à rota moderna da CCW (`/api/rotinas/rotinaVersaoComDependencia/{rotina}/{ciclo}/0/P`), com fallback automático transparente para a rota legada (`downloadRotina`) caso a rotina não esteja cadastrada no novo formato.
- **Ferramenta MCP para ciclos**: adicionada a tool `routines_get_ccw_cycles` ao servidor MCP para permitir que agentes de IA descubram e validem ciclos de evolução disponíveis.

### Alterado
- **Abertura do Hub mais rápida para quem já usa o app**: de ~5,4 s para ~2 s (animação enxuta e saída automática); quem abre pela primeira vez continua vendo a abertura completa.
- **Onboarding e tour atualizados para o menu lateral e as Integrações**: o passo "Checklist" dizia "Quatro itens" para uma lista de cinco (agora usa a contagem real), textos que falavam em "cabeçalho" agora dizem "menu lateral", o passo de IA & MCP e o final apontam para a tela Integrações, o tour guiado ganhou o passo "Integrações" e o convite dos tutoriais por tela não diz mais "Tour geral concluído" para quem pulou o tour.
- **Versão padrão do WinThor**: a versão padrão de download e configuração da CCW agora é `37.00` (ciclo estável padrão), alinhada com as versões atuais da TOTVS.

## [1.43.0] - 2026-10-21
### Adicionado
- **Console do Karaf no rodapé**: o console agora fica embaixo de qualquer tela (`` Ctrl+` `` abre e fecha) e é o mesmo em *Ambiente Dev* e *Deploy*, sem precisar trocar de página para acompanhar o Karaf. Ele abre sozinho ao executar um deploy e traz o *Histórico* do Karaf embedded.
- **Tail e watch no console**: a barra do console tem *Tail do log* (`log:tail` ao vivo, com *Parar tail*) e *Watch*, *Parar watch* e *Listar* (`bundle:watch` em todos os bundles, em ids ou em URLs `mvn:`). Também funciona no modo Web/Docker.
- **Gerenciador de bundles**: cada linha ganhou *Ver o log deste bundle* (abre o console com o tail filtrado pelo nome) e *Monitorar* (`bundle:watch` no bundle). A lista se atualiza sozinha a cada 10 s com o gerenciador aberto.
- **Montar fila de deploy**: o botão *Montar fila*, no painel de etapas, lê os projetos Maven da *Pasta de projetos*, deixa você marcar quais compilar e gera as etapas de build na ordem de dependência (`pom.xml`: dependências e parent). Os projetos de que os marcados dependem entram sozinhos (opcional), há opção de pular testes e de instalar no Karaf os projetos com packaging `bundle`, e o resultado pode ser acrescentado ou substituir as etapas do perfil. Dependência circular é avisada.
- **Cadeia de dependências no Deploy**: novo modal para ordenar projetos em esteira e executar a cadeia completa em 1 clique, com o novo tipo de etapa `pom-sync-version`, que sincroniza as tags `version` entre os `pom.xml` dos projetos upstream e downstream mantendo a formatação e gerando backups `.bak`. As falhas de resolução OSGi passam a trazer *Causa* e *Solução* em linguagem simples no card e no console.
- **Logs em Tempo Real — Busca Contextual e Modo Localizar**: a busca por termo (`Ctrl+F`) passa a contar com dois modos integrados para análise profunda de logs:
  - **Modo Localizar (padrão)**: preserva todas as linhas do arquivo na tela, destaca as ocorrências e rola suavemente até a linha ativa, permitindo inspecionar a linha completa e o contexto ao redor (stack traces, comandos anteriores e saídas subsequentes). Inclui contador de ocorrências (`X de Y`), botões de navegação e atalhos (<kbd>Enter</kbd> para próxima, <kbd>Shift+Enter</kbd> para anterior, <kbd>F3</kbd> e <kbd>Esc</kbd> para limpar).
  - **Modo Filtrar com Linhas de Contexto**: isola as linhas correspondentes com seletor de linhas de contexto (`±0`, `±1`, `±3` ou `±5` linhas antes e depois da ocorrência). As linhas de contexto vizinhas recebem indicador `CTX`, e blocos separados exibem divisores com o total de linhas omitidas.
  - **Ação "No contexto"**: no modo Filtrar, qualquer linha permite saltar com 1 clique diretamente para o log completo mantendo a posição e o foco.
  - **Numeração real de linhas**: a régua do console de log exibe permanentemente o número físico real de cada linha no arquivo.

### Alterado
- **Abertura do Hub mais rápida para quem já usa o app**: de ~5,4 s para ~2 s (animação enxuta e saída automática); quem abre pela primeira vez continua vendo a abertura completa.
- **Onboarding e tour atualizados para o menu lateral e as Integrações**: o passo "Checklist" dizia "Quatro itens" para uma lista de cinco (agora usa a contagem real), textos que falavam em "cabeçalho" agora dizem "menu lateral", o passo de IA & MCP e o final apontam para a tela Integrações, o tour guiado ganhou o passo "Integrações" e o convite dos tutoriais por tela não diz mais "Tour geral concluído" para quem pulou o tour.
- **Ambiente Dev e Deploy**: o console saiu das duas páginas, que passaram a usar a largura toda. Rodar um diagnóstico do Karaf não limpa mais o console.
- **Desinstalar bundle**: o modal já abre no modo *bundle* quando o bundle não pertence a nenhuma feature instalada. Instalar com sucesso fecha o modal.

### Corrigido
- **Fila de deploy**: marcar etapas em cliques rápidos não desfaz mais a marcação anterior, e trocar de perfil não regrava a lista inteira de perfis. Executar o perfil sugerido por um diagnóstico OSGi roda direto, sem o atraso que podia usar um perfil desatualizado, e executar sem etapas habilitadas agora avisa.
- **Projeto de contexto das etapas Karaf**: cada etapa usa o projeto dela, ou o da etapa anterior mais próxima, e não mais sempre o primeiro projeto do perfil.
- **Deploys simultâneos**: uma segunda execução é recusada com aviso, em vez de cancelar a que estava rodando.
- **Importar perfil**: as etapas recebem ids novos (importar o mesmo arquivo duas vezes gerava ids repetidos) e etapas inválidas são rejeitadas.

## [1.42.0] - 2026-10-20
### Adicionado
- **Abertura**: o app passa a abrir com uma animação de entrada (logo, nome e o carregamento das quatro áreas), que pode ser pulada. Quem está no primeiro uso termina em *"Começar onboarding"* ou *"Explorar sozinho"*; quem já usa entra direto, ou abre *"Ver novidades"*.
- **Onboarding em etapas**: substitui a introdução de uma tela por sete etapas — Boas-vindas, Módulos (liga e desliga as páginas do menu), Tema (variante e claro/escuro), Ambiente (o que já está configurado, por aba, com a detecção automática de caminhos), Checklist da configuração inicial, IA & MCP (exemplos do que um agente consegue fazer pelo servidor MCP) e Pronto, com o tour guiado opcional.

### Alterado
- **Abertura do Hub mais rápida para quem já usa o app**: de ~5,4 s para ~2 s (animação enxuta e saída automática); quem abre pela primeira vez continua vendo a abertura completa.
- **Onboarding e tour atualizados para o menu lateral e as Integrações**: o passo "Checklist" dizia "Quatro itens" para uma lista de cinco (agora usa a contagem real), textos que falavam em "cabeçalho" agora dizem "menu lateral", o passo de IA & MCP e o final apontam para a tela Integrações, o tour guiado ganhou o passo "Integrações" e o convite dos tutoriais por tela não diz mais "Tour geral concluído" para quem pulou o tour.
- **Logo nova**: o símbolo passa a ser o hub — o centro com as quatro áreas chegando nele, dentro do quadro do cockpit. No app ele acompanha a cor do tema escolhido; os ícones do instalador, da janela e do favicon foram refeitos com o mesmo desenho.
- **Tour guiado**: textos mais curtos e sem a segunda tela de boas-vindas; o passo de Configurações aponta para a aba Módulos.

## [1.41.0] - 2026-10-20
### Adicionado
- **Statement Tracer — aba "Por rotina"**: a captura passa a trazer tempo decorrido, CPU, leituras de buffer, leituras de disco e linhas do `v$sql` e agrupa as consultas pelo módulo que as executou (ex.: rotina `2075` / `PCSIS2075.exe`), com as telas (`ACTION`) tocadas, as consultas mais lentas por tempo médio e as repetidas — mesma consulta em laço ou variações só de valor literal (SQL concatenado) —, com a dica de correção. Abrir uma consulta leva ao inspetor de binds.
- **MCP**: nova tool `db_analyze_oracle_capture` entrega essa análise por rotina à IA depois de uma captura.
- **Build Delphi**: novo botão *"Build Delphi"* no Catálogo de Rotinas compila um `.dproj` pelo MSBuild, com as versões do RAD Studio (Delphi 10.x, 11 e 12) detectadas automaticamente, e mostra erros e avisos do compilador estruturados (arquivo, linha, código), sem abrir a IDE. O formulário lembra a última escolha.
- **Pipeline Delphi em um clique**: *"Pipeline completo"* encerra o `.exe` em execução, compila, publica o executável numa pasta (com `.bak` da versão anterior) e o abre no diretório correto para carregar DLLs e INIs. Se o build falhar, nada é publicado nem aberto.
- **MCP**: novas tools `delphi_detect_installations`, `delphi_list_projects`, `delphi_build` e `delphi_run_pipeline` (as duas últimas marcadas como destrutivas). Total: 162 ferramentas.
- **Hub Git — Artefatos do Azure Pipelines**: novo botão *"Artefatos"* no cabeçalho de repositórios Azure DevOps lista os builds concluídos (filtrados pela branch atual ou por qualquer outra), mostra os artefatos publicados por cada build e baixa o `.zip` com um clique, em pipelines YAML (`PublishPipelineArtifact`/`publish`) e clássicos (`PublishBuildArtifacts`).
- **Instalar artefato como rotina**: depois do download, o artefato pode ser instalado direto no diretório `Prod` do WinThor pelo mesmo instalador do catálogo de Rotinas, com backup automático da versão atual.
- **Configurações → Azure**: nova opção *"Pasta de download dos artefatos de pipeline"* (padrão `Downloads\HubManager-Azure`). O PAT existente precisa do escopo `Build (Read)`.
- **Módulos da navegação**: nova aba *Configurações → Módulos* liga e desliga as páginas do menu. Os módulos desligados somem do cabeçalho, da busca rápida (`Ctrl+K`), dos atalhos `Alt+N` e dos tours de página.
- **Atualização na versão portátil**: o app portátil também consulta as releases do GitHub e avisa, com um toast, quando há versão nova; o `.exe` novo abre no navegador. Os artefatos passam a ter nomes sem espaço (`HubManager-Setup-X.exe`, `HubManager-Portable-X.exe`) para o `latest.yml` casar com o GitHub, e `npm run release:publish` envia instalador, blockmap, `latest.yml` e portátil.

### Segurança
- O PAT do Azure DevOps só é enviado a `dev.azure.com`; o redirect do PipelineArtifact para o armazenamento de blobs é seguido sem o cabeçalho `Authorization`.

## [1.40.0] - 2026-10-17
### Adicionado
- **Meu impacto (Configurações → Meu uso)**: o Hub Manager passa a calcular quanto tempo as automações economizaram. A conta é *usos com sucesso × o tempo que você levava à mão − o tempo real no app*. Falhas não contam e o resultado nunca é negativo. A tela mostra a economia dos últimos 7 dias, dos últimos 30 dias e desde o início, por módulo e por automação.
- **Linha de base editável**: para cada automação (preparar ambiente, deploy, backup e restore, regressão de QA, testes Cypress…) você informa quantos minutos levava para fazer à mão. Enquanto não informar, vale um tempo padrão, que é só uma estimativa inicial. A tela separa o tempo **confirmado** (baseado no que você informou) do **estimado** (baseado no padrão), avisa quando parte da economia ainda usa o padrão e sinaliza as automações já usadas que pedem confirmação. Zerar o tempo de uma automação zera a economia dela; o botão de restaurar volta ao padrão. Como as demais configurações, a mudança vale ao clicar em **Salvar**, e a tela mostra o efeito na hora.
- **Exportar CSV**: baixa a tabela de economia por automação (formato "CSV para Excel Brasil"), com a origem do tempo manual em cada linha (padrão ou informado, e a data), para quem recebe o arquivo saber o que é medição e o que é estimativa.
- **Nova tool MCP `usage_get_impact`** (de leitura, 164 tools no total) e **API REST** `GET /api/usage/impact` e `GET /api/usage/days`: permitem perguntar a uma IA quanto tempo você economizou. A consulta não conta como uso.
### Alterado
- **Abertura do Hub mais rápida para quem já usa o app**: de ~5,4 s para ~2 s (animação enxuta e saída automática); quem abre pela primeira vez continua vendo a abertura completa.
- **Onboarding e tour atualizados para o menu lateral e as Integrações**: o passo "Checklist" dizia "Quatro itens" para uma lista de cinco (agora usa a contagem real), textos que falavam em "cabeçalho" agora dizem "menu lateral", o passo de IA & MCP e o final apontam para a tela Integrações, o tour guiado ganhou o passo "Integrações" e o convite dos tutoriais por tela não diz mais "Tour geral concluído" para quem pulou o tour.
- A contagem de uso passa a guardar também o tempo dos usos **com sucesso** (necessário para o cálculo). Contagens gravadas pela 1.39.0 continuam válidas: o tempo dos usos com sucesso é estimado a partir do total quando o campo não existe.

## [1.39.0] - 2026-10-17
### Adicionado
- **Meu uso (Configurações → Meu uso)**: o Hub Manager passa a contar, só na sua máquina, quantas vezes você executou cada automação (pipeline de ambiente, deploy, backup e restore, testes de QA, API Studio, consulta à documentação, Assistente IA…), quanto tempo cada execução levou e se terminou com sucesso. A tela mostra os totais, o uso por módulo e por semana e as ações mais usadas, nos últimos 7 dias, 30 dias ou em todo o período.
- **Privacidade da contagem**: só contadores e durações. Nunca são registrados SQL, nomes de banco ou schema, caminhos, perguntas e respostas da IA, senhas, tokens, nome ou e-mail. Cada instalação tem apenas um identificador aleatório, e nada sai da máquina. A contagem vem **ligada** e pode ser desligada na própria tela (vale ao salvar as configurações); o botão **Apagar histórico** remove tudo.
- **Contagem unificada**: o uso pela interface, pela API REST e pelas ferramentas MCP é somado por módulo. Um app aberto e vários assistentes de IA usando o MCP ao mesmo tempo gravam no mesmo arquivo (`usage-metrics.json`, na pasta de dados do app) sem perder contagem.
- **Nova tool MCP `usage_get_summary`** (de leitura): permite perguntar a uma IA quanto você usou cada automação. A própria consulta não conta como uso. No modo somente leitura (`HUB_MCP_MODE=readonly`) continua disponível.
- **API REST**: `GET /api/usage/summary` (aceita `from` e `to`) e `POST /api/usage/clear`.
### Alterado
- **Abertura do Hub mais rápida para quem já usa o app**: de ~5,4 s para ~2 s (animação enxuta e saída automática); quem abre pela primeira vez continua vendo a abertura completa.
- **Onboarding e tour atualizados para o menu lateral e as Integrações**: o passo "Checklist" dizia "Quatro itens" para uma lista de cinco (agora usa a contagem real), textos que falavam em "cabeçalho" agora dizem "menu lateral", o passo de IA & MCP e o final apontam para a tela Integrações, o tour guiado ganhou o passo "Integrações" e o convite dos tutoriais por tela não diz mais "Tour geral concluído" para quem pulou o tour.
- Contagem de tools MCP atualizada nos textos da Ajuda, do README e do catálogo (`docs/MCP_TOOLS.md`), que estavam desatualizados.

## [1.38.0] - 2026-10-16
### Adicionado
- **Perfis de Deploy — Execução Seletiva & Pular Etapas**: caixas de seleção (`checkbox`) interativas em cada etapa do perfil de deploy ativo, permitindo incluir ou desmarcar etapas individuais para pular comandos demorados (como compilações `mvn clean` desnecessárias quando o build já foi feito) na execução automática.
- **Ação Rápida "Daqui em diante"**: botão dedicado em cada etapa intermediária que fatia o perfil ativo e dispara a execução imediatamente a partir daquela etapa até o final, sem necessidade de desmarcar manualmente as anteriores.
- **Controles de Seleção em Lote**: checkbox mestre com estado indeterminado e botões de ação rápida *"Marcar todas"* e *"Desmarcar todas"* no cabeçalho do painel de etapas, com contador dinâmico `Etapas (X/Y)` e badge indicando a contagem de etapas puladas.
- **Botão Dinâmico no Cabeçalho**: o botão principal de execução adapta seu texto para *"Executar Selecionadas (N)"* e tooltip explicativo quando há etapas puladas, desabilitando-se automaticamente quando nenhuma etapa estiver marcada para prevenir disparos vazios.
- **Editor de Etapas de Deploy**: adicionada a opção *"Habilitar etapa na execução automática do perfil (enabled)"* no modal de configurações avançadas de etapas de deploy.
- **Central de Ajuda**: novo tópico no FAQ e bullet atualizado no Guia dos Módulos detalhando a seleção e o pulo de etapas em perfis de deploy.

## [1.37.0] - 2026-10-15
### Adicionado
- **API Studio (Postman Integrado)**: novo módulo completo acessível via atalho `Alt+9` no grupo de Desenvolvimento & DevOps, permitindo testar, depurar e homologar APIs REST e serviços WinThor/Karaf sem necessidade de ferramentas externas pesadas.
- **Importador Nativo de Coleções Postman**: importação de arquivos `.json` de coleções nos formatos Postman v2.1 e v2.0 com reconstrução fiel da árvore de pastas e subpastas, métodos HTTP, parâmetros de query, cabeçalhos, corpos e exemplos de resposta.
- **Gerenciador de Ambientes & Variáveis**: suporte completo a variáveis de ambiente com interpolação dinâmica (`{{host}}`, `{{port}}`, `{{LOGIN}}`, `{{SENHA}}`, `{{TOKEN}}`) e variáveis dinâmicas Postman (`{{$randomInt}}`, `{{$timestamp}}`, `{{$uuid}}`).
- **Autenticação Automática WinThor**: recurso de login direto contra `/winthor/autenticacao/v1/login`, extraindo o `accessToken` e injetando automaticamente nas requisições da coleção com um único clique no botão *"Autenticar no WinThor"*.
- **Editor Monaco Integrado**: suporte a realce sintático em JSON, validação estrutural, formatação rápida (*Beautify JSON*) e visualizador de respostas com métricas de tempo em milissegundos e tamanho de payload.
- **Integração com Validador Regressivo**: botão direto na resposta HTTP para enviar payloads JSON ao Validador Regressivo da Central de Qualidade (QA Hub).
- **Servidor MCP — 4 Novas Ferramentas**: adicionadas as tools `http_send_request`, `http_list_collections`, `http_login_winthor` e `http_import_postman_collection`, elevando o catálogo total do Hub Manager para 157 ferramentas de IA.

## [1.36.0] - 2026-10-15
### Adicionado
- **DB Studio — redimensionamento interativo de colunas**: os cabeçalhos das colunas do grid de resultados agora contam com divisores interativos arrastáveis via mouse, permitindo alargar e encolher qualquer coluna livremente. O duplo-clique no divisor expande a coluna instantaneamente em +200px (até o teto de 1200px) para leitura rápida de campos volumosos.
- **DB Studio — visualizador detalhado de célula (CellViewerModal)**: duplo-clique em qualquer célula da consulta em modo de leitura (ou botão direito &gt; *"Ver valor completo..."*) abre um modal de inspeção com formatação e indentação automática de JSON, alternância de quebra de linha (*word-wrap*), contador de caracteres e botão de cópia direta.
- **DB Studio — feedback visual e proteção na cópia de células**: o clique em uma célula agora exibe notificação toast com prévia do valor e identificação da coluna copiada. Foi implementada verificação de seleção manual de texto com o mouse para evitar sobreposição involuntária da cópia automática da célula inteira.
- **Área de transferência — fallback com execCommand**: o hook `useCopyToClipboard` agora conta com fallback retrocompatível via `document.execCommand('copy')`, garantindo sucesso na cópia de células mesmo quando a API moderna `navigator.clipboard.writeText` estiver restrita por foco ou políticas de permissão da janela.

### Alterado
- **Abertura do Hub mais rápida para quem já usa o app**: de ~5,4 s para ~2 s (animação enxuta e saída automática); quem abre pela primeira vez continua vendo a abertura completa.
- **Onboarding e tour atualizados para o menu lateral e as Integrações**: o passo "Checklist" dizia "Quatro itens" para uma lista de cinco (agora usa a contagem real), textos que falavam em "cabeçalho" agora dizem "menu lateral", o passo de IA & MCP e o final apontam para a tela Integrações, o tour guiado ganhou o passo "Integrações" e o convite dos tutoriais por tela não diz mais "Tour geral concluído" para quem pulou o tour.
- **DB Studio — largura flexível nas colunas do grid**: removida a restrição fixa rígida de `max-w-xs` (320px) em todas as células, adotando largura dinâmica baseada nas preferências do usuário e largura mínima confortável de `120px` por padrão.

## [1.35.1] - 2026-10-15
### Adicionado
- **DB Studio — seletor de pasta para Oracle Instant Client**: adicionado botão com diálogo nativo de busca no Explorer diretamente ao lado do campo de diretório do Instant Client no modal de conexão.

### Alterado
- **Abertura do Hub mais rápida para quem já usa o app**: de ~5,4 s para ~2 s (animação enxuta e saída automática); quem abre pela primeira vez continua vendo a abertura completa.
- **Onboarding e tour atualizados para o menu lateral e as Integrações**: o passo "Checklist" dizia "Quatro itens" para uma lista de cinco (agora usa a contagem real), textos que falavam em "cabeçalho" agora dizem "menu lateral", o passo de IA & MCP e o final apontam para a tela Integrações, o tour guiado ganhou o passo "Integrações" e o convite dos tutoriais por tela não diz mais "Tour geral concluído" para quem pulou o tour.
- **DB Studio — largura do modal de conexão**: ampliado de `max-w-md` (448px) para `max-w-2xl` (672px), distribuindo com conforto todas as configurações (Host, Porta, Service Name/SID, Thick Mode, credenciais e ambiente de produção) e evitando corte/truncamento na mensagem de versão do banco.
- **Auditoria de UI/UX**: foco de teclado visível em todo o app (`:focus-visible` global) e `prefers-reduced-motion` respeitado; ~270 botões só de ícone ganharam `aria-label` e o componente `IconButton` (rótulo obrigatório) substitui os do cabeçalho. A rampa `amber` passou para amarelo, separando "aviso" do laranja do tema, e há tokens `success`/`warning`/`danger`/`info`. Cinzas crus (`slate`/`zinc`/`neutral`) saíram do cromo de UI e ficam só em console/terminal; `text-[11px]` virou `text-2xs`; raios `2xl` viraram `xl`. Cada página tem um único `<h1>` e os modais usam `<h2>`.
- **Diálogos**: 3 `confirm()` nativos (excluir perfil de deploy/ambiente e remover fontes de log) agora usam o diálogo do app; nove overlays (QuickLauncher, leitor de Markdown, drawer de análise de exceção, modais de binds/snippet/especificação/item de qualidade, onboarding) passaram a usar o `ui/Modal` (foco preso, Esc e ARIA padronizados), e os menus de clique-fora fecham com Esc.
- **Lint**: `confirm`/`alert` viram erro; `text-[11px]`, cinzas crus e `fixed inset-0` fora de `ui/Modal` geram aviso (com exceções para consoles e menus).

### Corrigido
- **DB Studio — virtualização do grid de resultados SQL**: corrigido problema no hook `useVirtualScroll` onde consultas com mais de 39 linhas travavam a rolagem na linha 39 porque a referência do container e os ouvintes de evento não eram reinicializados após o término da execução da consulta (`isExecuting`). Adicionado suporte a callback ref, handler `onScroll` reativo e espaçadores virtuais com elementos de bloco para garantir que o scrollbar represente com precisão todas as linhas retornadas (ex: 127 linhas ou milhares).
- **DB Studio — edição do grid em tabela sem chave primária**: em Oracle e PostgreSQL a consulta `SELECT * FROM <tabela>` é refeita trazendo `ROWID`/`ctid` (oculto no grid, na busca e na exportação) e UPDATE/DELETE passam a usar `WHERE ROWID = :p`/`ctid = :p`. Linhas duplicadas, BLOB, datas e números grandes deixam de impedir a alteração. No PostgreSQL só para tabelas comuns (views e partições seguem pelo fallback). MySQL sem PK continua localizando por todas as colunas, agora com aviso.

## [1.35.0] - 2026-10-06
### Adicionado
- **Instalador — telas opcionais**: depois da escolha da pasta, o assistente mostra duas telas em português que podem ser puladas com **Avançar** (e não aparecem em atualizações automáticas). **Oracle Instant Client**: explica quando é necessário (Oracle 11g ou anterior e backup com expdp/impdp), traz os links de download e do Visual C++ Redistributable, sugere a pasta `C:\oracle` (com opção de criá-la) e diz onde informar o caminho no app. **Assistente de IA**: chave de API (BYOK) ou modelo local com o Ollama. O `instalar-extras.cmd` e o LEIA-ME continuam como alternativa.

### Segurança
- A **senha e o cookie do WTA** agora ficam criptografados no `config.json` (estavam em texto plano) e não voltam mais para a tela nem para a API; a tela mostra "senha salva e protegida".
- **Servidor web/Docker**: a API key é comparada em tempo constante, 10 chaves erradas por minuto bloqueiam a origem (429), sem API key a API só responde para `localhost` (fecha DNS rebinding) e um erro dentro de uma rota não derruba mais o processo nem deixa a requisição pendurada (vira 500 em JSON).
- **MCP**: toda tool declara `readOnlyHint`/`destructiveHint`, para o cliente pedir confirmação. `HUB_MCP_MODE=readonly` registra só as 85 tools de leitura. `db_execute_query` recusa comando de escrita em conexão marcada como produção.
- **Backup com comando personalizado**: host, senha ou caminho com espaço ou aspas deixam de poder injetar argumentos. Backup e restore MySQL com `.gz` corrompido ou processo que encerra cedo deixam de derrubar o app e passam a respeitar um tempo limite de 20 min.
- **Logs**: só arquivos com extensão de log podem ser zerados e o visualizador não lê a pasta de dados do app (`config.json` e chave).
- A chave do Gemini passa no header, não mais na URL. URLs de metadados de nuvem (169.254.x.x) são recusadas. Chamadas HTTP internas ganham tempo limite ocioso de 60 s e teto de 512 MB. O Karaf em modo debug no WSL valida caminho e script. O navegador de perfil só abre `http`/`https`.
- O `config.json` é gravado de forma atômica e um segredo que não consegue ser criptografado deixa de ser gravado em texto plano.

### Corrigido
- O instalador voltou a abrir em **português (pt-BR)**: a configuração anterior forçava o inglês.
- Fechar o app no meio de um log, deploy ou backup não gera mais "Object has been destroyed", e ao sair o app encerra o Karaf embutido, os agendamentos de backup e o receptor OTLP.
- **Configurações**: escolher o arquivo de uma fonte de log perdia o caminho (só o nome era aplicado). A tela não mostra mais "Não salvo" logo na abertura quando os launchers de rotina estavam salvos sem normalizar, e depois de **importar** um arquivo ela recarrega do disco (antes continuava marcando alterações pendentes). Falha ao salvar passa a mostrar um aviso na tela.
- Docker: o healthcheck agora envia a API key (o container ficava "unhealthy"), `.env` e certificados não entram mais na imagem e o `npm ci` do runtime não depende mais do `patch-package`.
- Ajuda e README: contagem de 166 tools MCP, nível de permissão `asInvoker` e fallbacks de versão corrigidos.

### Alterado
- **Abertura do Hub mais rápida para quem já usa o app**: de ~5,4 s para ~2 s (animação enxuta e saída automática); quem abre pela primeira vez continua vendo a abertura completa.
- **Onboarding e tour atualizados para o menu lateral e as Integrações**: o passo "Checklist" dizia "Quatro itens" para uma lista de cinco (agora usa a contagem real), textos que falavam em "cabeçalho" agora dizem "menu lateral", o passo de IA & MCP e o final apontam para a tela Integrações, o tour guiado ganhou o passo "Integrações" e o convite dos tutoriais por tela não diz mais "Tour geral concluído" para quem pulou o tour.
- Dependências atualizadas com `npm audit fix` e remoção do `patch-package` (vulnerabilidades 26 para 21, altas 10 para 5). O patch do `fastembed` foi removido (a versão 2.1.1 não precisa mais dele).
- **Diálogos**: as confirmações (`window.confirm`) e avisos (`alert`) do app, que travavam a janela e ignoravam o tema, viraram um diálogo próprio e toasts. O diálogo respeita Esc, clique fora e Tab (o foco não escapa para a tela de trás), devolve o foco ao fechar e é lido corretamente por leitores de tela. Os avisos importantes (como os alertas de uma importação de configurações) pedem um "Entendi" em vez de sumir sozinhos. Os 49 modais do app (Karaf, containers, Git, banco, documentação, qualidade e outros) passam pelo mesmo `Modal`: foco preso e devolvido, nome acessível e camada padronizada. Esc e clique fora continuam sem fechar os formulários e editores, como antes; os visualizadores (histórico, logs, diff, detalhes) fecham com Esc.
- A tela de Configurações foi reorganizada por dentro (de 1204 para 241 linhas, com a lógica em hooks por assunto e testes das regras puras), sem mudar o que o usuário vê.
- O registro de canais IPC do app (um arquivo de 1588 linhas, uma função com 24 parâmetros) foi dividido em 18 arquivos por assunto, e o adaptador web (2205 linhas) em 16 módulos. Saíram 10 canais IPC que ninguém chamava, e um teste agora confere que todo canal chamado pelo preload tem handler, que nenhum handler fica sem uso e que cada evento escutado é emitido.
- O instalador não leva mais os planos internos de `docs/superpowers`. Removidos scripts e módulos sem uso (`extract_tools`, `releaseNotesUtils`, `NetworkPortScanner`).

## [1.34.0] - 2026-10-06
### Adicionado
- **Banco de Dados — abas de consulta**: cada aba tem a sua conexão, o seu editor, o seu resultado (com filtros, ordenação e plano de execução) e a sua transação (sessão própria, com commit e rollback independentes). As abas continuam montadas quando ocultas, então trocar de aba ou de banco não apaga o resultado das outras e dá para **comparar dados entre conexões diferentes**. Clicar numa conexão da sidebar volta para a aba mais recente dela ou abre uma nova com a consulta padrão do banco; o botão **+** abre outra aba na conexão selecionada (até 12) e o botão do meio do mouse fecha. A barra indica o banco por cor e mostra um ponto âmbar quando há alterações pendentes.
- O texto e a conexão de cada aba **persistem entre aberturas**; abas de conexões apagadas somem.
- Fechar uma aba com alterações pendentes (alterações do grid não aplicadas ou comandos sem commit) pede confirmação e encerra a sessão com rollback.

### Alterado
- **Abertura do Hub mais rápida para quem já usa o app**: de ~5,4 s para ~2 s (animação enxuta e saída automática); quem abre pela primeira vez continua vendo a abertura completa.
- **Onboarding e tour atualizados para o menu lateral e as Integrações**: o passo "Checklist" dizia "Quatro itens" para uma lista de cinco (agora usa a contagem real), textos que falavam em "cabeçalho" agora dizem "menu lateral", o passo de IA & MCP e o final apontam para a tela Integrações, o tour guiado ganhou o passo "Integrações" e o convite dos tutoriais por tela não diz mais "Tour geral concluído" para quem pulou o tour.
- Ao trocar de conexão, o editor deixa de manter o texto da conexão anterior: cada conexão tem a sua aba, com a consulta padrão do banco na primeira vez.
- A lista de tabelas e as colunas da sidebar ficam em cache **por conexão**: alternar entre bancos não recarrega a lista, e colunas de tabelas com o mesmo nome em bancos diferentes não se misturam mais.
- O histórico de execuções é único e compartilhado entre as abas.

### Testes
- Lógica de abas (criar, selecionar, fechar, reabrir por conexão, reconciliar com as conexões existentes e persistência) coberta por testes.

## [1.33.0] - 2026-10-06
### Adicionado
- **Banco de Dados — transações**: cada conexão ativa ganha uma sessão própria, com barra **Auto-commit / Manual**, **Commit (F11)**, **Rollback (F12)**, contador de alterações pendentes e **Cancelar consulta**. Conexões marcadas como **Ambiente de produção** (novo campo no cadastro) começam em modo manual. Há confirmação para `UPDATE`/`DELETE` sem `WHERE` (em auto-commit) e para `DROP`/`TRUNCATE`, e aviso ao voltar para auto-commit com alterações pendentes. No PostgreSQL, um erro dentro da transação desfaz só o comando que falhou. Fechar o app faz rollback do que estiver pendente.
- **Banco de Dados — editor Monaco**: destaque de sintaxe, busca, múltiplos cursores, comentar linhas e formatar (`Ctrl+Shift+F`). O **autocomplete** funciona no cursor e conhece o contexto: colunas após `alias.` (carregadas sob demanda), tabelas após `FROM`/`JOIN`, colunas das tabelas do comando em `SELECT`/`WHERE`/`ON` (mesmo com o `FROM` depois do cursor), funções por dialeto, palavras-chave e snippets (`sel`, `ins`, `upd`, `cte`, `begin`...). `Ctrl+Enter` executa a seleção ou o comando sob o cursor; `F5` executa o script inteiro, parando no primeiro erro.
- **Banco de Dados — descrever tabela**: painel com colunas (PK, FK, NOT NULL, default, comentário), constraints (com navegação pelas chaves estrangeiras), índices, triggers e DDL, aberto pelo botão ⓘ da tabela ou por `F4` no editor. A sidebar passou a filtrar por tipo de objeto (tabelas, views, procedures, functions, packages, sequences, triggers, sinônimos, types), com contagem e selo de objeto inválido. Suporta `OWNER.TABELA` no Oracle (DDL por `DBMS_METADATA`), PostgreSQL e MySQL.
- **Banco de Dados — resultados**: exportar em **Excel (.xlsx)**, **CSV para Excel Brasil** (`;`, BOM e vírgula decimal), CSV padrão e JSON; botão **Carregar mais** quando o resultado atinge o limite (de 100 até 10.000 linhas); edição do grid **em lote** com **Aplicar** e **Descartar**, na mesma transação do editor; plano de execução em **árvore** (Oracle e PostgreSQL) com custo próprio por operação, alertas de *full scan* e produto cartesiano e predicados.
- Cadastro de conexão: opção **Usar SSL/TLS** para PostgreSQL e MySQL, antes inacessível pela interface.

### Corrigido
- **PL/SQL**: blocos `BEGIN ... END;` perdiam o `;` final e davam ORA-06550; o `/` terminador também passa a ser tratado.
- **PostgreSQL e MySQL**: as consultas traziam todas as linhas para a memória antes do corte; agora usam `LIMIT`, e há timeout de 60 s. O resultado avisa "Limite atingido" quando existem mais linhas.
- A conexão compartilhada era fechada no meio de uma consulta mais longa que 30 s, e o cache ignorava senha, modo SID/Service, Thick e SSL.
- Clicar numa tabela com maiúsculas ou símbolos no PostgreSQL (ex.: `public.Clientes`) gerava um `SELECT` que falhava; agora o nome vai entre aspas quando o banco exige.
- Resultado sem linhas dizia "nenhum resultado corresponde aos filtros" e oferecia remover filtros; agora informa que a consulta rodou e não retornou linhas.

### Testes
- Novos testes para sessões e transações, autocomplete, divisão de scripts, catálogo por banco, exportação (incluindo leitura do `.xlsx` gerado), edição em lote e plano em árvore. Os caminhos de transação foram verificados por mutação.

## [1.32.0] - 2026-10-06
### Adicionado
- **Qualidade em páginas próprias**: o menu **QA** do cabeçalho agora abre quatro páginas separadas — **Homologação** (Matriz, Prontidão e Roadmap; atalho `Alt+Q`), **Validador Regressivo**, **Test Runners** e **TAUT (Cypress)**. Cada página mostra só o que é dela; Release, Exportar Relatório e Novo Cenário ficam apenas em Homologação. A Matriz de Validação é única e compartilhada, então o resultado de um runner continua atualizando os cenários vinculados. As novas páginas também aparecem na busca rápida (`Ctrl+K`).
- **Matriz de Validação**: editar cenário já criado (título, alvo, categoria e notas), exportar os cenários exibidos em **CSV** (UTF-8, com proteção contra injeção de fórmula no Excel), ordenar por Status, Cenário, Alvo, Categoria e Atualizado (em Status, falhas e bloqueios vêm primeiro), coluna **Atualizado**, contador "Exibindo N de M" com *Limpar filtros* e cards de métrica clicáveis que filtram a Matriz por status.
- **Primeiro uso**: ao concluir o tour, os caminhos obrigatórios vazios (repositórios, IDE) são preenchidos com o que a detecção automática encontrar, e o app avisa quais foram preenchidos. Nunca sobrescreve valores já configurados.
- **Instalador (NSIS)**: sempre em pt-BR, com atalhos de Desktop e Menu Iniciar e execução ao finalizar declarados explicitamente.

### Alterado
- **Abertura do Hub mais rápida para quem já usa o app**: de ~5,4 s para ~2 s (animação enxuta e saída automática); quem abre pela primeira vez continua vendo a abertura completa.
- **Onboarding e tour atualizados para o menu lateral e as Integrações**: o passo "Checklist" dizia "Quatro itens" para uma lista de cinco (agora usa a contagem real), textos que falavam em "cabeçalho" agora dizem "menu lateral", o passo de IA & MCP e o final apontam para a tela Integrações, o tour guiado ganhou o passo "Integrações" e o convite dos tutoriais por tela não diz mais "Tour geral concluído" para quem pulou o tour.
- **Marca**: "Dev Manager" deu lugar a **Hub Manager** na interface, na Central de Ajuda, nas descrições das tools MCP, no README, no DOCKER.md, no AGENTS.md, no LEIA-ME e nas notas de release. O README e o LEIA-ME apontam o instalador `Hub Manager Setup <versão>.exe` e a variável `HUB_MANAGER_EXE`; o launcher do MCP continua aceitando `DEV_MANAGER_EXE`. A pasta de dados, o `dev-manager-mcp.cmd` e o nome do servidor MCP não mudaram.
- **Configurações → Qualidade**: deixa claro que a sincronização com Zephyr, Jira e Azure ainda não existe (as fontes só ficam registradas); o selo "ATIVA" virou "SELECIONADA".
- **Remover cenário** da Matriz pede confirmação.
- Removido o código sem uso de *evidências* (`QualityEvidence` e a seção do relatório em Markdown), que nenhuma tela utilizava.

### Corrigido
- **Onboarding reaparecia na 2ª abertura**: o app apagava os marcadores gravados quando o usuário pulava a introdução antes de o Electron responder a primeira execução. Recarregar a janela também não reabre mais o onboarding nem o "O que há de novo", e a versão do app passa a ser lida na primeira execução.
- **"Detectar automaticamente"** sobrescrevia caminhos já configurados com vazio quando a detecção não achava nada; agora só preenche campos vazios.
- **Dados ao atualizar**: a pasta de dados do Electron (`localStorage`: Matriz de Qualidade, tema, marcadores de onboarding) fica fixa em `%APPDATA%\dev-manager`. A troca do nome do pacote para `hub-manager` a moveria e faria quem atualiza perder esses dados.
- **Sincronização de Test Runners com a Matriz**: o aviso podia mostrar contagem errada; runner abortado agora marca o cenário como *Bloqueado* (antes virava *Falha*); vínculos que já não existem na Matriz são avisados.
- **Prontidão** sem cenários mostra "Sem cenários para avaliar" em vez de "Bloqueado".
- **Acessibilidade na Qualidade**: rótulos nos filtros, busca, status, ações de linha e campo de release; o modal de cenário tem `role="dialog"`, fecha com `Esc` e a tabela anuncia a ordenação (`aria-sort`). A tabela da Matriz tem largura mínima por coluna, para não espremer o texto em telas estreitas.

### Testes
- Cobertura de `readinessScore`, tolerância numérica das asserções e das regras de sincronização e edição da Matriz (lógica extraída dos hooks para funções puras). Verificado por mutação: as 5 alterações propositais de código que antes passavam sem falha agora são detectadas.

## [1.31.3] - 2026-10-05
### Alterado
- **Abertura do Hub mais rápida para quem já usa o app**: de ~5,4 s para ~2 s (animação enxuta e saída automática); quem abre pela primeira vez continua vendo a abertura completa.
- **Onboarding e tour atualizados para o menu lateral e as Integrações**: o passo "Checklist" dizia "Quatro itens" para uma lista de cinco (agora usa a contagem real), textos que falavam em "cabeçalho" agora dizem "menu lateral", o passo de IA & MCP e o final apontam para a tela Integrações, o tour guiado ganhou o passo "Integrações" e o convite dos tutoriais por tela não diz mais "Tour geral concluído" para quem pulou o tour.
- **Identidade do Produto (Rebranding)**: o cockpit agora se chama **Hub Manager**, com o subtítulo oficial *"Cockpit Integrado de Operação, Desenvolvimento e Qualidade"*. O novo posicionamento reflete a evolução da plataforma para atender toda a squad (Dev, QA, PO e SME) em fluxos de infraestrutura, banco de dados, catálogo de rotinas, qualidade de software e observabilidade.
- **Legibilidade**: nenhum texto da interface fica abaixo de 11px. O novo token `text-2xs` (11px) substituiu todas as fontes de 7 a 10,5px em badges, rótulos de seção, dicas de atalho e consoles.
- **Qualidade**: as abas agora estão agrupadas em Automação (TAUT, Test Runners), Validação (Matriz, Validador Regressivo) e Entrega (Prontidão, Roadmap). Os badges decorativos ("QA Hub", "Automação", "Oracle QA") saíram; ficam só a contagem da Matriz e a nota de Prontidão. Abas renomeadas: "TAUT (Cypress)", "Matriz" e "Prontidão (PO)".
- **Configurações**: as abas ficam em três grupos separados por divisor, e o contador só aparece quando há itens (antes mostrava 0). A barra virou o componente `SettingsTabsNav`.
- **Contraste**: o texto do botão primário atinge 4,5:1 em todos os temas (texto escuro nos temas escuros; laranja e verde do tema claro levemente mais escuros). No tema claro, tons fixos como `text-emerald-500`/`-600` e o texto secundário em chips ficam mais escuros, preservando consoles e superfícies escuras.

### Corrigido
- **Acessibilidade**: os campos de Configurações agora têm rótulo associado (`label` ligado ao campo ou `aria-label`), incluindo busca, perfis de ambiente, launchers por extensão, portas monitoradas e o toggle do WinThor Start. Leitores de tela leem o nome do campo, e o rótulo não some mais ao digitar.
- **Central de Ajuda**: os nomes das abas de Qualidade no Guia dos Módulos e nos atalhos acompanham a nova interface.

## [1.31.2] - 2026-10-05
### Alterado
- **Abertura do Hub mais rápida para quem já usa o app**: de ~5,4 s para ~2 s (animação enxuta e saída automática); quem abre pela primeira vez continua vendo a abertura completa.
- **Onboarding e tour atualizados para o menu lateral e as Integrações**: o passo "Checklist" dizia "Quatro itens" para uma lista de cinco (agora usa a contagem real), textos que falavam em "cabeçalho" agora dizem "menu lateral", o passo de IA & MCP e o final apontam para a tela Integrações, o tour guiado ganhou o passo "Integrações" e o convite dos tutoriais por tela não diz mais "Tour geral concluído" para quem pulou o tour.
- **Qualidade — Painel de Prontidão (PO)**: os cartões por categoria (Rotinas Delphi, Serviço Karaf, API REST, Fluxo E2E) agora mostram números reais calculados da Matriz de Validação (aprovados/total, barra de progresso e contagem de pendentes, em teste, falhas e bloqueados). Antes eram textos fixos, que sugeriam ler a saúde do Karaf.
- **TAUT**: o cabeçalho mostra "Cypress não detectado" quando não há versão no projeto (antes exibia "Cypress 15.6.0" fixo). O placeholder do campo Release deixou de sugerir `v1.24.0`.

### Corrigido
- **Matriz de Validação**: cenários-modelo antigos já gravados no navegador (um "Aprovado" e um "Em teste" com testador "QA Team", nunca verificados) voltam a *pendente* ao abrir a tela, e a release `v1.24.0` antiga é limpa. Itens editados pelo usuário são preservados.

## [1.31.1] - 2026-10-05
### Adicionado
- **Prefixo das chaves de cenário Zephyr (TAUT)** em Configurações > Diretórios & IDE (`tautKeyPrefix`): restringe a cobertura e o Intake CSV às chaves de um projeto (ex.: `PROJ-T`). Vazio aceita qualquer chave no formato `ABC-T123`.
- Detecção automática do projeto TAUT por qualquer pasta `taut*` (além de `cypress-tests`, `cypress` e `e2e-tests`) no diretório de projetos.

### Alterado
- **Abertura do Hub mais rápida para quem já usa o app**: de ~5,4 s para ~2 s (animação enxuta e saída automática); quem abre pela primeira vez continua vendo a abertura completa.
- **Onboarding e tour atualizados para o menu lateral e as Integrações**: o passo "Checklist" dizia "Quatro itens" para uma lista de cinco (agora usa a contagem real), textos que falavam em "cabeçalho" agora dizem "menu lateral", o passo de IA & MCP e o final apontam para a tela Integrações, o tour guiado ganhou o passo "Integrações" e o convite dos tutoriais por tela não diz mais "Tour geral concluído" para quem pulou o tour.
- **Qualidade — Matriz de Validação**: os 4 cenários-modelo iniciais agora nascem como *pendentes* (antes, um vinha "Aprovado" sem verificação) e a Release padrão ficou vazia (era `v1.24.0`). Dados inválidos no `localStorage` não quebram mais a tela.
- **Qualidade — Roadmap**: status refletem o que já existe (*Disponível*) e o que *ainda não foi implementado*.
- **Qualidade — Prontidão**: com falha, bloqueio ou pendência, o veredito nunca é "Release Pronta".
- **Qualidade — Fontes (Zephyr/Jira/Azure)**: o botão *Testar* agora informa que a validação é só local e que a sincronização ainda não está implementada.
- **TAUT**: sem CSV em `Insumo/` a porcentagem de cobertura não é calculada (`baselineMissing`), em vez de dar 100% trivial. O nome "TAUT-Mississauga" e o prefixo `DDWMISSI-T` deixaram de ser fixos no código, na UI, na Ajuda e nas tools MCP.
- **Validador Regressivo**: suíte só é aprovada se houver asserções e todas puderem ser verificadas; JSON de payload inválido gera erro (antes era ignorado) e a issue de exemplo deixou de ser pré-preenchida.
- **Test Runners**: o comando respeita aspas (ex.: `node -e "..."`) e um diretório de trabalho inexistente falha com mensagem, em vez de rodar na pasta do próprio app.
- **Perfil de deploy de exemplo** vem com as etapas desabilitadas (as coordenadas Maven são fictícias).
- **WSL/INFR e Rotinas**: removidos caminhos pessoais fixos; a detecção usa a pasta do usuário atual e o header de Rotinas mostra "não configurada" quando não há diretório.
- A tool MCP `db_save_backup_config` agora explica que o cron só é reagendado pelo app desktop/servidor.

### Corrigido
- **DB Studio**: Ctrl+Enter executa a query mesmo com a lista de sugestões aberta (antes aceitava a sugestão e substituía o texto digitado).
- `saveSettings` deixou de responder sucesso quando a gravação do `config.json` falha.
- O erro do botão *Simular Tráfego* (APM) deixou de ser engolido.

### Segurança
- A tool MCP `settings_save` devolvia as configurações sem sanitizar (senhas e tokens em texto puro); agora responde com os segredos ofuscados, como `settings_get`.
- O sincronismo de `.env` do TAUT não grava mais credencial padrão da API quando o login do WTA não está configurado.

## [1.31.0] - 2026-10-02
### Adicionado
- **Importação e Seleção de Conexões Oracle via `tnsnames.ora`**:
  - **Configuração de Caminho de Rede em Configurações > Banco de Dados**: Novo campo com botão de seleção de arquivo (`.ora`) no Windows Explorer para definir o caminho do arquivo `tnsnames.ora` (ex.: `C:\oracle\product\11.2.0\dbhome_1\network\admin\tnsnames.ora`);
  - **Configuração Automática de `TNS_ADMIN`**: Ao iniciar conexões ou inicializar o Oracle Thick Client, o Dev Manager detecta automaticamente o diretório do `tnsnames.ora` e ajusta as variáveis de ambiente necessárias e o `configDir` do driver Oracle;
  - **Seletor Visual de Conexões no DB Studio**: No modal de criação/edição de conexões Oracle (`ConnectionModal`), agora há um seletor visual (`OracleTnsSelector`) que lê o arquivo configurado, exibe todos os aliases cadastrados e preenche instantaneamente o nome, host, porta, base de dados (SID ou Service Name) e modo de conexão com 1 clique;
  - **Fallback Manual no Modal**: Caso o caminho não esteja definido nas configurações globais, o usuário pode selecionar um arquivo `.ora` pontual diretamente dentro do próprio modal de conexão;
  - **Parser Puro de TNS**: Novo utilitário (`tnsnamesParser.ts`) com suporte a comentários, múltiplos aliases na mesma definição, `SERVICE_NAME`, `SID` e protocolo `TCP`;
  - **Nova Ferramenta MCP (`db_list_tns_entries`)**: Total do catálogo expandido para **166 ferramentas**, permitindo que assistentes de IA inspecionem aliases e parâmetros de rede de arquivos `tnsnames.ora`;
  - **Sincronização nos Três Transportes**: Handlers IPC `db:parse-tnsnames`, rotas REST `POST /api/db/tnsnames/parse` e `GET /api/db/tnsnames`, e tool MCP correspondente.

## [1.30.0] - 2026-10-02
### Adicionado
- **Suporte Nativo a Apache Karaf no WSL 2 (Linux Virtualizado)**:
  - **Seletor de Ambiente em Configurações > Apache Karaf**: Nova seção dedicada (`KarafWslSection`) permitindo alternar entre o modo padrão *Local (Windows Nativo)* e *WSL 2 (Linux Virtualizado)* sem nenhum impacto ou quebra no ambiente Windows existente;
  - **Detecção Automática de Distribuições WSL**: Listagem automática das distribuições instaladas (Ubuntu, Debian, etc.) com status de execução em tempo real e seleção rápida via dropdown;
  - **Resolução Híbrida de Caminhos Linux e Windows UNC**: O Dev Manager agora aceita tanto caminhos do Linux (ex: `/home/usuario/karaf`) quanto caminhos UNC de rede do Windows (`\\wsl.localhost\Ubuntu\home\usuario\karaf`), mapeando-os de forma bidirecional transparente;
  - **Execução Transparente de Comandos OSGi**: Comandos de deploy (`bundle:list`, `feature:install`, diagnósticos OSGi e verificações JMX) passam a ser executados diretamente via `wsl.exe -d <distro> -- <path>/bin/client` quando configurado em modo WSL;
  - **Inicialização em Debug e Encerramento Limpo**: Inicialização do servidor Karaf em modo Debug (via terminal externo ou console integrado) invocando o container Linux no WSL, com liberação limpa de processos via `pkill -f karaf` no reset de ambiente;
  - **Fallback de Rede Inteligente**: Checagem de disponibilidade do Karaf via porta SSH (`8101`) com teste em `127.0.0.1` e fallback automático para o IP virtual da distro WSL caso o localhost forwarding não esteja ativo;
  - **Documentação e Central de Ajuda**: Novo tópico de FAQ completo adicionado na Central de Ajuda (Alt+9) com orientações passo a passo e dicas de rede espelhada (`networkingMode=mirrored` no `.wslconfig`).

## [1.29.0] - 2026-10-02
### Adicionado
- **Obtenção Flexível de Payloads de Integração no Validador Regressivo (Banco Oracle & API REST Externa)**:
  - **Consulta Direta no Banco Oracle (`PCINTEGRACAOCORE`)**: Novo modal interativo (`QaFetchPayloadModal` / `QaOraclePayloadTab`) com botão *"Obter Payload"* na aba de dados, permitindo localizar instantaneamente os payloads originais de transações recepcionadas pelo PDVSync e WSH gravados na tabela `PCINTEGRACAOCORE` (coluna `DADOSTRANSFORMADOS`);
  - **5 Modos Especializados de Filtro no Banco**:
    - *CPF/CNPJ do Consumidor (`cgcEnt`)*: Localiza transações diretamente pelo documento do cliente gravado no JSON (ex.: `68886626088`);
    - *Cupom e Filial*: Busca combinada por número do cupom fiscal e código de filial da venda;
    - *Chave NFC-e / NF-e*: Filtro por chave SEFAZ de 44 dígitos (`chaveNfce` / `chaveNfe`);
    - *ID Externo ou Interno*: Busca por identificador de integração (ex.: `pdvsync-vendamensagem-...`);
    - *Últimas Transações*: Listagem dos registros mais recentes recebidos na fila de integração;
  - **Busca Direta via API REST Externa (`QaApiPayloadTab`)**: Nova aba permitindo disparar requisições HTTP (`GET` ou `POST`) diretamente para endpoints de serviços de mensageria, gateways ou microsserviços externos. Suporte a cabeçalhos customizados (tokens, Bearer, API Keys), corpo em JSON e extração flexível via JSONPath (ex.: `data.pedido`);
  - **Persistência de Preferências**: Armazenamento automático da última URL de API e headers configurados para agilizar testes subsequentes;
  - **Auto-Mapeamento de Binds em 1 Clique**: Ao carregar o payload para o teste regressivo, o Dev Manager formata o JSON e extrai automaticamente os parâmetros de bind (`:codFilial`, `:numCupom`, `:chaveNfe`, `:vlTotal`, etc.) para execução imediata das asserções;
  - **Novas Ferramentas MCP (`qa_fetch_incoming_payload` e `qa_fetch_api_payload`)**: Total do catálogo expandido para **165 ferramentas**, permitindo que assistentes de IA localizem payloads no banco ou consultem APIs externas diretamente;
  - **Sincronização nos Três Transportes**: Handlers IPC `qa:search-core-payloads` e `qa:fetch-api-payload`, rotas REST `POST /api/qa/payloads/search` e `POST /api/qa/payloads/fetch-api`, e tools MCP correspondentes.

## [1.28.2] - 2026-10-02
### Adicionado
- **Novos Templates Oficiais de Homologação no Validador Regressivo Oracle (`QaRegressionRunner`)**:
  - **Pré-Venda Balcão Omni (TV7 e TV8 — Entrega / Encomenda / Retira)**: Bateria automatizada cobrindo validação de cabeçalho (`PCPEDC` com `NUMPEDHUBE` e `NUMPEDENTFUT`), itens do TV7 (`PCPEDI` com validação de `TIPOENTREGA` 'RI'/'RP'/'EN'/'EF', status `NUMCAR Gravado` e status de desconto `PERCOM`), itens futuros do TV8, validação cadastral e de cidade do cliente (`PCCLIENT`/`PCCIDADE`) e validação da mensageria no PDVSync (`PCINTEGRACAOCORE` garantindo status de sucesso `RECEBIDO`/`RESGATADA` e alertando falhas em `DISPONIVEL`);
  - **Movimentação de Caixa — Sangria e Suprimento (PDV / ECF)**: Validação das operações financeiras de frente de caixa com verificação da fila de mensageria (`PCFILAMENSAGEMHISTORICO` com tipo `SANG`/`SUPR`), vales de caixa de ECF (`PCVALECXECF` com tipo 'A' para sangria e 'U' para suprimento) e réplica para a tesouraria/retaguarda (`PCVALECX`);
  - **Inutilização de Numeração NFC-e (SEFAZ)**: Validação do registro de inutilização fiscal na `PCINUTILIZACAONFCE` com verificação de protocolo SEFAZ autorizado (`PREENCHIDO_INUTILIZACAO = 'S'`), faixas inicial e final e justificativa;
  - **Enriquecimento da Venda PDV Fim-a-Fim**: Inclusão de novos passos no template de Venda (`wsh-venda-pdv-completa`) para conferência de baixa real no estoque (`PCLOGESTOQUE`), custos do produto (`PCMOV` com custos financeiro, contábil, reposição e real), itens ajustados por embalagem (`PCPEDI` com `QTUNIT`) e cálculo de troco / pagamentos digitais e TEF (`PCPRESTECF` com `CODBANDEIRA_AJUSTADO` e `NSU_AJUSTADO`);
  - **Inicialização Automática de Novos Templates Padrão**: Ajustado o `QaRegressionService.ensureDefaultTemplates` para inicializar automaticamente quaisquer novos templates padrão sem sobrescrever templates customizados ou duplicar arquivos já existentes.

### Alterado
- **Abertura do Hub mais rápida para quem já usa o app**: de ~5,4 s para ~2 s (animação enxuta e saída automática); quem abre pela primeira vez continua vendo a abertura completa.
- **Onboarding e tour atualizados para o menu lateral e as Integrações**: o passo "Checklist" dizia "Quatro itens" para uma lista de cinco (agora usa a contagem real), textos que falavam em "cabeçalho" agora dizem "menu lateral", o passo de IA & MCP e o final apontam para a tela Integrações, o tour guiado ganhou o passo "Integrações" e o convite dos tutoriais por tela não diz mais "Tour geral concluído" para quem pulou o tour.
- **Modularização de Templates (Regra de 300 Linhas)**: Subdivisão do catálogo de templates padrão em submódulos dedicados em `src/main/utils/qaTemplates/` (`templateVendaPdv.ts`, `templateCancelamento.ts`, `templateKitCesta.ts`, `templatePreVendaTv7Tv8.ts`, `templateMovimentacaoCaixa.ts`, `templateInutilizacaoNfce.ts`), mantendo todos os arquivos com menos de 250 linhas.

## [1.28.1] - 2026-10-02
### Adicionado
- **Exportação & Guia Prático de Templates no Validador Regressivo (`QualityPage` / `QaRegressionRunner`)**:
  - **Exportação Direta do Template Selecionado**: Botão *"Exportar Template"* adicionado na barra superior do Validador Regressivo, permitindo baixar o cenário ativo em arquivo `.json` identado (`{template-id}.json`) com 1 clique;
  - **Exportação no Editor de Templates**: Opção *"Exportar JSON"* adicionada na barra de ações de edição de templates (`QaRegressionTemplatesManager`), permitindo salvar o template em disco local antes ou depois de persistir no banco;
  - **Exportação em Lote (Backup Completo)**: Novo botão *"Exportar Todos"* na listagem geral do Gerenciador de Templates, gerando um bundle JSON com todos os cenários cadastrados para compartilhamento entre o time de QA e versionamento;
  - **Guia Didático Interativo ("Como Usar")**: Novo modal (`QaRegressionTemplatesHelpModal`) acessível tanto no Validador Regressivo quanto no Gerenciador de Templates, com 4 abas didáticas:
    - *Fluxo Passo a Passo*: Conceito dos templates e ciclo de 6 etapas desde a escolha do banco até a evidência no Jira;
    - *Tipos de Asserção*: Tabela explicativa detalhada de `JSONPath`, `Literal`, `<S>` (preenchido), `<N>` (nulo), `<0>` (zero) e `Regex` com sintaxes e exemplos de uso;
    - *Exportação & Compartilhamento*: Instruções de exportação individual, em lote e importação JSON;
    - *Exemplo de JSON*: Código canônico de template com botão de 1 clique para copiar (`Copiar JSON`);
  - **FAQ Detalhado na Central de Ajuda**: Novo tópico na Central de Ajuda (Alt+9) cobrindo criação, configuração de binds nomeados e exportação de templates;
  - **Utilitário Dedicado (`qaTemplateExportUtils`)**: Módulo puro de serialização, sanitização e download de templates com cobertura de testes unitários automatizados (`qaTemplateExportUtils.test.ts`).

## [1.28.0] - 2026-10-01
### Adicionado
- **Integração & Cockpit de Automação TAUT (Cypress E2E + Oracle + Zephyr Scale)**:
  - **Novo Painel "Automação TAUT" na Central de Qualidade (`QualityPage`)**: Cockpit visual dedicado para conectar o projeto de testes automatizados da equipe de qualidade (`TAUT-Mississauga`) com resolução automática de caminho e monitoramento do ambiente.
  - **Sincronização de Ambiente em 1 Clique (`syncEnvFromDevManager`)**:
    - Sincronização automática das credenciais da conexão Oracle ativa no Dev Manager (`USER_BD`, `PASS_BD`, `TNS_NAME`, `INSTANT_CLIENT`) diretamente para o arquivo `.env` do TAUT;
    - Parametrização dinâmica das URLs da API do WinThor Anywhere (`URL_API_WINTHOR`, `URL_API_AUTH`, `URL_API_PARAMETRO`), permitindo alternância instantânea entre as versões `v39` e legado.
  - **Disparador Inteligente por Tags Cypress (`@cypress/grep`)**:
    - Execução headless com filtragem por tags com seleção rápida de chips: Meta-tags (`@esteira`, `@critico`, `@regressao`, `@contrato`, `-@develop`) e Módulos de Negócio (`@winthor-pedido-venda`, `@winthor-tributacao`, `@winthor-financeiro`, `@winthor-fiscal`, `@winthor-logistica`, `@winthor-wms`);
    - Suporte a abertura interativa da interface gráfica do Cypress com 1 clique (`cy:open`);
    - Terminal streaming integrado com saída em tempo real e botão de abortar/cancelar seguro com encerramento de árvore de processos (`killProcessTree`).
  - **Relatório e Rastreabilidade Zephyr Scale (`COVERAGE.md`)**:
    - Mapeamento e vinculação de cenários de teste documentados em planilhas CSV (`Insumo/*.csv`) com specs Cypress (`cypress/e2e/**/*.cy.ts`) através dos identificadores de teste Zephyr (`DDWMISSI-T\d+`);
    - Painel visual com cards de métricas (Total de Cenários, Automatizados, Pendentes e Taxa de Automação), busca textual por ID, descrição ou arquivo, e filtros rápidos por status.
  - **Catálogo de Specs & Suítes Cypress**:
    - Listagem e agrupamento automático de arquivos `.cy.ts` por submódulo, contadores de testes e lista de tags declaradas nos blocos `it`/`describe`.
  - **Orquestrador de Intake CSV com IA (Subagente 0)**:
    - Leitor automático de arquivos CSV de insumo na pasta `Insumo/`;
    - Extrator inteligente de cenários e gerador de prompt estruturado e plano de implementação para acelerar a criação de novas specs Cypress com assistentes de IA seguindo o padrão do TAUT Mississauga.
  - **Novas Ferramentas no Servidor MCP (Total: 161 Ferramentas)**:
    - `taut_get_status`: Inspeciona o diretório do projeto TAUT, versão do Cypress, variáveis do `.env` e status do banco Oracle;
    - `taut_run_tests`: Dispara execução de testes Cypress (headless ou interativo) com suporte a tags do `@cypress/grep` e specs específicos;
    - `taut_get_coverage`: Analisa a cobertura de testes do Zephyr Scale cruzando arquivos de insumo CSV com specs implementadas;
    - `taut_list_specs`: Cataloga todos os arquivos de especificação `.cy.ts` com tags e contadores de testes;
    - `taut_sync_env`: Sincroniza credenciais do Oracle ativo e URLs de API do Dev Manager para o `.env` do TAUT;
    - `taut_process_csv_intake`: Lê planilhas de insumo CSV e monta prompt/plano de implementação formatado para assistentes de IA.
  - **Sincronização nos Três Transportes**:
    - **Electron IPC**: Handlers `taut:get-status`, `taut:save-path`, `taut:get-coverage`, `taut:list-specs`, `taut:sync-env`, `taut:process-intake`, `taut:run-tests`, `taut:abort-tests`;
    - **Servidor Express / REST & WebSocket**: Endpoints `/api/taut/*` e canal de streaming em tempo real `taut:chunk`;
    - **Documentação e Central de Ajuda**: Atualizada a contagem total para 161 tools MCP em `docs/MCP_TOOLS.md` e na Central de Ajuda (`HelpModulesTab`, `helpData`).

## [1.27.0] - 2026-10-01
### Adicionado
- **Runner de Testes Automatizados & Cockpit de Automação (Central de Qualidade)**:
  - **Aba "Test Runners" na Central de Qualidade (`QualityPage`)**: Nova visão com gerenciamento visual e execução de suítes de testes automatizados com terminal interativo e streaming de stdout/stderr via WebSocket/IPC.
  - **Suporte Multi-Framework / Multi-Linguagem**:
    - **Backend Java / Apache Karaf**: Execução de `mvn test` e `mvn verify` (JUnit / Mockito), com resolução de executáveis Maven (`mvnw.cmd` e `mvn`), detecção de `JAVA_HOME` e parsing nativo de relatórios Surefire/Failsafe;
    - **Testes Web End-to-End**: Integração com **Playwright** (`npx playwright test`) e **Cypress** (`npx cypress run`), com extração automática de contadores de specs e testes passados, com falha ou ignorados;
    - **Contratos e Testes de API REST**: Integração com **Newman / Postman CLI** (`npx newman run`), com parsing da tabela de asserções do Postman;
    - **Scripts Customizados**: Suporte a qualquer comando/script arbitrário definido pelo desenvolvedor ou QA.
  - **Presets Prontos de Início Rápido**:
    - Botões para adicionar com 1 clique runners pré-configurados para Maven Unit/Integration, Maven Verify com Fail-Safe, Playwright E2E, Cypress E2E e Newman API Collections.
  - **Sincronização com a Matriz de Validação**:
    - Vínculo direto de suítes de teste a um ou múltiplos cenários da Matriz de Validação;
    - Botão *Sincronizar com Matriz* que atualiza instantaneamente o status dos cenários vinculados (para *Aprovado* ou *Falhas/Bugs*) e carimba a evidência com a data, hora e contadores da execução, refletindo automaticamente no Score de Prontidão da release do PO.
  - **Histórico Persistido & Controle de Processos**:
    - Armazenamento em disco das últimas 100 execuções analíticas com filtros e visualização de saída;
    - Cancelamento seguro e imediato via botão *Abortar*, com encerramento em árvore de processos (`killProcessTree` / `taskkill /F /T`).
  - **Sincronização Completa nos Três Transportes**:
    - **Electron IPC**: Handlers `test-runner:list`, `test-runner:save`, `test-runner:delete`, `test-runner:execute`, `test-runner:abort`, `test-runner:get-history` e `test-runner:clear-history`;
    - **Servidor Express / REST**: Endpoints `/api/test-runner/list`, `/api/test-runner/save`, `/api/test-runner/execute`, `/api/test-runner/abort`, `/api/test-runner/history` e transmissão de chunks em tempo real via canal WS `test-runner:chunk`;
    - **Servidor MCP**: Novas ferramentas para assistentes de IA (`test_runner_list`, `test_runner_execute`, `test_runner_history`), totalizando **155 ferramentas**.

## [1.26.0] - 2026-10-01
### Adicionado
- **Validador Regressivo & Asserções de Banco (QA Studio / Oracle QA)**:
  - **Módulo Dedicado na Central de Qualidade (`QualityPage`)**: Nova aba *Validador Regressivo* com cockpit integrado para equipes de QA e desenvolvedores executarem baterias automatizadas de consultas SQL e validações de integridade no banco Oracle em 1 clique.
  - **Esteira de Asserções Fim-a-Fim do WinThor**:
    - Validação encadeada de todo o ciclo de vida de dados: Mensageria (`PCFILAMENSAGEMHISTORICO`), Documentos Eletrônicos (`PCDOCELETRONICO`), Cabeçalhos Fiscais e Venda (`PCNFSAID`, `PCPEDCECF`, `PCPEDC`), Dados do Consumidor (`PCVENDACONSUM`), Movimentação e Estoque (`PCMOV`, `PCPEDIECF`, `PCPEDI`), Contas a Receber / TEF (`PCPREST`, `PCPRESTECF`), Consistência de RCA / Operador x Matrícula (`PCEMPR`), Decomposição de Kits / Cestas (`PCPEDICESTA` + `PCEMBALAGEM`) e Fluxos de Cancelamento/Estorno (`PCNFCAN`, `PCNFCANITEM`).
  - **Mapeamento Inteligente por JSONPath & Regras Estritas**:
    - Suporte a extração de dados diretamente do payload JSON da API ou PDV colado na tela (`$.vlTotal`, `$.produtos[*].qt`, `$.consumidorFinal.cgcEnt`);
    - Botão *Mapear Binds* (varinha mágica) que varre o JSON e auto-preenche variáveis `:codFilial`, `:numCupom`, `:chaveNfe`, `:numPed`, etc.;
    - Avaliação de regras estritas: `<S>` (espera preenchido/not null), `<N>` (espera vazio/nulo), `<0>` (espera zero), valores literais e expressões regulares;
    - Encadeamento dinâmico de variáveis: passos anteriores podem extrair dados (ex.: `NUMTRANSVENDA`, `NUMPED`) e alimentar automaticamente os passos seguintes.
  - **Gerenciador de Cenários & Pasta Dedicada de Templates**:
    - Templates salvos em pasta dedicada (`qa-templates/`) no diretório de dados do app (ou customizável em configurações);
    - Templates padrão canônicos pré-carregados: *Venda PDV — Integração WSH Mississauga (Fim-a-Fim)*, *Cancelamento de Venda PDV* e *Venda com Kit / Cesta*;
    - Criação, edição, duplicação e exclusão visual de cenários, com editor de query SQL e regras de asserção por coluna;
    - Importação e exportação de templates em arquivos `.json` para fácil compartilhamento entre o time de QA.
  - **Exportação de Evidências em 1 Clique para Jira & Confluence**:
    - Botão *Copiar Markdown (Jira)*: Gera relatório completo com métricas de asserção, tabelas comparativas (Esperado vs Retornado no Banco), status visual (Aprovado / Divergência) e queries SQL executadas, já com o código da issue do Jira informado (ex.: `DDWMISSI-T966`);
    - Botão *Jira Table*: Gera tabela em formatação Confluence/Jira markup clássico com cores semânticas.
  - **Sincronização nos Três Transportes**:
    - **Electron IPC**: Handlers `qa:list-templates`, `qa:get-template`, `qa:save-template`, `qa:delete-template`, `qa:execute-suite` e `qa:get-templates-dir`;
    - **Servidor Express / REST (Headless & Docker)**: Endpoints `/api/qa/templates`, `/api/qa/templates/:id`, `/api/qa/execute` e `/api/qa/templates-dir`;
    - **Servidor MCP**: 3 novas ferramentas para assistentes de IA (`qa_list_templates`, `qa_get_template` e `qa_run_regression_suite`), elevando o catálogo total do cockpit para **152 ferramentas**.
### Alterado
- **Abertura do Hub mais rápida para quem já usa o app**: de ~5,4 s para ~2 s (animação enxuta e saída automática); quem abre pela primeira vez continua vendo a abertura completa.
- **Onboarding e tour atualizados para o menu lateral e as Integrações**: o passo "Checklist" dizia "Quatro itens" para uma lista de cinco (agora usa a contagem real), textos que falavam em "cabeçalho" agora dizem "menu lateral", o passo de IA & MCP e o final apontam para a tela Integrações, o tour guiado ganhou o passo "Integrações" e o convite dos tutoriais por tela não diz mais "Tour geral concluído" para quem pulou o tour.
- **Reorganização dos Menus do Header & Central de Ajuda**:
  - **Botão Dedicado da Central de Ajuda na Barra de Ações**: A Central de Ajuda (`HelpCircle`, `Alt+9`) foi movida de dentro do dropdown de desenvolvimento para um botão de acesso rápido na barra superior direita (ao lado de Configurações, Status, Tema e Atualizar), com destaque visual ativo e integração ao tour de boas-vindas (`data-tour="help"`).
  - **Estruturação dos 4 Pilares Temáticos de Navegação**:
    - **Infraestrutura**: *Ambiente Dev*, *Containers*, *Deploy*, *Logs em Tempo Real* e *APM & Traces*;
    - **Dados & Rotinas**: *Banco de Dados* e *Catálogo de Rotinas*;
    - **Desenvolvimento & DevOps**: *Git & DevOps* (`Alt+5`) e *Documentação Semântica (RAG)* (`Alt+7`);
    - **Qualidade & Homologação**: Mantido como pilar estratégico independente (`nav-qa`), abrigando a *Central de Qualidade (QA Studio)* (`Alt+Q`) e preparado para a expansão das próximas telas e suítes de teste;
    - No seletor compacto para telas menores (< md), adicionada a seção *Sistema & Suporte* com navegação direta para a Central de Ajuda e Configurações.

## [1.25.0] - 2026-10-01
### Adicionado
- **Grupos de Containers Personalizados & Inicialização em 1 Clique (Containers & Docker)**:
  - **Painel Superior de Grupos (`ContainerGroupsBar`)**: Nova barra fixa no topo da tela de Containers exibindo cartões para cada grupo salvo (ex.: *Stack Backend*, *Bancos de Dados*, *Mensageria*), com contadores de status em tempo real (ex.: <code className="font-mono text-emerald-500 font-bold">X/Y rodando</code>), semáforo visual de execução (*Rodando*, *Parcial*, *Parado*), botões de ação rápida (*Subir Grupo* com streaming de progresso e *Parar* conjunto), edição e exclusão.
  - **Modal Inteligente de Grupos (`SaveEnvironmentModal`)**: Assistente remodelado para criação e edição de grupos, permitindo buscar e selecionar livremente qualquer container detectado no Docker local ou distribuições WSL via checkboxes, reordenar a sequência de subida e definir um tempo de espera opcional (*Delay/Warm-up* em segundos) entre a subida de cada container (ideal para bancos de dados ou message brokers que exigem estabilização antes dos serviços dependentes).
- **Seleção Múltipla & Barra Flutuante de Ações em Lote**:
  - **Seleção por Checkbox nos Cards**: Cada cartão de container (`ContainerCard`) agora conta com caixa de seleção dedicada e destaque visual ao ser selecionado, além de atalho no cabeçalho para *Selecionar Todos* ou *Limpar Seleção*.
  - **Barra de Ações em Lote (`ContainerBatchBar`)**: Barra flutuante contextual no rodapé da página exibindo a quantidade de containers marcados e botões de comando em lote em 1 clique:
    - **Subir Selecionados**: Inicia todos os containers selecionados de uma vez;
    - **Parar Selecionados**: Interrompe com segurança todos os containers marcados;
    - **Reiniciar Selecionados**: Executa reinicialização sequencial rápida do lote;
    - **Criar Grupo (N)**: Transforma a seleção atual instantaneamente em um novo grupo persistido, já abrindo o modal com os slots preenchidos.
- **Parada Coordenada & Sincronização nos Três Transportes (Electron, Express e MCP)**:
  - **`DockerService.stopContainerSequence`**: Novo método central de negócio no serviço de Docker com notificações de progresso em tempo real (`onProgress`) e tratamento de erros;
  - **Transporte IPC (Desktop)**: Handlers registrados `docker:stop-sequence` e aliases `container:start-sequence` e `container:stop-sequence`, com interfaces tipadas no `preload` e no `apiBridge`;
  - **Transporte REST / Express (Headless)**: Novos endpoints `POST /api/docker/stop-sequence` e `POST /api/containers/stop-sequence`;
  - **Servidor MCP**: Novas ferramentas disponibilizadas para agentes e LLMs: `docker_stop_sequence` e `docker_start_sequence`.
- **Documentação e Central de Ajuda**:
  - Card de Containers no Guia dos Módulos (`HelpModulesTab.tsx`) atualizado com Grupos de Containers e Ações em Lote;
  - Nova pergunta no FAQ da Central de Ajuda (`HelpPage.tsx`) com passo a passo sobre a criação de grupos, warm-up e controle em lote;
  - Catálogo de Ferramentas MCP (`docs/MCP_TOOLS.md`) atualizado para o total de 149 ferramentas.

## [1.24.0] - 2026-10-01
### Adicionado
- **Expansão do Dev Manager para QA & Donos de Produto (1ª Etapa - Módulo de Qualidade)**:
  - **4º Grupo Temático no Header ("Qualidade & Homologação")**: Novo menu superior ao lado de Infraestrutura, Dados e Desenvolvimento, com acesso rápido às ferramentas de qualidade e atalho global dedicado <kbd className="font-mono text-primary font-bold">Alt+Q</kbd>.
  - **Central de Qualidade (QA Hub)**: Nova página dedicada (`QualityPage`) concebida especificamente para apoiar analistas de qualidade (QA) e Product Owners (PO) no ciclo de homologação:
    - **Matriz de Validação & Homologação**: Tabela interativa para acompanhamento ágil de cenários de teste vinculados a rotinas Delphi, serviços Karaf, APIs e fluxos E2E, com alteração rápida de status (*Pendente*, *Em Teste*, *Aprovado*, *Falha/Bug*, *Bloqueado*), inclusão de novos cenários e persistência em `localStorage`.
    - **Painel de Prontidão da Release (PO)**: Semáforo executivo com cálculo automático de prontidão (*Readiness Score* de 0 a 100%) e taxa de sucesso dos testes para orientar a decisão de subida para produção.
    - **Exportação de Relatórios de Homologação em Markdown**: Botão *Exportar Relatório* que gera um resumo executivo com métricas e tabela de validação pronto para colar no Teams, Slack, Azure DevOps ou Jira.
    - **Apoio Direto ao Teste**: Atalhos em 1 clique para inspecionar logs em tempo real na tela de Logs, consultar massa de dados no Database Studio e disparar rotinas locais para teste.
    - **Roadmap & Futuras Demandas**: Painel documentando a evolução contínua planejada para QA e POs (automação de testes E2E com runners, central de evidências assistida e geração de massa de dados com IA).
  - **Configurações de Origens de Dados de Qualidade (Zephyr, Jira, Azure DevOps)**:
    - **Nova Aba "Qualidade & QA" em Configurações**: Gerenciamento centralizado de provedores de testes com templates pré-configurados para *Zephyr Scale (Cloud v2)*, *Zephyr Squad / Jira Server*, *Jira Software (Bugs & Histórias)* e *Azure DevOps Test Plans*;
    - **Criptografia em Repouso de Segredos**: Todos os tokens de API, Zephyr Tokens e PATs são persistidos no `config.json` criptografados com **AES-256-GCM** via `ConfigService` e `secretsCrypto`, protegendo credenciais em repouso e impedindo vazamentos em texto plano;
    - **Validação & Teste de Conectividade**: Botão de teste direto no card da fonte para verificar parâmetros e status operacional antes de salvar;
    - **Vinculação com o QA Hub**: O cabeçalho da Central de Qualidade identifica a fonte de teste ativa em tempo real com indicador visual pulsante e atalho direto para alternar ou cadastrar novas integrações.
  - **Integração Global ao Cockpit**:
    - **Busca Rápida (Ctrl+K)**: Novo comando *Central de Qualidade (QA Hub)* cadastrado no Quick Launcher;
    - **Busca nas Configurações**: Novos termos indexados (*zephyr, scale, squad, jira, test plans, homologacao, token*);
    - **Tour Guiado de Boas-Vindas**: Novo passo `nav-qa` no tour de navegação;
    - **Central de Ajuda**: Módulo 11 documentado no Guia dos Módulos, card na Visão Geral, atalho `Alt + Q` na tabela de atalhos e perguntas dedicadas no FAQ sobre o QA Hub e configuração de integrações.
- **Filtro por Famílias de Versão & Seleção em Lote no Catálogo da Rotina 801**:
  - **Agrupamento Automático por Release Line**: Dropdown dinâmico no cabeçalho do catálogo que extrai e agrupa automaticamente todas as funcionalidades pelas suas famílias de versão (ex: `Versão 1.39.x`, `Versão 1.38.x`, `Versão 0.39.x`).
  - **Seleção Rápida em 1 Clique**: Botão de conveniência `+ Selecionar N da vX.X.x` exibido junto ao filtro para marcar instantaneamente todos os serviços ou rotinas da release desejada para instalação combinada.
- **Assistente de Instalação Direta & Montagem de Ambientes**:
  - **Modal "+ Instalação Direta"**: Permite aos desenvolvedores especificar manualmente qualquer nome de feature (ex.: `winthor-atualizacao-dados`, `winthor-ferramenta-servidor`), o tipo do projeto (`SERVICO` ou `ROTINA`) e a versão desejada, mesmo que não conste na lista ativa retornada pela API do catálogo.
  - **Campo de Versão Alvo (Override) em Lote**: Permite definir uma versão global na barra de ações em lote para aplicar a todos os itens selecionados de uma só vez.
  - **Override Dinâmico no Drawer de Detalhes**: Ao inspecionar uma feature individual, o desenvolvedor pode alterar a versão e acompanhar em tempo real o recálculo das coordenadas Maven e dos comandos Karaf (`feature:repo-add` e `feature:install`).
- **Pré-registro Isolado de Repositórios (`repo_add_only`) no Karaf e MCP**:
  - Nova ação no instalador do Karaf, na interface visual (botão *Registrar Repositórios* na barra de lote e *Apenas Repositório* no drawer) e na tool MCP (`routine801_install_features` com `action: 'repo_add_only'`), permitindo cadastrar os repositórios Maven no Karaf previamente sem forçar a instalação imediata das features.
- **Expansão de Ferramentas MCP & Testes da Rotina 801**:
  - Parâmetros `action` (`install` | `repo_add_only`) e `targetVersionOverride` adicionados à ferramenta `routine801_install_features`.
  - Cobertura de testes unitários em `routine801Utils.test.ts` e `Routine801Service.test.ts` para inferência Maven, famílias de versão, override de versão e execução isolada de repositório.
- **Visualização Otimizada para Queries Grandes no DB Studio**:
  - **Divisor Vertical Redimensionável (Splitter)**: O editor SQL agora pode ter sua altura ajustada livremente clicando e arrastando o divisor com o mouse (de 140px até 800px), com o tamanho preferido persistido automaticamente no navegador.
  - **Modo Maximizar / Foco (Tela Cheia do Editor)**: Botão *Maximizar / Restaurar* na barra superior do editor que expande o editor para ocupar 100% da altura da tela, permitindo navegar e editar queries SQL complexas de centenas de linhas sem espremer o conteúdo. Duplo clique no divisor também alterna o modo maximizado.
  - **Gutter com Números de Linha Sincronizado**: Coluna de números de linha à esquerda da área de código com alinhamento preciso, rolagem perfeitamente sincronizada com o texto e destaque visual da linha atual onde o cursor está posicionado.
  - **Barra de Métricas e Status do Editor**: Indicador em tempo real exibindo a posição do cursor (`Ln X, Col Y`), total de linhas e contagem de caracteres da consulta.
  - **Formatação Inteligente de SQL (Beautify / Indent)**: Botão *Formatar SQL* na barra de status que adiciona quebras de linha e indentação organizada em cláusulas principais (`SELECT`, `FROM`, `WHERE`, `AND`, `OR`, `JOIN`, `GROUP BY`, `ORDER BY`), preservando rigorosamente strings literais e comentários.
  - **Quebra Automática de Linha (Word Wrap)**: Botão comutador *Wrap: ON / OFF* para alternar entre quebra automática de linha ou rolagem horizontal contínua.
  - **Ajuste de Tamanho da Fonte (Zoom)**: Botões *A-* e *A+* para ajustar o tamanho da fonte do editor (de 10px a 18px), salvo nas preferências locais.
  - **Recolhimento da Barra Lateral de Conexões e Tabelas**: Botão de toggle no topo da sidebar que permite recolher o painel lateral para uma barra compacta de 48px, liberando mais de 240px de largura horizontal para inspecionar queries largas com múltiplos joins e colunas.
- **Suporte Abrangente a Parâmetros e Variáveis de Consulta**:
  - **Múltiplos Formatos de Variáveis**: O sistema agora detecta, gerencia e interpola:
    - Bind Variables nativas (<code className="font-mono">:VAR</code>);
    - Variáveis de substituição do Oracle / SQL*Plus / WinThor (<code className="font-mono">&amp;VAR</code> e <code className="font-mono">&amp;&amp;VAR</code>);
    - Variáveis de script e sessão (<code className="font-mono">@VAR</code>);
    - Placeholders de templates dinâmicos (<code className="font-mono">${'{VAR}'}</code> e <code className="font-mono">#{'{VAR}'}</code>).
  - **Eliminação de Erros de Sintaxe no Oracle (`ORA-00911: invalid character`)**: Consultas contendo variáveis de substituição (`&VAR`, `@VAR`, `${VAR}`) agora são interpoladas com segurança e convertidas em literais formatados antes do envio ao driver do Oracle, dispensando intervenções manuais.
  - **Painel e Modal Enriquecido de Parâmetros**:
    - Botão *Parâmetros* sempre acessível no cabeçalho do editor com badge dinâmico indicando o número de variáveis identificadas;
    - Badges visuais identificando a origem do prefixo da variável (`: Bind`, `& SQL*Plus`, `@ Script`, `${} Template`);
    - Suporte ao tipo **Lista IN** (`list`) para cláusulas como `WHERE CODCLI IN (:CLIENTES)`, formatando itens múltiplos separados por vírgula sem quebrar aspas;
    - Opção para adicionar novas variáveis manualmente pelo modal (+ Adicionar Variável Manual);
    - Opção de limpar valores em 1 clique e botão *Substituir no SQL (Inline)* para visualizar a query resolvida no editor antes de executar.
- **Suíte de Testes para Formatação e Variáveis Expandida**:
  - Criação de `sqlFormatUtils.test.ts` cobrindo formatação de SQL, preservação de literais/comentários e cálculo de métricas.
  - Expansão de `sqlBinds.test.ts` e `DatabaseService.test.ts` cobrindo extração e interpolação de `:VAR`, `&VAR`, `&&VAR`, `@VAR`, `${VAR}` e listas `IN`.

### Corrigido
- **Resolução da Falha "No matching features" na Instalação via Karaf CLI**:
  - O Dev Manager agora infere automaticamente a URL canônica padrão do WinThor no repositório Maven (`mvn:br.com.pcsist.winthor.<servico|rotina>/<nome>-features/<versao>/xml/features`) caso a API da Rotina 801 não retorne um repositório explícito.
  - O comando `feature:repo-add` passa a ser executado preventivamente antes do `feature:install`, garantindo que o catálogo de features seja indexado na JVM do Apache Karaf e impedindo o erro `Error executing command: No matching features`.
  - Detecção aprimorada de falhas no stdout do `client.bat`, alertando o desenvolvedor caso o Karaf rejeite o comando mesmo quando o script bat finalizar com código 0.

## [1.23.0] - 2026-09-30
### Alterado
- **Abertura do Hub mais rápida para quem já usa o app**: de ~5,4 s para ~2 s (animação enxuta e saída automática); quem abre pela primeira vez continua vendo a abertura completa.
- **Onboarding e tour atualizados para o menu lateral e as Integrações**: o passo "Checklist" dizia "Quatro itens" para uma lista de cinco (agora usa a contagem real), textos que falavam em "cabeçalho" agora dizem "menu lateral", o passo de IA & MCP e o final apontam para a tela Integrações, o tour guiado ganhou o passo "Integrações" e o convite dos tutoriais por tela não diz mais "Tour geral concluído" para quem pulou o tour.
- **Componentização & Decomposição Modular do Frontend**:
  - **Refatoração dos 4 Maiores Módulos Monolíticos**: Redução de mais de 82% do volume de código acumulado nos arquivos raiz das páginas e modais centrais (de 15.764 para 2.813 linhas totais), particionando e extraindo 44 novos componentes atômicos, focados e reutilizáveis:
    - **Configurações (`SettingsPage.tsx`)**: De 3.428 para 1.183 linhas (-65%), desacoplando as 9 abas de configuração (`DirsTab`, `KarafTab`, `AzureTab`, `ServicesTab`, `PortsTab`, `AutomationTab`, `LogsTab`, `BackupTab`, `AiTab`), a barra de pesquisa rápida (`SettingsSearchBar`) e o checklist de setup inicial (`SetupChecklistCard`).
    - **Contêineres Docker (`ContainersPage.tsx`)**: De 5.020 para 770 linhas (-85%), particionando 16 submódulos dedicados em `src/renderer/src/components/containers/` (cabeçalho, barra de topologia de rede, painel Docker Compose, cards de contêiner e 12 modais operacionais carregados sob demanda).
    - **Gerenciador de Bundles OSGi (`KarafBundleManagerModal.tsx`)**: De 3.984 para 598 linhas (-85%), particionando a tabela, barra de escopos, cabeçalho e modais de histórico, snapshots, diagnóstico e features em `src/renderer/src/components/karaf/`.
    - **Central de Ajuda (`HelpPage.tsx`)**: De 3.332 para 262 linhas (-92%), particionando o catálogo de dados estáticos (`helpData.tsx`), catálogo de perguntas frequentes, lista de atalhos globais, visão geral e aba sobre o sistema em `src/renderer/src/components/help/`.
  - **Performance de Renderização & Hot Reload**: O carregamento de páginas e a renderização do React tornaram-se consideravelmente mais ágeis e eficientes através do isolamento de estado local por componente e renderização condicional de modais pesados apenas quando acionados.

### Adicionado
- **Suíte de Testes Automatizados para a Central de Ajuda (`helpData.test.ts`)**:
  - Testes unitários puros co-localizados cobrindo a integridade dos dados, categorias, FAQs pesquisáveis, atalhos de teclado e URLs de download oficiais.
- **Governança Arquitetural & Memória no `AGENTS.md`**:
  - Formalização de regras estritas de tipagem do TypeScript/React 18 (`RefObject<T>` nativo), resolução de profundidade relativa de imports (`../../../../../shared/types`) e preenchimento de literais de contratos de dados em novos componentes.

### Corrigido
- **Resolução de Tipos e Contratos no TypeScript**:
  - Corrigidos caminhos relativos de importação em componentes de 3º nível em `containers/` e `settings/tabs/`.
  - Alinhada a tipagem de referências `useRef` para elementos HTML (`<pre>` e `<input>`) no React 18, eliminando incompatibilidades na prop nativa `ref`.
  - Ajustados objetos literais em `validateSinglePath` para satisfazer o contrato completo exigido por `PathStatusInfo`.
- **Preservação e Resolução de Senhas do Banco de Dados e Apache Karaf**:
  - **Injeção de ConfigService no `DatabaseService` e `BackupService`**: Os serviços de banco de dados e backup agora resolvem automaticamente as senhas criptografadas salvas em `config.json` a partir do ID da conexão ou da tupla `(host, port, user, database)` quando a senha trafega sanitizada da UI (`password: ''`), solucionando o erro `ORA-01017: invalid username/password` e falhas de autenticação ao testar conexões, listar tabelas, executar queries, rodar Explain Plan e executar backups lógicos.
  - **Indicadores de Senha Salva (`hasKarafPass` e `hasPassword`)**: Introduzidas flags booleanas retornadas na sanitização de segredos para indicar à interface se a credencial já está configurada e criptografada no sistema.
  - **Checklist de Configuração Inicial**: Corrigido o cálculo de `karaf-creds` em `computeSetupChecklistStatus` para reconhecer `hasKarafPass`, marcando a etapa como concluída quando a senha do Karaf estiver salva.
  - **Experiência Visual nos Modais (`ConnectionModal` e `KarafTab`)**: Exibição de badge informativo (`Senha salva e protegida. Deixe em branco para mantê-la ou digite para alterá-la`), placeholder especial e botão de alternância (Exibir/Ocultar com ícones Eye/EyeOff) para inspecionar a digitação de senhas.

## [1.22.0] - 2026-09-29
### Adicionado
- **Visualizador de Diff de Arquivos & Ação "Abrir na IDE" (Hub Git & Azure DevOps)**:
  - **Inspeção de Alterações Pendentes (Uncommitted Changes)**: Novo painel no repositório selecionado listando arquivos alterados com badges semânticos de status (`M` Modificado, `A` Adicionado, `D` Deletado, `?` Não rastreado, `R` Renomeado).
  - **Visualizador de Diff Integrado (`DiffModal`)**: Modal visual completo com realce de sintaxe colorido (linhas verdes para inserções, vermelhas para remoções, blocos de cabeçalho `@@` e limites de diff extenso) permitindo inspecionar o diff de um arquivo específico ou de todo o repositório em relação a `HEAD`.
  - **Ação Rápida "Abrir na IDE"**: Atalho em 1 clique presente no painel de alterações, na barra lateral do modal de diff e no cabeçalho para abrir instantaneamente o arquivo selecionado no IntelliJ IDEA ou no editor padrão configurado no sistema.
  - **Inspeção Prévia no Commit**: Lista de arquivos na janela de commit rápido tornou-se clicável, abrindo o diff do arquivo para conferência antes do envio (`git commit && git push`).
- **Criação Integrada de Branch por Tarefa (Azure DevOps & Jira)**:
  - **Modal Inteligente de Branch por Tarefa (`TaskBranchModal`)**: Criação e checkout de branches padronizadas vinculadas a itens de trabalho diretamente pelo Dev Manager.
  - **Importação por URL ou Texto com Smart Parsing**: Identificação e extração automática de IDs de tarefas e títulos a partir de URLs do Azure DevOps (`.../workitems/edit/10482`), URLs do Jira (`.../browse/SRE-1234`) ou texto livre (`SRE-1234 Ajustes no faturamento`).
  - **Busca Integrada de Tarefas via API / WIQL**: Consulta direta a tarefas no Jira (JQL) e Azure DevOps (Work Items / WIQL) usando o token configurado, com preenchimento automático de tipo (`feature/`, `bugfix/`, `hotfix/`).
  - **Gerador de Slug e Validação Git Pura**: Conversão automática do título da tarefa em slug normalizado (sem acentos nem caracteres ilegais) e validação estrita das regras de nomenclatura de branches Git (`validateBranchName`).
  - **Seleção de Branch Base**: Suporte para definir a branch base de origem (`baseBranch`, ex: `develop` ou `main`) tanto na criação local quanto no checkout.
- **Segurança & Criptografia de Credenciais**:
  - **Criptografia AES-256-GCM para Token do Azure DevOps (`azureDevOpsToken`)**: Novo campo de token pessoal (PAT) integrado ao `ConfigService`, criptografado em repouso em `.secrets.key` e sanitizado contra vazamentos em respostas REST e IPC.
- **Exposição Unificada nos Três Transportes (IPC, REST & MCP)**:
  - **IPC Electron & Preload**: Novos canais `git:open-file-in-ide`, `git:create-task-branch`, `git:fetch-tasks` e suporte a `baseBranch` em `git:checkout-branch`.
  - **Servidor Express REST**: Endpoints `POST /api/git/create-task-branch`, `POST /api/git/open-file-in-ide`, `GET /api/git/tasks` e `POST /api/git/checkout`.
  - **Servidor MCP (Model Context Protocol)**: Novas ferramentas `git_create_task_branch` e `git_list_tasks` (totalizando **145 ferramentas** no catálogo oficial) e parâmetro `baseBranch` em `git_checkout_branch`.
- **Central de Ajuda & Documentação**:
  - Atualização do card de Git & Azure DevOps no Guia dos Módulos, novo tópico dedicado no FAQ sobre visualização de diff e criação de branches por tarefa, e atualização de `docs/MCP_TOOLS.md` com prompts e documentação de 145 tools.

## [1.21.0] - 2026-09-29
### Adicionado
- **Statement Tracer: Captura de Parâmetros (Binds) e Interpolação SQL Executável**:
  - **Captura Nativa de Variáveis Bind (`v$sql_bind_capture`)**: Inspeção automática e sob demanda dos parâmetros passados nas execuções de queries no banco Oracle, trazendo posição (`:1`, `:NOME`, `?`), tipo de dado (VARCHAR2, NUMBER, DATE, TIMESTAMP), nome e valor capturado real sem depender de logs nem de ferramentas externas como *Statement Tracer for Oracle* (`OraTracer.exe`).
  - **Eliminação de `log:set trace root` no Apache Karaf**: Permite que desenvolvedores depurem rotinas Delphi do WinThor e serviços Java/OSGi inspecionando queries parametrizadas diretamente no cursor cache do Oracle, evitando ligar o modo `TRACE` que satura arquivos de log (`karaf.log`), esgota I/O de disco e degrada a performance da JVM.
  - **Motor Puro de Interpolação de SQL (`oracleSqlInterpolator`)**: Mecanismo inteligente e isolado para substituição dos marcadores de bind pelos literais correspondentes formatados (strings com escape de aspas simples, números, datas com `TO_DATE` / `TO_TIMESTAMP` e `NULL`), preservando literais de texto existentes, blocos de comentários (`--` e `/* */`) e operadores de atribuição/cast (`:=`, `::`).
  - **Inspetor Dedicado no DB Studio (`StatementInspector`)**:
    - **Visualização Integrada e Gaveta de Detalhes**: Painel integrado ao Statement Tracer com contadores visuais de parâmetros e cursor child na tabela.
    - **Tabela de Parâmetros**: Visualização clara de cada variável bind com badges coloridos de tipo de dado.
    - **SQL Executável em 1 Clique**: Exibição da instrução final pronta para rodar com botões *"Copiar SQL"* e *"Usar no Editor"* (que transfere a query já interpolada direto para a aba de execução SQL do Database Studio).
- **Exposição Unificada nos Três Transportes (IPC, REST & MCP)**:
  - **IPC Electron & Preload**: Novo canal `db:get-oracle-statement-binds` tipado no `electronAPI` (`apiBridge.getOracleStatementBinds`).
  - **Servidor Express REST**: Endpoint `POST /api/db/oracle-statement-binds` aceitando conexão, `sqlId` e instrução SQL bruta com fallback seguro.
  - **Servidor MCP (Model Context Protocol)**: Nova ferramenta `db_get_oracle_statement_binds` (totalizando **143 ferramentas** no catálogo oficial) permitindo a agentes de IA inspecionar os parâmetros passados em qualquer query Oracle recente.
- **Central de Ajuda & Documentação**:
  - Atualização do card de Banco de Dados no Guia dos Módulos, novo tópico dedicado no FAQ explicando como inspecionar binds e evitar `log:set trace root`, e atualização do catálogo `docs/MCP_TOOLS.md` com prompts de exemplo.

## [1.20.0] - 2026-09-29
### Adicionado
- **Visualização em Gráfico Waterfall e Régua de Tempo Semântica (APM & Observabilidade)**:
  - **Régua de Tempo Visual Multi-Camada (Time Budget)**: Decomposição analítica e gráfica do tempo total de execução de cada trace dividindo proporcionalmente entre **🌐 Requisição HTTP** (I/O de rede e filtros de despacho), **☕ Processamento Java** (regras de negócio e serviços OSGi no Apache Karaf) e **🗄️ Queries JDBC** (consultas e comandos SQL no banco Oracle/PostgreSQL).
  - **Filtros e Chips Interativos por Camada**: Botões na régua de tempo para inspecionar e isolar instantaneamente spans de HTTP, Java ou JDBC, com opacidade dinâmica nos nós secundários preservando a árvore hierárquica.
  - **Modo Tela Cheia no Traces Explorer**: Botão de alternância entre painel lateral deslizante (*Split Drawer*) e modal expandido de alta resolução para inspeção aprofundada de traces complexos com muitos spans aninhados.
  - **Identificação Visual de Gargalos**: Destaque automático no Time Budget para detecção imediata do componente causador de maior latência (Gargalo no Banco vs Gargalo em Java vs Rede/HTTP) com atalho direto para a aba de Queries SQL.
  - **Destaque e Tags de Chamadas Lentas no Waterfall**: Spans e consultas demoradas (&gt;= 300ms) recebem automaticamente o badge `⚡ Lenta` com coloração semântica diferenciada na barra de duração.
- **Detecção Automática de Consultas e Endpoints Lentos (OTLP)**:
  - **Menu e Painel Rápido "Top Lentos"**: Popover dedicado na barra de ferramentas do Traces Explorer consolidando contadores de traces lentos (&gt;400ms), traces críticos (&gt;1s) e traces com queries de banco, com atalhos em 1 clique para filtrar os endpoints e queries mais demorados capturados pelo receptor OTLP.
  - **Novos Presets de Filtro Rápido**: Adicionados os presets `🐢 Lentos`, `🗄️ Queries Lentas` e `🌐 Endpoints Lentos` na barra de ferramentas.
  - **Alternador de Ordenação Rápida**: Botão para alternar entre ordenação por horário mais recente (`Mais Recentes`) e ordenação por latência decrescente (`Mais Lentos`).
  - **Ranking de Latência no Dashboard**: No Dashboard de APM, adicionada alternância entre *Mais Solicitados (Volume)* e *Mais Lentos (p95)* na lista de endpoints, além de botão *Filtrar* direto nos cards de queries mais lentas.
- **Exposição Unificada nos Três Transportes**:
  - Filtros `sortBy` ('time' | 'duration') e `slowOnly` suportados no serviço de APM (`ApmService`), nos canais IPC, nos endpoints REST (`GET /api/apm/traces`) e na ferramenta MCP `apm_get_traces`.

## [1.19.0] - 2026-09-29
### Adicionado
- **Monitor de Memória Heap e Non-Heap da JVM (JMX / Karaf)**:
  - **Telemetria em Tempo Real com Curva Visual**: Novo modal interativo (`KarafJvmMemoryModal`) com gráfico SVG contínuo mostrando a evolução temporal do consumo de memória Heap e Non-Heap (Metaspace/CodeCache), com contagem de threads ativas, classes carregadas e tempo de atividade (Uptime) da JVM.
  - **Detecção e Alertas de OutOfMemoryError (OOM)**: Alertas visuais multinível (`NORMAL`, `WARNING` a partir de 70% e `CRITICAL` a partir de 85% com flag `isNearOom`), avisando com antecedência riscos de esgotamento de memória no Apache Karaf.
  - **Disparo de Garbage Collection (GC) em 1 Clique**: Ação direta na interface para forçar a execução imediata do GC na JVM via JMX (`java.lang:type=Memory`) ou comando nativo do Karaf, com feedback visual em tempo real.
- **Log Analyzer & Destaque de Exceções Críticas WinThor**:
  - **Parser Contínuo de Exceções**: Mecanismo de análise e destaque visual em tempo real de falhas críticas do ecossistema WinThor e OSGi, cobrindo `ORA-XXXXX` (catálogo integrado de 11+ códigos de erro Oracle com explicações em português), `NullPointerException`, `BundleException` / falhas de resolução OSGi, `OutOfMemoryError`, `ClassNotFoundException` e falhas de conexão de rede.
  - **Badges Clicáveis e Gaveta de Diagnósticos (`LogExceptionAnalyzerDrawer`)**: Exibição de pílulas com códigos de erro diretamente nas linhas do console de log com navegação em 1 clique para a linha afetada, filtros por categoria de falha e sugestões imediatas de comandos de diagnóstico com botão de cópia rápida.
- **Gerenciador de Features Maven e Repositórios Karaf**:
  - **Aba Interativa de Features e Repositórios (`KarafFeaturesManagerModal`)**: Interface dedicada com duas abas operacionais acessível a partir da página de Deploy:
    - **Features Karaf**: Lista completa de features OSGi com filtros rápidos (Todas, Apenas Instaladas, Apenas WinThor), busca instantânea por nome ou repositório e instalação/desinstalação em 1 clique.
    - **Repositórios Maven**: Visualização de todos os repositórios registrados (`feature:repo-list`), identificação visual de repositórios WinThor, atualização em 1 clique (`feature:repo-refresh`), remoção segura e formulário com template para adicionar novas URLs Maven (`mvn:groupId/artifactId/version/xml/features`).
- **Exposição Unificada nos Três Transportes (IPC, REST & MCP)**:
  - **IPC Electron & Preload**: Novos canais `karaf:get-jvm-memory`, `karaf:trigger-gc`, `karaf:list-feature-repos`, `karaf:add-feature-repo`, `karaf:remove-feature-repo`, `karaf:refresh-feature-repo`, `karaf:list-all-features` e `karaf:analyze-log`.
  - **Servidor Express REST**: Endpoints `/api/karaf/jvm-memory`, `/api/karaf/gc`, `/api/karaf/feature-repos*`, `/api/karaf/features*` e `/api/karaf/analyze-log`.
  - **Servidor MCP (Model Context Protocol)**: 8 novas ferramentas registradas para agentes de IA (totalizando **142 ferramentas**): `karaf_get_jvm_memory`, `karaf_trigger_gc`, `karaf_list_feature_repos`, `karaf_add_feature_repo`, `karaf_remove_feature_repo`, `karaf_refresh_feature_repo`, `karaf_list_all_features` e `karaf_analyze_log`.
- **Central de Ajuda & Documentação**:
  - Documentação completa no Guia dos Módulos (Perfis de Deploy e Logs), novos tópicos no FAQ cobrindo telemetria JVM, alertas de OOM e resolução de erros ORA, e catálogo de ferramentas em `docs/MCP_TOOLS.md` atualizado para 142 tools.

## [1.18.0] - 2026-09-29
### Adicionado
- **Gerenciador de Rollback de Rotinas (.bak) com Reversibilidade Segura**:
  - **Histórico Completo de Versões**: Nova aba dedicada *"Histórico & Rollback"* e botão direto de rollback (<RotateCcw />) em cada card de rotina, listando todos os backups `.bak` existentes no disco com carimbo de data/hora legível, tamanho formatado e versão do executável.
  - **Restauração em 1 Clique com Proteção Preventiva**: Botão de restauração rápida que substitui o executável ativo pela versão de backup escolhida, gerando automaticamente uma cópia de segurança prévia (`_pre_rollback.bak`) antes de sobrescrever o arquivo ativo, impedindo regressões acidentais.
  - **Exclusão de Backups Obsoletos**: Possibilidade de remover arquivos `.bak` antigos diretamente pela interface gráfica, liberando espaço em disco.
- **Leitura de Versão do Executável (PE Header / FileVersion)**:
  - **Parser PE Nativo de Baixo Custo de I/O**: Implementado leitor de cabeçalho Portable Executable (PE Header / `.rsrc`) em TypeScript puro (`peVersionUtils.ts`), capaz de localizar e parsear a estrutura binária `VS_FIXEDFILEINFO` e blocos `StringFileInfo` UTF-16LE via seek direto no descritor de arquivo sem ler binários inteiros de 50MB-100MB em memória.
  - **Exibição Visual de Versão nos Cards**: Cada rotina no catálogo agora exibe automaticamente um badge verde com a sua `FileVersion` real gravada no binário (ex.: `v30.0.12`), com tooltip detalhando `ProductVersion`, permitindo conferir a versão homologada em disco e compará-la com a Central de Controle (CCW).
- **Download em Lote de Rotinas (Batch Download)**:
  - **Atualização Massiva em 1 Clique**: Nova aba e atalho no cabeçalho *"Atualização em Lote"* para atualizar simultaneamente todas as rotinas marcadas como Favoritas, todas as rotinas de um módulo funcional específico (ex.: `MOD-001`) ou uma lista livre de códigos.
  - **Monitoramento em Tempo Real**: Barra de progresso visual percentual e lista interativa exibindo o status individual de cada rotina (Pendente, Baixando com animação, Concluída ou Falha).
  - **Relatório Consolidado**: Resumo ao final com contagem de sucessos, falhas e duração total da operação.
- **Exposição Completa nos Três Transportes (IPC, REST & MCP)**:
  - **IPC Electron & Preload**: Handlers `routines:list-backups`, `routines:restore-backup`, `routines:delete-backup`, `routines:get-version` e `routines:batch-download`, com tipagem estrita no `electronAPI` e suporte a streaming de progresso.
  - **Servidor Express REST**: Endpoints `GET /api/routines/backups`, `POST /api/routines/restore-backup`, `DELETE /api/routines/backup`, `GET /api/routines/version-info` e `POST /api/routines/batch-download`.
  - **Servidor MCP (Model Context Protocol)**: 5 novas ferramentas expostas a agentes de IA (totalizando **134 tools**):
    - `routines_list_backups`: Lista backups de uma rotina com data, tamanho e versão extraída.
    - `routines_restore_backup`: Restaura um `.bak` criando preventivamente `_pre_rollback.bak`.
    - `routines_delete_backup`: Remove um arquivo `.bak` do disco.
    - `routines_get_executable_version`: Inspeciona o cabeçalho PE de qualquer `.EXE` no disco.
    - `routines_batch_download`: Orquestra downloads em lote com retorno consolidado via helper `collect()`.
- **Central de Ajuda & Documentação**:
  - Novo item de FAQ cobrindo rollback, leitura de versão PE e atualização em lote.
  - Atualização do Guia de Módulos (Catálogo de Rotinas) e da contagem oficial no catálogo `docs/MCP_TOOLS.md` (134 ferramentas).

## [1.17.0] - 2026-09-29
### Adicionado
- **Integração com a Central de Controle WinThor (CCW) & Atualização Automatizada de Rotinas**:
  - **Download Direto da Nuvem para o Ambiente Local**: Integração direta com a Central de Controle de Rotinas da PC Sistemas / TOTVS (`https://centraldecontrole.pcinformatica.com.br`). Permite baixar rotinas oficiais pelo seu código numérico (ex.: `132`, `316`, `530`) ou nome do executável e versão WinThor (padrão `30`).
  - **Extração e Descompactação Automática de ZIPs**: Tratamento transparente tanto para downloads que entregam executáveis binários `.EXE` diretos quanto para pacotes compactados `.ZIP`, utilizando parser puro em TypeScript (`zlib.inflateRawSync`) compatível com ambientes corporativos restritos.
  - **Backup Preventivo Automático (`.bak`)**: Antes de substituir qualquer executável existente na pasta do módulo em `C:\Winthor\Prod` (ex.: `MOD-001\PCSIS101.EXE`), o Dev Manager gera automaticamente uma cópia de segurança renomeada com carimbo de data e hora (ex.: `PCSIS101.EXE.20260929_120000.bak`), prevenindo regressões acidentais.
  - **Instalador de Arquivos Locais**: Aba para selecionar executáveis (`.exe`) ou pacotes compactados (`.zip`) baixados manualmente no disco e instalá-los diretamente no diretório do módulo WinThor com criação preventiva de backup.
  - **Árvore de Rotinas CCW**: Navegação completa pela árvore oficial de módulos e rotinas disponibilizada pela PC Sistemas (com suporte a cookie de autenticação `suukie` em repouso seguro com AES-256-GCM).
  - **Modal Interativo na Interface (`CcwRoutineModal`)**:
    - Botão destacado no cabeçalho da página de Rotinas: *"Atualizar Rotina (CCW)"*.
    - Botão de atualização rápida no cartão de cada rotina do catálogo, preenchendo automaticamente o código e versão.
    - Recarregamento automático do catálogo local após cada download ou instalação.
  - **Configurações Centralizadas**:
    - Novos campos nas Configurações (Aba Geral / Diretórios): URL Base da CCW, Versão WinThor padrão e Cookie de Sessão opcional.
  - **Exposição Multi-Transporte (REST & MCP)**:
    - Rotas Express REST: `POST /api/routines/download-ccw`, `POST /api/routines/install-local`, `GET /api/routines/ccw-catalog`, `GET /api/routines/ccw-download-url`.
    - 4 novas ferramentas no Servidor MCP (totalizando 129 tools): `routines_download_ccw_routine`, `routines_install_local_file`, `routines_get_ccw_catalog` e `routines_get_ccw_download_link`.
- **Central de Ajuda & Documentação**:
  - Novo item de FAQ sobre download e atualização de rotinas da CCW com backup preventivo.
  - Atualização do Guia de Módulos (Catálogo de Rotinas) e visão geral do ecossistema.
  - Atualização do catálogo oficial de ferramentas em `docs/MCP_TOOLS.md` para 129 ferramentas com exemplos práticos.

## [1.16.0] - 2026-09-28
### Adicionado
- **Diagnóstico Inteligente de Dependências OSGi & Ações Rápidas em 1 Clique**:
  - **Parser Causal de Exceções de Resolução (`karafResolutionParser`)**: Extração profunda de erros `ResolutionException`, `Unable to resolve root` e `missing requirement` emitidos pelo Apache Karaf e Pax URL. O parser percorre a cadeia causal (`caused by:`), identifica o bundle impactado, o tipo de requisito (`osgi.wiring.package`, `osgi.identity`, `bundle`, etc.), o nome do pacote ou classe ausente e analisa filtros LDAP (ex.: `(&(osgi.wiring.package=...)(version>=1.39.0)(!(version>=2.0.0)))`) para extrair restrições de versão mínima, máxima ou intervalos.
  - **Correlação Automática com o `pom.xml`**: O Dev Manager inspeciona o `pom.xml` do projeto em compilação/deploy, correlaciona o pacote ausente com a lista de `<dependency>` do Maven (ignorando blocos comentados) e aponta com exatidão o `groupId`, `artifactId` e a versão esperada.
  - **Card Interativo de Ação Rápida no Console de Deploy**: Ao ocorrer falha de dependência, a interface de Deploy exibe um card destacado acima do terminal detalhando o pacote ausente, faixa de versão e opções imediatas com 1 clique:
    - **Executar Perfil de Deploy da Dependência**: Se houver um perfil ou projeto cadastrado correspondente (ex.: perfil `matcon`), permite executá-lo diretamente para compilar e instalar a versão local necessária no Karaf.
    - **Instalar Release do Nexus**: Dispara os comandos oficiais do Karaf (`feature:repo-add` e `feature:install`) para obter a release remota do repositório Maven.
    - **Verificar Bundles no Karaf**: Executa `bundle:diag` ou comando de diagnóstico de fiação para investigar bundles com falha de ativação.
  - **Diagnóstico no Console de Logs**: Banner formatado com o resumo da falha, módulo POM mapeado e comandos sugeridos injetado no stream de logs (`deploy:log-chunk`).
- **Central de Ajuda**:
  - Novo item de FAQ e atualização do Guia de Módulos cobrindo diagnósticos de resolução OSGi, pacotes ausentes e opções de recuperação em 1 clique.

### Corrigido
- **Timeouts Silenciosos em Resolução de Dependências Maven/Karaf**:
  - Prevenção de timeouts indeterminados causados por dependências ausentes tentando conexões remotas; agora a causa raiz é diagnosticada e apresentada com clareza ao desenvolvedor.

## [1.15.4] - 2026-09-25
### Corrigido
- **Catálogo de Rotinas & Execução de Processos (Eliminação do erro `spawn EFTYPE`)**:
  - **Lançamento Seguro de Processos (`launchProcessSafely`)**: No Windows, disparar executáveis via `child_process.spawn()` sem shell invoca `CreateProcessW` diretamente. Quando o executável requer elevação de privilégios UAC (Administrador), está sob lock de antivírus ou é um script/atalho, o sistema operacional retorna `ERROR_BAD_EXE_FORMAT` (193), traduzido pelo libuv como `spawn EFTYPE`. Criado o utilitário central `launchProcessSafely` em `src/main/utils/routineLaunchUtils.ts`, que no Windows delega a execução ao Shell (`cmd.exe /c start "<título>" /d "<diretório>" "<executável>" [args...]`), preservando o diretório de trabalho (`cwd`) essencial para o carregamento de DLLs e arquivos INI das rotinas Delphi compiladas e tratando elevações UAC transparentemente.
  - **Eliminação de Falso Fallback Concorrente no WinThor Start**: Quando o WinThor Start demorava mais de 3.000ms na inicialização a frio, o `launchViaWinthorStart` tratava a demora prematuramente como `winthorStartOffline: true` e imediatamente tentava fazer fallback para execução direta via `spawn()`. Essa concorrência instantânea com o WinThor Start ativo causava contenção de arquivos e disparava o erro `spawn EFTYPE`, enquanto o WinThor Start completava a abertura em segundo plano (fazendo a rotina abrir apenas no segundo clique). O tempo limite de requisição ao WinThor Start foi ampliado de 3s para 8s, e expirações (`WINTHOR_START_TIMEOUT`) ou erros da API do serviço (`WINTHOR_START_ERROR`) não mais disparam o fallback concorrente às cegas.
  - **Reconhecimento Estendido de Prefixos de Rotinas**: O extrator de códigos de rotinas (`extractRoutineCode`) agora reconhece prefixos de nomenclatura oficiais do ecossistema WinThor como `PC` (ex.: `PC1406.EXE`), `PCINF` (ex.: `PCINF000.EXE`), `PCROT` e `ROTINA`, além de `PCSIS` e `ROT`.
  - **Correção no Ciclo de Renovação de Token WTA**: Ao renovar o token expirado com sucesso após um retorno HTTP 401, o sinalizador `isAuthRejected` agora é resetado apropriadamente, assegurando que tentativas seguintes com o novo token não sejam bloqueadas.
  - **Resiliência em Aplicativos Externos e IDE**: O `WindowsService` (`launchIntelliJ` e `launchExternalApp`) também foi migrado para o `launchProcessSafely`, garantindo inicialização imune a falhas de `EFTYPE` ao disparar editores ou ferramentas terceiras.

### Adicionado
- **Ação de Contingência com 1 Clique na Interface de Rotinas**:
  - Quando o WinThor Start apresentar indisponibilidade, timeout de resposta ou recusa de credencial, o banner de alerta no Catálogo de Rotinas exibe imediatamente o botão interativo **"Tentar abrir direto (sem autenticação)"**, permitindo ao desenvolvedor abrir a rotina localmente de forma isolada sem precisar esperar ou desligar a integração nas configurações.
- **Central de Ajuda**:
  - Nova pergunta detalhada no FAQ da Central de Ajuda sobre a resolução do erro `spawn EFTYPE`, o papel do diretório de trabalho (`cwd`), a prevenção de concorrência com o WinThor Start e o funcionamento do inicializador seguro.

## [1.15.3] - 2026-09-25
### Corrigido
- **Catálogo Oficial WinThor / Rotina 801 & Karaf CLI (Timeouts e Isolamento de JVM)**:
  - **Eliminação de Timeout Prematuro (30s) em Comandos Pesados**: O `executeKarafCommand` possuía um tempo limite fixo e curto de 30.000ms (30s), insuficiente para comandos pesados como `feature:install`, `feature:repo-add` e `bundle:install` que realizam download de artefatos Maven remotos (Nexus/Artifactory) e resolução de pacotes OSGi. Comandos pesados agora contam automaticamente com até 300.000ms (5 minutos) de tolerância (e 180s para adição de repositórios), além de permitir especificação dinâmica de tempo limite por chamada.
  - **Isolamento do Agente OpenTelemetry no `client.bat`**: Corrigida injeção indevida do `opentelemetry-javaagent.jar` via `JAVA_TOOL_OPTIONS` nas ferramentas CLI (`client.bat`). O agente de APM destina-se exclusivamente ao container Karaf (`winthor.bat` / `karaf.bat debug`). Ao ser carregado no `client.bat`, ele introduzia sobrecarga de inicialização na JVM, hooks de rede e emitia logs informativos no `stderr` (`[otel.javaagent ...] INFO io.opentelemetry...`), que eram erroneamente capturados como avisos e falhas na interface.
  - **Sanitização de Ruídos de Stderr**: Criação da função `filterBenignStderr` no `KarafService` para descartar linhas de ruído benignas da JVM e do Karaf (`Picked up JAVA_TOOL_OPTIONS`, `client.bat: Ignoring predefined value for KARAF_HOME`, logs informativos do Otel), assegurando que apenas erros e exceções legítimas do container OSGi sejam reportados.
  - **Fechamento Automático de Stdin em Processos Batch**: O utilitário `runCapturedProcess` agora encerra imediatamente o stream de `stdin` (`proc.stdin?.end()`) para processos não interativos, prevenindo que ferramentas CLI ou shells fiquem bloqueados indefinidamente aguardando entrada do teclado.
  - **Aumento de Timeout na API da Ferramenta Servidor**: O timeout da requisição HTTP no modo API da Rotina 801 (`/winthor/ferramenta/servidor/v1/sistema/instala-com-dependencias`) foi ampliado de 60s para 180s (3 minutos) para acomodar instalações volumosas no servidor.
- **Tipagem Preload e Integridade do Build**:
  - Declarada a assinatura de `isKarafRunning: (sshPort?: number) => Promise<boolean>` na interface `ElectronAPI` (`electronAPI.d.ts`), eliminando inconsistências de tipagem TypeScript no `apiBridge.ts` e na página de Deploy.
- **Validação de Executável Karaf (`client.bat`)**:
  - Em `executeKarafCommand`, a validação de existência do executável do cliente Karaf no disco agora é executada antes do teste de conectividade da porta SSH, emitindo diagnóstico imediato e preciso caso o caminho esteja incorreto ou o arquivo não exista.
- **Detecção de Conexões Recusadas e Rede**:
  - Refatorado o utilitário `isConnectionRefusedError` em `routineLaunchUtils.ts` para inspecionar apenas propriedades reais do erro (`message`, `code`, `name` e `cause`), removendo a leitura direta de `err.stack` e evitando falsos-positivos com identificadores internos de runners de teste (`runWithTimeout`).
- **Testes Unitários & Central de Ajuda**:
  - Ajustados os mocks de `isKarafRunning` e `getKarafClientExecutable` nas suítes de testes (`Routine801Service.test.ts` e `KarafService.test.ts`).
  - Sincronizados todos os fallbacks de versão para `1.15.3` na Central de Ajuda (`HelpPage.tsx`) e no servidor MCP (`src/mcp/index.ts`).

### Adicionado
- **Seletor de Modo de Instalação na Rotina 801**:
  - Novo controle interativo no cabeçalho do Catálogo Oficial permitindo alternar com 1 clique entre o modo **Console Karaf** (execução via `client.bat` com telemetria em tempo real no console) e **API WTA** (disparo direto pelo endpoint REST da ferramenta servidor), proporcionando uma alternativa imediata e resiliente caso qualquer dos métodos encontre restrições locais.
- **Central de Ajuda**:
  - Seção do FAQ sobre a Rotina 801 atualizada com instruções sobre os modos de instalação, download de pacotes Maven pesados e timeouts estendidos.

## [1.15.2] - 2026-09-25
### Corrigido
- **Perfis de Deploy & Karaf CLI (Prevenção de Falsos Positivos)**:
  - **Detecção de Sessão Falha (`client.bat`)**: Corrigida falha crítica onde o `client.bat` no Windows retornava exit code `0` com a mensagem `"Failed to get the session."` quando o Karaf estava offline, fazendo com que o pipeline de deploy registrasse falsos sucessos (`"PERFIL EXECUTADO COM SUCESSO!"`). O parser de erros do `KarafService` agora reconhece adequadamente mensagens de falha de conexão SSH (`Failed to get the session`, `Connection refused`, `ConnectException`, `Session is closed`), sinalizando o erro real e emitindo dicas de diagnóstico para o desenvolvedor.
  - **Validação Prévia do Container OSGi**: Implementada checagem antecipada de disponibilidade do Apache Karaf (porta SSH 8101) em `DeployService.executeProfile`. Caso o perfil contenha etapas Karaf (`karaf-command`, `karaf-bundle`) e não inclua uma etapa de inicialização prévia, a execução é interrompida imediatamente antes do primeiro passo, evitando esperas de 60s+ em compilações Maven inúteis (`mvn clean install`).
  - **Proteção em `deploy` e `buildAndDeployMaven`**: Adicionada verificação prévia de status do Karaf também nos deploys diretos e nas instalações de features da Rotina 801 (`karaf_cli`).

### Adicionado
- **Serviço Central e Transportes (`isKarafRunning`)**:
  - Nova checagem `isKarafRunning` exposta no processo principal Electron (`karaf:is-running`), no preload (`window.electronAPI.isKarafRunning`), na API Web/Docker (`GET /api/karaf/status`) e no MCP (`karaf_is_running`), unificando o diagnóstico de conectividade SSH local.
- **Interface de Deploy**:
  - Banner contextual de alerta na tela de Deploy avisando quando o perfil ativo requer o Karaf mas o container OSGi se encontra offline, acompanhado de botão de ação rápida para iniciar o Karaf Embutido em modo debug diretamente da tela.
- **Documentação e Central de Ajuda**:
  - Nova pergunta no FAQ da Central de Ajuda detalhando o comportamento do `client.bat`, a importância da porta SSH e como resolver falhas de sessão.
  - Atualização do catálogo de ferramentas MCP (`docs/MCP_TOOLS.md`) para 125 ferramentas com a inclusão de `karaf_is_running`.

## [1.15.1] - 2026-09-24
### Corrigido
- **Rotina 801 (Catálogo Oficial do WinThor - Porta 8889)**:
  - **Resolução IPv4/IPv6 (Happy Eyeballs)**: Corrigida falha de comunicação falso-positiva onde a aplicação reportava que `http://localhost:8889` não estava respondendo (apesar da porta responder normalmente no navegador e cURL). No Windows com Node.js 18+, o `localhost` resolve primariamente para IPv6 (`::1`), enquanto a JVM do Apache Karaf/Jetty escuta apenas na pilha IPv4 (`127.0.0.1`). O utilitário central `httpRequest` agora adota o algoritmo Happy Eyeballs (RFC 8305) com `autoSelectFamily: true`, timeout de 250ms e fallback transparente e imediato para `127.0.0.1` em caso de recusa de conexão.
  - **Autenticação e Renovação Automática WTA**: Implementado envio dinâmico de credenciais de sessão (`suukie` cookie e header `Authorization: Bearer <token>`). Caso o catálogo responda com HTTP 401/403 (sessão expirada ou protegida), o serviço autentica automaticamente via `POST /winthor/autenticacao/v1/login` utilizando as credenciais salvas e repete a requisição de forma transparente.
  - **Diagnóstico Real de Erros na UI**: Substituído o banner fixo genérico de indisponibilidade pela exibição do motivo real retornado pela API (`reason`), prevenindo falsos diagnósticos de rede quando o servidor recusa autenticação ou o bundle não está instalado.
  - **Drawer de Conexão com Alternância Rápida**: Adicionados botões de atalho no modal para alternar instantaneamente a URL entre `http://localhost:8889` e `http://127.0.0.1:8889`.
  - **Sincronização de Inicialização**: Eliminada condição de corrida na montagem do modal, garantindo o carregamento prévio das configurações de autenticação antes da consulta ao catálogo.

### Adicionado
- **Central de Ajuda (FAQ)**: Incluído tópico de troubleshooting detalhado sobre a porta 8889 e a convivência entre pilhas IPv4/IPv6 no Karaf sob Windows, orientando como testar o endpoint e alternar para `127.0.0.1` caso a resolução de nomes local esteja instável.

## [1.16.0] - 2026-09-25
### Adicionado
- Pasta do release mais completa: o `npm run build:electron` passa a gerar também `LEIA-ME.txt` (instalação, links dos downloads opcionais e registro do MCP, com a versão preenchida), `instalar-extras.cmd` (instala o modelo do RAG e extrai o Oracle Instant Client colocados na pasta) e `mcp/`, um servidor MCP autossuficiente que roda com o próprio `Dev Manager.exe` instalado, sem Node.js nem código-fonte. Novos scripts `npm run build:mcp` e `npm run release:folder`.
- Central de Ajuda: FAQ "O que preciso baixar à parte?" com links do Oracle Instant Client, Visual C++ Redistributable, modelo do RAG e Ollama; o FAQ do MCP ganha o passo a passo para quem usa o app instalado.
- **APM & Traces**: nome do serviço reportado pelo Java Agent (`otel.service.name`) configurável pela UI (`settings.apmServiceName`, tela Como Conectar), com fallback genérico `karaf-app` no lugar do nome fixo `karaf-winthor`. O anexo automático do agente ao Karaf passa a ser opt-in via o toggle "Anexar o agente automaticamente" (`settings.apmInstrumentationEnabled`, desligado por padrão) — antes bastava o `opentelemetry-javaagent.jar` existir em `<karaf>/bin` para ser anexado sempre, poluindo o log do Karaf mesmo com ninguém olhando o APM.
- **Database Studio**: grade de resultados editável no estilo planilha quando o resultado vem de um `SELECT * FROM <tabela única>` (ex.: clique numa tabela na sidebar) — botão "Nova linha", duplo-clique para editar célula (com `[NULL]` para gravar nulo) e exclusão de linha pelo menu de contexto. `DatabaseService` ganha `insertRow`/`updateRow`/`deleteRow` (binds posicionais, validação de tabela/colunas como identificadores SQL, `UPDATE`/`DELETE` sem `WHERE` bloqueado por segurança), expostos nos três transportes sem duplicar lógica de negócio.
- Configurações: busca rápida entre as abas que realça o campo encontrado, toggle de exibir/ocultar nas credenciais WTA (senha e cookie de sessão, mesmo padrão já usado na senha do Karaf) e indicador de alterações não salvas (badge ao lado do botão Salvar + aviso ao tentar fechar a janela com edições pendentes).
- Banco de Dados: aviso de primeiro uso quando não há nenhuma conexão cadastrada, com atalho direto para criar uma ou abrir Configurações.
- Central de Ajuda: botão "Rever Tours das Telas" reativa os tours individuais de cada módulo (Banco, Rotinas, Deploy, Containers, Git...), que antes ficavam perdidos para sempre depois da escolha inicial de pular no modal de onboarding.
### Alterado
- **Abertura do Hub mais rápida para quem já usa o app**: de ~5,4 s para ~2 s (animação enxuta e saída automática); quem abre pela primeira vez continua vendo a abertura completa.
- **Onboarding e tour atualizados para o menu lateral e as Integrações**: o passo "Checklist" dizia "Quatro itens" para uma lista de cinco (agora usa a contagem real), textos que falavam em "cabeçalho" agora dizem "menu lateral", o passo de IA & MCP e o final apontam para a tela Integrações, o tour guiado ganhou o passo "Integrações" e o convite dos tutoriais por tela não diz mais "Tour geral concluído" para quem pulou o tour.
- Configurações: botões "Restaurar Padrões" (serviços monitorados, processos conflitantes, portas e fontes de log) passam a pedir confirmação e usam estilo destrutivo, evitando perda acidental de listas configuradas manualmente.

## [1.15.0] - 2026-09-24
### Adicionado
- **Statement Tracer (Oracle)**: nova aba no DB Studio com captura contínua de atividade (`v$session`/`v$sql`) rodando em segundo plano no processo do app (não no componente React) — sobrevive a trocar de aba ou navegar para outra página do Dev Manager, então dá pra iniciar a captura, ir disparar uma ação em outro app conectado ao mesmo Oracle e voltar depois para ver a linha do tempo de qual sessão rodou qual SQL. Intervalo de consulta configurável (2s a 30s, piso de 2s) e parada automática de segurança após 30 minutos. Consultas pontuais também ficam expostas via MCP (`db_get_oracle_active_sessions`, `db_get_oracle_recent_statements`).
- Tools MCP de captura contínua do Statement Tracer: `db_start_oracle_capture`, `db_get_oracle_capture_state` (com `limit`, padrão 50), `db_stop_oracle_capture` e `db_clear_oracle_capture`. A IA liga a captura, o usuário executa a ação no app/rotina e a IA lê quais SQLs rodaram. A captura é própria do servidor MCP e independente da iniciada na tela do app.
- **APM & Traces (OpenTelemetry)**: receptor OTLP/HTTP embutido (JSON ou Protobuf, com gzip/deflate), dashboard (vazão, latências p50/p95/p99, taxa de erros, % do tempo em banco, endpoints e queries lentas) e Traces Explorer (waterfall, atributos, SQL, stacktrace e decomposição do tempo entre banco, chamadas externas e aplicação). O Karaf iniciado pelo Cockpit anexa o `opentelemetry-javaagent.jar` automaticamente quando ele está em `<karaf>/bin`.
- Porta do receptor configurável em **APM & Traces → Como Conectar**: a porta nova é aberta antes de fechar a atual, então uma porta ocupada (ex.: por um OTel Collector/SigNoz local) não derruba o receptor em uso; o anexo automático do agente segue a porta escolhida.
- Tools MCP `apm_*` (overview, traces, detalhes, serviços e status do receptor). Como o servidor MCP roda em outro processo, elas consultam o buffer do app por uma API local do receptor — somente loopback, sem CORS e protegida por um token publicado na pasta de dados do usuário.
- **Git & Azure DevOps**: contagem de alterações pendentes de todos os repositórios (em lote, com concorrência limitada, só ao abrir/sincronizar a tela), link "Ver no GitHub/GitLab/Azure", seletor de branch de destino do PR montado a partir das branches reais do origin, lista de branches com filtro incluindo branches locais ainda não publicadas e branches que só existem no origin (o checkout cria a local rastreando o origin), aviso de HEAD destacado e suporte a remotes SSH/SCP, ao formato legado `{org}.visualstudio.com`, a worktrees/submódulos e a `packed-refs`.
- Tools MCP de leitura de Git: `git_get_status`, `git_get_diff` (com limite de tamanho configurável) e `git_get_commit_history`; `git_list_projects` ganha `includeUncommittedCount`.
- Onboarding: atualização de versão passa a mostrar só um resumo do changelog (sem resetar Welcome/Tour), e o tour inicial leva direto para Configurações quando faltam caminhos essenciais (repositórios/IDE).
- Catálogo de tools MCP (`docs/MCP_TOOLS.md`) passa a documentar as tools `apm_*` e `routine801_*`, além de 27 tools que existiam mas não estavam listadas (`env_batch_*`, `env_check_admin`, `env_launch_server_debug`, 13 tools `karaf_*` de console embutido/bundles/histórico, `profile_kill_port`, `profile_stop_step`, `routines_*`, `settings_*`, `system_check_path` e `system_auto_detect_paths`), com uma seção nova de Catálogo de Rotinas (123 tools no total).
- Central de Ajuda cobre as funcionalidades das últimas versões: card de **APM & Traces** no Guia dos Módulos e na Visão Geral, Statement Tracer no card de Banco de Dados, branches remotas/upstream/worktrees e GitHub/GitLab no card de Git, WinThor Start no card de Rotinas, e FAQs sobre o Statement Tracer, conexão do Java Agent ao receptor APM, WinThor Start/WTA e criptografia de segredos.
- **Notas de Versão e Guia de Instalação na Release**: geração automática dos arquivos `RELEASE_NOTES.md` (Markdown) e `LEIA-ME.txt` (texto puro com quebras CRLF para o Bloco de Notas) na pasta `release/` ao empacotar os instaladores (`npm run build:electron`) ou sob demanda via `npm run release:notes`. Os arquivos acompanham os executáveis com instruções claras para quem for instalar, comparativo entre o instalador padrão e a versão portátil, instruções sobre o Windows SmartScreen, requisitos de sistema e resumo das alterações desta versão.
### Alterado
- **Abertura do Hub mais rápida para quem já usa o app**: de ~5,4 s para ~2 s (animação enxuta e saída automática); quem abre pela primeira vez continua vendo a abertura completa.
- **Onboarding e tour atualizados para o menu lateral e as Integrações**: o passo "Checklist" dizia "Quatro itens" para uma lista de cinco (agora usa a contagem real), textos que falavam em "cabeçalho" agora dizem "menu lateral", o passo de IA & MCP e o final apontam para a tela Integrações, o tour guiado ganhou o passo "Integrações" e o convite dos tutoriais por tela não diz mais "Tour geral concluído" para quem pulou o tour.
- Nova identidade visual do ícone/logo (fundo índigo mais claro, fonte de luz e reflexo), aplicada ao `AppLogo`, `icon.svg`, `icon.png` e `favicon.ico`.
- Welcome do onboarding reduzido de 3 telas para 1 (saudação + escolha de tema + começar).
- Listagem de tabelas do DB Studio sobe o teto de 500 para 50.000 tabelas (schemas de ERP passam fácil de alguns milhares), com a sidebar renderizando a lista em blocos conforme o scroll.
- Cabeçalho do gerenciador de bundles do Karaf quebra linha em telas estreitas, com botões de altura uniforme.
### Segurança
- A URL do remote Git devolvida pela API web e pelo MCP tinha usuário/PAT embutidos (ex.: `https://user:PAT@dev.azure.com/...`) — agora é sanitizada.
- O `GitAzureService` passa a validar o caminho do projeto no próprio service (e não só nas rotas), recusando caminhos UNC que apontariam o git para `.git/config`/hooks de terceiros, já que IPC, servidor web e MCP o chamam diretamente.
### Corrigido
- `git checkout` de um nome sem branch correspondente (ex.: `.` ou `src`) descartava as alterações locais desses caminhos; agora o nome é sempre tratado como branch.
- Fetch/pull/push ficavam presos indefinidamente num prompt de credencial ou de host SSH sem resposta; agora têm tempo limite de 3 minutos, e o estouro encerra a árvore inteira de processos (credential helper, `git-remote-https`, `ssh`). O `git status` de segundo plano também tem limite e usa `--no-optional-locks` para não disputar o `index.lock` com a IDE.
- Commit & Push numa branch nova sem upstream dependia de casar a mensagem de erro do git em inglês (falhava com o git em português); agora detecta o upstream antes, publica em `origin` com o mesmo nome e configura o tracking. A existência de algo no stage também deixou de depender do idioma do git. Erros de commit aparecem dentro do modal (mantendo a mensagem digitada), e falha só no push fecha o modal com o aviso em destaque.
- Diff de arquivo não rastreado vinha vazio (passa a ser exibido como arquivo novo); cliques rápidos em arquivos diferentes podiam mostrar o diff errado; e o painel continuava exibindo branch/contagem anteriores após checkout ou commit.
- Onboarding: condição de corrida no primeiro uso reabria Welcome/Tour depois que o usuário já tinha pulado; o botão "Ver Tour Guiado" da Central de Ajuda reabria a introdução completa em vez de só o tour; e o botão "Pular introdução" não recebia clique de mouse real (coberto pelo container de conteúdo).
- O receptor OTLP descartava com resposta 200 o array JSON do exemplo cURL da própria tela de conexão (e JSON com espaço/BOM), tratados como protobuf; as rotas do servidor web não aceitavam protobuf — formato padrão do Java Agent — nem payloads acima de 100KB.
- Decoder protobuf endurecido contra payload malformado (um varint longo tinha custo quadrático e podia travar o processo principal) e contra zip bomb; payload grande passa a receber 413, que o exportador não retenta.
- A tela de APM não carregava dados no modo Web/Docker (`api` do apiBridge era capturado antes do `initApiBridge`).
- O % do tempo em banco contava spans SERVER aninhados e spans sem pai como tempo total, e a taxa de erro do cabeçalho virava 100% com o filtro "Erros" ativo.
- O drawer do trace selecionava o span errado, a aba Atributos mostrava sempre o mesmo span, a aba de erro não exibia o stacktrace e as queries SQL apareciam sem os números.
- `Alt+0` abria Configurações, embora o menu e o Quick Launcher o anunciassem como atalho do **APM & Traces**; agora abre o APM. A tabela de atalhos da Ajuda e do README dizia que `Alt+8` abria Configurações (abre Logs) e não citava `Alt+0`.
- A Central de Ajuda informava 73 tools MCP; são 123.

## [1.14.0] - 2026-09-23
### Adicionado
- Criptografia em repouso (AES-256-GCM) dos segredos gravados no `config.json` — senha do Karaf, senhas de conexão de banco, tokens do Confluence/Jira e API keys de provedores LLM, antes salvos em texto plano no disco.
- Fuzzy match com destaque de trecho correspondente e ordenação por relevância no Quick Launcher (`Ctrl+K`).
- Autenticação por API key também no handshake do WebSocket do modo Web/Docker (`/ws`): antes, um cliente que não fosse navegador podia se conectar sem enviar o header `Origin` e, com isso, contornar por completo a autenticação já exigida nas rotas REST — inclusive para enviar comandos ao Karaf embutido (`karaf:input`).
- Paridade do servidor MCP com IPC/REST para backup/restore de banco (`db_run_backup`, `db_list_backups`, `db_restore_backup`, `db_run_restore_drill`, `db_save_backup_config`, `db_list_backup_history`, `backup_test_webhook`) e para o observador de logs (`logs_check_file`, `logs_read_last_lines`, `logs_clear_file`) — nenhum dos dois tinha qualquer tool exposta a assistentes de IA até aqui.
- Verificação de build (`npm run build`) adicionada ao pipeline de CI, além de lint/typecheck/test.
### Alterado
- **Abertura do Hub mais rápida para quem já usa o app**: de ~5,4 s para ~2 s (animação enxuta e saída automática); quem abre pela primeira vez continua vendo a abertura completa.
- **Onboarding e tour atualizados para o menu lateral e as Integrações**: o passo "Checklist" dizia "Quatro itens" para uma lista de cinco (agora usa a contagem real), textos que falavam em "cabeçalho" agora dizem "menu lateral", o passo de IA & MCP e o final apontam para a tela Integrações, o tour guiado ganhou o passo "Integrações" e o convite dos tutoriais por tela não diz mais "Tour geral concluído" para quem pulou o tour.
- Code-split das páginas via `React.lazy`: bundle inicial do renderer reduzido de 1.19MB para 247KB.
- Documentação esclarece que o modo Web/Docker é single-tenant (sem isolamento por usuário).
- Lógica de preservação de credenciais existentes ao salvar configurações (antes duplicada em `registerIpc.ts` e `server/index.ts`, ausente no MCP) centralizada em `ConfigService.saveSettings`.
### Corrigido
- 35 erros de typecheck e a maior parte dos avisos pré-existentes do ESLint (52 no total) acumulados após a modernização do cockpit de containers, incluindo 3 falhas de teste que quebravam o CI desde então.
- Credenciais de webhook (`docSyncTargets`/`backupWebhooks`, usadas por sincronização de documentação e notificações de backup) ficaram de fora da criptografia em repouso acima e também não eram mascaradas em `GET /api/settings`/`settings:get` — trafegavam e ficavam gravadas em texto plano, diferente das demais credenciais. Corrigido; e a proteção contra reaproveitar uma credencial salva quando só o destino (host/URL) muda — que já existia para API keys de LLM só na importação de configurações — passou a valer para todo campo de segredo, em todo caminho de salvamento.
- Teste de isolamento de cache do `ConfigService` (`cada instância... não vaza entre instâncias`) dependia da resolução de mtime do sistema de arquivos e falhava esporadicamente; passou a forçar o avanço do mtime como o teste vizinho já fazia.

## [1.13.0] - 2026-09-21
### Adicionado
- **Integração WinThor Start (DataSnap REST) & WTA**:
  - Abertura de rotinas desktop do WinThor (extensões `.EXE`, `.PC`, etc.) através do serviço local **WinThor Start** (`http://localhost:9195`), permitindo iniciar telas com contexto autenticado sem necessitar do menu aberto.
  - Autenticação automática no portal WinThor Anywhere (WTA) via endpoint `POST /winthor/autenticacao/v1/login` para obtenção dinâmica de tokens e parâmetros de inicialização de rotinas (`matriculaWinthor`, `usuarioBd`, `senhaBd`, `serverBd`, `token`).
  - Suporte a payload de sessão fixo (`winthorStartDefaultPayload`) como contingência e fallback permanente.
  - Monitoramento nativo da porta `9195` (`WinThor Start (Launcher Delphi)`) e `8889` (`Portal Web Local (WTA)`) no cockpit de portas monitoradas.
  - Painel de configuração visual dedicado em **Configurações > Diretórios** e badge de status em tempo real no **Catálogo de Rotinas**.
  - Fallback automático para execução direta (`spawn`) ou launcher customizado caso o serviço local esteja inativo.
- **Distribuição & Assinatura de Código (Code Signing)**:
  - Pipeline de empacotamento com suporte ativo e validado à assinatura digital de binários (`.exe`, instalador NSIS e desinstalador) via certificado corporativo (`.env.codesign`), prevenindo bloqueios do Windows SmartScreen na distribuição interna.

## [1.12.0] - 2026-09-17
### Adicionado
- Sistema completo de Onboarding Guiado e Tours Interativos (`src/renderer/src/components/onboarding/`):
  - Tour global no cabeçalho apresentando as principais ferramentas e recursos do cockpit (Infraestrutura, Banco de Dados, Desenvolvimento, Busca Rápida `Ctrl+K`, Diagnósticos/Rede, Configurações e Atualização).
  - Tours interativos contextuais dedicados em todas as telas do cockpit (Ambiente, Containers, Banco de Dados, Deploy Karaf, Git/Azure DevOps, Logs, Documentação RAG, Rotinas WinThor e Configurações).
  - Coordenação inteligente (`tourCoordinator` e `usePageTour`) para evitar sobreposição, abrindo os tours por página apenas após o usuário concluir ou dispensar o tour inicial.
  - Persistência de progresso e conclusão salva individualmente no `localStorage`.
- Gerador automático e validador de ícones para distribuição Desktop (`scripts/generate-icons.cjs`):
  - Garante a presença e conformidade dos ícones `.ico` e `.png` (mínimo 256x256) no pipeline do Electron através do hook de npm `prebuild`.
  - Configuração explícita de ícone Windows em `electron-builder.json5`.

## [1.10.0] - 2026-09-16
### Adicionado
- Autocomplete no editor SQL da página de Banco de Dados: sugere palavras-chave, tabelas e colunas (com resolução de `alias.coluna` a partir das cláusulas `FROM`/`JOIN`); navegação por setas, `Tab`/`Enter` pra aceitar, `Esc` pra fechar.
### Corrigido
- Listagem de tabelas do PostgreSQL considerava só o schema `public`, ocultando tabelas de outros schemas — agora lista todos (exceto `pg_catalog`/`information_schema`), qualificadas como `schema.tabela`; `getTableColumns` resolve o schema correspondente.

## [1.9.1] - 2026-09-16
### Corrigido
- Testes de `BackupService` (placeholders, tokenização de comando, mascaramento de senha) usando `require()` num projeto ESM, quebrando a suíte (`Cannot find module`) — trocados por `import` normal.

## [1.9.0] - 2026-09-16
### Adicionado
- Comando de backup personalizado por conexão: template com placeholders (`{filePath}`, `{connectString}`, `{directory}`, etc.), tokenizado e executado via `execFile` (sem shell), bloqueando metacaracteres de encadeamento (`; & | < > \``) e mascarando a senha nos logs — `BackupService.runCustomCommandBackup`.

## [1.8.2] - 2026-09-16
### Corrigido
- Ações de serviço/processo da Automação (Karaf e perfis de deploy) agora checam o estado atual antes de agir — não tentam mais parar um serviço já parado ou iniciar um já em execução, eliminando falhas genéricas enganosas.
- Botão único e inteligente para as etapas de serviço Windows (`service-start`/`service-stop`) na Automação: o rótulo e a ação seguem o estado real do serviço (Iniciar/Parar), no lugar do par Executar/Parar que antes convergia pra mesma ação.

## [1.8.1] - 2026-09-16
### Corrigido
- Teste desatualizado de `formatErrorMessage` (ORA-01008) que ainda usava a assinatura síncrona antiga.
- Substituição de bind `NULL` não aplicada no modo `auto` do interpolador de SQL (`substituteBindVariables`).

## [1.8.0] - 2026-09-16
### Adicionado
- Editor de variáveis de bind (`:PARAMETRO`) na página de Banco de Dados: detecta placeholders no SQL antes de executar, abre modal pra preencher valores tipados (auto/string/number/date/null) e cacheia os últimos valores usados (`src/renderer/src/utils/sqlBinds.ts`).
- Execução de etapa individual de um Perfil de Deploy (Karaf/Docker/comando genérico) sem rodar o perfil inteiro (`DeployService.executeSingleStep`).

## [1.7.1] - 2026-09-16
### Corrigido
- Detecção de colisão de porta local identifica o processo real escutando a porta (via `tasklist`) e só alerta quando ele não parece ser o motor de banco esperado — antes disparava até contra o próprio banco local correto.
### Adicionado
- Progresso ao vivo (streaming) das ações de bundle Karaf (instalar, reinstalar, gerenciar ciclo de vida, desinstalar, atualizar versão) no Gerenciador de Bundles, em vez de só o resultado final ao término.

## [1.7.0] - 2026-09-15
### Adicionado
- Detecção de colisão de porta local em falha de autenticação de banco: quando o host é loopback, avisa sobre possível túnel SSH que perdeu a porta pra um serviço local já rodando.

## [1.6.1] - 2026-09-15
### Corrigido
- 15 achados de segurança/robustez identificados na revisão das melhorias de containers: injeção de comando via senha/distro WSL/nome de container, TLS desligado por padrão no build do Electron, `spawn('wt.exe')` sem handler de erro, salvamento de ambiente quebrado no modo web, tradução de caminho Windows→WSL ausente no compose/build, progresso de containers congelado no modo web, detecção de status Docker/WSL desatualizada, validações ausentes em handlers IPC, entre outros.

## [1.6.0] - 2026-09-15
### Adicionado
- Gerenciamento de containers Docker/Podman bem mais completo (`ContainersPage.tsx`) com suporte a WSL (`WslService.ts`).

## [1.5.0] - 2026-09-13
### Adicionado
- Histórico persistido de deploys/builds Karaf (`settings.karafDeployHistory`, até 200 entradas): botão "Histórico de Deploys" no Gerenciador de Bundles, `karaf_get_deploy_history` (MCP), `GET /api/karaf/deploy-history`, `karaf:list-deploy-history` (IPC).
- Notificações desktop (toast + notificação nativa) para deploy/build Karaf concluído ou falho, e para reindexação automática do RAG concluída (`NotificationService.ts`).
- Auto-reindex do RAG por observação de arquivos (`chokidar`): toggle "Reindexar automaticamente ao detectar mudanças" na aba Documentação.
- `JiraSource`: nova fonte do RAG multi-fonte — projetos/JQLs do Jira indexados como documentação, painel "Fontes Jira" na aba Documentação.
- Perfis de Ambiente (`settings.environmentProfiles`): presets nomeados dos diretórios/portas com "Salvar estado atual como perfil" e "Ativar".

## [1.4.0] - 2026-09-12
### Adicionado
- Ação `bundle:resolve` e visualizador de log real do Karaf no Gerenciador de Bundles.

## [1.3.2] - 2026-09-12
### Corrigido
- Mensagem de erro preservada em `/api/db/test` no modo web (antes era engolida/genérica).

## [1.3.1] - 2026-09-12
### Corrigido
- Mensagens de erro engolidas no modo web e rótulo de PR fixo no provider Azure DevOps.

## [1.3.0] - 2026-09-12
### Adicionado
- Export CSV do histórico de backup, presets de webhook, e melhorias em compose/karaf/confluence/drill.

## [1.2.0] - 2026-09-12
### Adicionado
- Webhook de backup, restore drill, PR multi-provider, Docker Compose, log Karaf persistido, fonte Confluence e auto-update.

## [1.1.0] - 2026-09-12
### Adicionado
- Melhorias no backup de banco: lock contra execuções concorrentes, retenção por idade, compressão, histórico e notificação.

---

### Já incluído no [1.0.0]
- `git_checkout_branch`, `env_launch_app` e gerência de bundles Karaf via MCP (`karaf_list_bundles`, `karaf_manage_bundle`, `karaf_install_bundle`, etc.) — commit `49ecb34`, anterior à tag `v1.0.0`.

import React from 'react';
import type { FaqItem } from '../helpData';

const C = 'font-mono text-primary font-semibold';

export function getInfrVersionFaq(): FaqItem[] {
  return [
    {
      id: 'infr-winthor-version',
      question: 'Como subir o WTA e o WSH numa versão específica do WinThor (38, 39, 40) pelo INFR-Docker?',
      category: 'Containers & Docker',
      tags: ['infr-docker', 'wta', 'wsh', 'versão', '38', '39', '40', 'imagem', 'features', 'manifesto', 'wsl'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            No assistente de bootstrap do INFR-Docker (tela WinThor &amp; WSL → Assistente INFR), o campo{' '}
            <strong className="text-foreground">Versão do WinThor</strong>, acima das abas, vale para banco, WTA e WSH. Com ele preenchido, o WTA sobe da imagem{' '}
            <code className={C}>linux-winthor:&lt;versão&gt;-debian</code>, que já traz as features do manifesto{' '}
            <code className={C}>linux-winthor/versions/&lt;versão&gt;.features</code>. Se a imagem ainda não existe, o terminal roda antes o{' '}
            <code className={C}>build_version.sh</code>, que instala as features pelo Nexus configurado no WTA (leva alguns minutos).
          </p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li>
              <strong className="text-foreground">Vários ambientes lado a lado:</strong> na tela WinThor &amp; WSL, o seletor <strong className="text-foreground">Ambiente</strong>{' '}
              escolhe qual deles o Hub usa. <strong className="text-foreground">Subir WinThor</strong> e a topologia passam a ser do ambiente escolhido, e a URL do WTA, a da
              Rotina 801 e a porta SSH do Karaf, nas Configurações, são apontadas para as portas reais dele (<code className={C}>docker ps</code>): rotinas, 801 e integrações
              falam com ele. A senha do WTA continua salva. Se o container for recriado e a porta mudar, use <em>Atualizar portas</em>. Com um ambiente escolhido, o <strong className="text-foreground">Subir WinThor</strong>{' '}
              espera cada parte ficar pronta: o banco saudável, a API do WTA respondendo e o login entrando, e só então sobe o WSH (sem a configuração inicial do WTA ele reinicia
              em loop com &quot;Versão exigida&quot;). Se o WSH não subir, o motivo aparece sob o seletor.
            </li>
            <li>
              <strong className="text-foreground">Karaf do WTA em container:</strong> em Configurações → Karaf, escolha <em>Container (WTA)</em>. O cliente do Karaf roda dentro do
              container (<code className={C}>docker exec</code>, em <code className={C}>/opt/pcsist/produtos/winthor/bin/client</code>), sem Karaf instalado no Windows; o container é o
              <code className={C}>wta-&lt;ambiente&gt;</code> escolhido na tela WinThor &amp; WSL. Bundles, features e diagnósticos rodam por esse caminho. O deploy por Maven não: o Hub compila no{' '}
              <code className={C}>~/.m2</code> do Windows e o container instala pelo Nexus, então o jar novo não chega a ele.
            </li>
            <li>
              <strong className="text-foreground">Nunca instalou nada?</strong> Use <strong className="text-foreground">Montar do zero</strong>, na tela
              inicial do assistente (ou <em>Começar do zero</em> na tela WinThor &amp; WSL sem distro). A etapa da vez ocupa a tela e as feitas viram uma linha. O Hub confere WSL, distro, Docker, o clone do INFR-Docker no
              branch <code className={C}>feature/imagem-por-versao</code>, os arquivos fora do git (<code className={C}>pcsist.tar.gz</code>, dump,{' '}
              <code className={C}>Winthor.ini</code>, jar do WSH), sobe banco, WTA e WSH da versão e espera a configuração inicial do WTA. Cada etapa
              traz o comando com Copiar e a ação. Ficam com você: o administrador para instalar o WSL, o login no Drive e no Azure DevOps, o acesso ao
              Nexus e a senha do <em>system</em>, que o import do dump pede no terminal.
            </li>
            <li>
              <strong className="text-foreground">Um banco por versão:</strong> o WTA de uma versão espera as colunas dela, então cada versão
              roda com o seu Oracle: <em>Subir só o banco</em> sugere <code className={C}>oracle-38</code> na porta 1538, restaurado de um dump daquela versão.
              O WTA lê o <code className={C}>wta.env.38</code> (com <code className={C}>DB_HOST=oracle-38</code>) e o WSH, o{' '}
              <code className={C}>.env.38</code>.
            </li>
            <li>
              <strong className="text-foreground">Lado a lado:</strong> o container vira <code className={C}>wta-38</code> e as portas derivam da versão
              (web 8038, SSH 8138, JMX 1038, Artemis 61638), para 38, 39 e 40 rodarem juntos. Nome e porta personalizados não são trocados.
            </li>
            <li>
              <strong className="text-foreground">WSH:</strong> em <em>Subir só o WSH</em> (link no fim da tela de ambientes), a versão faz o script usar o <code className={C}>.env.&lt;versão&gt;</code>,
              onde ficam o jar do WSH (<code className={C}>WSH_JAR</code>), o container do WTA e a porta. Ao subir, o WSH confere as{' '}
              <em>features</em> do WTA contra o <code className={C}>dependencies.json</code> dele como versão <strong className="text-foreground">mínima</strong>{' '}
              (ex.: <code className={C}>winthor-integracao-config</code> 1.38.17.48 ou superior) e encerra se alguma estiver abaixo ou faltar. Por isso o
              WSH publicado em produção serve também para uma versão mais nova do WinThor, como a 40.
            </li>
            <li>
              <strong className="text-foreground">Nova versão:</strong> numa frase só, &quot;Criar o ambiente develop na versão 40 do WinThor, a partir
              do master, com o banco copiado&quot;, você escolhe o nome, a versão, a origem e o banco. O Hub lê as features do <code className={C}>wta-master</code>, sobe cada uma
              pelo catálogo de atualizações da rotina 801 até a linha 40 (sem passar dela) e, com o jar do WSH escolhido (o de produção serve), confere o que
              esse WSH exige do WTA: é aí que um clone feito à mão costuma falhar com &quot;Versão exigida ... instalada&quot;. Na prévia você vê o que
              sobe, o que ficou na versão anterior e o que o WSH cobraria.
            </li>
            <li>
              <strong className="text-foreground">Guia completo:</strong> o que é cada projeto (oracle-winthor, linux-winthor, wsh-winthor e o Hub), por que
              existe, como um ambiente sobe, o que o Hub faz por você e os problemas conhecidos estão em Central de Ajuda → <strong className="text-foreground">Guias</strong>,
              e no botão <strong className="text-foreground">Como funciona</strong> do Assistente INFR.
            </li>
            <li>
              <strong className="text-foreground">Como a tela guia:</strong> o assistente abre em <strong className="text-foreground">Ambientes</strong>:
              cada ambiente da distro aparece como Oracle → WTA → WSH, com o estado e a porta de cada parte e a ação que faz sentido (Iniciar, Abrir o
              WinThor, Verificar, Copiar para outra versão). Dali saem as tarefas Nova versão, Montar do zero e Verificar, cada uma numa tela com o caminho
              de volta no cabeçalho, que também mostra a distro e a pasta do INFR-Docker (vermelho quando faltam scripts). Na Nova versão, portas, WSH e a
              configuração copiada da origem ficam em <em>Ajustes</em>, fechado, com os valores à vista; o rodapé diz o que será criado e tem o botão Criar. Um
              clone de banco que não vai funcionar (Oracle que não é o XE do INFR-Docker) oferece as saídas: usar aquele Oracle direto ou subir um vazio.
            </li>
            <li>
              <strong className="text-foreground">Branch do INFR-Docker:</strong> os scripts da Nova versão (<code className={C}>export_features.sh</code>,{' '}
              <code className={C}>build_version.sh</code> e <code className={C}>new_version_env.sh</code>) ficam no branch{' '}
              <code className={C}>feature/imagem-por-versao</code>. Com a pasta no <code className={C}>main</code>, a revisão para em
              &quot;Não foi possível ler a origem&quot; e pede para rodar <code className={C}>git checkout feature/imagem-por-versao</code> na pasta.
            </li>
            <li>
              <strong className="text-foreground">Antes de criar:</strong> ao escolher a origem, o assistente confere se a pasta do INFR-Docker tem os
              scripts, se o <code className={C}>wta-&lt;origem&gt;</code> está rodando e responde, e se o login do WTA entra; com as três em verde, lê o
              catálogo da 801 sozinho. Tudo fica numa lista só: o que impede vem primeiro, com a ação de resolver ali (com a origem parada,{' '}
              <em>Iniciar o &lt;origem&gt;</em>), e o que passou fica recolhido numa linha. Sem usuário, ou com a senha recusada, a própria linha do login pede
              usuário e senha; Salvar e testar grava em Configurações → Rotinas WinThor e confere de novo.
            </li>
            <li>
              <strong className="text-foreground">O ambiente subiu?</strong> Depois da criação, o assistente abre <strong className="text-foreground">Verificar ambiente</strong>{' '}
              (também pela tela de ambientes). Ele mostra o ambiente como Oracle → WTA → WSH, com o estado de <code className={C}>oracle-</code>, <code className={C}>wta-</code> e{' '}
              <code className={C}>wsh-&lt;nome&gt;</code>, o fim do log de cada um e se o WTA responde, e repete a leitura a cada 15 s enquanto o
              ambiente sobe. Um WSH reiniciando com &quot;Versão exigida&quot; no log aparece como falha, com a linha do log. Cada teste também vem
              como comando (<code className={C}>docker ps</code>, <code className={C}>docker logs</code>, <code className={C}>curl</code>), com
              Copiar e Executar.
            </li>
            <li>
              <strong className="text-foreground">Downgrade (ex.: um 38 a partir de um 39):</strong> a Nova versão só sobe features, e o banco da 39 tem
              tabelas que um WTA 38 não conhece. A revisão mostra a linha da origem (pelo núcleo <code className={C}>winthor-core-*</code>) e, quando a
              versão nova é menor, bloqueia o clone do banco e as features sem <code className={C}>versions/38.features</code>. Com a lista pronta e um
              Oracle vazio (botão na revisão), passa com aviso: importe o dump da 38 antes de usar o WTA. Sem a lista, use Montar do zero.
            </li>
            <li>
              <strong className="text-foreground">Manifesto que já existe:</strong> se o INFR-Docker já tem{' '}
              <code className={C}>versions/40.features</code>, a prévia o compara com a lista nova (quantas features ficariam acima, abaixo
              ou só num dos dois) e a geração usa o existente por padrão. Substituir pelo da prévia é uma escolha explícita, porque o
              catálogo da 801 de um WTA mais antigo pode não ter a linha da versão e a lista sairia rebaixada.
            </li>
            <li>
              <strong className="text-foreground">Login do catálogo:</strong> o catálogo da 801 exige login. O Hub entra no WTA de origem com
              o usuário e a senha de Configurações → Rotinas WinThor e manda a senha em MD5 maiúsculo, como o WTA espera (pode digitar a
              senha normal ou colar o hash). Se o WTA recusar, o erro traz a resposta dele.
            </li>
            <li>
              <strong className="text-foreground">Banco e portas da versão nova:</strong> clonar o banco de um Oracle escolhido (RMAN), usar um
              Oracle que já existe ou criar um vazio para importar o dump depois; container e portas vêm sugeridos pela versão e podem ser
              mudados. Ao criar, o Hub grava <code className={C}>versions/40.features</code> e abre o terminal com o{' '}
              <code className={C}>new_version_env.sh</code>, que monta a imagem, o banco, o WTA e o WSH.
            </li>
            <li>
              <strong className="text-foreground">Configurações:</strong> a seção mostra o <code className={C}>wta.env</code> e o{' '}
              <code className={C}>.env</code> do WSH com os valores do ambiente de origem (SID, usuário, loja, empresa, memória das JVMs,
              portas internas e o <code className={C}>Winthor.ini</code>), todos editáveis. Senhas não voltam para a tela: em branco, o Hub copia
              a da origem no servidor; digitada, vale a nova. O Hub grava <code className={C}>wta.env.40</code> e{' '}
              <code className={C}>.env.40</code> e o script usa esses arquivos como estão.
            </li>
            <li>
              <strong className="text-foreground">Senha do banco:</strong> o <code className={C}>Winthor.ini</code> grava a senha em maiúsculas e o WSH conecta com ela.
              Em Oracle 12 ou mais novo, use a senha do usuário do banco em maiúsculas no banco, no WTA e no WSH.
            </li>
          </ul>
        </div>
      )
    }
  ];
}

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
              <strong className="text-foreground">Um banco por versão:</strong> o WTA de uma versão espera as colunas dela, então cada versão
              roda com o seu Oracle: a aba Oracle sugere <code className={C}>oracle-38</code> na porta 1538, restaurado de um dump daquela versão.
              O WTA lê o <code className={C}>wta.env.38</code> (com <code className={C}>DB_HOST=oracle-38</code>) e o WSH, o{' '}
              <code className={C}>.env.38</code>.
            </li>
            <li>
              <strong className="text-foreground">Lado a lado:</strong> o container vira <code className={C}>wta-38</code> e as portas derivam da versão
              (web 8038, SSH 8138, JMX 1038, Artemis 61638), para 38, 39 e 40 rodarem juntos. Nome e porta personalizados não são trocados.
            </li>
            <li>
              <strong className="text-foreground">WSH:</strong> na aba WSH, a versão faz o script usar o <code className={C}>.env.&lt;versão&gt;</code>,
              onde ficam o jar do WSH (<code className={C}>WSH_JAR</code>), o container do WTA e a porta. Ao subir, o WSH confere as{' '}
              <em>features</em> do WTA contra o <code className={C}>dependencies.json</code> dele como versão <strong className="text-foreground">mínima</strong>{' '}
              (ex.: <code className={C}>winthor-integracao-config</code> 1.38.17.48 ou superior) e encerra se alguma estiver abaixo ou faltar. Por isso o
              WSH publicado em produção serve também para uma versão mais nova do WinThor, como a 40.
            </li>
            <li>
              <strong className="text-foreground">Nova versão (aba Nova versão):</strong> escolha um ambiente que já funciona (ex.: master, no 39),
              a versão nova (40) e o nome do ambiente novo (develop). O Hub lê as features do <code className={C}>wta-master</code>, sobe cada uma
              pelo catálogo de atualizações da rotina 801 até a linha 40 (sem passar dela) e, com o jar do WSH escolhido (o de produção serve), confere o que
              esse WSH exige do WTA: é aí que um clone feito à mão costuma falhar com &quot;Versão exigida ... instalada&quot;. Na prévia você vê o que
              sobe, o que ficou na versão anterior e o que o WSH cobraria.
            </li>
            <li>
              <strong className="text-foreground">Banco e portas da versão nova:</strong> clonar o banco de um Oracle escolhido (RMAN), usar um
              Oracle que já existe ou criar um vazio para importar o dump depois; container e portas vêm sugeridos pela versão e podem ser
              mudados. Ao gerar, o Hub grava <code className={C}>versions/40.features</code> e abre o terminal com o{' '}
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

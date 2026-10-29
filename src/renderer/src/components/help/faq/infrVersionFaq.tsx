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
              <strong className="text-foreground">WSH da mesma versão:</strong> na aba WSH, a versão faz o script usar o <code className={C}>.env.&lt;versão&gt;</code>,
              onde ficam o jar do WSH daquela versão (<code className={C}>WSH_JAR</code>), o container do WTA e a porta. O WSH confere as versões das{' '}
              <em>features</em> do WTA ao subir e encerra se faltar alguma.
            </li>
            <li>
              <strong className="text-foreground">Nova versão:</strong> o manifesto sai de um WTA de referência já atualizado, com{' '}
              <code className={C}>./scripts/export_features.sh --version 39 --container &lt;wta&gt;</code>.
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

import React from 'react';
import { Download, ExternalLink, ShieldAlert } from 'lucide-react';
import type { FaqItem } from '../helpData';

const GITHUB_RELEASES_URL = 'https://github.com/wanderalvess/dev-manager/releases/latest';

export function getUpdateFaq(handleOpenLink: (url: string) => void): FaqItem[] {
  return [
    {
      id: 'app-update-troubleshooting',
      question: 'Como atualizar o Hub Manager e o que fazer se a verificação ou download falhar?',
      category: 'Instalação & Pré-requisitos',
      tags: [
        'atualização',
        'update',
        'nova versão',
        'assinatura',
        'certificado',
        'publisherNames',
        'not signed',
        'github releases',
        'manual',
        'download'
      ],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            O Hub Manager inclui um sistema integrado de verificação e atualização que consulta os lançamentos
            oficiais no GitHub Releases.
          </p>

          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-2 shadow-xs">
            <span className="font-bold text-foreground block text-2xs uppercase tracking-wider text-primary">
              1. Atualização Automática no Cockpit:
            </span>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                Acesse <strong className="text-foreground">Ajuda (Alt+0) → Sobre o Hub Manager</strong>.
              </li>
              <li>
                No card <strong className="text-foreground">Versão do Aplicativo</strong>, clique em <strong className="text-foreground">&quot;Verificar&quot;</strong>.
              </li>
              <li>
                Quando houver uma nova versão disponível, clique em <strong className="text-foreground">&quot;Baixar e Instalar&quot;</strong>. O app baixará os arquivos em segundo plano e exibirá o botão verde <strong className="text-foreground">&quot;Instalar e Reiniciar&quot;</strong>.
              </li>
            </ul>

            <span className="font-bold text-foreground block pt-1 text-2xs uppercase tracking-wider text-primary">
              2. Falha de Assinatura (&quot;not signed by the application owner&quot;):
            </span>
            <div className="p-2.5 rounded-lg bg-warning/10 border border-warning/20 text-warning text-xs space-y-1">
              <div className="flex items-start gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                <p className="text-2xs leading-relaxed text-warning/90">
                  Os executáveis do Hub Manager utilizam certificado de assinatura de código interno. Quando o Windows não possui essa Autoridade Raiz pré-instalada na máquina corporativa, o sistema operacional reporta o instalador como não confiável, bloqueando a instalação automática.
                </p>
              </div>
            </div>

            <span className="font-bold text-foreground block pt-1 text-2xs uppercase tracking-wider text-primary">
              3. Alternativa 100% Confiável (Download Manual):
            </span>
            <p>
              Se a rede corporativa ou a validação do Windows impedir a atualização automática, utilize o botão <strong className="text-foreground">&quot;Manual&quot;</strong> no card de versão ou abra a página oficial de lançamentos para baixar o instalador (<code className="font-mono text-primary">HubManager-Setup-x.y.z.exe</code>) ou executável portátil:
            </p>

            <button
              type="button"
              onClick={() => handleOpenLink(GITHUB_RELEASES_URL)}
              className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 w-fit cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Acessar GitHub Releases (Download Oficial)</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )
    }
  ];
}

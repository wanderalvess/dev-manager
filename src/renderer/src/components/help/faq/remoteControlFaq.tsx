import React from 'react';
import type { FaqItem } from '../helpData';

// Fora de helpData.tsx (que já passa do teto de linhas): FAQ do controle remoto pelo celular.
export function getRemoteControlFaq(onNavigate?: (tab: string) => void): FaqItem[] {
  return [
    {
      id: 'remote-control-phone',
      question: 'Como controlar o Hub Manager pelo celular?',
      category: 'Configurações',
      tags: ['celular', 'remoto', 'controle remoto', 'qr', 'wi-fi', 'mobile', 'smartphone', 'firewall', 'tailscale'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            Em <strong className="text-foreground">Configurações → Portas</strong>, no cartão{' '}
            <strong className="text-foreground">Controle Remoto pelo Celular</strong>, clique em{' '}
            <strong className="text-foreground">Ligar</strong> e leia o QR com a câmera do celular, que precisa estar no mesmo Wi-Fi do PC
            (ou na mesma rede Tailscale). A página abre no navegador, sem instalar nada, com 4 abas:{' '}
            <strong className="text-foreground">Ambiente</strong> (preparar ambiente, abrir IDE, servidor debug, portas e serviços),{' '}
            <strong className="text-foreground">Karaf</strong> (iniciar em debug, parar e log ao vivo),{' '}
            <strong className="text-foreground">Docker</strong> (iniciar, parar e reiniciar containers) e{' '}
            <strong className="text-foreground">Deploy</strong> (rodar perfis de deploy e backup de banco).
          </p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li>
              <strong className="text-foreground">Firewall:</strong> na primeira vez, o Windows pergunta se libera o Hub Manager. Marque{' '}
              <em>Redes privadas</em> (e deixe a rede do PC como <em>Particular</em>).
            </li>
            <li>
              <strong className="text-foreground">Segurança:</strong> a chave vai no endereço e muda toda vez que você liga ou clica em{' '}
              <em>Trocar chave</em> (QR antigo para de funcionar). Só entram aparelhos da rede local. O celular escolhe entre ações
              fixas, nunca comandos livres, e as destrutivas (parar Karaf/container, preparar ambiente, deploy, backup) pedem
              confirmação.
            </li>
            <li>
              <strong className="text-foreground">Limites:</strong> funciona só no app desktop (não no modo Web/Docker), só enquanto o app
              está aberto, e uma tarefa longa (ambiente, deploy ou backup) por vez. Backup usa a pasta configurada em Configurações →
              Backup para a conexão.
            </li>
          </ul>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="text-2xs font-semibold text-primary hover:underline cursor-pointer"
            >
              Abrir Configurações
            </button>
          )}
        </div>
      )
    }
  ];
}

import React from 'react';
import { GitPullRequest } from 'lucide-react';
import { ModuleBullets, ModuleCardShell, ModuleNavButton, type ModuleCardProps } from './ModuleCardShell';

export const GitModuleCard: React.FC<ModuleCardProps> = ({ onNavigate }) => (
  <ModuleCardShell
    icon={<GitPullRequest className="w-4 h-4" />}
    iconBoxClass="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20"
    title="5. Git &amp; Azure DevOps Hub"
    subtitle="Gestão de Branches &amp; Pull Requests"
    shortcut="Alt+5"
    footer={
      <ModuleNavButton
        onNavigate={onNavigate}
        target="git"
        colorClass="bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/30"
        label="Abrir Git &amp; Azure DevOps"
      />
    }
  >
    <ModuleBullets
      intro="Hub centralizado para gerenciar múltiplos repositórios do seu workspace local:"
      checkClass="text-blue-400"
    >
      <span><strong>Varredura Automática:</strong> Detecta branch atual, contagem de arquivos não commitados em cada projeto (incluindo worktrees e submódulos) e aviso de HEAD destacado.</span>
      <span><strong>Visualizador de Diff &amp; Alterações Pendentes:</strong> Painel dedicado de arquivos modificados com status visual (M, A, D, ?, R), modal de diff com syntax highlighting e atalho "Abrir na IDE" em 1 clique para navegar direto ao arquivo no IntelliJ IDEA ou VS Code.</span>
      <span><strong>Criação Integrada de Branch por Tarefa:</strong> Criação e checkout de branches padronizadas baseadas em itens de trabalho do Azure DevOps ou Jira (busca via API, importação por URL/texto, prefixos <code className="font-mono text-primary">feature/</code>, <code className="font-mono text-primary">bugfix/</code>, <code className="font-mono text-primary">hotfix/</code> e seleção de branch base).</span>
      <span><strong>Ações Rápidas:</strong> Botões dedicados para <code className="font-mono text-primary">git fetch</code>, <code className="font-mono text-primary">pull</code>, <code className="font-mono text-primary">stash</code> e <code className="font-mono text-primary">pop</code>.</span>
      <span><strong>Branches Remotas:</strong> Branches que só existem no <code className="font-mono text-primary">origin</code> aparecem na lista; o checkout cria a branch local já rastreando a remota. O push de uma branch nova publica em <code className="font-mono text-primary">origin</code> e configura o upstream.</span>
      <span><strong>Abertura de PR Direta:</strong> Abre a criação de Pull Request no Azure DevOps ou GitHub (ou Merge Request no GitLab) sem preenchimento manual.</span>
    </ModuleBullets>
  </ModuleCardShell>
);

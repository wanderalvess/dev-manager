import React from 'react';
import { Database } from 'lucide-react';
import { ModuleBullets, ModuleCardShell, ModuleNavButton, type ModuleCardProps } from './ModuleCardShell';

export const DatabaseModuleCard: React.FC<ModuleCardProps> = ({ onNavigate }) => (
  <ModuleCardShell
    icon={<Database className="w-4 h-4" />}
    iconBoxClass="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
    title="2. Banco de Dados &amp; Backups"
    subtitle="Oracle · PostgreSQL · MySQL · CLI Custom"
    shortcut="Alt+2"
    footer={
      <ModuleNavButton
        onNavigate={onNavigate}
        target="database"
        colorClass="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
        label="Abrir Módulo de Banco de Dados"
      />
    }
  >
    <ModuleBullets
      intro="Gerenciador de bancos multi-vendor com suporte a rotinas de exportação e restauração seguras:"
      checkClass="text-emerald-400"
    >
      <span><strong>Modo Personalizado Oracle:</strong> Alternância entre <em>expdp padrão</em>, <em>expdp com VERSION=11.2</em> e <em>exp clássico</em> (sem depender de pasta remota).</span>
      <span><strong>Tokens Dinâmicos:</strong> Marcadores automáticos como <code className="font-mono text-primary">{'{filePath}'}</code>, <code className="font-mono text-primary">{'{user}'}</code>, <code className="font-mono text-primary">{'{connectString}'}</code>.</span>
      <span><strong>Cron &amp; Retenção:</strong> Backups recorrentes automáticos com expurgo por idade ou limite de arquivos.</span>
      <span><strong>Restore Drill &amp; Webhooks:</strong> Teste de restauração em base temporária e avisos no Discord/Slack.</span>
      <span><strong>Editor SQL para Queries Grandes:</strong> Split redimensionável por arrasto vertical, modo Maximizar (tela cheia para foco total em queries grandes), gutter com números de linha sincronizado, quebra automática (Word Wrap), zoom da fonte (A-/A+) e botão para Formatar SQL automaticamente.</span>
      <span><strong>Parâmetros e Variáveis Dinâmicas:</strong> Suporte completo a Bind Variables (<code className="font-mono text-primary">:VAR</code>), variáveis de substituição do WinThor / SQL*Plus (<code className="font-mono text-primary">&amp;VAR</code> e <code className="font-mono text-primary">&amp;&amp;VAR</code>), scripts (<code className="font-mono text-primary">@VAR</code>) e templates (<code className="font-mono text-primary">{'{VAR}'}</code>), com histórico no cache, suporte a listas <code className="font-mono text-primary">IN (...)</code>, adição manual e substituição inline no editor.</span>
      <span><strong>Statement Tracer &amp; Parâmetros (Binds):</strong> Rastreamento de queries Oracle (<code className="font-mono text-primary">v$session</code>/<code className="font-mono text-primary">v$sql</code>) com captura de valores de binds (<code className="font-mono text-primary">v$sql_bind_capture</code>), dispensando <code className="font-mono text-primary">log:set trace root</code> no Karaf e gerando SQL executável interpolado em 1 clique.</span>
      <span><strong>Grade de dados editável:</strong> ao abrir uma tabela pela barra lateral (SELECT * simples), a grade de resultados vira uma planilha — botão <em>Nova linha</em>, duplo-clique numa célula para editar e botão direito para excluir a linha, sem precisar escrever INSERT/UPDATE/DELETE na mão.</span>
      <span><strong>Integração com tnsnames.ora:</strong> Configure o caminho do arquivo de rede Oracle nas Configurações para buscar conexões TNS e preencher automaticamente os parâmetros no modal de Nova Conexão do DB Studio com 1 clique (Host, Porta, Service Name ou SID).</span>
    </ModuleBullets>
  </ModuleCardShell>
);

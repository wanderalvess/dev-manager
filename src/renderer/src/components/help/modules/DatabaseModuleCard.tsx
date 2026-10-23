import React from 'react';
import { Database } from 'lucide-react';
import { ModuleBullets, ModuleCardShell, ModuleNavButton, type ModuleCardProps } from './ModuleCardShell';

export const DatabaseModuleCard: React.FC<ModuleCardProps> = ({ onNavigate }) => (
  <ModuleCardShell
    icon={<Database className="w-4 h-4" />}
    iconBoxClass="p-2 rounded-xl bg-success/10 text-success border border-success/20"
    title="2. Banco de Dados"
    subtitle="Oracle · PostgreSQL · MySQL · CLI Custom"
    shortcut="Alt+2"
    footer={
      <ModuleNavButton
        onNavigate={onNavigate}
        target="database"
        colorClass="bg-success/10 hover:bg-success/20 text-success border border-success/30"
        label="Abrir Módulo de Banco de Dados"
      />
    }
  >
    <ModuleBullets
      intro="Gerenciador de bancos multi-vendor com suporte a rotinas de exportação e restauração seguras:"
      checkClass="text-success"
    >
      <span><strong>Modo Personalizado Oracle:</strong> Alternância entre <em>expdp padrão</em>, <em>expdp com VERSION=11.2</em> e <em>exp clássico</em> (sem depender de pasta remota).</span>
      <span><strong>Tokens Dinâmicos:</strong> Marcadores automáticos como <code className="font-mono text-primary">{'{filePath}'}</code>, <code className="font-mono text-primary">{'{user}'}</code>, <code className="font-mono text-primary">{'{connectString}'}</code>.</span>
      <span><strong>Tela Backups de Banco:</strong> backup, restauração, agendamento, arquivos, histórico e webhooks ficam na tela própria <em>Backups de Banco</em> (menu Dados); o botão <em>Backup</em> do Studio abre lá, já na conexão ativa.</span>
      <span><strong>Cron &amp; Retenção:</strong> Backups recorrentes automáticos com expurgo por idade ou limite de arquivos.</span>
      <span><strong>Restore Drill &amp; Webhooks:</strong> Teste de restauração em base temporária e avisos no Discord/Slack.</span>
      <span><strong>Editor SQL para Queries Grandes:</strong> Split redimensionável por arrasto vertical, modo Maximizar (tela cheia para foco total em queries grandes), gutter com números de linha sincronizado, quebra automática (Word Wrap), zoom da fonte (A-/A+) e botão para Formatar SQL automaticamente.</span>
      <span><strong>Parâmetros e Variáveis Dinâmicas:</strong> Suporte completo a Bind Variables (<code className="font-mono text-primary">:VAR</code>), variáveis de substituição do WinThor / SQL*Plus (<code className="font-mono text-primary">&amp;VAR</code> e <code className="font-mono text-primary">&amp;&amp;VAR</code>), scripts (<code className="font-mono text-primary">@VAR</code>) e templates (<code className="font-mono text-primary">{'{VAR}'}</code>), com histórico no cache, suporte a listas <code className="font-mono text-primary">IN (...)</code>, adição manual e substituição inline no editor.</span>
      <span><strong>Statement Tracer &amp; Parâmetros (Binds):</strong> Rastreamento de queries Oracle (<code className="font-mono text-primary">v$session</code>/<code className="font-mono text-primary">v$sql</code>) com captura de valores de binds (<code className="font-mono text-primary">v$sql_bind_capture</code>), dispensando <code className="font-mono text-primary">log:set trace root</code> no Karaf e gerando SQL executável interpolado em 1 clique. A aba <em>Por rotina</em> agrupa o que foi capturado pelo módulo que executou (ex.: rotina <code className="font-mono text-primary">2075</code>), destacando as consultas mais lentas (tempo médio por execução) e as repetidas (possível N+1 ou SQL montado com valores no texto).</span>
      <span><strong>Grade de dados editável:</strong> ao abrir uma tabela pela barra lateral (SELECT * simples), a grade de resultados vira uma planilha — botão <em>Nova linha</em>, duplo-clique numa célula para editar e botão direito para excluir a linha, sem precisar escrever INSERT/UPDATE/DELETE na mão.</span>
      <span><strong>Integração com tnsnames.ora:</strong> Configure o caminho do arquivo de rede Oracle nas Configurações para buscar conexões TNS e preencher automaticamente os parâmetros no modal de Nova Conexão do DB Studio com 1 clique (Host, Porta, Service Name ou SID).</span>
    </ModuleBullets>
  </ModuleCardShell>
);

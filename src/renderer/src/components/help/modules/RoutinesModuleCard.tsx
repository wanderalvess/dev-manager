import React from 'react';
import { Grid } from 'lucide-react';
import { ModuleBullets, ModuleCardShell, ModuleNavButton, type ModuleCardProps } from './ModuleCardShell';

export const RoutinesModuleCard: React.FC<ModuleCardProps> = ({ onNavigate }) => (
  <ModuleCardShell
    icon={<Grid className="w-4 h-4" />}
    iconBoxClass="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
    title="6. Catálogo de Rotinas WinThor"
    subtitle="Executáveis Delphi .exe e .pc"
    shortcut="Alt+6"
    footer={
      <ModuleNavButton
        onNavigate={onNavigate}
        target="routines"
        colorClass="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
        label="Abrir Catálogo de Rotinas"
      />
    }
  >
    <ModuleBullets
      intro="Acesso instantâneo aos executáveis compilados na sua máquina:"
      checkClass="text-indigo-400"
    >
      <span><strong>Busca Instantânea:</strong> Filtre rotinas por código numérico ou nome do executável.</span>
      <span><strong>Filtro por Módulo:</strong> Agrupamento automático por subpastas do diretório configurado.</span>
      <span><strong>Favoritos Persistidos:</strong> Fixe suas rotinas de trabalho com estrela (★) para acesso no topo.</span>
      <span><strong>WinThor Start &amp; WTA:</strong> Abre rotinas já autenticadas pelo serviço local (<code className="font-mono text-primary">:9195</code>), com monitoramento de status do Karaf (WTA na porta <code className="font-mono text-primary">:8889</code>), alerta explícito de autenticação e fallback direto.</span>
      <span><strong>Download e Atualização via CCW:</strong> Baixe rotinas oficiais diretamente da Central de Controle WinThor para a pasta <code className="font-mono text-primary">Prod</code> do módulo, com descompactação de ZIP automática.</span>
      <span><strong>Gerenciador de Rollback (.bak):</strong> Histórico de versões anteriores com data, hora, tamanho e restauração em 1 clique com backup prévio de segurança (<code className="font-mono text-primary">_pre_rollback.bak</code>).</span>
      <span><strong>Leitura de Versão do Executável (PE Header):</strong> Inspeção de metadados binários (<code className="font-mono text-primary">FileVersion</code> / <code className="font-mono text-primary">ProductVersion</code>) exibida diretamente nos cartões para validação instantânea de releases.</span>
      <span><strong>Atualização em Lote (Batch Download):</strong> Atualize todas as rotinas favoritas ou módulos inteiros com um único clique e acompanhamento em tempo real.</span>
      <span><strong>Instalação Local &amp; Árvore Oficial:</strong> Atualize a partir de arquivos <code className="font-mono text-primary">.exe</code> ou <code className="font-mono text-primary">.zip</code> baixados localmente ou explore a árvore de rotinas da CCW.</span>
    </ModuleBullets>
  </ModuleCardShell>
);

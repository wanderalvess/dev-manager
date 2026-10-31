import React from 'react';
import { ListChecks } from 'lucide-react';

const STEPS = ['WSL', 'Distro do WinThor', 'Docker na distro', 'Projeto INFR-Docker', 'Arquivos fora do git', 'Subir o ambiente', 'Configuração inicial do WTA', 'Pronto para usar'];

/**
 * Tela WinThor & WSL sem nenhuma distro do WinThor: no lugar da topologia (que só faz sentido com
 * containers), o caminho do zero pelo Assistente INFR → Primeiros passos.
 */
export const WinthorEmptyState: React.FC<{ hasWsl: boolean; onStart: () => void; onOpenSnapshots: () => void }> = ({ hasWsl, onStart, onOpenSnapshots }) => (
  <section className="m-5 md:m-6 max-w-3xl rounded-xl border border-dashed border-border bg-card p-6 space-y-4">
    <p className="text-xs font-bold font-mono tracking-[0.14em] text-warning">NADA INSTALADO AINDA</p>
    <h2 className="text-xl font-bold text-foreground">Nenhuma distro do WinThor neste computador</h2>
    <p className="text-sm text-foreground/80 leading-relaxed">
      {hasWsl ? 'O WSL está aqui, mas nenhuma distro tem "winthor" no nome.' : 'O WSL não respondeu ou não tem distros.'} O Assistente INFR abre em Primeiros passos,
      confere o que já existe e guia o resto, até o ambiente com banco, WTA e WSH. Leva de 40 minutos a 1 hora, a maior parte esperando downloads e o dump.
    </p>
    <ol className="grid grid-cols-1 sm:grid-cols-2 sm:grid-flow-col sm:grid-rows-4 gap-x-6 gap-y-1.5 list-decimal pl-5 text-sm text-foreground">
      {STEPS.map((s) => (
        <li key={s}>{s}</li>
      ))}
    </ol>
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onStart}
        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 cursor-pointer"
      >
        <ListChecks className="w-4 h-4" /> Começar do zero
      </button>
      <button type="button" onClick={onOpenSnapshots} className="h-9 px-3.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted cursor-pointer">
        Já tenho o .tar: Snapshots WSL
      </button>
    </div>
  </section>
);

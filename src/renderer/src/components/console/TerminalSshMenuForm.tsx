import React, { useState } from 'react';

interface TerminalSshMenuFormProps {
  onCancel: () => void;
  onSubmit: (target: string, port: number) => Promise<void>;
}

export const TerminalSshMenuForm: React.FC<TerminalSshMenuFormProps> = ({ onCancel, onSubmit }) => {
  const [sshTarget, setSshTarget] = useState('');
  const [sshPort, setSshPort] = useState('22');
  const [sshSubmitting, setSshSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = sshTarget.trim();
    if (!target) return;
    setSshSubmitting(true);
    try {
      const portNum = Number.parseInt(sshPort, 10) || 22;
      await onSubmit(target, portNum);
    } finally {
      setSshSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 space-y-2.5">
      <div className="text-xs font-bold text-foreground">Nova Sessão SSH</div>
      <div className="space-y-1">
        <label className="block text-2xs font-medium text-muted-foreground">
          Destino (usuário@host)
        </label>
        <input
          type="text"
          autoFocus
          value={sshTarget}
          onChange={(e) => setSshTarget(e.target.value)}
          placeholder="usuario@192.168.1.50"
          className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <div className="space-y-1">
        <label className="block text-2xs font-medium text-muted-foreground">Porta</label>
        <input
          type="number"
          min={1}
          max={65535}
          value={sshPort}
          onChange={(e) => setSshPort(e.target.value)}
          className="w-24 px-2.5 py-1 rounded-lg border border-border bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <div className="flex items-center justify-end gap-1.5 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-2.5 py-1 rounded-lg border border-border text-2xs text-muted-foreground hover:text-foreground cursor-pointer"
        >
          Voltar
        </button>
        <button
          type="submit"
          disabled={sshSubmitting || !sshTarget.trim()}
          className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-2xs font-bold hover:opacity-90 disabled:opacity-50 cursor-pointer"
        >
          {sshSubmitting ? 'Conectando...' : 'Conectar'}
        </button>
      </div>
    </form>
  );
};

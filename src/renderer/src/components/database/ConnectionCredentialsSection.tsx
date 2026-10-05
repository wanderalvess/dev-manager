import React, { useState } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { DatabaseConnectionConfig } from '../../../../shared/types';

interface ConnectionCredentialsSectionProps {
  editingConn: Partial<DatabaseConnectionConfig>;
  setEditingConn: React.Dispatch<React.SetStateAction<Partial<DatabaseConnectionConfig>>>;
}

export const ConnectionCredentialsSection: React.FC<ConnectionCredentialsSectionProps> = ({
  editingConn,
  setEditingConn
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const hasSavedPassword = Boolean(editingConn.hasPassword || (editingConn.id && !editingConn.password));

  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="block font-medium text-foreground mb-1">Usuário</label>
        <input
          type="text"
          required
          value={editingConn.user || ''}
          onChange={(e) => setEditingConn({ ...editingConn, user: e.target.value })}
          placeholder="Ex: system, postgres, root"
          className="w-full bg-background border border-border/70 rounded-md p-2 text-foreground focus:outline-none focus:border-primary font-mono text-xs"
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block font-medium text-foreground">Senha</label>
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-muted-foreground hover:text-foreground text-2xs flex items-center gap-1 cursor-pointer transition-colors"
          >
            {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            <span>{showPassword ? 'Ocultar' : 'Exibir'}</span>
          </button>
        </div>
        <input
          type={showPassword ? 'text' : 'password'}
          value={editingConn.password || ''}
          onChange={(e) => setEditingConn({ ...editingConn, password: e.target.value })}
          placeholder={hasSavedPassword ? '(Senha salva e protegida)' : '••••••••'}
          className="w-full bg-background border border-border/70 rounded-md p-2 text-foreground focus:outline-none focus:border-primary font-mono text-xs"
        />
        {hasSavedPassword && !editingConn.password && (
          <p className="text-2xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Senha salva. Deixe em branco para mantê-la ou digite para alterá-la.</span>
          </p>
        )}
      </div>
    </div>
  );
};

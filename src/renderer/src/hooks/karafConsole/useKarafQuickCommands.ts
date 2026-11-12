import { useState } from 'react';

export function useKarafQuickCommands() {
  const [commands] = useState([
    { id: 'la', label: 'Listar Bundles (la)', command: 'la' },
    { id: 'features', label: 'Listar Features', command: 'feature:list' },
    { id: 'logs', label: 'Últimos Logs', command: 'log:display' },
    { id: 'version', label: 'Versão do Karaf', command: 'system:version' }
  ]);
  return { commands };
}

export async function confirmKarafCommand(_cmd: string): Promise<boolean> {
  return true;
}

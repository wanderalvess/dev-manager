const PENDING_KEY = 'devManager.backups.pendingConnectionId';

/** O Studio SQL deixa aqui a conexão ativa antes de abrir a tela de Backups, que a usa ao ficar ativa. */
export function storePendingBackupConnection(connectionId: string): void {
  try {
    sessionStorage.setItem(PENDING_KEY, connectionId);
  } catch {
    /* sem storage: a tela de Backups abre na conexão padrão */
  }
}

/** Lê e apaga a conexão pendente (null quando não há). */
export function takePendingBackupConnection(): string | null {
  try {
    const id = sessionStorage.getItem(PENDING_KEY);
    if (id) sessionStorage.removeItem(PENDING_KEY);
    return id;
  } catch {
    return null;
  }
}

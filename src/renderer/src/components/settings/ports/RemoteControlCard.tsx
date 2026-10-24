import React, { useEffect, useState } from 'react';
import { Smartphone, Power, RefreshCw, Copy } from 'lucide-react';
import { EMPTY_REMOTE_STATUS, type RemoteControlStatus } from '../../../../../shared/remoteControl';
import { showToast } from '../../ToastHost';

/** Liga o servidor da rede local e mostra o QR para o celular controlar o app (só no app desktop). */
export const RemoteControlCard: React.FC = () => {
  const [status, setStatus] = useState<RemoteControlStatus>(EMPTY_REMOTE_STATUS);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    window.electronAPI.getRemoteControlStatus().then(setStatus).catch(() => undefined);
  }, []);

  if (!status.supported) return null;

  const change = async (fn: () => Promise<RemoteControlStatus>) => {
    setBusy(true);
    try {
      setStatus(await fn());
    } catch (err) {
      showToast(`Falha no controle remoto: ${(err as Error).message}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const copy = (url: string) => {
    void navigator.clipboard.writeText(url).then(() => showToast('Endereço copiado.'));
  };

  return (
    <div className="cockpit-panel rounded-xl p-5 space-y-4 shadow-xl border border-border">
      <div className="flex items-center justify-between pb-1 border-b border-border/60">
        <div>
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-primary" /> Controle Remoto pelo Celular
          </h3>
          <p className="text-2xs text-muted-foreground mt-0.5">
            O celular, no mesmo Wi-Fi, abre uma página leve para ver o ambiente e acionar o Hub Manager.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => change(() => (status.running ? window.electronAPI.stopRemoteControl() : window.electronAPI.startRemoteControl()))}
          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all disabled:opacity-50 ${
            status.running ? 'border-danger/50 text-danger hover:bg-danger/10' : 'border-primary/50 text-primary hover:bg-primary/10'
          }`}
        >
          <Power className="w-3.5 h-3.5" /> {status.running ? 'Desligar' : 'Ligar'}
        </button>
      </div>

      {status.running && status.qrDataUrl ? (
        <div className="flex flex-col sm:flex-row gap-4 items-start text-xs">
          <img src={status.qrDataUrl} alt="QR do controle remoto" className="w-40 h-40 rounded-lg bg-white p-1" />
          <div className="space-y-2 min-w-0 flex-1">
            <p className="text-muted-foreground leading-relaxed">
              Aponte a câmera do celular para o QR. A chave muda toda vez que você liga ou clica em “Trocar chave”; QR antigo
              deixa de funcionar.
            </p>
            {status.urls.map((url) => (
              <div key={url} className="flex items-center gap-2 bg-muted/30 border border-border rounded-lg px-2.5 py-1.5">
                <code className="font-mono text-2xs truncate flex-1">{url}</code>
                <button type="button" aria-label="Copiar endereço" onClick={() => copy(url)} className="text-primary">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              disabled={busy}
              onClick={() => change(() => window.electronAPI.regenerateRemoteControlKey())}
              className="flex items-center gap-1.5 text-2xs font-bold text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw className="w-3 h-3" /> Trocar chave
            </button>
          </div>
        </div>
      ) : (
        <p className="text-2xs text-muted-foreground leading-relaxed">
          Desligado. Ao ligar, o Windows pode perguntar se libera o Hub Manager no firewall: marque “Redes privadas”. Só
          aparelhos da rede local (ou do Tailscale) conseguem entrar.
        </p>
      )}
      {status.error && <p className="text-2xs text-danger">{status.error}</p>}
    </div>
  );
};

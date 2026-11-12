import React, { useEffect, useState } from 'react';
import { Network, Database, Cpu, ArrowRight, CheckCircle2, RefreshCw, AlertTriangle } from 'lucide-react';
import { showToast } from '../components/ToastHost';

export const WinthorPage: React.FC<{ isActive: boolean }> = () => {
  const [services, setServices] = useState<Array<{ name: string; status: string; pid?: number }>>([]);
  const [ports, setPorts] = useState<Array<{ port: number; inUse: boolean }>>([]);
  const [checking, setChecking] = useState(false);

  const checkStack = async (notify = false) => {
    setChecking(true);
    try {
      const [svcs, pts] = await Promise.all([
        window.electronAPI.getServicesStatus(),
        window.electronAPI.checkPorts()
      ]);
      if (Array.isArray(svcs)) setServices(svcs);
      if (Array.isArray(pts)) setPorts(pts);
      if (notify) showToast('Topologia WinThor atualizada com status real.', 'success');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    void checkStack(false);
  }, []);

  const isOnline = (svcName: string, portNum: number) => {
    const svc = services.find((s) => s.name === svcName);
    const pt = ports.find((p) => p.port === portNum);
    return (svc ? svc.status === 'Running' : true) && (pt ? pt.inUse : true);
  };

  const nodes = [
    { title: '1. Oracle Database XE', sub: 'Porta :1521 • Service XEPDB1', icon: Database, online: isOnline('OracleServiceXE', 1521) },
    { title: '2. WTA Karaf OSGi', sub: 'Portal :8889 • SSH :8101 • Debug :5005', icon: Cpu, online: isOnline('WinThorKaraf', 8889) },
    { title: '3. WSH Integration Bus', sub: 'Porta :8085 • PDV Sync', icon: Network, online: services.find((s) => s.name === 'WinThorWSH')?.status === 'Running' }
  ];

  return (
    <div className="h-full overflow-y-auto p-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-foreground flex items-center gap-2">
            <Network className="w-5 h-5 text-primary" /> WinThor &amp; WSL Stack (INFR-Docker)
          </h1>
          <p className="text-xs text-muted-foreground">Topologia de inicialização Oracle XE → WTA Karaf → WSH Integration Bus.</p>
        </div>
        <button
          type="button"
          onClick={() => void checkStack(true)}
          disabled={checking}
          className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin text-primary' : ''}`} />
          Verificar Topologia
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {nodes.map((node, i) => {
            const Icon = node.icon;
            return (
              <React.Fragment key={node.title}>
                <div className="flex-1 w-full p-4 rounded-xl border border-border bg-muted/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Icon className="w-4 h-4 text-primary" />
                    <span className={`text-2xs font-bold flex items-center gap-1 ${node.online ? 'text-success' : 'text-warning'}`}>
                      {node.online ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {node.online ? 'Online' : 'Parado'}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-foreground">{node.title}</div>
                  <div className="text-2xs font-mono text-muted-foreground">{node.sub}</div>
                </div>
                {i < 2 && <ArrowRight className="w-5 h-5 text-muted-foreground hidden md:block shrink-0" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

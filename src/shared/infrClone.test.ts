import { describe, expect, it } from 'vitest';
import { cloneDefaultPorts, fixedWtaPorts, freePort, parseHostPorts, parseWtaImage, reviewClone, usedHostPorts, type InfrCloneReviewInput } from './infrClone';
import type { InfrEnvironment } from './infrWinthorVersion';

const PORTS_39 = '0.0.0.0:1039->1099/tcp, [::]:1039->1099/tcp, 0.0.0.0:8039->8080/tcp, 0.0.0.0:8139->8101/tcp, 0.0.0.0:61639->61616/tcp';
const master = (state = 'running'): InfrEnvironment => ({
  name: 'master',
  oracle: { name: 'oracle-master', image: 'oracle-winthor:latest', state, ports: '0.0.0.0:1539->1521/tcp' },
  wta: { name: 'wta-master', image: 'linux-winthor:39-debian', state, ports: PORTS_39 },
  wsh: { name: 'wsh-master', image: 'wsh:1', state, ports: '0.0.0.0:9039->9000/tcp' }
});

const base = (over: Partial<InfrCloneReviewInput> = {}): InfrCloneReviewInput => ({
  clone: { version: '39', image: 'linux-winthor:39-debian', imageExists: true, originState: 'running', manifestExists: true },
  from: 'master',
  name: 'test',
  dbMode: 'clone',
  dbSource: 'oracle-master',
  dbSourceImage: 'oracle-winthor:latest',
  dbContainer: 'oracle-test',
  envs: [master('exited')],
  ports: { oracle: 1589, web: 8089, wsh: 9089 },
  ...over
});
const byId = (items: ReturnType<typeof reviewClone>) => Object.fromEntries(items.map((i) => [i.id, i]));

describe('versão pela imagem e portas', () => {
  it('lê versão e distro de linux-winthor:<v>-<distro>, com ou sem registry', () => {
    expect(parseWtaImage('linux-winthor:39-debian')).toEqual({ version: '39', distro: 'debian' });
    expect(parseWtaImage('registry.local:5000/pc/linux-winthor:40-debian')).toEqual({ version: '40', distro: 'debian' });
    expect(parseWtaImage('oracle-winthor:latest')).toBeNull();
    expect(parseWtaImage('linux-winthor:latest')).toBeNull();
    expect(parseWtaImage(undefined)).toBeNull();
  });

  it('extrai as portas do host da coluna Ports do docker ps', () => {
    expect(parseHostPorts(PORTS_39).sort((a, b) => a - b)).toEqual([1039, 8039, 8139, 61639]);
    expect(parseHostPorts('8080/tcp')).toEqual([]);
  });

  it('usedHostPorts só conta container rodando', () => {
    expect([...usedHostPorts([master('running')]).keys()]).toContain(8039);
    expect(usedHostPorts([master('exited')]).size).toBe(0);
    expect(usedHostPorts([master('exited')], false).has(8039)).toBe(true);
  });

  it('as portas do clone saem das da versão (da origem) e não repetem entre si', () => {
    const used = usedHostPorts([master('running')]);
    expect(cloneDefaultPorts('39', used)).toEqual({ oracle: 1589, web: 8089, wsh: 9089 });
    used.set(8089, 'outro');
    expect(cloneDefaultPorts('39', used).web).toBe(8090);
    expect(freePort(65500, new Set(Array.from({ length: 100 }, (_, i) => 65550 + i)))).toBeNull();
  });

  it('SSH, JMX e JMS fixos pela versão', () => {
    expect(fixedWtaPorts('39').map((f) => f.port)).toEqual([8139, 1039, 61639]);
  });
});

describe('reviewClone', () => {
  it('imagem pronta, lista existente e origem parada: nada bloqueia e avisa da configuração por versão', () => {
    const r = byId(reviewClone(base()));
    expect(r.imagem.status).toBe('ok');
    expect(r.manifesto.status).toBe('ok');
    expect(r.portasfixas).toBeUndefined();
    expect(r.portas.status).toBe('ok');
    expect(r.banco.status).toBe('ok');
    expect(r.arquivosenv.status).toBe('warn');
    expect(r.arquivosenv.detail).toContain('wta.env.39');
    expect(Object.values(r).some((i) => i.status === 'block')).toBe(false);
  });

  it('origem no ar publica o SSH/JMX/JMS que o script fixa: bloqueia e diz qual container parar', () => {
    const r = byId(reviewClone(base({ envs: [master('running')] })));
    expect(r.portasfixas.status).toBe('block');
    expect(r.portasfixas.detail).toContain('wta-master');
    expect(r.portasfixas.detail).toContain('docker stop wta-master');
    expect(r.portasfixas.detail).toContain('SSH do Karaf 8139');
  });

  it('imagem que não existe bloqueia com o como resolver', () => {
    const r = byId(reviewClone(base({ clone: { ...base().clone, imageExists: false } })));
    expect(r.imagem.status).toBe('block');
    expect(r.imagem.detail).toContain('Como resolver');
  });

  it('imagem da origem fora do padrão não impede: a criação a marca com o nome da versão', () => {
    const r = byId(reviewClone(base({ clone: { ...base().clone, imageExists: false, tagFrom: 'linux-winthor:1.93-debian' } })));
    expect(r.imagem.status).toBe('ok');
    expect(r.imagem.detail).toContain('linux-winthor:1.93-debian');
  });

  it('sem versions/<v>.features: ok se o Hub leu a lista da origem, bloqueia se não leu', () => {
    const missing = { ...base().clone, manifestExists: false };
    expect(byId(reviewClone(base({ clone: missing, manifestText: 'feature a 1' }))).manifesto.status).toBe('ok');
    const r = byId(reviewClone(base({ clone: { ...missing, originState: 'exited' } })));
    expect(r.manifesto.status).toBe('block');
    expect(r.manifesto.detail).toContain('suba o wta-master');
  });

  it('porta escolhida em uso por container rodando bloqueia e diz de quem é', () => {
    const r = byId(reviewClone(base({ envs: [master('running')], ports: { oracle: 1539, web: 8089, wsh: 9089 } })));
    expect(r.portas.status).toBe('block');
    expect(r.portas.detail).toContain('Oracle 1539 (oracle-master)');
  });

  it('a pré-checagem entra: disco e memória seguem, porta ocupada fora do Docker substitui a minha', () => {
    const items = reviewClone(
      base({
        preflight: [
          { id: 'portas', status: 'block', title: 'Porta em uso', detail: 'Windows usa a 8089.' },
          { id: 'memoria', status: 'warn', title: 'Pouca memória', detail: '5 GB.' }
        ]
      })
    );
    const r = byId(items);
    expect(r.portas.title).toBe('Porta em uso');
    expect(r.memoria.status).toBe('warn');
    expect(items.filter((i) => i.id === 'portas')).toHaveLength(1);
  });

  it('o banco usa a mesma regra da Nova versão: clone por RMAN só com a imagem XE', () => {
    const r = byId(reviewClone(base({ dbSourceImage: 'hub-oracle-local:snap' })));
    expect(r.banco.status).toBe('block');
    expect(r.banco.fixes).toContain('emptyOracle');
  });

  it('o aviso da configuração cita o .env do WSH só quando há WSH', () => {
    expect(byId(reviewClone(base({ withWsh: true }))).arquivosenv.detail).toContain('wsh-winthor/.env.39');
    expect(byId(reviewClone(base())).arquivosenv.detail).not.toContain('wsh-winthor');
  });
});

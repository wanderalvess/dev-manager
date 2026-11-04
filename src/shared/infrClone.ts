/**
 * Clonar um ambiente sem mudar nada: o ambiente novo roda na MESMA versão da origem, com a imagem do WTA que já existe
 * (o new_version_env.sh pula o build quando `linux-winthor:<versão>-<distro>` existe). Não lê o catálogo da 801, não
 * troca feature e não depende de conferência de dependências. Aqui ficam as partes puras: a versão pela imagem da
 * origem, as portas livres e a revisão do que impede o clone.
 */
import { reviewDatabase, type InfrReviewItem } from './infrNewVersionReview';
import type { PreflightItem } from './infrPreflight';
import { winthorVersionPorts, type InfrDbMode, type InfrEnvironment } from './infrWinthorVersion';

/** O que a leitura de um clone devolve da distro. */
export interface InfrCloneInfo {
  /** Versão do WinThor da origem (a do ambiente novo) */
  version: string;
  /** Imagem do WTA de origem, como o Docker a conhece (linux-winthor:39-debian) */
  image: string;
  /** A imagem existe na distro: sem ela o script faria o build de ~30 minutos */
  imageExists: boolean;
  /** Estado do container wta-<origem> (running, exited...) */
  originState: string;
  /** versions/<versão>.features já existe no INFR-Docker (o script exige o arquivo, mesmo sem usar) */
  manifestExists: boolean;
  /** Imagem da origem fora do padrão (linux-winthor:1.93-debian): a criação a marca como `image` antes do script */
  tagFrom?: string;
}

const WTA_IMAGE = /^(?:[^/\s]+\/)*linux-winthor:(\d{2,3})-([A-Za-z0-9_.]+)$/;

/** Versão e distro de uma imagem `linux-winthor:39-debian`; null quando o nome não segue o padrão. */
export function parseWtaImage(image: string | undefined): { version: string; distro: string } | null {
  const m = WTA_IMAGE.exec((image ?? '').trim());
  return m ? { version: m[1], distro: m[2] } : null;
}

/** Portas do host de uma coluna `Ports` do docker ps (`0.0.0.0:8038->8080/tcp, [::]:8038->8080/tcp`). */
export function parseHostPorts(ports: string | undefined): number[] {
  const out = new Set<number>();
  for (const m of (ports ?? '').matchAll(/:(\d{2,5})->/g)) out.add(parseInt(m[1], 10));
  return [...out];
}

/** Porta do host → container que a publica; `onlyRunning` ignora quem está parado (a porta não está ocupada). */
export function usedHostPorts(envs: InfrEnvironment[], onlyRunning = true): Map<number, string> {
  const used = new Map<number, string>();
  for (const e of envs) {
    for (const c of [e.oracle, e.wta, e.wsh]) {
      if (!c || (onlyRunning && c.state !== 'running')) continue;
      for (const p of parseHostPorts(c.ports)) if (!used.has(p)) used.set(p, c.name);
    }
  }
  return used;
}

/** Primeira porta livre a partir de `base + 50` (longe do padrão das outras versões); null se acabarem. */
export function freePort(base: number, used: Map<number, string> | Set<number>): number | null {
  for (let p = base + 50; p <= 65535; p++) if (!used.has(p)) return p;
  return null;
}

/** Portas padrão do Oracle, do WTA e do WSH para um clone: as da versão estão com a origem, então vão as próximas livres. */
export function cloneDefaultPorts(version: string, used: Map<number, string>): { oracle: number | null; web: number | null; wsh: number | null } {
  const p = winthorVersionPorts(version);
  const taken = new Map(used);
  const pick = (base: number) => {
    const port = freePort(base, taken);
    if (port !== null) taken.set(port, 'clone');
    return port;
  };
  return { oracle: pick(p.oracle), web: pick(p.web), wsh: pick(p.wsh) };
}

/** SSH, JMX e JMS do WTA: o new_version_env.sh os fixa pela versão (sem opção), então um clone na mesma versão repete os da origem. */
export function fixedWtaPorts(version: string): { label: string; port: number }[] {
  const p = winthorVersionPorts(version);
  return [
    { label: 'SSH do Karaf', port: p.ssh },
    { label: 'JMX', port: p.jmx },
    { label: 'JMS', port: p.jms }
  ];
}

export interface InfrCloneReviewInput {
  clone: InfrCloneInfo;
  /** Manifesto que o Hub gravará por conta própria, lido do WTA de origem (só quando versions/<v>.features não existe) */
  manifestText?: string;
  from: string;
  name: string;
  dbMode: InfrDbMode;
  dbSource?: string;
  dbSourceImage?: string;
  dbContainer?: string;
  /** Ambientes da distro (containers e portas) */
  envs: InfrEnvironment[];
  /** Portas escolhidas para o Oracle, o WTA e o WSH */
  ports: { oracle?: number; web?: number; wsh?: number };
  /** Disco, memória, rede (e porta ocupada fora do Docker) lidos da distro */
  preflight?: PreflightItem[];
  /** O ambiente novo leva WSH (jar escolhido): o .env.<versão> dele também é regravado */
  withWsh?: boolean;
}

const list = (xs: string[]) => (xs.length > 4 ? `${xs.slice(0, 4).join(', ')} e mais ${xs.length - 4}` : xs.join(', '));

/** O que confere antes de clonar: imagem, lista de features, portas e banco. */
export function reviewClone(i: InfrCloneReviewInput): InfrReviewItem[] {
  const c = i.clone;
  const items: InfrReviewItem[] = [];

  items.push(
    c.imageExists
      ? { id: 'imagem', status: 'ok', title: 'Imagem do WTA pronta', detail: `${c.image} já existe: o ambiente sobe em minutos, sem o build de ~30 minutos e sem mexer nas features.` }
      : c.tagFrom
        ? {
            id: 'imagem',
            status: 'ok',
            title: 'Imagem do WTA da origem',
            detail: `A imagem do wta-${i.from} (${c.tagFrom}) não diz a versão: a criação a marca também como ${c.image} (docker tag, sem copiar nada) e o ambiente sobe com ela, sem build.`
          }
        : {
          id: 'imagem',
          status: 'block',
          title: 'A imagem do WTA não existe',
          detail: `${c.image} não está nesta distro, e sem ela o script faria o build inteiro. Como resolver: use a opção de atualizar para uma versão, que monta a imagem pelo manifesto, ou recupere a imagem (docker pull/load).`
        }
  );

  if (c.manifestExists) {
    items.push({ id: 'manifesto', status: 'ok', title: `Lista de features da ${c.version}`, detail: `versions/${c.version}.features já existe e fica como está; o script só exige o arquivo, a imagem pronta não o usa.` });
  } else if (i.manifestText) {
    items.push({ id: 'manifesto', status: 'ok', title: `Lista de features da ${c.version}`, detail: `versions/${c.version}.features não existe: o Hub grava a lista do próprio wta-${i.from}, como ele está.` });
  } else {
    items.push({
      id: 'manifesto',
      status: 'block',
      title: `Falta versions/${c.version}.features`,
      detail: `O script exige o arquivo e o Hub não conseguiu ler a lista do wta-${i.from} (${c.originState}). Como resolver: suba o wta-${i.from} e confira de novo.`
    });
  }

  // O que o script fixa pela versão e que a origem já publica: só dá para ter um dos dois no ar
  const used = usedHostPorts(i.envs, true);
  const fixed = fixedWtaPorts(c.version)
    .filter((f) => used.has(f.port))
    .map((f) => ({ ...f, by: used.get(f.port)! }));
  if (fixed.length > 0) {
    const owner = fixed[0].by;
    items.push({
      id: 'portasfixas',
      status: 'block',
      title: 'Portas fixas do WTA já em uso',
      detail:
        `${list(fixed.map((f) => `${f.label} ${f.port} (${f.by})`))}. O script fixa SSH, JMX e JMS pela versão, então dois WTA da ${c.version} não ficam no ar juntos. ` +
        `Como resolver: pare o ${owner} (docker stop ${owner}) antes de criar, ou clone para outra versão.`
    });
  }

  const chosen = [
    { label: 'Oracle', port: i.dbMode === 'existing' ? undefined : i.ports.oracle },
    { label: 'WTA', port: i.ports.web },
    { label: 'WSH', port: i.ports.wsh }
  ].filter((p): p is { label: string; port: number } => !!p.port);
  const clash = chosen.filter((p) => used.has(p.port)).map((p) => `${p.label} ${p.port} (${used.get(p.port)})`);
  const pre = i.preflight ?? [];
  // Uma porta ocupada por programa do Windows (a pré-checagem só devolve a de porta quando bloqueia) também impede
  const outside = pre.find((p) => p.id === 'portas' && p.status === 'block');
  items.push(
    clash.length > 0
      ? { id: 'portas', status: 'block', title: 'Portas já em uso', detail: `${list(clash)}. Troque em Ajustes.` }
      : (outside ?? { id: 'portas', status: 'ok', title: 'Portas do ambiente novo livres', detail: chosen.map((p) => `${p.label} ${p.port}`).join(', ') + '.' })
  );
  items.push(...pre.filter((p) => p.id !== 'portas'));

  // wta.env.<v> e .env.<v> são por versão, não por ambiente: o do clone sobrescreve o que a origem usou ao ser criada
  items.push({
    id: 'arquivosenv',
    status: 'warn',
    title: `Configuração da ${c.version} regravada`,
    detail:
      `linux-winthor/wta.env.${c.version}${i.withWsh ? ` e wsh-winthor/.env.${c.version}` : ''} são por versão e passam a apontar para o banco do ${i.name}. ` +
      `Os containers que já rodam não mudam, mas recriar o ${i.from} depois com esses arquivos o ligaria ao banco novo: guarde uma cópia antes se for recriá-lo.`
  });

  items.push(
    reviewDatabase({
      preview: { success: true },
      manifestSource: 'preview',
      version: c.version,
      from: i.from,
      dbMode: i.dbMode,
      dbSource: i.dbSource,
      dbSourceImage: i.dbSourceImage,
      dbContainer: i.dbContainer
    })
  );
  return items;
}

/**
 * Estado da distro que decide se a criação sobe do jeito que a pessoa espera, e a conferência dele (Assistente INFR →
 * Nova versão, "Antes de criar"). O new_version_env.sh NÃO recria o que já existe: se `wta-<nome>` existe só dá
 * `docker start`, o volume `wta-<nome>-data` só recebe o conteúdo da imagem na primeira criação, e a imagem
 * `linux-winthor:<v>-debian` já existente pula o build. Aqui ficam o roteiro de leitura (só leitura), a leitura da saída e as
 * conferências. Os comandos que apagam algo só aparecem como texto para a pessoa rodar; o Hub nunca os executa.
 */
import { parseDiagnosticProbe } from './infrDiagnostic';
import { fixedWtaPorts, parseWtaImage, usedHostPorts } from './infrClone';
import type { InfrReviewItem } from './infrNewVersionReview';
import { isValidEnvName, isValidWinthorVersion, type InfrEnvironment } from './infrWinthorVersion';

export interface InfrBuildState {
  /** Imagens `linux-winthor:*` da distro, com o ID curto */
  images: { tag: string; id: string }[];
  /** ID curto da imagem do container wta-<origem> */
  originImageId?: string;
  /** Volumes `wta-<nome>-data` que já existem */
  volumes: string[];
  /** O jar do WSH escolhido existe na distro (undefined = não conferido) */
  jarExists?: boolean;
  /** Nome do ambiente novo para o qual os volumes foram lidos (a leitura não se repete a cada letra do nome) */
  forName?: string;
}

const SAFE_PATH = /^\/[a-zA-Z0-9_./-]+$/;
const shortId = (id: string) => id.trim().replace(/^sha256:/, '').slice(0, 12);

/** Roteiro de leitura (bash na distro): imagens do WTA, imagem da origem, volume do WTA novo e o jar do WSH. */
export function buildStateScript(o: { name: string; from: string; wshJar?: string }): string {
  if (!isValidEnvName(o.name) || !isValidEnvName(o.from)) return 'echo invalid';
  const lines = [
    "echo '@@img'; docker images --format '{{.Repository}}:{{.Tag}}|{{.ID}}' 2>/dev/null | grep '^linux-winthor:'",
    `echo '@@origem'; docker inspect -f '{{.Image}}' wta-${o.from.trim()} 2>/dev/null`,
    `echo '@@vol'; docker volume ls -q 2>/dev/null | grep -x 'wta-${o.name.trim()}-data'`
  ];
  if (o.wshJar && SAFE_PATH.test(o.wshJar.trim())) lines.push(`echo '@@jar'; [ -f '${o.wshJar.trim()}' ] && echo yes || echo no`);
  lines.push("echo '@@fim'");
  return lines.join('\n');
}

export function parseBuildState(output: string): InfrBuildState {
  const s = parseDiagnosticProbe(output);
  const images = (s.get('img') ?? [])
    .map((l) => l.trim().split('|'))
    .filter((p) => p.length === 2 && p[0] && p[1])
    .map(([tag, id]) => ({ tag, id: shortId(id) }));
  const origin = (s.get('origem') ?? []).map((l) => l.trim()).find(Boolean);
  const jar = (s.get('jar') ?? []).map((l) => l.trim()).find(Boolean);
  return {
    images,
    ...(origin ? { originImageId: shortId(origin) } : {}),
    volumes: (s.get('vol') ?? []).map((l) => l.trim()).filter(Boolean),
    ...(jar ? { jarExists: jar === 'yes' } : {})
  };
}

export interface InfrBuildStateReviewInput {
  /** Atualizar para uma versão ou Só clonar */
  mode: 'update' | 'clone';
  version: string;
  name: string;
  from: string;
  state?: InfrBuildState;
  envs: InfrEnvironment[];
  /** O ambiente novo leva WSH (jar escolhido) */
  withWsh: boolean;
}

const list = (xs: string[]) => (xs.length > 4 ? `${xs.slice(0, 4).join(', ')} e mais ${xs.length - 4}` : xs.join(', '));

/** Conferências que dependem do que já existe na distro. Nada aqui bloqueia por palpite: só pelo que o script faria. */
export function reviewBuildState(i: InfrBuildStateReviewInput): InfrReviewItem[] {
  const items: InfrReviewItem[] = [];
  if (!isValidWinthorVersion(i.version) || !isValidEnvName(i.name)) return items;
  const image = `linux-winthor:${i.version}-debian`;
  const env = i.envs.find((e) => e.name === i.name);

  // 2. Imagem da versão com o mesmo ID de outra: o build é pulado e o ambiente sobe com as features erradas
  if (i.mode === 'update' && i.state) {
    const own = i.state.images.find((x) => x.tag === image);
    if (own) {
      const twins = i.state.images.filter((x) => x.id === own.id && x.tag !== image).map((x) => x.tag);
      if (i.state.originImageId === own.id) twins.push(`wta-${i.from}`);
      if (twins.length > 0) {
        items.push({
          id: 'imagemmesma',
          status: 'warn',
          title: `${image} é a mesma imagem de outra`,
          detail:
            `${image} tem o mesmo ID de ${list(twins)}: provavelmente é só um nome posto sobre a imagem da origem (o "Só clonar" faz isso). A criação vê que ela existe, pula o build e o ambiente sobe com as features da origem, sem as da ${i.version}. ` +
            `Como resolver: tire só o nome (não apaga a imagem da origem) com "docker rmi ${image}" e gere de novo, ou siga se for isso mesmo que você quer.`
        });
      }
    }
  }

  // 3. Portas que o script fixa pela versão (SSH, JMX, JMS) em uso por outro WTA
  if (i.mode === 'update') {
    const used = usedHostPorts(i.envs, true);
    const clash = fixedWtaPorts(i.version)
      .filter((f) => used.has(f.port) && used.get(f.port) !== `wta-${i.name}`)
      .map((f) => ({ ...f, by: used.get(f.port)! }));
    if (clash.length > 0) {
      items.push({
        id: 'portasfixas',
        status: 'block',
        title: 'Portas fixas do WTA já em uso',
        detail:
          `${list(clash.map((f) => `${f.label} ${f.port} (${f.by})`))}. O script fixa SSH, JMX e JMS pela versão, então dois WTA da ${i.version} não ficam no ar juntos e o docker run falharia com "port is already allocated". ` +
          `Como resolver: pare o ${clash[0].by} (docker stop ${clash[0].by}) antes de criar.`
      });
    }
  }

  // 4. Container ou volume de uma tentativa anterior: o script só reinicia o que existe, com a configuração antiga
  const leftovers = [env?.wta ? `wta-${i.name}` : '', i.withWsh && env?.wsh ? `wsh-${i.name}` : ''].filter(Boolean);
  const volume = i.state && i.state.forName === i.name && i.state.volumes.includes(`wta-${i.name}-data`) ? `wta-${i.name}-data` : '';
  if (leftovers.length > 0 || volume) {
    const cmds = [leftovers.length ? `docker rm -f ${leftovers.join(' ')}` : '', volume ? `docker volume rm ${volume}` : ''].filter(Boolean);
    items.push({
      id: 'recriar',
      status: 'warn',
      title: `${list([...leftovers, volume].filter(Boolean))} já existe`,
      detail:
        `O script não recria o que existe: ${leftovers.length ? 'ele só dá docker start no container antigo, com a configuração antiga' : ''}${leftovers.length && volume ? ', e ' : ''}${volume ? `o volume ${volume} mantém o conteúdo da primeira criação (as features antigas)` : ''}. ` +
        `Se é uma tentativa nova de verdade, recrie antes de criar. Estes comandos apagam: rode você mesmo no terminal da distro, só se não precisar do que está lá: ${cmds.join(' && ')}.`
    });
  }

  // 5. wta.env.<v> e .env.<v> são por versão
  if (i.mode === 'update') {
    const same = i.envs.filter((e) => e.name !== i.name && e.wta && parseWtaImage(e.wta.image)?.version === i.version).map((e) => e.name);
    if (same.length > 0) {
      items.push({
        id: 'arquivosenv',
        status: 'warn',
        title: `Configuração da ${i.version} regravada`,
        detail:
          `linux-winthor/wta.env.${i.version}${i.withWsh ? ` e wsh-winthor/.env.${i.version}` : ''} são por versão e passam a apontar para o banco do ${i.name}. ` +
          `O ${list(same)} já usa a ${i.version}: se for recriado depois com esses arquivos, cairia no banco novo. Guarde uma cópia antes se for recriá-lo.`
      });
    }
  }

  // 8. WSH: o script para se o jar ou o wsh-<origem> não existem
  if (i.withWsh) {
    const missing: string[] = [];
    if (i.state?.jarExists === false) missing.push('o jar do WSH escolhido não existe nesta distro');
    if (!i.envs.find((e) => e.name === i.from)?.wsh) missing.push(`o container wsh-${i.from} não existe (o script o usa de modelo)`);
    if (missing.length > 0) {
      items.push({
        id: 'jarwsh',
        status: 'block',
        title: 'O WSH não tem de onde sair',
        detail: `${missing.join('; ')}. O script pararia em "Jar do WSH não encontrado" depois de restaurar o banco. Como resolver: escolha outro jar ou o ambiente sem WSH, ou use uma origem que tenha wsh-<nome>.`
      });
    }
  }
  return items;
}

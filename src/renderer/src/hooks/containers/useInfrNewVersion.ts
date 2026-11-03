import { useCallback, useEffect, useRef, useState } from 'react';
import { cloneDefaultPorts, parseWtaImage, reviewClone, usedHostPorts } from '../../../../shared/infrClone';
import {
  buildNewVersionEnvCommand,
  isValidEnvName,
  isValidWinthorVersion,
  winthorVersionPorts,
  type InfrDbMode,
  type InfrEnvironmentsResult
} from '../../../../shared/infrWinthorVersion';
import type { InfrEnvTemplate, InfrManifestSource, InfrVersionPreview } from '../../../../shared/infrVersionManifest';
import { reviewBlocks, reviewNewVersion, type InfrReviewFix } from '../../../../shared/infrNewVersionReview';
import { useInfrOriginCheck } from './useInfrOriginCheck';

/** Campos que a leitura da origem usa: mudar um deles descarta a leitura; portas e banco não, a conferência recalcula na hora. */
const PREVIEW_KEYS: (keyof InfrNewVersionForm)[] = ['from', 'version', 'wshJar', 'originWtaUrl', 'dryRun', 'clone'];

export interface InfrNewVersionForm {
  from: string;
  version: string;
  name: string;
  dbMode: InfrDbMode;
  dbSource: string;
  dbContainer: string;
  oraclePort: string;
  wtaPort: string;
  wshPort: string;
  wshJar: string;
  originWtaUrl: string;
  /** '1' = ensaiar a resolução no Karaf de origem na prévia */
  dryRun: string;
  /** '1' = clonar sem mudar nada: mesma versão da origem, sem catálogo da 801 nem troca de feature */
  clone: string;
}

const EMPTY: InfrNewVersionForm = {
  from: '', version: '', name: '', dbMode: 'clone', dbSource: '', dbContainer: '',
  oraclePort: '', wtaPort: '', wshPort: '', wshJar: '', originWtaUrl: '', dryRun: '', clone: ''
};

/** Portas livres para um clone (as da versão estão com a origem); null fora do modo clone. */
type ClonePorts = ReturnType<typeof cloneDefaultPorts> | null;

/** Campos que seguem a versão, a origem e o nome enquanto o usuário não os edita. */
type Derived = 'dbSource' | 'dbContainer' | 'oraclePort' | 'wtaPort' | 'wshPort';

function derive(form: InfrNewVersionForm, edited: Set<Derived>, clonePorts: ClonePorts = null): InfrNewVersionForm {
  const next = { ...form };
  const ports = isValidWinthorVersion(form.version) ? winthorVersionPorts(form.version) : null;
  const set = (key: Derived, value: string) => {
    if (!edited.has(key)) next[key] = value;
  };
  const port = (clone: number | null | undefined, byVersion: number | undefined) => String(clone ?? byVersion ?? '');
  set('dbSource', form.from ? `oracle-${form.from}` : '');
  set('dbContainer', form.name ? `oracle-${form.name}` : '');
  set('oraclePort', ports ? port(clonePorts?.oracle, ports.oracle) : '');
  set('wtaPort', ports ? port(clonePorts?.web, ports.web) : '');
  set('wshPort', ports ? port(clonePorts?.wsh, ports.wsh) : '');
  return next;
}

const toPort = (v: string) => (v.trim() ? parseInt(v, 10) : undefined);

/** Aba Nova versão do Assistente INFR: escolhas do usuário, prévia pelo catálogo da 801 e geração. */
export function useInfrNewVersion(distro?: string, infrPath?: string, onGenerated?: (name: string) => void) {
  const [form, setForm] = useState<InfrNewVersionForm>(EMPTY);
  const [edited, setEdited] = useState<Set<Derived>>(new Set());
  const [envs, setEnvs] = useState<InfrEnvironmentsResult | null>(null);
  const envsRef = useRef<InfrEnvironmentsResult | null>(null);
  envsRef.current = envs;
  const [loadingEnvs, setLoadingEnvs] = useState(false);
  const [preview, setPreview] = useState<InfrVersionPreview | null>(null);
  // Com versions/<v>.features já existente, a geração usa ele, a menos que o usuário escolha substituir
  const [manifestSource, setManifestSource] = useState<InfrManifestSource>('preview');
  const [envTemplate, setEnvTemplate] = useState<InfrEnvTemplate | null>(null);
  const [edits, setEdits] = useState<{ wta: Record<string, string>; wsh: Record<string, string> }>({ wta: {}, wsh: {} });

  // Configuração do WTA/WSH de origem: recarrega quando a origem muda (edições anteriores são descartadas)
  useEffect(() => {
    if (!form.from || !window.electronAPI?.getInfrEnvTemplate) return;
    let alive = true;
    window.electronAPI.getInfrEnvTemplate({ distro, from: form.from }).then((t) => {
      if (!alive) return;
      setEnvTemplate(t);
      setEdits({ wta: {}, wsh: {} });
    });
    return () => {
      alive = false;
    };
  }, [distro, form.from]);

  const editEnv = (target: 'wta' | 'wsh', key: string, value: string) =>
    setEdits((e) => ({ ...e, [target]: { ...e[target], [key]: value } }));
  const [busy, setBusy] = useState<'preview' | 'generate' | null>(null);
  const [message, setMessage] = useState('');

  /** Portas livres do clone: as próximas às da versão, que a origem já publica. Só no modo clone. */
  const clonePortsFor = (f: InfrNewVersionForm, from: InfrEnvironmentsResult | null = envsRef.current): ClonePorts =>
    f.clone === '1' && from?.environments.length && isValidWinthorVersion(f.version) ? cloneDefaultPorts(f.version, usedHostPorts(from.environments)) : null;

  const loadEnvironments = useCallback(async () => {
    if (!window.electronAPI?.listInfrEnvironments) return;
    setLoadingEnvs(true);
    try {
      const res = await window.electronAPI.listInfrEnvironments(distro);
      setEnvs(res);
      if (res.success && res.environments.length) {
        setForm((f) => (f.from ? f : derive({ ...f, from: res.environments[0].name }, edited, clonePortsFor({ ...f, from: res.environments[0].name }, res))));
      }
    } finally {
      setLoadingEnvs(false);
    }
  }, [distro, edited]);

  const update = (key: keyof InfrNewVersionForm, value: string) => {
    const nextEdited = new Set(edited);
    if (['dbSource', 'dbContainer', 'oraclePort', 'wtaPort', 'wshPort'].includes(key)) nextEdited.add(key as Derived);
    setEdited(nextEdited);
    setForm((f) => {
      const next = { ...f, [key]: key === 'version' ? value.replace(/\D/g, '').slice(0, 3) : value };
      return derive(next, nextEdited, clonePortsFor(next));
    });
    if (PREVIEW_KEYS.includes(key)) setPreview(null);
  };

  // Clonar sem mudar nada: a versão é a da origem, lida da imagem do WTA dela (linux-winthor:39-debian)
  const clone = form.clone === '1';
  const originImage = envs?.environments.find((e) => e.name === form.from)?.wta?.image;
  const originVersion = parseWtaImage(originImage)?.version;
  useEffect(() => {
    if (!clone || !originVersion || form.version === originVersion) return;
    setForm((f) => {
      const next = { ...f, version: originVersion };
      return derive(next, edited, clonePortsFor(next));
    });
    setPreview(null);
  }, [clone, originVersion, form.version]); // eslint-disable-line react-hooks/exhaustive-deps
  // Ao entrar no modo clone ou quando os ambientes chegam, as portas passam para as livres (as editadas à mão ficam)
  useEffect(() => {
    if (!clone || !envs?.environments.length) return;
    setForm((f) => derive(f, edited, clonePortsFor(f)));
  }, [clone, envs]); // eslint-disable-line react-hooks/exhaustive-deps

  const newEnv = {
    name: form.name,
    from: form.from,
    wshJar: form.wshJar || undefined,
    dbMode: form.dbMode,
    dbSource: form.dbSource || undefined,
    dbContainer: form.dbContainer || undefined,
    oraclePort: toPort(form.oraclePort),
    wtaPort: toPort(form.wtaPort),
    wshPort: toPort(form.wshPort),
    tagImage: clone ? preview?.clone?.tagFrom : undefined
  };
  const command = buildNewVersionEnvCommand({ ...newEnv, version: form.version });
  const canPreview = isValidWinthorVersion(form.version) && isValidEnvName(form.from) && !busy;

  const rawOrigin = useInfrOriginCheck(distro, infrPath, form.from);
  // Clonar não lê o catálogo da 801: WTA parado e login do WTA não impedem; só a pasta do INFR-Docker
  const origin = clone
    ? { ...rawOrigin, blocked: !rawOrigin.result || !rawOrigin.result.success || rawOrigin.result.items.some((i) => i.id === 'pasta' && i.status === 'block') }
    : rawOrigin;
  const isPort = (v: string) => /^\d{2,5}$/.test(v.trim());
  // O primeiro dado que falta no formulário (vazio = completo); a conferência da origem e a leitura vêm depois
  const formIssue = !form.from
    ? 'Escolha o ambiente de origem.'
    : clone && !originVersion && !isValidWinthorVersion(form.version)
      ? `A imagem do WTA do ${form.from} (${originImage || 'sem imagem'}) não diz a versão: informe a versão do ${form.from} na frase.`
      : !isValidWinthorVersion(form.version)
      ? 'Informe a versão nova (ex.: 40).'
      : !isValidEnvName(form.name) || form.name === form.from
        ? 'Dê um nome ao ambiente novo, diferente da origem.'
        : !isValidEnvName(form.dbContainer)
          ? 'Escolha o Oracle do ambiente novo (em Ajustes).'
          : form.dbMode === 'clone' && !isValidEnvName(form.dbSource)
            ? 'Escolha o Oracle de onde copiar o banco (em Ajustes).'
            : form.dbMode !== 'existing' && !isPort(form.oraclePort)
              ? 'Informe a porta do Oracle (em Ajustes).'
              : !isPort(form.wtaPort)
                ? 'Informe a porta do WTA (em Ajustes).'
                : form.wshJar && !isPort(form.wshPort)
                  ? 'Informe a porta do WSH (em Ajustes).'
                  : '';

  const sourceImage = envs?.oracles.find((o) => o.name === form.dbSource)?.image;
  const review = !preview
    ? []
    : clone && preview.success && preview.clone
      ? reviewClone({
          clone: preview.clone,
          manifestText: preview.manifestText,
          from: form.from,
          name: form.name,
          dbMode: form.dbMode,
          dbSource: form.dbSource,
          dbSourceImage: sourceImage,
          dbContainer: form.dbContainer,
          envs: envs?.environments ?? [],
          ports: { oracle: toPort(form.oraclePort), web: toPort(form.wtaPort), wsh: form.wshJar ? toPort(form.wshPort) : undefined },
          preflight: preview.preflight,
          withWsh: !!form.wshJar
        })
      : reviewNewVersion({
          preview,
          manifestSource,
          version: form.version,
          from: form.from,
          dbMode: form.dbMode,
          dbSource: form.dbSource,
          dbSourceImage: sourceImage,
          dbContainer: form.dbContainer,
          wshJar: form.wshJar || undefined
        });
  const blocked = reviewBlocks(review);
  // O que impede o Gerar agora, na ordem em que a pessoa resolve (vazio = pode gerar)
  const issue =
    formIssue ||
    (origin.loading && !origin.result
      ? 'Conferindo a origem (pasta, WTA e login)...'
      : origin.blocked
        ? 'Resolva o que está em vermelho em Antes de gerar.'
        : busy === 'preview'
          ? clone
            ? 'Conferindo a imagem e as portas do clone...'
            : 'Lendo a origem e o catálogo da 801...'
          : !preview
            ? clone
              ? 'Falta conferir a imagem e as portas do clone.'
              : 'Falta ler a origem e o catálogo da 801.'
            : !preview.success || blocked
              ? 'Resolva o que está em vermelho em Antes de gerar.'
              : '');
  const canGenerate = !issue && !!command && busy === null;

  /** Saídas da conferência quando o clone não serve: usar o Oracle de origem direto ou subir um vazio. */
  const applyFix = (fix: InfrReviewFix) => {
    if (fix === 'useSourceOracle') {
      const next = new Set(edited).add('dbContainer');
      setEdited(next);
      setForm((f) => derive({ ...f, dbMode: 'existing', dbContainer: f.dbSource }, next, clonePortsFor(f)));
    } else {
      setForm((f) => derive({ ...f, dbMode: 'empty' }, edited, clonePortsFor(f)));
    }
  };

  const runPreview = async (): Promise<InfrVersionPreview | undefined> => {
    if (!window.electronAPI?.previewInfrVersion || !canPreview) return undefined;
    setBusy('preview');
    setMessage('');
    try {
      const res = await window.electronAPI.previewInfrVersion({
        distro,
        infrPath,
        fromEnv: form.from,
        targetVersion: form.version,
        wshJar: form.wshJar || undefined,
        originWtaUrl: form.originWtaUrl || undefined,
        dryRun: form.dryRun === '1' && !clone,
        ...(clone ? { cloneOnly: true, ports: { oracle: toPort(form.oraclePort), web: toPort(form.wtaPort), wsh: form.wshJar ? toPort(form.wshPort) : undefined } } : {})
      });
      setPreview(res);
      setManifestSource(res.existing ? 'existing' : 'preview');
      return res;
    } finally {
      setBusy(null);
    }
  };

  const generate = async (): Promise<boolean> => {
    const api = window.electronAPI;
    if (!api?.saveInfrVersionManifest || !api.runInfrSetupScript || !preview || !command) return false;
    if (!clone && !preview.manifestText) return false;
    setBusy('generate');
    try {
      const keepExisting = !!preview.existing && manifestSource === 'existing';
      // Clone: o arquivo da versão fica como está; só se não existir o Hub grava a lista lida do WTA de origem (o script exige o arquivo)
      const saved = clone
        ? preview.manifestText
          ? await api.saveInfrVersionManifest({ infrPath, targetVersion: form.version, manifestText: preview.manifestText, overwrite: false })
          : { success: true, path: `versions/${form.version}.features (mantido)` }
        : keepExisting
          ? { success: true, path: `${preview.existing!.path} (mantido)` }
          : await api.saveInfrVersionManifest({ infrPath, targetVersion: form.version, manifestText: preview.manifestText!, overwrite: !!preview.existing });
      if (!saved.success) {
        setMessage(saved.error || 'Não foi possível gravar o manifesto.');
        return false;
      }
      const env = await api.saveInfrEnvFiles?.({
        distro,
        infrPath,
        version: form.version,
        name: form.name,
        from: form.from,
        dbContainer: form.dbContainer || undefined,
        wshJar: form.wshJar || undefined,
        wshPort: toPort(form.wshPort),
        wtaEdits: edits.wta,
        wshEdits: edits.wsh
      });
      if (env && !env.success) {
        setMessage(env.error || 'Não foi possível gravar a configuração do WTA/WSH.');
        return false;
      }
      const res = await api.runInfrSetupScript('version', { distro, infrPath, winthorVersion: form.version, newEnv });
      setMessage(`Manifesto: ${saved.path}. Configuração: ${env?.path ?? '—'}. ${res.output}`);
      if (res.success) onGenerated?.(form.name.trim());
      return !!res.success;
    } finally {
      setBusy(null);
    }
  };

  return {
    form, update, envs, loadingEnvs, loadEnvironments, preview, busy, message, command, canPreview, runPreview, generate,
    /** Descarta a prévia lida (um novo pedido da IA começa lendo a origem de novo) */
    resetPreview: () => setPreview(null),
    /** Clonar sem mudar nada, a versão e a imagem da origem (para mostrar na tela) */
    clone, originVersion, originImage,
    envTemplate, edits, editEnv, manifestSource, setManifestSource,
    formIssue, issue, canGenerate, review, blocked, applyFix, origin
  };
}

export type InfrNewVersionState = ReturnType<typeof useInfrNewVersion>;

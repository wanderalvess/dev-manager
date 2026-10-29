import { useCallback, useEffect, useState } from 'react';
import {
  buildNewVersionEnvCommand,
  isValidEnvName,
  isValidWinthorVersion,
  winthorVersionPorts,
  type InfrDbMode,
  type InfrEnvironmentsResult
} from '../../../../shared/infrWinthorVersion';
import type { InfrEnvTemplate, InfrVersionPreview } from '../../../../shared/infrVersionManifest';

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
}

const EMPTY: InfrNewVersionForm = {
  from: '', version: '', name: '', dbMode: 'clone', dbSource: '', dbContainer: '',
  oraclePort: '', wtaPort: '', wshPort: '', wshJar: '', originWtaUrl: ''
};

/** Campos que seguem a versão, a origem e o nome enquanto o usuário não os edita. */
type Derived = 'dbSource' | 'dbContainer' | 'oraclePort' | 'wtaPort' | 'wshPort';

function derive(form: InfrNewVersionForm, edited: Set<Derived>): InfrNewVersionForm {
  const next = { ...form };
  const ports = isValidWinthorVersion(form.version) ? winthorVersionPorts(form.version) : null;
  const set = (key: Derived, value: string) => {
    if (!edited.has(key)) next[key] = value;
  };
  set('dbSource', form.from ? `oracle-${form.from}` : '');
  set('dbContainer', form.name ? `oracle-${form.name}` : '');
  set('oraclePort', ports ? String(ports.oracle) : '');
  set('wtaPort', ports ? String(ports.web) : '');
  set('wshPort', ports ? String(ports.wsh) : '');
  return next;
}

const toPort = (v: string) => (v.trim() ? parseInt(v, 10) : undefined);

/** Aba Nova versão do Assistente INFR: escolhas do usuário, prévia pelo catálogo da 801 e geração. */
export function useInfrNewVersion(distro?: string, infrPath?: string) {
  const [form, setForm] = useState<InfrNewVersionForm>(EMPTY);
  const [edited, setEdited] = useState<Set<Derived>>(new Set());
  const [envs, setEnvs] = useState<InfrEnvironmentsResult | null>(null);
  const [loadingEnvs, setLoadingEnvs] = useState(false);
  const [preview, setPreview] = useState<InfrVersionPreview | null>(null);
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

  const loadEnvironments = useCallback(async () => {
    if (!window.electronAPI?.listInfrEnvironments) return;
    setLoadingEnvs(true);
    try {
      const res = await window.electronAPI.listInfrEnvironments(distro);
      setEnvs(res);
      if (res.success && res.environments.length) {
        setForm((f) => (f.from ? f : derive({ ...f, from: res.environments[0].name }, edited)));
      }
    } finally {
      setLoadingEnvs(false);
    }
  }, [distro, edited]);

  const update = (key: keyof InfrNewVersionForm, value: string) => {
    const nextEdited = new Set(edited);
    if (['dbSource', 'dbContainer', 'oraclePort', 'wtaPort', 'wshPort'].includes(key)) nextEdited.add(key as Derived);
    setEdited(nextEdited);
    setForm((f) => derive({ ...f, [key]: key === 'version' ? value.replace(/\D/g, '').slice(0, 3) : value }, nextEdited));
    setPreview(null);
  };

  const newEnv = {
    name: form.name,
    from: form.from,
    wshJar: form.wshJar || undefined,
    dbMode: form.dbMode,
    dbSource: form.dbSource || undefined,
    dbContainer: form.dbContainer || undefined,
    oraclePort: toPort(form.oraclePort),
    wtaPort: toPort(form.wtaPort),
    wshPort: toPort(form.wshPort)
  };
  const command = buildNewVersionEnvCommand({ ...newEnv, version: form.version });
  const canPreview = isValidWinthorVersion(form.version) && isValidEnvName(form.from) && !busy;

  const runPreview = async () => {
    if (!window.electronAPI?.previewInfrVersion || !canPreview) return;
    setBusy('preview');
    setMessage('');
    try {
      setPreview(
        await window.electronAPI.previewInfrVersion({
          distro,
          infrPath,
          fromEnv: form.from,
          targetVersion: form.version,
          wshJar: form.wshJar || undefined,
          originWtaUrl: form.originWtaUrl || undefined
        })
      );
    } finally {
      setBusy(null);
    }
  };

  const generate = async () => {
    const api = window.electronAPI;
    if (!api?.saveInfrVersionManifest || !api.runInfrSetupScript || !preview?.manifestText || !command) return;
    setBusy('generate');
    try {
      const saved = await api.saveInfrVersionManifest({ infrPath, targetVersion: form.version, manifestText: preview.manifestText });
      if (!saved.success) {
        setMessage(saved.error || 'Não foi possível gravar o manifesto.');
        return;
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
        return;
      }
      const res = await api.runInfrSetupScript('version', { distro, infrPath, winthorVersion: form.version, newEnv });
      setMessage(`Manifesto: ${saved.path}. Configuração: ${env?.path ?? '—'}. ${res.output}`);
    } finally {
      setBusy(null);
    }
  };

  return {
    form, update, envs, loadingEnvs, loadEnvironments, preview, busy, message, command, canPreview, runPreview, generate,
    envTemplate, edits, editEnv
  };
}

export type InfrNewVersionState = ReturnType<typeof useInfrNewVersion>;

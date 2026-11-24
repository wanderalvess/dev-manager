import React, { useEffect, useState } from 'react';
import { Paperclip, Send } from 'lucide-react';
import {
  RESULT_LABEL,
  guessJiraKey,
  normalizeJiraKey,
  summarizeEvidence,
  type EvidenceJiraIssue,
  type EvidenceJiraPreview,
  type EvidenceJiraResult,
  type EvidenceSession
} from '../../../../shared/evidenceTypes';
import { Modal } from '../ui/Modal';

const INPUT = 'h-10 px-3 border border-input rounded-[10px] bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring w-full';
const BTN =
  'h-10 px-3 border border-border rounded-[10px] bg-card hover:bg-muted text-sm font-medium text-foreground flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_PRIMARY =
  'h-10 px-4 rounded-[10px] bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const LABEL = 'text-xs font-medium text-muted-foreground';

const formatSize = (n?: number): string => (n === undefined ? '' : n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export interface JiraPublishModalProps {
  session: EvidenceSession;
  onClose: () => void;
  lookupIssue: (key: string) => Promise<EvidenceJiraIssue>;
  previewJira: (includeVideos: boolean, attachFiles: boolean) => Promise<EvidenceJiraPreview>;
  publish: (key: string, includeVideos: boolean, attachFiles: boolean) => Promise<EvidenceJiraResult | undefined>;
}

/** Última conferência antes de publicar: mostra o comentário e os anexos exatos e só envia ao confirmar. */
export const JiraPublishModal: React.FC<JiraPublishModalProps> = ({ session, onClose, lookupIssue, previewJira, publish }) => {
  const [key, setKey] = useState(() => guessJiraKey(session.task));
  const [includeVideos, setIncludeVideos] = useState(true);
  const [preview, setPreview] = useState<EvidenceJiraPreview | null>(null);
  const [issue, setIssue] = useState<{ ok: boolean; text: string } | null>(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  // Anexo recusado pelo Jira (anexos desativados, sem permissão): dá para publicar só o comentário.
  const [attachFiles, setAttachFiles] = useState(true);
  const [canCommentOnly, setCanCommentOnly] = useState(false);
  const summary = summarizeEvidence(session.steps);
  const normalized = normalizeJiraKey(key);

  useEffect(() => {
    let alive = true;
    setPreview(null);
    previewJira(includeVideos, attachFiles)
      .then((p) => alive && setPreview(p))
      .catch((err) => alive && setError(err instanceof Error ? err.message : String(err)));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeVideos, attachFiles, session.updatedAt, session.steps]);

  useEffect(() => {
    setIssue(null);
    if (!normalized) return undefined;
    let alive = true;
    const timer = window.setTimeout(() => {
      void lookupIssue(normalized).then((res) => {
        if (!alive) return;
        setIssue(res.success ? { ok: true, text: `${res.issueKey}: ${res.summary ?? ''}${res.status ? ` · ${res.status}` : ''}` } : { ok: false, text: res.error ?? 'Não consegui consultar a tarefa.' });
      });
    }, 400);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalized]);

  const send = async () => {
    setSending(true);
    setError('');
    const result = await publish(key, includeVideos, attachFiles);
    setSending(false);
    if (result?.success) return onClose();
    setError(result?.error ?? 'Falha ao publicar no Jira.');
    // Só oferece o comentário sozinho se nada foi anexado: com anexo já enviado, repetir duplicaria.
    setCanCommentOnly(result?.failedStep === 'attach' && !(result.attached?.length));
  };

  const videos = session.videos.length;
  const warnings = [
    summary.pending > 0 && `${summary.pending} ${summary.pending === 1 ? 'passo ainda está pendente' : 'passos ainda estão pendentes'}`,
    summary.total === 0 && 'a evidência não tem nenhum passo'
  ].filter(Boolean) as string[];

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      dismissible={!sending}
      title="Publicar no Jira"
      description="Confira o comentário e os anexos. Nada é enviado antes de você confirmar."
      footer={
        <>
          <button type="button" className={BTN} disabled={sending} onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className={BTN_PRIMARY} disabled={sending || !normalized || !preview} onClick={() => void send()}>
            <Send className="w-3.5 h-3.5" /> {sending ? 'Publicando…' : `${attachFiles ? 'Publicar' : 'Publicar comentário'}${normalized ? ` em ${normalized}` : ''}`}
          </button>
        </>
      }
    >
      <div className="space-y-4 pb-2">
        <div className="space-y-1.5">
          <label htmlFor="jira-publish-key" className={LABEL}>
            Tarefa do Jira
          </label>
          <input id="jira-publish-key" data-autofocus className={`${INPUT} max-w-[220px]`} placeholder="Ex.: WT-123" value={key} onChange={(e) => setKey(e.target.value)} />
          {normalized && issue && <p className={`text-xs ${issue.ok ? 'text-muted-foreground' : 'text-amber-700'}`}>{issue.text}</p>}
          {!normalized && key.trim() && <p className="text-xs text-red-600">Chave inválida (ex.: WT-123).</p>}
          {!key.trim() && <p className="text-xs text-muted-foreground">Esta evidência não tem tarefa. Informe a do Jira para publicar; ela fica guardada na evidência.</p>}
        </div>

        {warnings.length > 0 && (
          <p className="text-xs rounded-[10px] border border-amber-500/40 bg-amber-500/10 text-amber-800 px-3 py-2">Atenção: {warnings.join(' e ')}. O comentário vai mostrar o resultado como {RESULT_LABEL[summary.verdict]}.</p>
        )}

        <div className="space-y-1.5">
          <div className={LABEL}>Anexos</div>
          <ul className="text-sm space-y-1">
            {(preview?.attachments ?? []).map((a) => (
              <li key={a.name} className="flex items-center gap-2">
                <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-mono text-xs">{a.name}</span>
                <span className="text-xs text-muted-foreground">
                  {a.kind === 'report' ? 'relatório em PDF, gerado ao publicar' : formatSize(a.sizeBytes)}
                  {a.skipped ? ' · acima de 50 MB, não será anexado' : ''}
                </span>
              </li>
            ))}
            {!preview && <li className="text-xs text-muted-foreground">Carregando…</li>}
          </ul>
          {!attachFiles && (
            <p className="text-xs text-muted-foreground">
              Modo só comentário: nada será anexado. O relatório fica na pasta da evidência para você anexar à mão.{' '}
              <button type="button" className="underline cursor-pointer hover:text-foreground" disabled={sending} onClick={() => { setAttachFiles(true); setCanCommentOnly(false); setError(''); }}>
                Voltar a anexar
              </button>
            </p>
          )}
          {attachFiles && videos > 0 && (
            <label className="text-[13px] text-foreground flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={includeVideos} disabled={sending} onChange={(e) => setIncludeVideos(e.target.checked)} /> Anexar {videos === 1 ? 'o vídeo' : `os ${videos} vídeos`} (até 50 MB cada)
            </label>
          )}
        </div>

        <div className="space-y-1.5">
          <div className={LABEL}>Comentário que será publicado (formato do Jira)</div>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-[10px] border border-border bg-muted/40 p-3 text-xs font-mono text-foreground">
            {preview ? preview.comment : 'Carregando…'}
          </pre>
        </div>

        {error && (
          <div className="space-y-2">
            <p className="text-xs text-red-600">{error}</p>
            {canCommentOnly && attachFiles && (
              <button
                type="button"
                className={BTN}
                disabled={sending}
                onClick={() => {
                  setAttachFiles(false);
                  setCanCommentOnly(false);
                  setError('');
                }}
              >
                Tentar só com o comentário (sem anexos)
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

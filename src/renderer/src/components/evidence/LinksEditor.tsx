import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { EVIDENCE_LINK_KINDS, EVIDENCE_MAX_LINKS, LINK_KIND_LABEL, normalizeLinkUrl, type EvidenceLink, type EvidenceLinkKind } from '../../../../shared/evidenceTypes';

const FIELD = 'h-9 px-2.5 border border-input rounded-[10px] bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring';
const BTN =
  'h-8 px-2.5 border border-border rounded-[10px] bg-card hover:bg-muted text-xs font-medium text-foreground flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50';

const PLACEHOLDER: Record<EvidenceLinkKind, { label: string; url: string }> = {
  pr: { label: 'Versão 2.1.0', url: 'https://github.com/org/repo/pull/123' },
  video: { label: 'Gravação do teste', url: 'https://...' },
  api: { label: 'Swagger / documentação', url: 'https://servidor/api' },
  other: { label: 'Descrição', url: 'https://...' }
};

const ADD_LABEL: Record<EvidenceLinkKind, string> = { pr: 'Pull request', video: 'Vídeo', api: 'URL da API', other: 'Outro link' };

/**
 * Links opcionais da evidência (PR de cada versão, vídeos hospedados fora, URL da API...). Cada linha grava ao sair
 * do campo; linha com URL inválida fica no rascunho, com aviso, e não é gravada até ser corrigida.
 */
export const LinksEditor: React.FC<{ links: EvidenceLink[] | undefined; onChange: (links: EvidenceLink[]) => void }> = ({ links, onChange }) => {
  const [rows, setRows] = useState<EvidenceLink[]>(links ?? []);

  const commit = (next: EvidenceLink[]) => onChange(next.filter((r) => normalizeLinkUrl(r.url)));
  const patch = (id: string, change: Partial<EvidenceLink>, save = false) => {
    const next = rows.map((r) => (r.id === id ? { ...r, ...change } : r));
    setRows(next);
    if (save) commit(next);
  };
  const add = (kind: EvidenceLinkKind) => setRows([...rows, { id: crypto.randomUUID(), kind, url: '' }]);
  const remove = (id: string) => {
    const next = rows.filter((r) => r.id !== id);
    setRows(next);
    commit(next);
  };

  return (
    <div className="space-y-2">
      {rows.length === 0 && <p className="text-xs text-muted-foreground">Sem links. Adicione o PR de cada versão, vídeos hospedados fora do Hub ou a URL da API: eles saem no relatório e no comentário do Jira.</p>}
      {rows.map((row) => {
        const invalid = !!row.url.trim() && !normalizeLinkUrl(row.url);
        return (
          <div key={row.id} className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <select className={`${FIELD} w-36`} value={row.kind} aria-label="Tipo do link" onChange={(e) => patch(row.id, { kind: e.target.value as EvidenceLinkKind }, true)}>
                {EVIDENCE_LINK_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {LINK_KIND_LABEL[k]}
                  </option>
                ))}
              </select>
              <input
                className={`${FIELD} w-48`}
                aria-label="Rótulo do link"
                placeholder={PLACEHOLDER[row.kind].label}
                value={row.label ?? ''}
                onChange={(e) => patch(row.id, { label: e.target.value })}
                onBlur={() => commit(rows)}
              />
              <input
                className={`${FIELD} min-w-[220px] flex-1 font-mono text-xs ${invalid ? 'border-red-500' : ''}`}
                aria-label="URL do link"
                placeholder={PLACEHOLDER[row.kind].url}
                value={row.url}
                onChange={(e) => patch(row.id, { url: e.target.value })}
                onBlur={() => commit(rows)}
              />
              <button type="button" title="Remover link" className="p-2 rounded-[10px] text-muted-foreground hover:text-red-600 hover:bg-muted cursor-pointer" onClick={() => remove(row.id)}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {invalid && <p className="text-xs text-red-600">URL inválida: use http:// ou https:// (sem usuário e senha). Enquanto estiver assim, este link não é salvo.</p>}
          </div>
        );
      })}
      <div className="flex flex-wrap gap-1.5">
        {EVIDENCE_LINK_KINDS.map((k) => (
          <button key={k} type="button" className={BTN} disabled={rows.length >= EVIDENCE_MAX_LINKS} onClick={() => add(k)}>
            <Plus className="w-3.5 h-3.5" /> {ADD_LABEL[k]}
          </button>
        ))}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Key,
  X,
  FolderOpen,
  Activity,
  Sparkles,
  RotateCw
} from 'lucide-react';
import type { DockerContainerInfo, WshPrerequisiteStatus } from '../../../../../shared/types';
import { useCopyToClipboard } from '../../../hooks/useCopyToClipboard';

export interface WshUtilsModalProps {
  container: DockerContainerInfo | null;
  wshPrereqs: WshPrerequisiteStatus[];
  isLoadingWshPrereqs: boolean;
  isOpeningOptFolder: boolean;
  onLoadWshPrereqs: () => void;
  onOpenOptFolder: () => void;
  onClose: () => void;
}

export const WshUtilsModal: React.FC<WshUtilsModalProps> = ({
  container,
  wshPrereqs,
  isLoadingWshPrereqs,
  isOpeningOptFolder,
  onLoadWshPrereqs,
  onOpenOptFolder,
  onClose
}) => {
  const [wshActiveTab, setWshActiveTab] = useState<'md5' | 'files' | 'rotina2650'>('md5');
  const [wshPlainPass, setWshPlainPass] = useState<string>('pcinfo');
  const [wshMd5Upper, setWshMd5Upper] = useState<string>('');
  const [wshMd5Lower, setWshMd5Lower] = useState<string>('');

  const { copy: copyLogsToClipboard, copiedKey: copyFeedback } = useCopyToClipboard();

  // Geração reativa de hash MD5 para senhas WSH
  useEffect(() => {
    if (!wshPlainPass) {
      setWshMd5Upper('');
      setWshMd5Lower('');
      return;
    }
    if (window.electronAPI?.generateMd5) {
      window.electronAPI.generateMd5(wshPlainPass).then((res) => {
        if (res) {
          setWshMd5Upper(res.upper);
          setWshMd5Lower(res.lower);
        }
      });
    }
  }, [wshPlainPass]);

  if (!container) return null;

  const containerCleanName = container.names.replace(/^\//, '');

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border/80 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/80 flex items-center justify-between bg-muted/20">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-600 dark:text-violet-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                <span>Utilitários WSH — {containerCleanName}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/10 text-violet-500 border border-violet-500/20">
                  Winthor Smart Hub
                </span>
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Criptografia MD5 de senha, checagem de pré-requisitos em /opt e suporte à Rotina 2650
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/60 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex items-center px-5 pt-2 border-b border-border/80 bg-muted/10 gap-2">
          <button
            onClick={() => setWshActiveTab('md5')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 transition cursor-pointer ${
              wshActiveTab === 'md5'
                ? 'border-violet-500 text-violet-600 dark:text-violet-400 bg-card shadow-2xs'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Gerador de Senha MD5</span>
          </button>

          <button
            onClick={() => {
              setWshActiveTab('files');
              onLoadWshPrereqs();
            }}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 transition cursor-pointer ${
              wshActiveTab === 'files'
                ? 'border-violet-500 text-violet-600 dark:text-violet-400 bg-card shadow-2xs'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Arquivos em /opt WSL</span>
          </button>

          <button
            onClick={() => setWshActiveTab('rotina2650')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 transition cursor-pointer ${
              wshActiveTab === 'rotina2650'
                ? 'border-violet-500 text-violet-600 dark:text-violet-400 bg-card shadow-2xs'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Guia da Rotina 2650</span>
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-auto p-5 space-y-4">
          {/* ABA 1: GERADOR MD5 */}
          {wshActiveTab === 'md5' && (
            <div className="space-y-4">
              <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-3.5 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0 mt-0.5">
                  <Key className="w-4 h-4" />
                </div>
                <div className="text-xs leading-relaxed text-muted-foreground">
                  <strong className="text-foreground font-semibold block mb-0.5">Por que o MD5 é obrigatório no WSH?</strong>
                  O WSH valida a conexão com o banco comparando o hash MD5 da senha com o configurado no <code className="text-foreground font-mono">Winthor.ini</code>. No arquivo <code className="text-foreground font-mono">.env</code>, o parâmetro <code className="text-foreground font-mono">DB_PASSWORD</code> deve ser <strong>obrigatoriamente o hash MD5 em letras maiúsculas</strong>.
                </div>
              </div>

              <div className="space-y-3 bg-card border border-border/80 rounded-xl p-4">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Senha em Texto Plano
                  </label>
                  <input
                    type="text"
                    value={wshPlainPass}
                    onChange={(e) => setWshPlainPass(e.target.value)}
                    placeholder="Ex: pcinfo, 123456, totvs"
                    className="w-full bg-background border border-border/80 rounded-lg px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* MD5 Maiúsculo */}
                  <div className="p-3 bg-muted/40 rounded-xl border border-violet-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>MD5 Maiúsculo (WSH .env)</span>
                      </span>
                      <button
                        onClick={() => copyLogsToClipboard(wshMd5Upper, 'md5-upper')}
                        disabled={!wshMd5Upper}
                        className="text-[10px] px-2 py-0.5 rounded bg-violet-600 hover:bg-violet-500 text-white font-semibold transition cursor-pointer disabled:opacity-50"
                      >
                        {copyFeedback === 'md5-upper' ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                    <div className="font-mono text-xs text-foreground font-bold break-all select-all bg-background p-2 rounded-lg border border-border/60">
                      {wshMd5Upper || '—'}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Utilize para a variável <code className="text-foreground font-mono">DB_PASSWORD</code> no arquivo <code className="text-foreground font-mono">.env</code>.
                    </p>
                  </div>

                  {/* MD5 Minúsculo */}
                  <div className="p-3 bg-muted/40 rounded-xl border border-border/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        MD5 Minúsculo (Padrão Linux)
                      </span>
                      <button
                        onClick={() => copyLogsToClipboard(wshMd5Lower, 'md5-lower')}
                        disabled={!wshMd5Lower}
                        className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground border border-border/80 font-medium transition cursor-pointer disabled:opacity-50"
                      >
                        {copyFeedback === 'md5-lower' ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                    <div className="font-mono text-xs text-foreground break-all select-all bg-background p-2 rounded-lg border border-border/60">
                      {wshMd5Lower || '—'}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Padrão gerado por <code className="text-foreground font-mono">echo -n "{wshPlainPass}" | md5sum</code>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: ARQUIVOS EM /OPT WSL */}
          {wshActiveTab === 'files' && (
            <div className="space-y-4">
              <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0 mt-0.5">
                    <FolderOpen className="w-4 h-4" />
                  </div>
                  <div className="text-xs leading-relaxed text-muted-foreground">
                    <strong className="text-foreground font-semibold block mb-0.5">Diretório Compartilhado /opt (WSL)</strong>
                    O container WSH monta o JAR e o Winthor.ini diretamente de <code className="text-foreground font-mono">/opt</code>. Se esses arquivos não estiverem lá, o container não iniciará.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onOpenOptFolder}
                  disabled={isOpeningOptFolder}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-sky-600/20 hover:bg-sky-600/30 text-sky-700 dark:text-sky-300 border border-sky-500/40 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 active:scale-98"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>{isOpeningOptFolder ? 'Abrindo...' : 'Abrir /opt no Explorer'}</span>
                </button>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground px-1">
                  <span>Status dos Arquivos Necessários</span>
                  <button
                    onClick={onLoadWshPrereqs}
                    disabled={isLoadingWshPrereqs}
                    className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCw className={`w-3 h-3 ${isLoadingWshPrereqs ? 'animate-spin text-primary' : ''}`} />
                    <span>Reverificar</span>
                  </button>
                </div>

                {wshPrereqs.map((prereq) => (
                  <div
                    key={prereq.file}
                    className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 transition ${
                      prereq.exists
                        ? 'bg-emerald-500/5 border-emerald-500/25 text-foreground'
                        : prereq.required
                        ? 'bg-rose-500/5 border-rose-500/30 text-foreground'
                        : 'bg-muted/40 border-border/80 text-muted-foreground'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs font-mono">{prereq.file}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase border ${
                            prereq.exists
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : prereq.required
                              ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30'
                              : 'bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          {prereq.exists ? 'Presente' : prereq.required ? 'Obrigatório Ausente' : 'Opcional Ausente'}
                        </span>
                        {prereq.size && (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            ({prereq.formattedSize})
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {prereq.description}
                      </p>
                    </div>

                    {!prereq.exists && (
                      <button
                        onClick={onOpenOptFolder}
                        className="px-2.5 py-1 bg-card hover:bg-muted border border-border/80 text-foreground rounded-lg text-[11px] font-semibold transition cursor-pointer shrink-0"
                      >
                        Copiar para cá
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA 3: ROTINA 2650 */}
          {wshActiveTab === 'rotina2650' && (
            <div className="space-y-4">
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3.5 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="text-xs leading-relaxed text-muted-foreground">
                  <strong className="text-foreground font-semibold block mb-0.5">Configuração da Rotina 2650 no WinThor</strong>
                  A Rotina 2650 cadastra o endereço do WinThor Server Hub (WSH) no ERP para permitir a emissão de notas fiscais, sincronização com mobile e integrações REST.
                </div>
              </div>

              <div className="bg-card border border-border/80 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span>Valores Recomendados para Ambiente Local/Dev:</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-muted/40 rounded-lg border border-border/50">
                    <span className="text-[11px] text-muted-foreground block mb-0.5">URL de Conexão WSH</span>
                    <div className="font-mono text-xs font-bold text-foreground flex items-center justify-between">
                      <span>http://localhost:8080/</span>
                      <button
                        onClick={() => copyLogsToClipboard('http://localhost:8080/', 'wsh-url')}
                        className="text-[10px] text-primary hover:underline cursor-pointer"
                      >
                        {copyFeedback === 'wsh-url' ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-muted/40 rounded-lg border border-border/50">
                    <span className="text-[11px] text-muted-foreground block mb-0.5">Nome do Serviço</span>
                    <div className="font-mono text-xs font-bold text-foreground">
                      WSH LOCAL DOCKER
                    </div>
                  </div>

                  <div className="p-3 bg-muted/40 rounded-lg border border-border/50">
                    <span className="text-[11px] text-muted-foreground block mb-0.5">Porta Padrão</span>
                    <div className="font-mono text-xs font-bold text-foreground">
                      8080 (mapeada no host)
                    </div>
                  </div>

                  <div className="p-3 bg-muted/40 rounded-lg border border-border/50">
                    <span className="text-[11px] text-muted-foreground block mb-0.5">Validação de Conexão</span>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      Clique em "Testar Conexão" na rotina
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-muted/20 rounded-lg border border-border/40 text-[11px] text-muted-foreground space-y-1">
                  <strong className="text-foreground block mb-0.5">Dica Importante:</strong>
                  Se a rotina relatar falha de comunicação, verifique se o container <code className="text-foreground font-mono">wsh-winthor</code> (ou <code className="text-foreground font-mono">wsh-local</code>) está com status <strong>running</strong> e se a porta 8080 não está ocupada por outra aplicação.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/80 flex items-center justify-between bg-muted/10">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />
            Interoperabilidade WSH WinThor ERP
          </span>

          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-card hover:bg-muted border border-border/80 text-foreground rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

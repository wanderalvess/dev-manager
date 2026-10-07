import React from 'react';
import { CheckCheck, Eye, EyeOff, Save, ShieldCheck } from 'lucide-react';
import { QualitySourceConfig, QualitySourceType } from '../../../../../shared/types';

interface QualitySourceFormProps {
  source: Partial<QualitySourceConfig>;
  isExisting: boolean;
  onChange: (source: Partial<QualitySourceConfig> | null) => void;
  showToken: boolean;
  onToggleShowToken: (show: boolean) => void;
  onSave: () => void;
}

const TEXT_INPUT =
  'w-full px-3 py-1.5 bg-background border border-border rounded-lg text-foreground focus:outline-hidden focus:border-primary';

export const QualitySourceForm: React.FC<QualitySourceFormProps> = ({
  source,
  isExisting,
  onChange,
  showToken,
  onToggleShowToken,
  onSave
}) => (
  <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-4 animate-in fade-in duration-150">
    <div className="flex items-center justify-between pb-2 border-b border-primary/20">
      <span className="text-xs font-bold text-foreground flex items-center gap-2">
        <CheckCheck className="w-4 h-4 text-primary" />
        {isExisting ? 'Editar Conexão de Teste' : 'Nova Conexão de Teste'}
      </span>
      <button
        type="button"
        onClick={() => onChange(null)}
        className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
      >
        Cancelar
      </button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
      <div>
        <label htmlFor="quality-source-form-1" className="font-bold text-foreground block mb-1">Nome da Conexão / Rótulo</label>
        <input id="quality-source-form-1"
          type="text"
          value={source.name || ''}
          onChange={(e) => onChange({ ...source, name: e.target.value })}
          placeholder="Ex: Zephyr Scale - Squad Faturamento"
          className={TEXT_INPUT}
        />
      </div>

      <div>
        <label htmlFor="quality-source-form-2" className="font-bold text-foreground block mb-1">Provedor / Tipo</label>
        <select id="quality-source-form-2"
          value={source.type || 'zephyr-scale'}
          onChange={(e) => onChange({ ...source, type: e.target.value as QualitySourceType })}
          className={`${TEXT_INPUT} cursor-pointer`}
        >
          <option value="zephyr-scale">Zephyr Scale (API v2 / Cloud)</option>
          <option value="zephyr-squad">Zephyr Squad / Jira Server</option>
          <option value="jira">Jira Software (Bugs &amp; Histórias)</option>
          <option value="azure-test-plans">Azure DevOps Test Plans</option>
          <option value="custom-webhook">Webhook / API Customizada</option>
        </select>
      </div>

      <div className="md:col-span-2">
        <label htmlFor="quality-source-form-3" className="font-bold text-foreground block mb-1">URL Base da API / Instância</label>
        <input id="quality-source-form-3"
          type="text"
          value={source.baseUrl || ''}
          onChange={(e) => onChange({ ...source, baseUrl: e.target.value })}
          placeholder="Ex: https://api.zephyrscale.smartbear.com/v2 ou https://empresa.atlassian.net"
          className={`${TEXT_INPUT} font-mono`}
        />
      </div>

      <div>
        <label htmlFor="quality-source-form-4" className="font-bold text-foreground block mb-1">Chave do Projeto (Project Key)</label>
        <input id="quality-source-form-4"
          type="text"
          value={source.projectKey || ''}
          onChange={(e) => onChange({ ...source, projectKey: e.target.value })}
          placeholder="Ex: WIN, DIST, CORE"
          className={`${TEXT_INPUT} font-mono`}
        />
      </div>

      <div>
        <label htmlFor="quality-source-form-5" className="font-bold text-foreground block mb-1">Plano ou Ciclo de Teste (Opcional)</label>
        <input id="quality-source-form-5"
          type="text"
          value={source.testPlanKey || ''}
          onChange={(e) => onChange({ ...source, testPlanKey: e.target.value })}
          placeholder="Ex: WIN-P12, Cycle-1, Test Suite ID"
          className={`${TEXT_INPUT} font-mono`}
        />
      </div>

      <div>
        <label htmlFor="quality-source-form-6" className="font-bold text-foreground block mb-1">E-mail / Usuário de Autenticação</label>
        <input id="quality-source-form-6"
          type="text"
          value={source.userEmail || ''}
          onChange={(e) => onChange({ ...source, userEmail: e.target.value })}
          placeholder="seu.email@empresa.com.br (para Jira Cloud)"
          className={TEXT_INPUT}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="quality-source-form-7" className="font-bold text-foreground">API Token / Zephyr Token / PAT</label>
          {source.hasApiToken && !source.apiToken && (
            <span className="text-2xs text-emerald-500 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Token salvo e protegido
            </span>
          )}
        </div>
        <div className="relative">
          <input id="quality-source-form-7"
            type={showToken ? 'text' : 'password'}
            value={source.apiToken || ''}
            onChange={(e) => onChange({ ...source, apiToken: e.target.value })}
            placeholder={source.hasApiToken ? 'Deixe em branco para manter o token atual' : 'Cole seu token de autenticação'}
            className="w-full pl-3 pr-9 py-1.5 bg-background border border-border rounded-lg text-foreground font-mono focus:outline-hidden focus:border-primary"
          />
          <button
            type="button"
            onClick={() => onToggleShowToken(!showToken)}
            className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
            title={showToken ? 'Ocultar token' : 'Revelar token'}
          >
            {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="md:col-span-2">
        <label htmlFor="quality-source-form-8" className="font-bold text-foreground block mb-1">Filtro JQL / Query de Testes &amp; Bugs (Opcional)</label>
        <input id="quality-source-form-8"
          type="text"
          value={source.jqlFilter || ''}
          onChange={(e) => onChange({ ...source, jqlFilter: e.target.value })}
          placeholder="Ex: issuetype in (Test, Bug) AND status != Closed ORDER BY priority DESC"
          className={`${TEXT_INPUT} font-mono text-xs`}
        />
      </div>
    </div>

    <div className="flex justify-end gap-2 pt-2 border-t border-primary/20">
      <button
        type="button"
        onClick={() => onChange(null)}
        className="px-3 py-1.5 rounded-lg hover:bg-muted text-muted-foreground text-xs font-semibold cursor-pointer"
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={onSave}
        className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 hover:bg-primary/90 transition shadow-2xs cursor-pointer"
      >
        <Save className="w-3.5 h-3.5" />
        <span>Salvar Fonte de Teste</span>
      </button>
    </div>
  </div>
);

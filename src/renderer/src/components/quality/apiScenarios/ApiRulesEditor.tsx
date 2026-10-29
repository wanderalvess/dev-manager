import React from 'react';
import { Trash2 } from 'lucide-react';
import { API_RULE_KIND_LABELS, API_RULE_OPERATORS, API_RULE_OPERATOR_LABELS, DB_OPERATOR_LABELS, ruleNeedsValue } from '../../../../../shared/apiRuleText';
import type { ApiRule, ApiRuleKind, ApiRuleOperator } from '../../../../../shared/apiScenarioTypes';
import type { DatabaseConnectionConfig } from '../../../../../shared/types';
import { changeRule, newRule } from '../../../utils/apiScenarioView';
import { FIELD_CLASS, SectionTitle } from '../lockout/lockoutFormFields';
import { ApiDbRuleFields } from './ApiDbRuleFields';

interface ApiRulesEditorProps {
  rules: ApiRule[];
  connections: DatabaseConnectionConfig[];
  onChange: (rules: ApiRule[]) => void;
}

const SMALL = FIELD_CLASS.replace('h-10', 'h-9');
const KINDS = Object.keys(API_RULE_KIND_LABELS) as ApiRuleKind[];

const VALUE_PLACEHOLDER: Record<ApiRuleKind, (op: ApiRuleOperator) => string> = {
  status: (op) => (op === 'in' ? '200, 201 ou 2xx' : '200'),
  duration: () => 'ms (ex.: 2000)',
  header: () => 'valor',
  body: (op) => (op === 'matches' ? 'regex (ex.: "codigo":\\s*\\d+)' : 'texto'),
  json: () => 'valor esperado',
  db: () => ''
};

/** Segunda coluna da linha: caminho do campo, nome do cabeçalho ou uma legenda. */
function Subject({ rule, onChange }: { rule: ApiRule; onChange: (path: string) => void }) {
  if (rule.kind === 'json' || rule.kind === 'db' || rule.kind === 'header') {
    return (
      <input
        aria-label={rule.kind === 'header' ? 'Nome do cabeçalho' : 'Caminho do campo'}
        value={rule.path ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={rule.kind === 'header' ? 'content-type' : '$.itens[0].codigo'}
        className={`${SMALL} col-span-3 font-mono`}
        spellCheck={false}
      />
    );
  }
  const caption = rule.kind === 'duration' ? 'da requisição' : rule.kind === 'body' ? 'da resposta (texto)' : 'da resposta';
  return <span className="col-span-3 text-xs text-muted-foreground px-1">{caption}</span>;
}

/** O que a resposta precisa ter: uma linha por regra. */
export const ApiRulesEditor: React.FC<ApiRulesEditorProps> = ({ rules, connections, onChange }) => {
  const update = (id: string, patch: Parameters<typeof changeRule>[1]) => onChange(rules.map((r) => (r.id === id ? changeRule(r, patch) : r)));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <SectionTitle>O que a resposta precisa ter ({rules.length})</SectionTitle>
        <select
          aria-label="Adicionar regra"
          value=""
          onChange={(e) => e.target.value && onChange([...rules, newRule(e.target.value as ApiRuleKind)])}
          className="h-8 bg-card border border-border rounded-[10px] px-2 text-xs font-medium text-primary"
        >
          <option value="">+ Adicionar regra…</option>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {API_RULE_KIND_LABELS[k]}
            </option>
          ))}
        </select>
      </div>
      {rules.map((rule) => (
        <div key={rule.id} className="space-y-2">
          <div className="grid grid-cols-12 gap-2 items-center">
            <select aria-label="Tipo da regra" value={rule.kind} onChange={(e) => update(rule.id, { kind: e.target.value as ApiRuleKind })} className={`${SMALL} col-span-3`}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {API_RULE_KIND_LABELS[k]}
                </option>
              ))}
            </select>
            <Subject rule={rule} onChange={(path) => update(rule.id, { path })} />
            <select aria-label="Operador" value={rule.operator} onChange={(e) => update(rule.id, { operator: e.target.value as ApiRuleOperator })} className={`${SMALL} col-span-3`}>
              {API_RULE_OPERATORS[rule.kind].map((op) => (
                <option key={op} value={op}>
                  {rule.kind === 'db' ? `${DB_OPERATOR_LABELS[op] ?? API_RULE_OPERATOR_LABELS[op]} banco` : API_RULE_OPERATOR_LABELS[op]}
                </option>
              ))}
            </select>
            {ruleNeedsValue(rule.operator, rule.kind) ? (
              <input
                aria-label="Valor esperado"
                value={rule.expected ?? ''}
                onChange={(e) => update(rule.id, { expected: e.target.value })}
                placeholder={VALUE_PLACEHOLDER[rule.kind](rule.operator)}
                className={`${SMALL} col-span-2 font-mono`}
                spellCheck={false}
              />
            ) : (
              <span className="col-span-2" />
            )}
            <button
              type="button"
              aria-label="Remover regra"
              onClick={() => onChange(rules.filter((r) => r.id !== rule.id))}
              className="col-span-1 h-9 flex items-center justify-center text-muted-foreground hover:text-danger"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          {rule.kind === 'db' && <ApiDbRuleFields rule={rule} connections={connections} onChange={(patch) => update(rule.id, patch)} />}
        </div>
      ))}
      <p className="text-2xs text-muted-foreground">
        Caminho do campo: <code className="font-mono">$.campo</code>, <code className="font-mono">$.lista[0].campo</code>. Números aceitam
        vírgula ou ponto, e S/N vale como verdadeiro/falso.
      </p>
    </div>
  );
};

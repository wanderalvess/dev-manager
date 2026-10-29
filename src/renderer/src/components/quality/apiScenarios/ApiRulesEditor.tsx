import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { API_RULE_OPERATORS, API_RULE_OPERATOR_LABELS, ruleNeedsValue } from '../../../../../shared/apiRuleText';
import type { ApiRule, ApiRuleKind, ApiRuleOperator } from '../../../../../shared/apiScenarioTypes';
import { changeRule, newRule } from '../../../utils/apiScenarioView';
import { FIELD_CLASS, SectionTitle } from '../lockout/lockoutFormFields';

interface ApiRulesEditorProps {
  rules: ApiRule[];
  onChange: (rules: ApiRule[]) => void;
}

const SMALL = FIELD_CLASS.replace('h-10', 'h-9');

/** O que a resposta precisa ter: uma linha por regra (status ou campo do JSON). */
export const ApiRulesEditor: React.FC<ApiRulesEditorProps> = ({ rules, onChange }) => {
  const update = (id: string, patch: Parameters<typeof changeRule>[1]) => onChange(rules.map((r) => (r.id === id ? changeRule(r, patch) : r)));
  const add = (kind: ApiRuleKind) => onChange([...rules, newRule(kind)]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <SectionTitle>O que a resposta precisa ter ({rules.length})</SectionTitle>
        <div className="flex gap-3">
          <button type="button" className="text-2xs font-medium text-primary hover:underline flex items-center gap-1" onClick={() => add('status')}>
            <Plus className="w-3 h-3" /> Status
          </button>
          <button type="button" className="text-2xs font-medium text-primary hover:underline flex items-center gap-1" onClick={() => add('json')}>
            <Plus className="w-3 h-3" /> Campo do JSON
          </button>
        </div>
      </div>
      {rules.map((rule) => (
        <div key={rule.id} className="grid grid-cols-12 gap-2 items-center">
          <select
            aria-label="Tipo da regra"
            value={rule.kind}
            onChange={(e) => update(rule.id, { kind: e.target.value as ApiRuleKind })}
            className={`${SMALL} col-span-3`}
          >
            <option value="status">Status HTTP</option>
            <option value="json">Campo do JSON</option>
          </select>
          {rule.kind === 'json' ? (
            <input
              aria-label="Caminho do campo"
              value={rule.path ?? ''}
              onChange={(e) => update(rule.id, { path: e.target.value })}
              placeholder="$.itens[0].codigo"
              className={`${SMALL} col-span-3 font-mono`}
              spellCheck={false}
            />
          ) : (
            <span className="col-span-3 text-xs text-muted-foreground px-1">da resposta</span>
          )}
          <select
            aria-label="Operador"
            value={rule.operator}
            onChange={(e) => update(rule.id, { operator: e.target.value as ApiRuleOperator })}
            className={`${SMALL} col-span-3`}
          >
            {API_RULE_OPERATORS[rule.kind].map((op) => (
              <option key={op} value={op}>
                {API_RULE_OPERATOR_LABELS[op]}
              </option>
            ))}
          </select>
          {ruleNeedsValue(rule.operator) ? (
            <input
              aria-label="Valor esperado"
              value={rule.expected ?? ''}
              onChange={(e) => update(rule.id, { expected: e.target.value })}
              placeholder={rule.kind === 'status' ? (rule.operator === 'in' ? '200, 201 ou 2xx' : '200') : 'valor esperado'}
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
      ))}
      <p className="text-2xs text-muted-foreground">
        Caminho do campo: <code className="font-mono">$.campo</code>, <code className="font-mono">$.lista[0].campo</code>. Números aceitam
        vírgula ou ponto, e S/N vale como verdadeiro/falso.
      </p>
    </div>
  );
};

import { describe, expect, it } from 'vitest';
import { buildIntegrations, filterIntegrations } from './integrationsStatus';

const byId = (items: ReturnType<typeof buildIntegrations>, id: string) => items.find((i) => i.id === id)!;

describe('integrationsStatus', () => {
  it('marca tudo como não configurado sem configurações', () => {
    const items = buildIntegrations(null);
    expect(byId(items, 'llm').status).toBe('unconfigured');
    expect(byId(items, 'azure').status).toBe('unconfigured');
    expect(byId(items, 'webhooks').statusLabel).toBe('Nenhum');
    expect(byId(items, 'mcp').status).toBe('none');
  });

  it('mostra o provedor de LLM ativo pelo nome', () => {
    const items = buildIntegrations({
      llmProviders: [{ id: 'a', name: 'Meu GPT', provider: 'openai', model: 'x', enabled: true }],
      activeLlmProviderId: 'a'
    });
    expect(byId(items, 'llm')).toMatchObject({ status: 'active', statusLabel: 'Ativo: Meu GPT' });
  });

  it('avisa quando há provedores mas nenhum ativo', () => {
    const items = buildIntegrations({ llmProviders: [{ id: 'a', name: 'X', provider: 'openai', model: 'x', enabled: true }] });
    expect(byId(items, 'llm').statusLabel).toBe('Nenhum ativo');
  });

  it('detecta GitHub/GitLab pelos repositórios e usa a porta OTLP configurada', () => {
    const items = buildIntegrations({ apmReceiverPort: 4320 }, [{ provider: 'gitlab' }, { provider: 'azure' }, {}]);
    expect(byId(items, 'git-hosts')).toMatchObject({ status: 'detected', statusLabel: 'Detectado em 1 repositório(s)' });
    expect(byId(items, 'otlp').statusLabel).toBe('Porta 4320');
  });

  it('filtra por ativas e não configuradas', () => {
    const items = buildIntegrations({ azureDevOpsToken: 'x' });
    expect(filterIntegrations(items, 'active').map((i) => i.id)).toContain('azure');
    expect(filterIntegrations(items, 'unconfigured').map((i) => i.id)).not.toContain('azure');
    expect(filterIntegrations(items, 'all')).toHaveLength(items.length);
  });
});

import { describe, expect, it } from 'vitest';
import { MCP_TOOL_COUNT } from '../../../shared/mcpCatalog';
import { buildIntegrations, countIntegrationsByFilter, filterIntegrations } from './integrationsStatus';

const byId = (items: ReturnType<typeof buildIntegrations>, id: string) => items.find((i) => i.id === id)!;

describe('integrationsStatus', () => {
  it('marca tudo como não configurado sem configurações', () => {
    const items = buildIntegrations(null);
    expect(byId(items, 'llm').status).toBe('unconfigured');
    expect(byId(items, 'azure').status).toBe('unconfigured');
    expect(byId(items, 'webhooks').statusLabel).toBe('Nenhum');
    expect(byId(items, 'mcp')).toMatchObject({ status: 'none', statusLabel: `${MCP_TOOL_COUNT} tools` });
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

  it('reconhece token do Azure e cookie da CCW salvos mesmo com o valor sanitizado', () => {
    const items = buildIntegrations({ azureDevOpsToken: '', hasAzureDevOpsToken: true, ccwAuthCookie: '', hasCcwAuthCookie: true });
    expect(byId(items, 'azure')).toMatchObject({ status: 'active', statusLabel: 'Token salvo' });
    expect(byId(items, 'ccw')).toMatchObject({ status: 'active', statusLabel: 'Cookie salvo' });
  });

  it('usa o estado real do receptor OTLP', () => {
    expect(byId(buildIntegrations({}), 'otlp').status).toBe('none');
    const listening = buildIntegrations({}, [], { apmReceiver: { listening: true, port: 4319 } });
    expect(byId(listening, 'otlp')).toMatchObject({ status: 'active', statusLabel: 'Recebendo na porta 4319' });
    const down = buildIntegrations({}, [], { apmReceiver: { listening: false, port: 4318, error: 'EADDRINUSE' } });
    expect(byId(down, 'otlp')).toMatchObject({ status: 'error', detail: 'EADDRINUSE' });
    expect(filterIntegrations(down, 'attention').map((i) => i.id)).toEqual(['otlp']);
  });

  it('conta os cartões de cada filtro', () => {
    const items = buildIntegrations({ azureDevOpsToken: 'x' }, [], { apmReceiver: { listening: false, port: 4318 } });
    const counts = countIntegrationsByFilter(items);
    expect(counts.all).toBe(items.length);
    expect(counts.attention).toBe(1);
    expect(counts.active + counts.attention + counts.unconfigured).toBeLessThanOrEqual(items.length);
  });
});

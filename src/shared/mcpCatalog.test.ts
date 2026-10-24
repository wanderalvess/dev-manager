import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { classifyTool } from '../mcp/toolSafety';
import { MCP_TOOL_COUNT, MCP_READ_TOOL_COUNT, MCP_DESTRUCTIVE_TOOL_COUNT } from './mcpCatalog';

function listSourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(full);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') ? [full] : [];
  });
}

function registeredToolNames(): string[] {
  const names = new Set<string>();
  for (const file of listSourceFiles(path.resolve(__dirname, '../mcp'))) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/registerTool\(\s*'([a-z0-9_]+)'/g)) names.add(match[1]);
  }
  return [...names];
}

describe('mcpCatalog', () => {
  const names = registeredToolNames();

  it('MCP_TOOL_COUNT bate com as tools registradas em src/mcp', () => {
    expect(names.length).toBe(MCP_TOOL_COUNT);
  });

  it('as contagens por risco batem com a classificação de toolSafety', () => {
    expect(names.filter((n) => classifyTool(n) === 'read')).toHaveLength(MCP_READ_TOOL_COUNT);
    expect(names.filter((n) => classifyTool(n) === 'destructive')).toHaveLength(MCP_DESTRUCTIVE_TOOL_COUNT);
  });
});

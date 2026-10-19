import path from 'path';
import { describe, expect, it } from 'vitest';
import {
  buildArtifactFileName,
  buildArtifactZipUrl,
  buildListBuildsUrl,
  isValidAzureTarget,
  normalizeBranchRef,
  parseArtifactsResponse,
  parseBuildsResponse,
  resolveArtifactsDir,
  shouldSendAuthTo
} from './azurePipelineUtils';

const target = { org: 'minha-org', project: 'Projeto WinThor' };

describe('isValidAzureTarget', () => {
  it('aceita org e projeto comuns', () => {
    expect(isValidAzureTarget(target)).toBe(true);
  });

  it('recusa separadores e traversal', () => {
    expect(isValidAzureTarget({ org: 'org/../x', project: 'p' })).toBe(false);
    expect(isValidAzureTarget({ org: 'org', project: 'p?x=1' })).toBe(false);
    expect(isValidAzureTarget({ org: 'org', project: 'a..b' })).toBe(false);
    expect(isValidAzureTarget(null)).toBe(false);
  });
});

describe('urls', () => {
  it('normaliza a branch para refs/heads', () => {
    expect(normalizeBranchRef('main')).toBe('refs/heads/main');
    expect(normalizeBranchRef('refs/heads/dev')).toBe('refs/heads/dev');
    expect(normalizeBranchRef('  ')).toBeUndefined();
  });

  it('monta a listagem de builds com filtro e teto de 50', () => {
    const url = new URL(buildListBuildsUrl(target, 'main', 500));
    expect(url.hostname).toBe('dev.azure.com');
    expect(url.pathname).toBe('/minha-org/Projeto%20WinThor/_apis/build/builds');
    expect(url.searchParams.get('$top')).toBe('50');
    expect(url.searchParams.get('branchName')).toBe('refs/heads/main');
    expect(url.searchParams.get('statusFilter')).toBe('completed');
  });

  it('codifica o nome do artefato no download', () => {
    const url = new URL(buildArtifactZipUrl(target, 42, 'drop & pacote'));
    expect(url.searchParams.get('artifactName')).toBe('drop & pacote');
    expect(url.searchParams.get('$format')).toBe('zip');
  });
});

describe('parsers', () => {
  it('extrai os campos do build', () => {
    const [b] = parseBuildsResponse({
      value: [
        {
          id: 7,
          buildNumber: '20261019.3',
          definition: { id: 3, name: 'ci-winthor' },
          status: 'completed',
          result: 'succeeded',
          sourceBranch: 'refs/heads/main',
          sourceVersion: 'abcdef1234567890',
          requestedFor: { displayName: 'Fulano' },
          _links: { web: { href: 'https://dev.azure.com/x' } }
        },
        { buildNumber: 'sem-id' }
      ]
    });
    expect(b).toMatchObject({ id: 7, pipelineName: 'ci-winthor', sourceBranch: 'main', sourceVersion: 'abcdef12' });
  });

  it('lê tamanho do artefato quando existe', () => {
    const list = parseArtifactsResponse({
      value: [
        { id: 1, name: 'drop', resource: { type: 'Container', properties: { artifactsize: '2048' } } },
        { id: 2, name: 'app', resource: { type: 'PipelineArtifact' } },
        { id: 3 }
      ]
    });
    expect(list).toHaveLength(2);
    expect(list[0].sizeBytes).toBe(2048);
    expect(list[1].sizeBytes).toBeUndefined();
  });

  it('tolera resposta vazia', () => {
    expect(parseBuildsResponse(null)).toEqual([]);
    expect(parseArtifactsResponse({})).toEqual([]);
  });
});

describe('arquivo e destino', () => {
  it('gera nome de arquivo sem separadores nem traversal', () => {
    expect(buildArtifactFileName('2026.1', 'drop')).toBe('2026.1_drop.zip');
    const nasty = buildArtifactFileName('..', '..\\..\\Windows/x');
    expect(nasty).not.toMatch(/[\\/]/);
    expect(nasty.endsWith('.zip')).toBe(true);
  });

  it('só manda o PAT para dev.azure.com em https', () => {
    expect(shouldSendAuthTo('https://dev.azure.com/org/_apis/x')).toBe(true);
    expect(shouldSendAuthTo('https://artprodcus3.artifacts.visualstudio.com/x?sig=1')).toBe(false);
    expect(shouldSendAuthTo('http://dev.azure.com/x')).toBe(false);
    expect(shouldSendAuthTo('nao-e-url')).toBe(false);
  });

  it('usa Downloads quando a pasta não está configurada', () => {
    expect(resolveArtifactsDir('', '/home/u')).toBe(path.join('/home/u', 'Downloads', 'HubManager-Azure'));
    expect(resolveArtifactsDir(' /tmp/a ', '/home/u')).toBe(path.resolve('/tmp/a'));
  });
});

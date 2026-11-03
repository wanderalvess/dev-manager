import { describe, it, expect } from 'vitest';
import { buildHelpSearchIndex, normalizeHelpText, searchHelp } from './helpSearch';

const index = buildHelpSearchIndex({
  faqs: [
    { id: 'port-in-use', question: 'Porta em uso ao subir o servidor', category: 'Ambiente & Rede', tags: ['netstat', 'tcp'] },
    { id: 'karaf-client-bat', question: 'O client.bat não foi localizado', category: 'Karaf OSGi', tags: ['configurações', 'deploy'] }
  ],
  modules: [{ title: 'Ambiente Dev', description: 'Serviços Windows e liberação de portas.' }],
  shortcuts: [{ key: 'Alt + 4', desc: 'Acessar "Deploy"' }]
});

describe('helpSearch', () => {
  it('ignora acento e caixa', () => {
    expect(normalizeHelpText('Configurações')).toBe('configuracoes');
  });

  it('devolve vazio sem termo', () => {
    expect(searchHelp(index, '   ')).toEqual([]);
  });

  it('acha pergunta pela tag, mesmo sem acento', () => {
    const results = searchHelp(index, 'configuracoes');
    expect(results.map((r) => r.id)).toEqual(['faq:karaf-client-bat']);
  });

  it('coloca acerto no título antes do acerto só em tags ou resumo', () => {
    const results = searchHelp(index, 'porta');
    expect(results[0].id).toBe('faq:port-in-use');
    expect(results[1].id).toBe('module:Ambiente Dev');
  });

  it('manda cada tipo para a seção certa', () => {
    expect(searchHelp(index, 'deploy').map((r) => [r.kind, r.category])).toEqual([
      ['shortcut', 'shortcuts'],
      ['faq', 'faq']
    ]);
  });

  it('respeita o limite', () => {
    expect(searchHelp(index, 'a', 2)).toHaveLength(2);
  });
});

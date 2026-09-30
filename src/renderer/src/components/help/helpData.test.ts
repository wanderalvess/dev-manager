import { describe, it, expect, vi } from 'vitest';
import {
  getKeyboardShortcuts,
  getHelpCategories,
  getFaqList,
  OPTIONAL_DOWNLOADS,
  MCP_ADD_COMMAND
} from './helpData';

describe('helpData', () => {
  describe('OPTIONAL_DOWNLOADS and MCP_ADD_COMMAND', () => {
    it('should provide valid URLs for optional downloads', () => {
      expect(OPTIONAL_DOWNLOADS.ragModel).toContain('sentence-transformers-all-MiniLM-L6-v2');
      expect(OPTIONAL_DOWNLOADS.oracleInstantClient).toContain('oracle.com');
      expect(OPTIONAL_DOWNLOADS.vcRedist).toContain('aka.ms');
      expect(OPTIONAL_DOWNLOADS.ollama).toContain('ollama.com');
    });

    it('should provide the standard MCP command for Claude Code', () => {
      expect(MCP_ADD_COMMAND).toContain('claude mcp add dev-manager');
      expect(MCP_ADD_COMMAND).toContain('dev-manager-mcp.cmd');
    });
  });

  describe('getKeyboardShortcuts', () => {
    it('should generate shortcuts with the custom debugPort', () => {
      const shortcuts = getKeyboardShortcuts(5005);
      expect(shortcuts.length).toBe(14);

      const debugShortcut = shortcuts.find((s) => s.key === 'Shift + F9');
      expect(debugShortcut).toBeDefined();
      expect(debugShortcut?.desc).toContain(':5005');

      const customShortcuts = getKeyboardShortcuts(8888);
      const customDebug = customShortcuts.find((s) => s.key === 'Shift + F9');
      expect(customDebug?.desc).toContain(':8888');
    });

    it('should include navigation shortcuts from Alt+1 to Alt+0 and Ctrl+K', () => {
      const shortcuts = getKeyboardShortcuts(5005);
      const keys = shortcuts.map((s) => s.key);

      expect(keys).toContain('Alt + 1');
      expect(keys).toContain('Alt + 2');
      expect(keys).toContain('Alt + 3');
      expect(keys).toContain('Alt + 4');
      expect(keys).toContain('Alt + 5');
      expect(keys).toContain('Alt + 6');
      expect(keys).toContain('Alt + 7');
      expect(keys).toContain('Alt + 8');
      expect(keys).toContain('Alt + 9');
      expect(keys).toContain('Alt + 0');
      expect(keys).toContain('Ctrl + K');
    });
  });

  describe('getHelpCategories', () => {
    it('should return 5 main navigation categories with proper badges', () => {
      const categories = getHelpCategories(32, '1.23.0');
      expect(categories.length).toBe(5);

      const ids = categories.map((c) => c.id);
      expect(ids).toEqual(['overview', 'modules', 'shortcuts', 'faq', 'about']);

      const faqCat = categories.find((c) => c.id === 'faq');
      expect(faqCat?.badge).toBe('32');

      const aboutCat = categories.find((c) => c.id === 'about');
      expect(aboutCat?.badge).toBe('v1.23.0');
    });

    it('should use fallback version 1.22.0 when appVersion is not provided', () => {
      const categories = getHelpCategories(10);
      const aboutCat = categories.find((c) => c.id === 'about');
      expect(aboutCat?.badge).toBe('v1.22.0');
    });
  });

  describe('getFaqList', () => {
    it('should generate all 32 FAQ items with valid structure and tags', () => {
      const copyFn = vi.fn();
      const openLinkFn = vi.fn();
      const openMcpFn = vi.fn();

      const faqs = getFaqList({
        debugPort: 5005,
        webPort: 8888,
        sshPort: 8101,
        portalWebUrl: 'http://localhost:8888',
        consoleUrl: 'http://localhost:8888/system/console',
        onNavigate: vi.fn(),
        copyToClipboard: copyFn,
        copiedItem: null,
        handleOpenLink: openLinkFn,
        handleOpenMcpDocs: openMcpFn,
        appInfo: { appVersion: '1.22.0' }
      });

      expect(faqs.length).toBe(32);

      for (const faq of faqs) {
        expect(faq.id).toBeTruthy();
        expect(faq.question).toBeTruthy();
        expect(faq.category).toBeTruthy();
        expect(faq.answer).toBeDefined();
        expect(Array.isArray(faq.tags)).toBe(true);
        expect(faq.tags.length).toBeGreaterThan(0);
      }
    });

    it('should interpolate custom ports into questions and tags', () => {
      const faqs = getFaqList({
        debugPort: 9999,
        webPort: 7777,
        sshPort: 6666,
        portalWebUrl: 'http://localhost:7777',
        consoleUrl: 'http://localhost:7777/system/console',
        copyToClipboard: vi.fn(),
        copiedItem: null,
        handleOpenLink: vi.fn(),
        handleOpenMcpDocs: vi.fn()
      });

      const intellijFaq = faqs.find((f) => f.id === 'intellij-debug');
      expect(intellijFaq?.question).toContain('9999');
      expect(intellijFaq?.tags).toContain('9999');

      const portFaq = faqs.find((f) => f.id === 'port-in-use');
      expect(portFaq?.question).toContain(':7777');
      expect(portFaq?.question).toContain(':6666');
      expect(portFaq?.question).toContain(':9999');
      expect(portFaq?.tags).toContain('7777');
      expect(portFaq?.tags).toContain('6666');
      expect(portFaq?.tags).toContain('9999');
    });
  });
});

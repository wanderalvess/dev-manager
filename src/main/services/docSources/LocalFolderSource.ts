import fs from 'fs';
import path from 'path';
import { DocSource, DocSourceEntry } from './DocSource';
import { isSafePath } from '../../utils/security';
import { extractPdfText, extractDocxText } from './textExtractors';

const TEXT_EXTENSIONS = ['.md', '.mdx', '.txt'];
const BINARY_EXTENSIONS = ['.pdf', '.docx'];
export const DOC_EXTENSIONS = [...TEXT_EXTENSIONS, ...BINARY_EXTENSIONS];
export const IGNORED_DIR_NAMES = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'target',
  'out',
  'bin',
  'obj',
  '.idea',
  '.vscode',
  'coverage',
  '.next',
  '.turbo'
]);
const MAX_TEXT_FILE_SIZE_BYTES = 1_000_000;
// PDF/DOCX carregam formatação, fontes e imagens embutidas que inflam o arquivo sem
// relação com o tamanho do texto extraído — limite bem mais generoso que o de texto puro.
const MAX_BINARY_FILE_SIZE_BYTES = 20_000_000;

/**
 * Fonte de documentação a partir de uma pasta local (recursiva). Usada tanto para
 * cada projeto git descoberto em `projectsPath` quanto para pastas arbitrárias que
 * o usuário adiciona manualmente (fora da Pasta de Projetos) — mesma lógica, raiz diferente.
 */
export function extractCleanFolderLabel(folderPath: string, explicitLabel?: string): string {
  if (explicitLabel && !explicitLabel.includes(':\\') && !explicitLabel.includes(':/') && !explicitLabel.includes('\\')) {
    return explicitLabel.trim();
  }
  const normalized = folderPath.replace(/\\/g, '/').replace(/\/+$/, '');
  const basename = normalized.split('/').pop() || 'docs';
  if (['docs', 'doc', 'documentacao', 'documentation', 'wiki'].includes(basename.toLowerCase())) {
    const parent = normalized.split('/').slice(-2, -1)[0];
    if (parent && !parent.includes(':')) {
      return parent;
    }
  }
  return basename;
}

export class LocalFolderSource implements DocSource {
  readonly id: string;
  readonly label: string;

  constructor(private readonly rootPath: string, label?: string) {
    this.id = `local-folder:${rootPath}`;
    this.label = extractCleanFolderLabel(rootPath, label);
  }

  getRootPath(): string {
    return this.rootPath;
  }

  async listEntries(): Promise<DocSourceEntry[]> {
    const entries: DocSourceEntry[] = [];
    const walk = (dir: string) => {
      let dirEntries: fs.Dirent[];
      try {
        dirEntries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const dirent of dirEntries) {
        const full = path.join(dir, dirent.name);
        if (dirent.isDirectory()) {
          if (IGNORED_DIR_NAMES.has(dirent.name)) continue;
          walk(full);
        } else if (dirent.isFile()) {
          const ext = path.extname(dirent.name).toLowerCase();
          if (!DOC_EXTENSIONS.includes(ext)) continue;
          if (!isSafePath(full, this.rootPath)) continue;
          let stat: fs.Stats;
          try {
            stat = fs.statSync(full);
          } catch {
            continue;
          }
          const maxSize = BINARY_EXTENSIONS.includes(ext) ? MAX_BINARY_FILE_SIZE_BYTES : MAX_TEXT_FILE_SIZE_BYTES;
          const relTitle = path.relative(this.rootPath, full).replace(/\\/g, '/');
          entries.push({ id: full, title: relTitle, mtimeMs: stat.mtimeMs });
        }
      }
    };
    walk(this.rootPath);
    return entries;
  }

  async readContent(entry: DocSourceEntry): Promise<string> {
    const ext = path.extname(entry.id).toLowerCase();
    if (ext === '.pdf') return extractPdfText(fs.readFileSync(entry.id));
    if (ext === '.docx') return extractDocxText(fs.readFileSync(entry.id));
    return fs.readFileSync(entry.id, 'utf-8');
  }
}

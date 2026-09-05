import fs from 'fs';
import path from 'path';
import { DocSource, DocSourceEntry } from './DocSource';
import { isSafePath } from '../../utils/security';

const DOC_EXTENSIONS = ['.md', '.mdx', '.txt'];
const IGNORED_DIR_NAMES = new Set([
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
const MAX_FILE_SIZE_BYTES = 1_000_000;

/**
 * Fonte de documentação a partir de uma pasta local (recursiva). Usada tanto para
 * cada projeto git descoberto em `projectsPath` quanto para pastas arbitrárias que
 * o usuário adiciona manualmente (fora da Pasta de Projetos) — mesma lógica, raiz diferente.
 */
export class LocalFolderSource implements DocSource {
  readonly id: string;
  readonly label: string;

  constructor(private readonly rootPath: string, label?: string) {
    this.id = `local-folder:${rootPath}`;
    this.label = label || rootPath;
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
        } else if (dirent.isFile() && DOC_EXTENSIONS.includes(path.extname(dirent.name).toLowerCase())) {
          if (!isSafePath(full, this.rootPath)) continue;
          let stat: fs.Stats;
          try {
            stat = fs.statSync(full);
          } catch {
            continue;
          }
          if (stat.size > MAX_FILE_SIZE_BYTES) continue;
          entries.push({ id: full, title: path.relative(this.rootPath, full), mtimeMs: stat.mtimeMs });
        }
      }
    };
    walk(this.rootPath);
    return entries;
  }

  async readContent(entry: DocSourceEntry): Promise<string> {
    return fs.readFileSync(entry.id, 'utf-8');
  }
}

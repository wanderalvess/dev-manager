import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { RoutineItem } from '../../shared/types';
import { ConfigService } from './ConfigService';
import { isSafePath } from '../utils/security';

const DEFAULT_ROUTINE_EXTENSIONS = ['.EXE'];

export class RoutinesService {
  private configService: ConfigService;

  constructor(configService: ConfigService) {
    this.configService = configService;
  }

  public listRoutines(): RoutineItem[] {
    const settings = this.configService.getSettings();
    const basePath = settings.appPath;
    const routines: RoutineItem[] = [];
    if (!basePath) {
      return routines;
    }

    const extensions = (
      settings.routineFileExtensions && settings.routineFileExtensions.length > 0
        ? settings.routineFileExtensions
        : DEFAULT_ROUTINE_EXTENSIONS
    ).map((ext) => ext.toUpperCase());

    const prodDir = fs.existsSync(path.join(basePath, 'Prod'))
      ? path.join(basePath, 'Prod')
      : basePath;
    const favorites = new Set(settings.favoriteRoutines || []);

    if (!fs.existsSync(prodDir)) {
      return routines;
    }

    const scanDirectory = (dir: string, currentModule: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            scanDirectory(fullPath, entry.name);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toUpperCase();
            if (extensions.includes(ext)) {
              const stat = fs.statSync(fullPath);
              const sizeMb = (stat.size / (1024 * 1024)).toFixed(1) + ' MB';
              const id = entry.name;

              routines.push({
                id,
                name: entry.name,
                module: currentModule || 'Geral',
                fullPath,
                sizeMb,
                isFavorite: favorites.has(id)
              });
            }
          }
        }
      } catch (err) {
        console.error(`Erro ao escanear pasta ${dir}:`, err);
      }
    };

    scanDirectory(prodDir, 'Raiz');
    return routines.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  public launchRoutine(routinePath: string): boolean {
    try {
      if (!routinePath || typeof routinePath !== 'string') {
        return false;
      }
      const settings = this.configService.getSettings();
      const basePath = settings.appPath;
      if (!basePath) {
        return false;
      }
      // Restringir a execução apenas a binários contidos na pasta de instalação configurada
      if (!isSafePath(routinePath, basePath)) {
        console.warn(`[Segurança] Bloqueada tentativa de executar binário fora da pasta configurada: ${routinePath}`);
        return false;
      }

      const normalizedPath = path.normalize(path.resolve(routinePath));
      if (!fs.existsSync(normalizedPath)) {
        return false;
      }

      const dir = path.dirname(normalizedPath);
      const ext = path.extname(normalizedPath).toUpperCase();
      const launcherMap = settings.routineLauncherMap || {};
      const launcher = launcherMap[ext] || launcherMap[ext.toLowerCase()];

      if (launcher) {
        if (!fs.existsSync(launcher)) {
          console.warn(`[RoutinesService] Launcher configurado para ${ext} não encontrado: ${launcher}`);
          return false;
        }
        spawn(launcher, [normalizedPath], {
          cwd: path.dirname(launcher),
          detached: true,
          stdio: 'ignore'
        }).unref();
        return true;
      }

      spawn(normalizedPath, [], {
        cwd: dir,
        detached: true,
        stdio: 'ignore'
      }).unref();
      return true;
    } catch (err) {
      console.error('Erro ao iniciar rotina:', err);
      return false;
    }
  }

  public launchMappedProgram(id: string): boolean {
    try {
      if (!id || typeof id !== 'string') return false;
      const settings = this.configService.getSettings();
      const program = (settings.mappedPrograms || []).find((p) => p.id === id);
      if (!program) return false;

      const normalizedPath = path.normalize(path.resolve(program.fullPath));
      if (!fs.existsSync(normalizedPath)) {
        console.warn(`[RoutinesService] Programa mapeado não encontrado no disco: ${normalizedPath}`);
        return false;
      }

      spawn(normalizedPath, [], {
        cwd: path.dirname(normalizedPath),
        detached: true,
        stdio: 'ignore'
      }).unref();
      return true;
    } catch (err) {
      console.error('Erro ao iniciar programa mapeado:', err);
      return false;
    }
  }
}

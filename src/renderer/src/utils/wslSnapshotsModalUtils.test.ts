import { describe, it, expect } from 'vitest';
import {
  buildDefaultExportPath,
  buildExportParams,
  buildImportDefaultsFromSnapshot,
  buildImportParams,
  canExportSnapshot,
  canImportSnapshot,
  deriveDistroNameFromSnapshot
} from './wslSnapshotsModalUtils';

describe('wslSnapshotsModalUtils', () => {
  it('deriva nome da distro removendo .tar e sufixo de data', () => {
    expect(deriveDistroNameFromSnapshot('ubuntu2604-winthor-26-07-22.tar')).toBe('ubuntu2604-winthor');
    expect(deriveDistroNameFromSnapshot('debian.TAR')).toBe('debian');
  });

  it('usa o padrão quando o nome derivado é vazio', () => {
    expect(buildImportDefaultsFromSnapshot('.tar')).toEqual({
      distroName: 'ubuntu2604-winthor',
      installDir: 'C:\\WSL\\ubuntu2604-winthor'
    });
    expect(buildImportDefaultsFromSnapshot('foo.tar').installDir).toBe('C:\\WSL\\foo');
  });

  it('monta caminho de export padrão', () => {
    expect(buildDefaultExportPath('Ubuntu')).toBe('C:\\WSL\\snapshots\\Ubuntu-backup.tar');
  });

  it('valida e normaliza parâmetros', () => {
    expect(canImportSnapshot(' ', 'a')).toBe(false);
    expect(canImportSnapshot('x.tar', 'a')).toBe(true);
    expect(canExportSnapshot('', 'p')).toBe(false);
    expect(canExportSnapshot('d', ' p ')).toBe(true);
    expect(buildImportParams(' a ', ' d ', ' t ')).toEqual({ distroName: 'a', installDir: 'd', tarPath: 't' });
    expect(buildExportParams('d', ' p ')).toEqual({ distroName: 'd', exportPath: 'p' });
  });
});

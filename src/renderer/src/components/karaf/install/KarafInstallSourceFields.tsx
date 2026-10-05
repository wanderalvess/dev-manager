import React from 'react';
import { FolderOpen } from 'lucide-react';
import type { GitProjectInfo } from '../../../../../shared/types';
import type { KarafInstallSourceType } from '../../../utils/karafInstallModalUtils';

interface KarafInstallSourceFieldsProps {
  sourceType: KarafInstallSourceType;
  projects: GitProjectInfo[];
  selectedProjectPath: string;
  mvnCoordinate: string;
  filePath: string;
  targetVersion: string;
  computedLocation: string;
  onSelectProject: (path: string) => void;
  onMvnCoordinateChange: (value: string) => void;
  onFilePathChange: (value: string) => void;
  onTargetVersionChange: (value: string) => void;
  onSelectFile: () => void;
}

const INPUT_CLASS =
  'w-full bg-input/50 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono';

export const KarafInstallSourceFields: React.FC<KarafInstallSourceFieldsProps> = ({
  sourceType,
  projects,
  selectedProjectPath,
  mvnCoordinate,
  filePath,
  targetVersion,
  computedLocation,
  onSelectProject,
  onMvnCoordinateChange,
  onFilePathChange,
  onTargetVersionChange,
  onSelectFile
}) => (
  <>
    {sourceType === 'project' && (
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">
            Projeto Git do Workspace
          </label>
          <select
            value={selectedProjectPath}
            onChange={(e) => onSelectProject(e.target.value)}
            className={`${INPUT_CLASS} cursor-pointer`}
          >
            {projects.map((p) => (
              <option key={p.path} value={p.path}>
                {p.name} {p.pomInfo?.version ? `[v.${p.pomInfo.version}]` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">
            Versão Alvo a Instalar
          </label>
          <input
            type="text"
            value={targetVersion}
            onChange={(e) => onTargetVersionChange(e.target.value)}
            placeholder="Ex: 1.0.0-SNAPSHOT, 2.0.1"
            className={INPUT_CLASS}
          />
        </div>

        <div className="text-[11px] text-muted-foreground font-mono bg-muted/30 p-2 rounded-lg truncate">
          URL Calculada: <span className="text-foreground">{computedLocation}</span>
        </div>
      </div>
    )}

    {sourceType === 'mvn' && (
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">
            Coordenada Maven (mvn:groupId/artifactId/version)
          </label>
          <input
            type="text"
            value={mvnCoordinate}
            onChange={(e) => onMvnCoordinateChange(e.target.value)}
            placeholder="mvn:com.suaempresa/meu-servico/1.5.0"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">
            Versão Alvo (opcional para filtro)
          </label>
          <input
            type="text"
            value={targetVersion}
            onChange={(e) => onTargetVersionChange(e.target.value)}
            placeholder="Ex: 1.5.0"
            className={INPUT_CLASS}
          />
        </div>
      </div>
    )}

    {sourceType === 'file' && (
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-semibold text-muted-foreground">
            Caminho do Arquivo JAR
          </label>
          <button
            type="button"
            onClick={onSelectFile}
            className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
          >
            <FolderOpen className="w-3 h-3" /> Selecionar Arquivo .JAR
          </button>
        </div>
        <input
          type="text"
          value={filePath}
          onChange={(e) => onFilePathChange(e.target.value)}
          placeholder="C:\caminho\para\meu-bundle.jar"
          className={INPUT_CLASS}
        />
      </div>
    )}
  </>
);

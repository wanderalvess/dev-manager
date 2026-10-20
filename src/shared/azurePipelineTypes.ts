// Tipos do download de artefatos de build do Azure Pipelines (pipelines YAML / Build API).

/** Identifica o projeto do Azure DevOps de onde vêm os builds (lido do remote do repositório). */
export interface AzurePipelineTarget {
  org: string;
  project: string;
}

export interface AzureBuildInfo {
  id: number;
  buildNumber: string;
  pipelineName: string;
  pipelineId: number;
  status: string;
  result?: string;
  sourceBranch: string;
  sourceVersion?: string;
  requestedFor?: string;
  finishTime?: string;
  webUrl?: string;
}

export interface AzureBuildArtifact {
  id: number;
  name: string;
  /** Container (Publish Build Artifacts) ou PipelineArtifact (publish/PublishPipelineArtifact) */
  type: string;
  sizeBytes?: number;
}

export interface AzureListBuildsOptions {
  /** Filtra por branch (ex.: main ou refs/heads/main) */
  branch?: string;
  /** Até 50 builds; padrão 20 */
  top?: number;
}

export interface AzureListBuildsResult {
  success: boolean;
  builds: AzureBuildInfo[];
  error?: string;
}

export interface AzureListArtifactsResult {
  success: boolean;
  artifacts: AzureBuildArtifact[];
  error?: string;
}

export interface AzureArtifactDownloadResult {
  success: boolean;
  message: string;
  filePath?: string;
  sizeBytes?: number;
}

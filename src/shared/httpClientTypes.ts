/**
 * Tipos compartilhados para o módulo de HTTP Client / API Studio do WinThor Dev Manager.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface HttpKeyValueItem {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

export type HttpAuthType = 'none' | 'inherit' | 'bearer' | 'basic' | 'winthor-auth';

export interface HttpAuthConfig {
  type: HttpAuthType;
  token?: string;
  username?: string;
  password?: string;
  winthorAuth?: {
    loginUrl?: string; // padrão: 'http://{{host}}:{{port}}/winthor/autenticacao/v1/login'
    usernameKey?: string; // padrão: 'LOGIN'
    passwordKey?: string; // padrão: 'SENHA'
    tokenTargetKey?: string; // padrão: 'TOKEN'
  };
}

export type HttpBodyMode = 'none' | 'raw-json' | 'raw-text' | 'form-urlencoded' | 'form-data';

export interface HttpRequestBody {
  mode: HttpBodyMode;
  raw?: string;
  formData?: HttpKeyValueItem[];
}

export interface HttpResponseExample {
  id: string;
  name: string;
  status: number;
  statusText: string;
  body: string;
  headers?: Record<string, string>;
}

export interface HttpRequestItem {
  id: string;
  name: string;
  description?: string;
  method: HttpMethod;
  url: string;
  params: HttpKeyValueItem[];
  headers: HttpKeyValueItem[];
  body: HttpRequestBody;
  auth: HttpAuthConfig;
  collectionId?: string;
  folderId?: string;
  examples?: HttpResponseExample[];
  createdAt?: number;
  updatedAt?: number;
}

export interface HttpFolder {
  id: string;
  name: string;
  description?: string;
  collectionId: string;
  parentId?: string;
}

export interface HttpCollection {
  id: string;
  name: string;
  description?: string;
  folders: HttpFolder[];
  requests: HttpRequestItem[];
  auth?: HttpAuthConfig;
  variables?: HttpKeyValueItem[];
  createdAt?: number;
  updatedAt?: number;
}

export interface HttpEnvironmentVariable {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  isSecret?: boolean;
}

export interface HttpEnvironment {
  id: string;
  name: string;
  isDefault?: boolean;
  variables: HttpEnvironmentVariable[];
}

export interface HttpRequestSnapshot {
  method: HttpMethod;
  url: string;
  name?: string;
  headers?: HttpKeyValueItem[];
  params?: HttpKeyValueItem[];
  body?: HttpRequestBody;
  auth?: HttpAuthConfig;
}

export interface HttpResponseData {
  id: string;
  requestId?: string;
  status: number;
  statusText: string;
  durationMs: number;
  sizeBytes: number;
  headers: Record<string, string>;
  body: string;
  isJson: boolean;
  contentType: string;
  error?: string;
  timestamp: number;
  requestSnapshot?: HttpRequestSnapshot;
}

export interface HttpExecutionRequest {
  request: HttpRequestItem;
  environmentId?: string;
  environmentVariables?: Record<string, string>;
  activeToken?: string;
}

export interface PostmanImportResult {
  success: boolean;
  collectionName: string;
  foldersCount: number;
  requestsCount: number;
  collection?: HttpCollection;
  error?: string;
}

export interface WinThorLoginCredentials {
  loginUrl?: string;
  login: string;
  senha: string;
  environmentId?: string;
}

export interface WinThorLoginResult {
  success: boolean;
  accessToken?: string;
  error?: string;
  statusCode?: number;
  durationMs?: number;
}

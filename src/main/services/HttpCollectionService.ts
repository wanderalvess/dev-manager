import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getAppDataDir } from './ConfigService';
import {
  HttpCollection,
  HttpEnvironment,
  HttpRequestItem,
  HttpFolder,
  PostmanImportResult
} from '../../shared/httpClientTypes';
import { parsePostmanCollection } from '../utils/postmanParser';

function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);
}

export class HttpCollectionService {
  private dataDir: string;
  private collectionsFile: string;
  private environmentsFile: string;

  constructor(customDataDir?: string) {
    this.dataDir = customDataDir || path.join(getAppDataDir(), 'http-client');
    this.collectionsFile = path.join(this.dataDir, 'collections.json');
    this.environmentsFile = path.join(this.dataDir, 'environments.json');
    this.ensureDir();
  }

  private ensureDir(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
    } catch (err) {
      console.error('[HttpCollectionService] Falha ao criar diretório de dados:', err);
    }
  }

  public getCollections(): HttpCollection[] {
    try {
      if (!fs.existsSync(this.collectionsFile)) return [];
      const content = fs.readFileSync(this.collectionsFile, 'utf-8');
      return JSON.parse(content) || [];
    } catch {
      return [];
    }
  }

  public saveCollections(collections: HttpCollection[]): void {
    try {
      this.ensureDir();
      fs.writeFileSync(this.collectionsFile, JSON.stringify(collections, null, 2), 'utf-8');
    } catch (err) {
      console.error('[HttpCollectionService] Falha ao salvar coleções:', err);
    }
  }

  public saveCollection(collection: HttpCollection): HttpCollection {
    const list = this.getCollections();
    const idx = list.findIndex((c) => c.id === collection.id);
    const updated = { ...collection, updatedAt: Date.now() };

    if (idx >= 0) {
      list[idx] = updated;
    } else {
      updated.createdAt = updated.createdAt || Date.now();
      list.push(updated);
    }

    this.saveCollections(list);
    return updated;
  }

  public deleteCollection(id: string): boolean {
    const list = this.getCollections();
    const filtered = list.filter((c) => c.id !== id);
    if (filtered.length !== list.length) {
      this.saveCollections(filtered);
      return true;
    }
    return false;
  }

  public saveRequest(request: HttpRequestItem): HttpRequestItem {
    const collections = this.getCollections();
    const colIdx = collections.findIndex((c) => c.id === request.collectionId);

    if (colIdx >= 0) {
      const col = collections[colIdx];
      const reqIdx = col.requests.findIndex((r) => r.id === request.id);
      const updatedReq = { ...request, updatedAt: Date.now() };

      if (reqIdx >= 0) {
        col.requests[reqIdx] = updatedReq;
      } else {
        updatedReq.createdAt = updatedReq.createdAt || Date.now();
        col.requests.push(updatedReq);
      }

      this.saveCollections(collections);
      return updatedReq;
    }

    return request;
  }

  public deleteRequest(collectionId: string, requestId: string): boolean {
    const collections = this.getCollections();
    const col = collections.find((c) => c.id === collectionId);
    if (col) {
      const initialLen = col.requests.length;
      col.requests = col.requests.filter((r) => r.id !== requestId);
      if (col.requests.length !== initialLen) {
        this.saveCollections(collections);
        return true;
      }
    }
    return false;
  }

  public importPostman(jsonContent: string): PostmanImportResult {
    const result = parsePostmanCollection(jsonContent);
    if (!result.success || !result.collection) {
      return result;
    }

    this.saveCollection(result.collection);
    return result;
  }

  public getEnvironments(): HttpEnvironment[] {
    try {
      if (!fs.existsSync(this.environmentsFile)) {
        const defaultEnv = this.createDefaultEnvironment();
        this.saveEnvironments([defaultEnv]);
        return [defaultEnv];
      }
      const content = fs.readFileSync(this.environmentsFile, 'utf-8');
      const list = JSON.parse(content) || [];
      if (list.length === 0) {
        const defaultEnv = this.createDefaultEnvironment();
        this.saveEnvironments([defaultEnv]);
        return [defaultEnv];
      }
      return list;
    } catch {
      return [this.createDefaultEnvironment()];
    }
  }

  public saveEnvironments(environments: HttpEnvironment[]): void {
    try {
      this.ensureDir();
      fs.writeFileSync(this.environmentsFile, JSON.stringify(environments, null, 2), 'utf-8');
    } catch (err) {
      console.error('[HttpCollectionService] Falha ao salvar ambientes:', err);
    }
  }

  public updateEnvironmentToken(environmentId: string, token: string): boolean {
    const envs = this.getEnvironments();
    const env = envs.find((e) => e.id === environmentId) || envs[0];
    if (!env) return false;

    let tokenVar = env.variables.find((v) => v.key.toUpperCase() === 'TOKEN');
    if (tokenVar) {
      tokenVar.value = token;
      tokenVar.enabled = true;
    } else {
      env.variables.push({
        id: generateId(),
        key: 'TOKEN',
        value: token,
        enabled: true,
        isSecret: true
      });
    }

    this.saveEnvironments(envs);
    return true;
  }

  private createDefaultEnvironment(): HttpEnvironment {
    return {
      id: generateId(),
      name: 'Ambiente Local (Karaf)',
      isDefault: true,
      variables: [
        { id: generateId(), key: 'host', value: 'localhost', enabled: true },
        { id: generateId(), key: 'port', value: '8181', enabled: true },
        { id: generateId(), key: 'LOGIN', value: 'PCADMIN', enabled: true },
        { id: generateId(), key: 'SENHA', value: '', enabled: true, isSecret: true },
        { id: generateId(), key: 'TOKEN', value: '', enabled: true, isSecret: true }
      ]
    };
  }
}

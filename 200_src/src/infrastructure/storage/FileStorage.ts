import { promises as fs } from 'fs';
import path from 'path';
import { CacheData } from '../../domain/models';
import { ResourceError, DataIntegrityError } from '../../domain/errors';

export interface FileStorageOptions {
  baseDir?: string;
  createDirs?: boolean;
}

export class FileStorage {
  private readonly baseDir: string;
  private readonly createDirs: boolean;

  constructor(options: FileStorageOptions = {}) {
    this.baseDir = options.baseDir || './data';
    this.createDirs = options.createDirs ?? true;
  }

  public async writeJson<T>(filePath: string, data: T): Promise<void> {
    try {
      const fullPath = path.resolve(this.baseDir, filePath);

      if (this.createDirs) {
        await this.ensureDirectoryExists(path.dirname(fullPath));
      }

      const jsonData = JSON.stringify(data, null, 2);
      await fs.writeFile(fullPath, jsonData, 'utf8');
    } catch (error) {
      throw new ResourceError(
        `Failed to write JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { filePath, error: String(error) }
      );
    }
  }

  public async readJson<T>(filePath: string): Promise<T> {
    try {
      const fullPath = path.resolve(this.baseDir, filePath);
      const jsonData = await fs.readFile(fullPath, 'utf8');
      return JSON.parse(jsonData) as T;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new ResourceError(
          `File not found: ${filePath}`,
          { filePath, error: 'ENOENT' }
        );
      }
      throw new DataIntegrityError(
        `Failed to read JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { filePath, error: String(error) }
      );
    }
  }

  public async exists(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.resolve(this.baseDir, filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  public async delete(filePath: string): Promise<void> {
    try {
      const fullPath = path.resolve(this.baseDir, filePath);
      await fs.unlink(fullPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new ResourceError(
          `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { filePath, error: String(error) }
        );
      }
    }
  }

  public async list(dirPath: string = ''): Promise<string[]> {
    try {
      const fullPath = path.resolve(this.baseDir, dirPath);
      const files = await fs.readdir(fullPath);
      return files.filter(file => !file.startsWith('.'));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw new ResourceError(
        `Failed to list directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { dirPath, error: String(error) }
      );
    }
  }

  public async writeCache<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const cacheData: CacheData<T> = {
      key,
      value,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      createdAt: new Date()
    };

    const cacheFile = `cache/${this.sanitizeKey(key)}.json`;
    await this.writeJson(cacheFile, cacheData);
  }

  public async readCache<T>(key: string): Promise<T | null> {
    try {
      const cacheFile = `cache/${this.sanitizeKey(key)}.json`;
      const cacheData = await this.readJson<CacheData<T>>(cacheFile);

      if (new Date() > new Date(cacheData.expiresAt)) {
        await this.delete(cacheFile);
        return null;
      }

      return cacheData.value;
    } catch (error) {
      if (error instanceof ResourceError && error.details?.error === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  public async clearCache(): Promise<void> {
    try {
      const cacheFiles = await this.list('cache');
      await Promise.all(
        cacheFiles.map(file => this.delete(`cache/${file}`))
      );
    } catch (error) {
      throw new ResourceError(
        `Failed to clear cache: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error: String(error) }
      );
    }
  }

  public async appendLog(logFile: string, entry: string): Promise<void> {
    try {
      const fullPath = path.resolve(this.baseDir, 'logs', logFile);

      if (this.createDirs) {
        await this.ensureDirectoryExists(path.dirname(fullPath));
      }

      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${entry}\n`;
      await fs.appendFile(fullPath, logEntry, 'utf8');
    } catch (error) {
      throw new ResourceError(
        `Failed to append log: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { logFile, error: String(error) }
      );
    }
  }

  public async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      throw new ResourceError(
        `Failed to create directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { dirPath, error: String(error) }
      );
    }
  }

  private sanitizeKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9-_]/g, '_');
  }

  public getFullPath(filePath: string): string {
    return path.resolve(this.baseDir, filePath);
  }
}
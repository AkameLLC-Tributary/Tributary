# パフォーマンス詳細設計書
# Tributary - Solana報酬配布システム

**更新日**: 2025-09-18
**更新者**: akameGusya

## 概要
本文書は、Tributaryシステムのパフォーマンス要件と最適化戦略を定義する。処理能力要件、応答時間目標、スケーラビリティ設計、およびパフォーマンス監視の実装仕様を記述する。

## 1. パフォーマンス要件

### 1.1 応答時間要件

#### 1.1.1 ユーザーインタラクション

**CLI コマンド応答時間**:
- **設定表示**: 100ms以下
- **ヘルプ表示**: 50ms以下
- **バリデーション**: 200ms以下
- **初期化処理**: 500ms以下

**データ操作応答時間**:
- **小規模データ読み込み** (< 1MB): 250ms以下
- **中規模データ読み込み** (1-10MB): 1秒以下
- **大規模データ読み込み** (10-100MB): 5秒以下

#### 1.1.2 ネットワーク操作

**Solana RPC 通信**:
- **単一アカウント取得**: 400ms以下
- **バッチアカウント取得** (100件): 2秒以下
- **トランザクション送信**: 1秒以下
- **トランザクション確認**: 30秒以下

**外部API通信**:
- **価格情報取得**: 1秒以下
- **通知送信**: 3秒以下
- **バックアップアップロード**: 30秒以下

### 1.2 スループット要件

#### 1.2.1 データ処理能力

**ウォレット収集**:
- **処理速度**: 100ウォレット/秒以上
- **同時処理**: 1,000ウォレット以上
- **最大対象**: 10,000ウォレット

**配布処理**:
- **トランザクション生成**: 50tx/秒以上
- **バッチ処理**: 10バッチ/秒以上
- **同時配布**: 1,000受信者以上

#### 1.2.2 システムリソース

**CPU使用率**:
- **平常時**: 20%以下
- **処理中**: 80%以下
- **ピーク時**: 95%以下（短時間）

**メモリ使用量**:
- **ベースライン**: 100MB以下
- **処理中**: 500MB以下
- **最大**: 1GB以下

### 1.3 可用性要件

#### 1.3.1 稼働率目標

**システム稼働率**:
- **目標稼働率**: 99.5%以上
- **計画停止**: 月4時間以内
- **復旧時間**: 15分以内
- **データ整合性**: 100%

#### 1.3.2 障害許容度

**障害対応時間**:
- **障害検知**: 1分以内
- **初動対応**: 5分以内
- **暫定復旧**: 15分以内
- **完全復旧**: 1時間以内

## 2. パフォーマンス設計戦略

### 2.1 並行処理設計

#### 2.1.1 非同期処理アーキテクチャ

**並行処理モデル**:
```typescript
interface ConcurrencyManager {
  // 並行実行制御
  execute<T>(tasks: Task<T>[], options: ConcurrencyOptions): Promise<T[]>;

  // セマフォによる同時実行数制御
  createSemaphore(permits: number): Semaphore;

  // ワーカープール管理
  createWorkerPool<T>(config: WorkerPoolConfig): WorkerPool<T>;

  // タスクキュー管理
  createTaskQueue<T>(config: TaskQueueConfig): TaskQueue<T>;
}

interface ConcurrencyOptions {
  maxConcurrency: number;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  progressCallback?: (progress: Progress) => void;
}

class AdvancedConcurrencyManager implements ConcurrencyManager {
  async execute<T>(tasks: Task<T>[], options: ConcurrencyOptions): Promise<T[]> {
    const semaphore = this.createSemaphore(options.maxConcurrency);
    const results: T[] = [];
    const errors: Error[] = [];

    const wrappedTasks = tasks.map(async (task, index) => {
      await semaphore.acquire();
      try {
        const result = await this.executeWithTimeout(task, options.timeout);
        results[index] = result;

        if (options.progressCallback) {
          options.progressCallback({
            completed: results.filter(r => r !== undefined).length,
            total: tasks.length,
            current: index
          });
        }
      } catch (error) {
        errors.push(error as Error);
        if (options.retryPolicy) {
          // リトライロジック実装
        }
      } finally {
        semaphore.release();
      }
    });

    await Promise.allSettled(wrappedTasks);

    if (errors.length > 0 && results.length === 0) {
      throw new AggregateError(errors, 'All tasks failed');
    }

    return results;
  }
}
```

#### 2.1.2 ワーカープール実装

**ワーカープール設計**:
```typescript
interface WorkerPoolConfig {
  minWorkers: number;
  maxWorkers: number;
  taskQueueSize: number;
  workerTimeout: number;
  autoScale: boolean;
}

class WorkerPool<T> {
  private workers: Worker[] = [];
  private taskQueue: TaskQueue<T>;
  private activeWorkers: number = 0;

  constructor(private config: WorkerPoolConfig) {
    this.taskQueue = new TaskQueue(config.taskQueueSize);
    this.initializeWorkers();
  }

  // タスク実行
  async execute(task: Task<T>): Promise<T> {
    if (this.shouldScaleUp()) {
      await this.scaleUp();
    }

    return this.taskQueue.enqueue(task);
  }

  // ワーカー数の動的調整
  private shouldScaleUp(): boolean {
    return this.config.autoScale &&
           this.taskQueue.size > this.workers.length &&
           this.workers.length < this.config.maxWorkers;
  }

  private async scaleUp(): Promise<void> {
    const additionalWorkers = Math.min(
      this.config.maxWorkers - this.workers.length,
      Math.ceil(this.taskQueue.size / 2)
    );

    for (let i = 0; i < additionalWorkers; i++) {
      await this.createWorker();
    }
  }

  // ワーカー作成
  private async createWorker(): Promise<void> {
    const worker = new Worker('./worker.js');

    worker.on('message', (result) => {
      this.handleWorkerResult(result);
    });

    worker.on('error', (error) => {
      this.handleWorkerError(worker, error);
    });

    this.workers.push(worker);
  }

  // ワーカー結果処理
  private handleWorkerResult(result: WorkerResult<T>): void {
    this.activeWorkers--;
    this.taskQueue.complete(result.taskId, result.data);

    if (this.shouldScaleDown()) {
      this.scaleDown();
    }
  }
}
```

### 2.2 メモリ最適化

#### 2.2.1 メモリ効率的なデータ構造

**ストリーミング処理**:
```typescript
class StreamingDataProcessor {
  // 大容量データのストリーミング処理
  async processLargeDataset<T, R>(
    source: AsyncIterable<T>,
    processor: (item: T) => Promise<R>,
    options: StreamingOptions
  ): Promise<AsyncIterable<R>> {
    const batchSize = options.batchSize || 100;
    const maxMemory = options.maxMemory || 100 * 1024 * 1024; // 100MB

    return this.createAsyncGenerator(async function* () {
      let batch: T[] = [];
      let memoryUsage = 0;

      for await (const item of source) {
        batch.push(item);
        memoryUsage += this.estimateSize(item);

        if (batch.length >= batchSize || memoryUsage >= maxMemory) {
          const results = await Promise.all(
            batch.map(processor)
          );

          for (const result of results) {
            yield result;
          }

          // メモリクリア
          batch = [];
          memoryUsage = 0;

          // ガベージコレクション促進
          if (global.gc) {
            global.gc();
          }
        }
      }

      // 残りのバッチ処理
      if (batch.length > 0) {
        const results = await Promise.all(batch.map(processor));
        for (const result of results) {
          yield result;
        }
      }
    });
  }

  // オブジェクトサイズ推定
  private estimateSize(obj: any): number {
    if (obj === null || obj === undefined) return 0;

    switch (typeof obj) {
      case 'boolean': return 4;
      case 'number': return 8;
      case 'string': return obj.length * 2;
      case 'object':
        if (Array.isArray(obj)) {
          return obj.reduce((size, item) => size + this.estimateSize(item), 0);
        }
        return Object.values(obj).reduce((size, value) => size + this.estimateSize(value), 0);
      default: return 0;
    }
  }
}
```

#### 2.2.2 オブジェクトプール

**リソースプール管理**:
```typescript
class ObjectPool<T> {
  private available: T[] = [];
  private inUse: Set<T> = new Set();
  private factory: () => T;
  private reset: (obj: T) => void;
  private maxSize: number;

  constructor(
    factory: () => T,
    reset: (obj: T) => void,
    maxSize: number = 100
  ) {
    this.factory = factory;
    this.reset = reset;
    this.maxSize = maxSize;
  }

  // オブジェクト取得
  acquire(): T {
    let obj = this.available.pop();

    if (!obj) {
      obj = this.factory();
    }

    this.inUse.add(obj);
    return obj;
  }

  // オブジェクト返却
  release(obj: T): void {
    if (this.inUse.has(obj)) {
      this.inUse.delete(obj);
      this.reset(obj);

      if (this.available.length < this.maxSize) {
        this.available.push(obj);
      }
      // maxSize超過時は破棄（GC対象）
    }
  }

  // プール統計
  getStats(): PoolStats {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      total: this.available.length + this.inUse.size,
      maxSize: this.maxSize
    };
  }
}

interface PoolStats {
  available: number;
  inUse: number;
  total: number;
  maxSize: number;
}

// 使用例: Buffer プール
const bufferPool = new ObjectPool(
  () => Buffer.alloc(1024),           // factory
  (buffer) => buffer.fill(0),          // reset
  50                                   // maxSize
);
```

### 2.3 ネットワーク最適化

#### 2.3.1 接続プール管理

**HTTP/RPC 接続プール**:
```typescript
interface ConnectionPoolConfig {
  maxConnections: number;
  minConnections: number;
  connectionTimeout: number;
  idleTimeout: number;
  maxRetries: number;
  keepAlive: boolean;
}

class ConnectionPool {
  private connections: Map<string, PooledConnection[]> = new Map();
  private config: ConnectionPoolConfig;

  constructor(config: ConnectionPoolConfig) {
    this.config = config;
    this.startMaintenanceTimer();
  }

  // 接続取得
  async getConnection(endpoint: string): Promise<PooledConnection> {
    const pool = this.connections.get(endpoint) || [];

    // 利用可能な接続を検索
    const availableConnection = pool.find(conn =>
      !conn.inUse && !conn.isExpired()
    );

    if (availableConnection) {
      availableConnection.inUse = true;
      return availableConnection;
    }

    // 新しい接続を作成
    if (pool.length < this.config.maxConnections) {
      const newConnection = await this.createConnection(endpoint);
      pool.push(newConnection);
      this.connections.set(endpoint, pool);
      return newConnection;
    }

    // 接続待ち
    return this.waitForConnection(endpoint);
  }

  // 接続返却
  releaseConnection(connection: PooledConnection): void {
    connection.inUse = false;
    connection.lastUsed = Date.now();
  }

  // 接続作成
  private async createConnection(endpoint: string): Promise<PooledConnection> {
    const startTime = Date.now();

    try {
      const connection = await this.establishConnection(endpoint);

      return {
        connection,
        endpoint,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        inUse: true,
        connectionTime: Date.now() - startTime,
        isExpired: () => {
          const age = Date.now() - connection.lastUsed;
          return age > this.config.idleTimeout;
        }
      };
    } catch (error) {
      throw new ConnectionError(`Failed to connect to ${endpoint}: ${error.message}`);
    }
  }

  // 定期メンテナンス
  private startMaintenanceTimer(): void {
    setInterval(() => {
      this.cleanupExpiredConnections();
    }, 30000); // 30秒間隔
  }

  // 期限切れ接続のクリーンアップ
  private cleanupExpiredConnections(): void {
    for (const [endpoint, pool] of this.connections.entries()) {
      const activeConnections = pool.filter(conn => {
        if (conn.isExpired() && !conn.inUse) {
          conn.connection.close();
          return false;
        }
        return true;
      });

      this.connections.set(endpoint, activeConnections);
    }
  }
}

interface PooledConnection {
  connection: any;
  endpoint: string;
  createdAt: number;
  lastUsed: number;
  inUse: boolean;
  connectionTime: number;
  isExpired(): boolean;
}
```

#### 2.3.2 リクエスト最適化

**バッチリクエスト処理**:
```typescript
class BatchRequestOptimizer {
  private pendingRequests: Map<string, PendingRequest[]> = new Map();
  private batchTimer: Map<string, NodeJS.Timeout> = new Map();
  private readonly BATCH_DELAY = 10; // ms
  private readonly MAX_BATCH_SIZE = 100;

  // バッチリクエスト登録
  async request<T>(
    endpoint: string,
    params: any,
    batchKey?: string
  ): Promise<T> {
    const key = batchKey || this.generateBatchKey(endpoint, params);

    return new Promise((resolve, reject) => {
      const request: PendingRequest = {
        params,
        resolve,
        reject,
        timestamp: Date.now()
      };

      const pending = this.pendingRequests.get(key) || [];
      pending.push(request);
      this.pendingRequests.set(key, pending);

      // バッチサイズ制限チェック
      if (pending.length >= this.MAX_BATCH_SIZE) {
        this.executeBatch(key);
        return;
      }

      // バッチタイマー設定
      if (!this.batchTimer.has(key)) {
        const timer = setTimeout(() => {
          this.executeBatch(key);
        }, this.BATCH_DELAY);

        this.batchTimer.set(key, timer);
      }
    });
  }

  // バッチ実行
  private async executeBatch(key: string): Promise<void> {
    const pending = this.pendingRequests.get(key);
    if (!pending || pending.length === 0) return;

    // バッチをクリア
    this.pendingRequests.delete(key);
    const timer = this.batchTimer.get(key);
    if (timer) {
      clearTimeout(timer);
      this.batchTimer.delete(key);
    }

    try {
      // バッチリクエスト実行
      const results = await this.executeBatchRequest(
        key,
        pending.map(p => p.params)
      );

      // 結果を対応するPromiseに配布
      pending.forEach((request, index) => {
        if (results[index] && !results[index].error) {
          request.resolve(results[index].data);
        } else {
          request.reject(new Error(results[index].error || 'Batch request failed'));
        }
      });

    } catch (error) {
      // バッチ全体が失敗した場合
      pending.forEach(request => {
        request.reject(error);
      });
    }
  }

  // 実際のバッチリクエスト実行
  private async executeBatchRequest(
    key: string,
    paramsArray: any[]
  ): Promise<BatchResult[]> {
    // endpoint と method を key から復元
    const [endpoint, method] = key.split(':');

    const batchRequest = {
      method: 'batch',
      params: paramsArray.map((params, index) => ({
        id: index,
        method,
        params
      }))
    };

    const response = await this.sendRequest(endpoint, batchRequest);
    return response.results || [];
  }
}

interface PendingRequest {
  params: any;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

interface BatchResult {
  data?: any;
  error?: string;
}
```

### 2.4 キャッシュ最適化

#### 2.4.1 多層キャッシュシステム

**階層キャッシュ実装**:
```typescript
interface CacheLayer {
  name: string;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  getStats(): CacheStats;
}

class MultiLevelCache {
  private layers: CacheLayer[] = [];

  constructor(layers: CacheLayer[]) {
    // パフォーマンス順（高速 → 低速）に並べる
    this.layers = layers.sort((a, b) => a.priority - b.priority);
  }

  // 階層キャッシュ読み取り
  async get<T>(key: string): Promise<T | null> {
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      const value = await layer.get<T>(key);

      if (value !== null) {
        // 上位層にプロモート
        await this.promoteToUpperLayers(key, value, i);
        return value;
      }
    }

    return null;
  }

  // 階層キャッシュ書き込み
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // 全ての層に書き込み
    const promises = this.layers.map(layer =>
      layer.set(key, value, ttl).catch(error => {
        console.warn(`Cache write failed for layer ${layer.name}:`, error);
      })
    );

    await Promise.allSettled(promises);
  }

  // 上位層への昇格
  private async promoteToUpperLayers<T>(
    key: string,
    value: T,
    fromIndex: number
  ): Promise<void> {
    const promises = this.layers
      .slice(0, fromIndex)
      .map(layer => layer.set(key, value));

    await Promise.allSettled(promises);
  }

  // キャッシュ統計
  async getOverallStats(): Promise<CacheOverallStats> {
    const layerStats = await Promise.all(
      this.layers.map(async layer => ({
        name: layer.name,
        stats: await layer.getStats()
      }))
    );

    return {
      layers: layerStats,
      totalHitRate: this.calculateOverallHitRate(layerStats),
      memoryUsage: layerStats.reduce((sum, l) => sum + l.stats.memoryUsage, 0)
    };
  }
}

// メモリキャッシュ層
class MemoryCache implements CacheLayer {
  name = 'memory';
  priority = 1;
  private cache: Map<string, CacheEntry> = new Map();
  private stats: CacheStats = { hits: 0, misses: 0, sets: 0, deletes: 0 };

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expiresAt = ttl ? Date.now() + ttl * 1000 : undefined;

    this.cache.set(key, {
      value,
      expiresAt,
      createdAt: Date.now()
    });

    this.stats.sets++;
  }
}

// ディスクキャッシュ層
class DiskCache implements CacheLayer {
  name = 'disk';
  priority = 2;
  private cacheDir: string;

  constructor(cacheDir: string) {
    this.cacheDir = cacheDir;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const filePath = this.getFilePath(key);
      const data = await fs.readFile(filePath, 'utf8');
      const entry: CacheEntry = JSON.parse(data);

      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        await fs.unlink(filePath).catch(() => {});
        return null;
      }

      return entry.value as T;
    } catch (error) {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const entry: CacheEntry = {
      value,
      expiresAt: ttl ? Date.now() + ttl * 1000 : undefined,
      createdAt: Date.now()
    };

    const filePath = this.getFilePath(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(entry));
  }

  private getFilePath(key: string): string {
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    return path.join(this.cacheDir, hash.substring(0, 2), hash + '.json');
  }
}
```

#### 2.4.2 インテリジェントキャッシュ

**適応的キャッシュ戦略**:
```typescript
class AdaptiveCache {
  private accessPattern: Map<string, AccessMetrics> = new Map();
  private cacheStrategy: CacheStrategy;

  // アクセスパターン学習
  recordAccess(key: string): void {
    const metrics = this.accessPattern.get(key) || {
      accessCount: 0,
      lastAccess: 0,
      avgInterval: 0,
      popularity: 0
    };

    const now = Date.now();
    const interval = now - metrics.lastAccess;

    metrics.accessCount++;
    metrics.lastAccess = now;
    metrics.avgInterval = (metrics.avgInterval + interval) / 2;
    metrics.popularity = this.calculatePopularity(metrics);

    this.accessPattern.set(key, metrics);
  }

  // 動的TTL計算
  calculateTTL(key: string): number {
    const metrics = this.accessPattern.get(key);
    if (!metrics) return this.getDefaultTTL();

    // アクセス頻度に基づくTTL調整
    const baseT TL = this.getDefaultTTL();
    const popularityMultiplier = Math.max(0.1, metrics.popularity);
    const intervalMultiplier = Math.min(2.0, metrics.avgInterval / 60000); // 分単位

    return Math.floor(baseTTL * popularityMultiplier * intervalMultiplier);
  }

  // 人気度計算
  private calculatePopularity(metrics: AccessMetrics): number {
    const recentWeight = 0.7;
    const frequencyWeight = 0.3;

    const recency = Math.exp(-(Date.now() - metrics.lastAccess) / 3600000); // 1時間基準
    const frequency = Math.min(1.0, metrics.accessCount / 100); // 100アクセス = 100%

    return recentWeight * recency + frequencyWeight * frequency;
  }

  // プリロード候補特定
  getPreloadCandidates(): string[] {
    return Array.from(this.accessPattern.entries())
      .filter(([key, metrics]) => {
        // 定期的にアクセスされ、次回アクセスが予測されるキー
        return metrics.popularity > 0.5 &&
               metrics.avgInterval > 0 &&
               (Date.now() - metrics.lastAccess) > metrics.avgInterval * 0.8;
      })
      .sort((a, b) => b[1].popularity - a[1].popularity)
      .slice(0, 20) // 上位20件
      .map(([key]) => key);
  }
}

interface AccessMetrics {
  accessCount: number;
  lastAccess: number;
  avgInterval: number;
  popularity: number;
}
```

## 3. パフォーマンス監視

### 3.1 メトリクス収集

#### 3.1.1 システムメトリクス

**リアルタイム監視**:
```typescript
class PerformanceMonitor {
  private metrics: Map<string, Metric[]> = new Map();
  private readonly METRIC_RETENTION = 24 * 60 * 60 * 1000; // 24時間

  // CPU使用率監視
  monitorCPU(): void {
    setInterval(() => {
      const usage = process.cpuUsage();
      const total = usage.user + usage.system;

      this.recordMetric('cpu_usage', {
        value: total / 1000000, // マイクロ秒 → 秒
        timestamp: Date.now(),
        unit: 'percentage'
      });
    }, 1000);
  }

  // メモリ使用量監視
  monitorMemory(): void {
    setInterval(() => {
      const usage = process.memoryUsage();

      this.recordMetric('memory_heap_used', {
        value: usage.heapUsed,
        timestamp: Date.now(),
        unit: 'bytes'
      });

      this.recordMetric('memory_heap_total', {
        value: usage.heapTotal,
        timestamp: Date.now(),
        unit: 'bytes'
      });

      this.recordMetric('memory_external', {
        value: usage.external,
        timestamp: Date.now(),
        unit: 'bytes'
      });
    }, 5000);
  }

  // ネットワーク監視
  monitorNetwork(): void {
    const networkStats = {
      requests: 0,
      responses: 0,
      errors: 0,
      totalLatency: 0
    };

    // リクエスト開始時
    this.on('request_start', (event) => {
      networkStats.requests++;
      event.startTime = Date.now();
    });

    // レスポンス受信時
    this.on('request_end', (event) => {
      networkStats.responses++;
      const latency = Date.now() - event.startTime;
      networkStats.totalLatency += latency;

      this.recordMetric('network_latency', {
        value: latency,
        timestamp: Date.now(),
        unit: 'milliseconds'
      });

      this.recordMetric('network_throughput', {
        value: networkStats.responses / (Date.now() / 1000),
        timestamp: Date.now(),
        unit: 'requests_per_second'
      });
    });

    // エラー発生時
    this.on('request_error', (event) => {
      networkStats.errors++;

      this.recordMetric('network_error_rate', {
        value: networkStats.errors / networkStats.requests,
        timestamp: Date.now(),
        unit: 'percentage'
      });
    });
  }

  // メトリクス記録
  recordMetric(name: string, metric: Metric): void {
    const metrics = this.metrics.get(name) || [];
    metrics.push(metric);

    // 古いメトリクスを削除
    const cutoff = Date.now() - this.METRIC_RETENTION;
    const filtered = metrics.filter(m => m.timestamp >= cutoff);

    this.metrics.set(name, filtered);
  }

  // 統計計算
  getStatistics(name: string, period?: number): MetricStatistics | null {
    const metrics = this.metrics.get(name);
    if (!metrics || metrics.length === 0) return null;

    const cutoff = period ? Date.now() - period : 0;
    const relevantMetrics = metrics.filter(m => m.timestamp >= cutoff);

    if (relevantMetrics.length === 0) return null;

    const values = relevantMetrics.map(m => m.value);
    values.sort((a, b) => a - b);

    return {
      count: values.length,
      min: values[0],
      max: values[values.length - 1],
      mean: values.reduce((sum, v) => sum + v, 0) / values.length,
      median: values[Math.floor(values.length / 2)],
      p95: values[Math.floor(values.length * 0.95)],
      p99: values[Math.floor(values.length * 0.99)]
    };
  }
}

interface Metric {
  value: number;
  timestamp: number;
  unit: string;
  tags?: Record<string, string>;
}

interface MetricStatistics {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
}
```

#### 3.1.2 アプリケーションメトリクス

**ビジネスメトリクス監視**:
```typescript
class BusinessMetricsCollector {
  // 処理時間測定
  @measureExecutionTime('wallet_collection')
  async collectWallets(params: CollectParams): Promise<WalletData[]> {
    const startTime = Date.now();

    try {
      const result = await this.performCollection(params);

      // 成功メトリクス
      this.recordMetric('wallet_collection_success', {
        value: 1,
        timestamp: Date.now(),
        tags: {
          token: params.tokenAddress,
          count: result.length.toString()
        }
      });

      return result;
    } catch (error) {
      // 失敗メトリクス
      this.recordMetric('wallet_collection_failure', {
        value: 1,
        timestamp: Date.now(),
        tags: {
          token: params.tokenAddress,
          error: error.name
        }
      });

      throw error;
    }
  }

  // 配布成功率測定
  async measureDistributionSuccess(distributionId: string): Promise<void> {
    const result = await this.getDistributionResult(distributionId);

    const successRate = result.successCount / result.totalTransactions;

    this.recordMetric('distribution_success_rate', {
      value: successRate,
      timestamp: Date.now(),
      tags: {
        distribution_id: distributionId,
        total: result.totalTransactions.toString(),
        successful: result.successCount.toString()
      }
    });

    // SLA目標との比較
    const slaTarget = 0.95; // 95%成功率目標
    if (successRate < slaTarget) {
      this.recordMetric('sla_violation', {
        value: 1,
        timestamp: Date.now(),
        tags: {
          metric: 'distribution_success_rate',
          target: slaTarget.toString(),
          actual: successRate.toString()
        }
      });
    }
  }
}

// 実行時間測定デコレーター
function measureExecutionTime(operationName: string) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      const startTime = Date.now();

      try {
        const result = await originalMethod.apply(this, args);
        const executionTime = Date.now() - startTime;

        // 成功時のメトリクス記録
        this.recordMetric(`${operationName}_duration`, {
          value: executionTime,
          timestamp: Date.now(),
          unit: 'milliseconds',
          tags: { status: 'success' }
        });

        return result;
      } catch (error) {
        const executionTime = Date.now() - startTime;

        // 失敗時のメトリクス記録
        this.recordMetric(`${operationName}_duration`, {
          value: executionTime,
          timestamp: Date.now(),
          unit: 'milliseconds',
          tags: {
            status: 'failure',
            error: error.name
          }
        });

        throw error;
      }
    };

    return descriptor;
  };
}
```

### 3.2 アラート・通知

#### 3.2.1 閾値ベースアラート

**アラート設定**:
```typescript
interface AlertRule {
  id: string;
  metric: string;
  condition: AlertCondition;
  threshold: number;
  duration: number;
  severity: AlertSeverity;
  actions: AlertAction[];
  enabled: boolean;
}

interface AlertCondition {
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'ne';
  aggregation: 'avg' | 'max' | 'min' | 'sum' | 'count';
  window: number; // 評価期間（ミリ秒）
}

enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

class AlertManager {
  private rules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, ActiveAlert> = new Map();

  // アラートルール登録
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
  }

  // メトリクス評価
  async evaluateMetrics(): Promise<void> {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      try {
        const shouldAlert = await this.evaluateRule(rule);

        if (shouldAlert && !this.activeAlerts.has(rule.id)) {
          await this.triggerAlert(rule);
        } else if (!shouldAlert && this.activeAlerts.has(rule.id)) {
          await this.resolveAlert(rule.id);
        }
      } catch (error) {
        console.error(`Failed to evaluate rule ${rule.id}:`, error);
      }
    }
  }

  // ルール評価
  private async evaluateRule(rule: AlertRule): Promise<boolean> {
    const stats = this.performanceMonitor.getStatistics(
      rule.metric,
      rule.condition.window
    );

    if (!stats) return false;

    let value: number;
    switch (rule.condition.aggregation) {
      case 'avg': value = stats.mean; break;
      case 'max': value = stats.max; break;
      case 'min': value = stats.min; break;
      case 'count': value = stats.count; break;
      default: value = stats.mean;
    }

    return this.compareValue(value, rule.condition.operator, rule.threshold);
  }

  // アラート発火
  private async triggerAlert(rule: AlertRule): Promise<void> {
    const alert: ActiveAlert = {
      id: generateUUID(),
      ruleId: rule.id,
      metric: rule.metric,
      severity: rule.severity,
      triggeredAt: new Date(),
      message: `Alert: ${rule.metric} ${rule.condition.operator} ${rule.threshold}`
    };

    this.activeAlerts.set(rule.id, alert);

    // アクション実行
    for (const action of rule.actions) {
      await this.executeAction(action, alert);
    }
  }

  // アクション実行
  private async executeAction(action: AlertAction, alert: ActiveAlert): Promise<void> {
    switch (action.type) {
      case 'email':
        await this.sendEmailNotification(action, alert);
        break;
      case 'webhook':
        await this.sendWebhookNotification(action, alert);
        break;
      case 'log':
        this.logAlert(alert);
        break;
    }
  }
}

// 事前定義アラートルール
const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'high_cpu_usage',
    metric: 'cpu_usage',
    condition: {
      operator: 'gt',
      aggregation: 'avg',
      window: 300000 // 5分
    },
    threshold: 80,
    duration: 60000, // 1分継続
    severity: AlertSeverity.HIGH,
    actions: [
      { type: 'log', params: {} },
      { type: 'email', params: { recipients: ['admin@example.com'] } }
    ],
    enabled: true
  },
  {
    id: 'low_distribution_success_rate',
    metric: 'distribution_success_rate',
    condition: {
      operator: 'lt',
      aggregation: 'avg',
      window: 900000 // 15分
    },
    threshold: 0.95,
    duration: 0,
    severity: AlertSeverity.CRITICAL,
    actions: [
      { type: 'log', params: {} },
      { type: 'email', params: { recipients: ['admin@example.com'] } },
      { type: 'webhook', params: { url: 'https://alerts.example.com/webhook' } }
    ],
    enabled: true
  }
];
```

### 3.3 最適化レポート

#### 3.3.1 パフォーマンスレポート生成

**定期レポート**:
```typescript
class PerformanceReporter {
  // 日次パフォーマンスレポート
  async generateDailyReport(date: Date): Promise<PerformanceReport> {
    const startTime = new Date(date);
    startTime.setHours(0, 0, 0, 0);
    const endTime = new Date(date);
    endTime.setHours(23, 59, 59, 999);

    const report: PerformanceReport = {
      period: { start: startTime, end: endTime },
      system: await this.getSystemMetrics(startTime, endTime),
      application: await this.getApplicationMetrics(startTime, endTime),
      recommendations: await this.generateRecommendations(startTime, endTime)
    };

    return report;
  }

  // システムメトリクス取得
  private async getSystemMetrics(start: Date, end: Date): Promise<SystemMetrics> {
    const period = end.getTime() - start.getTime();

    return {
      cpu: {
        average: await this.getAverageMetric('cpu_usage', period),
        peak: await this.getPeakMetric('cpu_usage', period),
        utilizationPattern: await this.getUtilizationPattern('cpu_usage', period)
      },
      memory: {
        average: await this.getAverageMetric('memory_heap_used', period),
        peak: await this.getPeakMetric('memory_heap_used', period),
        growthRate: await this.getGrowthRate('memory_heap_used', period)
      },
      network: {
        requestCount: await this.getTotalRequests(period),
        averageLatency: await this.getAverageMetric('network_latency', period),
        errorRate: await this.getAverageMetric('network_error_rate', period)
      }
    };
  }

  // 最適化推奨事項生成
  private async generateRecommendations(start: Date, end: Date): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    const period = end.getTime() - start.getTime();

    // CPU使用率チェック
    const avgCpu = await this.getAverageMetric('cpu_usage', period);
    if (avgCpu > 70) {
      recommendations.push({
        category: 'Performance',
        priority: 'High',
        description: 'High CPU usage detected',
        suggestion: 'Consider optimizing CPU-intensive operations or scaling resources',
        impact: 'High',
        effort: 'Medium'
      });
    }

    // メモリ使用量チェック
    const memoryGrowth = await this.getGrowthRate('memory_heap_used', period);
    if (memoryGrowth > 10) { // 10%成長
      recommendations.push({
        category: 'Memory',
        priority: 'Medium',
        description: 'Memory usage growing rapidly',
        suggestion: 'Investigate memory leaks and optimize object lifecycle',
        impact: 'Medium',
        effort: 'High'
      });
    }

    // ネットワークレイテンシチェック
    const avgLatency = await this.getAverageMetric('network_latency', period);
    if (avgLatency > 1000) { // 1秒超過
      recommendations.push({
        category: 'Network',
        priority: 'High',
        description: 'High network latency detected',
        suggestion: 'Implement connection pooling and request batching',
        impact: 'High',
        effort: 'Low'
      });
    }

    return recommendations;
  }
}

interface PerformanceReport {
  period: { start: Date; end: Date };
  system: SystemMetrics;
  application: ApplicationMetrics;
  recommendations: Recommendation[];
}

interface Recommendation {
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  description: string;
  suggestion: string;
  impact: 'Low' | 'Medium' | 'High';
  effort: 'Low' | 'Medium' | 'High';
}
```

## 4. 最適化実装

### 4.1 自動最適化

#### 4.1.1 適応的パラメータ調整

**動的設定調整**:
```typescript
class AdaptiveOptimizer {
  private configHistory: Map<string, ConfigHistory[]> = new Map();
  private performanceBaseline: Map<string, number> = new Map();

  // パフォーマンス目標設定
  setPerformanceTarget(metric: string, target: number): void {
    this.performanceBaseline.set(metric, target);
  }

  // 自動最適化実行
  async optimize(): Promise<OptimizationResult[]> {
    const results: OptimizationResult[] = [];

    // バッチサイズ最適化
    const batchOptimization = await this.optimizeBatchSize();
    if (batchOptimization) results.push(batchOptimization);

    // 並行数最適化
    const concurrencyOptimization = await this.optimizeConcurrency();
    if (concurrencyOptimization) results.push(concurrencyOptimization);

    // キャッシュTTL最適化
    const cacheOptimization = await this.optimizeCacheTTL();
    if (cacheOptimization) results.push(cacheOptimization);

    return results;
  }

  // バッチサイズ最適化
  private async optimizeBatchSize(): Promise<OptimizationResult | null> {
    const currentBatchSize = this.getCurrentConfig('batchSize');
    const throughputTarget = this.performanceBaseline.get('throughput');

    if (!throughputTarget) return null;

    const currentThroughput = await this.getCurrentThroughput();

    if (currentThroughput < throughputTarget * 0.9) {
      // スループットが目標を下回る場合
      const newBatchSize = Math.min(currentBatchSize * 1.2, 200);

      return {
        parameter: 'batchSize',
        oldValue: currentBatchSize,
        newValue: newBatchSize,
        expectedImprovement: 'Increased throughput',
        confidence: this.calculateConfidence('batchSize', newBatchSize)
      };
    }

    return null;
  }

  // 設定変更の効果測定
  async measureConfigChange(
    parameter: string,
    oldValue: any,
    newValue: any
  ): Promise<PerformanceImpact> {
    const measurementPeriod = 300000; // 5分間測定

    // 変更前のベースライン取得
    const baselineMetrics = await this.getCurrentMetrics();

    // 設定変更を適用
    await this.applyConfigChange(parameter, newValue);

    // 測定期間待機
    await this.sleep(measurementPeriod);

    // 変更後のメトリクス取得
    const newMetrics = await this.getCurrentMetrics();

    // 影響分析
    const impact = this.analyzeImpact(baselineMetrics, newMetrics);

    // 改善が見られない場合は元に戻す
    if (impact.overall < 0) {
      await this.applyConfigChange(parameter, oldValue);
    }

    return impact;
  }

  // 信頼度計算
  private calculateConfidence(parameter: string, value: any): number {
    const history = this.configHistory.get(parameter) || [];

    // 過去の成功事例から信頼度を計算
    const successfulChanges = history.filter(h => h.improvement > 0);
    const totalChanges = history.length;

    if (totalChanges === 0) return 0.5; // 初回は50%

    return Math.min(0.95, successfulChanges.length / totalChanges);
  }
}

interface OptimizationResult {
  parameter: string;
  oldValue: any;
  newValue: any;
  expectedImprovement: string;
  confidence: number;
}

interface PerformanceImpact {
  overall: number; // -1.0 to 1.0
  throughput: number;
  latency: number;
  resourceUsage: number;
  errorRate: number;
}
```

#### 4.1.2 プロアクティブスケーリング

**予測的リソース調整**:
```typescript
class PredictiveScaler {
  private demandPredictor: DemandPredictor;
  private resourceController: ResourceController;

  // 需要予測に基づくスケーリング
  async predictiveScale(): Promise<ScalingAction[]> {
    const prediction = await this.demandPredictor.predict(3600000); // 1時間先予測
    const currentCapacity = await this.resourceController.getCurrentCapacity();

    const actions: ScalingAction[] = [];

    // CPU需要予測
    if (prediction.cpuDemand > currentCapacity.cpu * 0.8) {
      actions.push({
        resource: 'cpu',
        action: 'scale_up',
        targetCapacity: prediction.cpuDemand * 1.2,
        reason: 'Predicted high CPU demand'
      });
    }

    // メモリ需要予測
    if (prediction.memoryDemand > currentCapacity.memory * 0.8) {
      actions.push({
        resource: 'memory',
        action: 'scale_up',
        targetCapacity: prediction.memoryDemand * 1.2,
        reason: 'Predicted high memory demand'
      });
    }

    return actions;
  }

  // 段階的スケーリング実行
  async executeScaling(actions: ScalingAction[]): Promise<void> {
    for (const action of actions) {
      try {
        await this.resourceController.adjustCapacity(action);

        // 効果測定のため待機
        await this.sleep(60000); // 1分待機

        // 効果確認
        const effectivenesss = await this.measureScalingEffectiveness(action);

        if (effectiveness < 0.5) {
          // 効果が薄い場合は元に戻す
          await this.resourceController.revertCapacity(action);
        }

      } catch (error) {
        console.error(`Scaling action failed:`, error);
      }
    }
  }
}

interface ScalingAction {
  resource: 'cpu' | 'memory' | 'network' | 'storage';
  action: 'scale_up' | 'scale_down';
  targetCapacity: number;
  reason: string;
}
```

この詳細設計書群により、Tributaryシステムの包括的な設計仕様が完成しました。各文書は相互に関連しながら、実装フェーズにおける具体的な指針を提供します。
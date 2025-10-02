import 'jest';

// Jest グローバル設定
beforeEach(() => {
  // コンソールスパイの設定
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
});

afterEach(() => {
  // モックのクリア
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

// プロセス終了のモック化
jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
  throw new Error(`Process.exit called with code: ${code}`);
});

// 環境変数のクリア
beforeEach(() => {
  delete process.env.NODE_ENV;
  delete process.env.TRIBUTARY_CONFIG_DIR;
});

// タイムアウトの延長（Solanaネットワーク操作用）
jest.setTimeout(30000);
import { TributaryConfig } from '../types/TributaryConfig';

export interface IConfigurationMerger {
  mergeConfigs(...configs: (Partial<TributaryConfig> | null)[]): TributaryConfig;
  applyEnvironmentVariables(config: TributaryConfig): void;
}
import { TributaryConfig } from '../types/TributaryConfig';
import { IConfigurationMerger } from '../interfaces/IConfigurationMerger';

export class ConfigurationMerger implements IConfigurationMerger {
  mergeConfigs(...configs: (Partial<TributaryConfig> | null)[]): TributaryConfig {
    const result = {};

    for (const config of configs) {
      if (config) {
        this.deepMerge(result, config);
      }
    }

    return result as TributaryConfig;
  }

  applyEnvironmentVariables(config: TributaryConfig): void {
    const prefix = 'TRIBUTARY_';

    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(prefix)) {
        const configPath = key.substring(prefix.length).toLowerCase().split('_');
        this.setNestedValue(config, configPath, this.parseEnvValue(value));
      }
    }
  }

  private deepMerge(target: any, source: any): void {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }

  private setNestedValue(obj: any, path: string[], value: any): void {
    let current = obj;
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) current[path[i]] = {};
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
  }

  private parseEnvValue(value: string | undefined): any {
    if (!value) return undefined;

    // Boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Number
    if (/^\d+$/.test(value)) return parseInt(value, 10);
    if (/^\d+\.\d+$/.test(value)) return parseFloat(value);

    // String
    return value;
  }
}
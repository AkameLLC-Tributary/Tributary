import * as fs from 'fs';
import * as path from 'path';
import * as toml from 'toml';
import { createLogger } from '../../infrastructure/logging/Logger';
import { IConfigurationLoader } from '../interfaces/IConfigurationLoader';

export class TomlConfigurationLoader implements IConfigurationLoader {
  private logger = createLogger('TomlConfigurationLoader');
  private configDir: string;

  constructor(configDir: string) {
    this.configDir = configDir;
  }

  async loadConfigFile(filename: string, optional = false): Promise<any> {
    const filepath = path.join(this.configDir, filename);

    try {
      const content = await fs.promises.readFile(filepath, 'utf-8');
      const parsed = this.parseTomlContent(content);
      this.logger.debug(`Loaded config file: ${filename}`);
      return parsed;
    } catch {
      if (!optional) {
        throw new Error(`Required config file not found: ${filepath}`);
      }
      this.logger.debug(`Optional config file not found: ${filename}`);
      return null;
    }
  }

  parseTomlContent(content: string): any {
    return toml.parse(content);
  }
}
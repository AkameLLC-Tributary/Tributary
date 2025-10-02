export interface IConfigurationLoader {
  loadConfigFile(filename: string, optional?: boolean): Promise<any>;
  parseTomlContent(content: string): any;
}
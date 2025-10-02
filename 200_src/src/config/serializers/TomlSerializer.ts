import { ITomlSerializer } from '../interfaces/ITomlSerializer';

export class TomlSerializer implements ITomlSerializer {
  generateTomlContent(obj: any): string {
    let toml = '';

    for (const [section, values] of Object.entries(obj)) {
      if (values && typeof values === 'object' && !Array.isArray(values)) {
        toml += `[${section}]\n`;
        for (const [key, value] of Object.entries(values as Record<string, any>)) {
          if (typeof value === 'string') {
            toml += `${key} = "${value}"\n`;
          } else if (typeof value === 'number' || typeof value === 'boolean') {
            toml += `${key} = ${value}\n`;
          } else if (typeof value === 'object' && value !== null) {
            // ネストされたオブジェクト
            toml += `\n[${section}.${key}]\n`;
            for (const [nestedKey, nestedValue] of Object.entries(value)) {
              if (typeof nestedValue === 'string') {
                toml += `${nestedKey} = "${nestedValue}"\n`;
              } else {
                toml += `${nestedKey} = ${nestedValue}\n`;
              }
            }
          }
        }
        toml += '\n';
      }
    }

    return toml;
  }
}
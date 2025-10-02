export interface ITomlSerializer {
  generateTomlContent(obj: any): string;
}
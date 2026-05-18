export interface ILlmService {
  expandKeywords(keyword: string): Promise<string[]>;
}

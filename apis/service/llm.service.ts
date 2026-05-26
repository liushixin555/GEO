export interface ArticleGenerationParams {
  title: string;
  keywords: string;
  portrait: string;
  images: { title: string; description: string; imageUrl: string }[];
  skills: string;
  previousContent?: string;
}

export interface ILlmService {
  expandKeywords(keyword: string): Promise<string[]>;
  mineKeywordsFromContent(content: string): Promise<string[]>;
  generateArticle(params: ArticleGenerationParams): Promise<string>;
}

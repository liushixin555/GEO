export interface ArticleGenerationParams {
  title: string;
  keywords: string;
  portrait: string;
  images: { title: string; description: string; imageUrl: string }[];
  skills: string | Array<string | number>;
  previousContent?: string;
  companyName?: string;
  companyShortName?: string;
  projectName?: string;
  projectShortName?: string;
}

export interface ILlmService {
  expandKeywords(keyword: string): Promise<string[]>;
  mineKeywordsFromContent(content: string): Promise<string[]>;
  generateArticle(params: ArticleGenerationParams): Promise<string>;
}

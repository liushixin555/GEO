export interface ArticleGenerationParams {
  title: string;
  keywords: string;
  articleType?: string | null;
  portrait: string;
  images: { title: string; description: string; imageUrl: string }[];
  skills: string | Array<string | number>;
  projectId?: number;
  companyId?: number;
  revisionInstruction?: string;
  previousContent?: string;
  companyName?: string;
  companyShortName?: string;
  projectName?: string;
  projectShortName?: string;
}

export interface ArticleGenerationDebugInfo {
  modelName: string;
  skillDirs: string[];
  requiredReferenceFiles: string[];
  systemPrompt: string;
  userPrompt: string;
  toolCalls: Array<{
    toolName: string;
    input: Record<string, unknown>;
    output: string;
  }>;
  rawLlmOutput: string;
  cleanedOutput: string;
  warnings: string[];
  retrievedEvidenceCards: unknown[];
  evidenceRetrievalQuery: Record<string, unknown>;
  evidenceWarnings: string[];
  evidencePromptPreview?: string;
  evidenceStats?: Record<string, unknown>;
}

export interface ArticleGenerationResult {
  content: string;
  qualityPassed: boolean;
  debug: ArticleGenerationDebugInfo;
}

export interface ILlmService {
  expandKeywords(keyword: string): Promise<string[]>;
  mineKeywordsFromContent(content: string): Promise<string[]>;
  generateArticle(params: ArticleGenerationParams): Promise<ArticleGenerationResult>;
}

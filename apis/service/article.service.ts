import { Article, ArticleVersion, CreateArticleRequest, UpdateArticleRequest } from '../entity';

/** 认证上下文 — 统一传递用户身份信息 */
export interface AuthContext {
  userId: number;
  role: string;
}

export interface IArticleService {
  list(projectId: number, page: number, pageSize: number, search?: string, status?: string, auth?: AuthContext): Promise<{ list: Article[]; total: number }>;
  getById(id: number): Promise<Article>;
  create(projectId: number, request: CreateArticleRequest, auth: AuthContext): Promise<Article>;
  update(projectId: number, id: number, request: UpdateArticleRequest, auth: AuthContext): Promise<Article>;
  updateContent(projectId: number, id: number, content: string, auth: AuthContext): Promise<Article>;
  delete(projectId: number, id: number, auth: AuthContext): Promise<void>;
  review(projectId: number, id: number, approved: boolean, auth: AuthContext): Promise<Article>;
  regenerate(projectId: number, id: number, auth: AuthContext): Promise<Article>;
  submitForReview(projectId: number, id: number, auth: AuthContext): Promise<Article>;
  listVersions(articleId: number): Promise<ArticleVersion[]>;

  // Business rule queries
  isSettingsEditable(status: string): boolean;
  isContentEditable(status: string): boolean;
  isValidStatusTransition(from: string, to: string): boolean;
}

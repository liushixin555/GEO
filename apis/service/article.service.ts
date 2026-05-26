import { Article, ArticleStatus, ArticleVersion, CreateArticleRequest, UpdateArticleRequest } from '../entity';

// H-4 fix: AuthContext moved to dedicated module; re-export for backward compatibility
export { AuthContext } from '../types/auth';
// Import AuthContext locally for interface usage
import type { AuthContext } from '../types/auth';

export interface IArticleService {
  // H-2 fix: auth made required, moved before optional params
  list(projectId: number, page: number, pageSize: number, auth: AuthContext, search?: string, status?: string): Promise<{ list: Article[]; total: number }>;
  // C-1 fix: getById now requires projectId
  getById(projectId: number, id: number): Promise<Article>;
  create(projectId: number, request: CreateArticleRequest, auth: AuthContext): Promise<Article>;
  update(projectId: number, id: number, request: UpdateArticleRequest, auth: AuthContext): Promise<Article>;
  updateContent(projectId: number, id: number, content: string, auth: AuthContext): Promise<Article>;
  delete(projectId: number, id: number, auth: AuthContext): Promise<void>;
  review(projectId: number, id: number, approved: boolean, auth: AuthContext): Promise<Article>;
  regenerate(projectId: number, id: number, auth: AuthContext): Promise<Article>;
  submitForReview(projectId: number, id: number, auth: AuthContext): Promise<Article>;
  // C-1 fix: listVersions now requires projectId
  listVersions(projectId: number, articleId: number): Promise<ArticleVersion[]>;

  // Business rule queries
  // M-1 fix: status parameters use ArticleStatus type
  isSettingsEditable(status: ArticleStatus): boolean;
  isContentEditable(status: ArticleStatus): boolean;
  isValidStatusTransition(from: string, to: string): boolean;
}

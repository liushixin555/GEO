import { Article, ArticleVersion, CreateArticleRequest, UpdateArticleRequest } from '../entity';

export interface IArticleService {
  list(projectId: number, page: number, pageSize: number, search?: string, status?: string, userId?: number, role?: string): Promise<{ list: Article[]; total: number }>;
  getById(id: number, userId?: number, role?: string): Promise<Article>;
  create(projectId: number, request: CreateArticleRequest, userId: number): Promise<Article>;
  update(id: number, request: UpdateArticleRequest, userId?: number, role?: string): Promise<Article>;
  delete(id: number, userId?: number, role?: string): Promise<void>;
  review(id: number, approved: boolean, userId?: number, role?: string): Promise<Article>;
  listVersions(articleId: number): Promise<ArticleVersion[]>;
}

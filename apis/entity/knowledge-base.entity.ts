/** 知识库作用域，与 Prisma KnowledgeScope 枚举一致 */
export type KnowledgeScope = 'platform' | 'company' | 'project';

/** 知识库基础实体（Prisma 单表字段） */
export interface KnowledgeBase {
  id: number;
  name: string;
  /** 描述，最长 500 字符（Prisma @db.VarChar(500)） */
  description: string | null;
  /** 知识库作用域：platform=全平台, company=公司级, project=项目级 */
  scope: KnowledgeScope;
  company_id: number | null;
  project_id: number | null;
  /** 启用/禁用状态 */
  status: boolean;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
  /** 软删除时间戳，null 表示未删除 */
  deleted_at: Date | null;
}

/** 知识库详情（含关联解析 + 聚合计数），用于列表/详情 API 返回 */
export interface KnowledgeBaseDetail extends KnowledgeBase {
  company_name: string | null;
  project_name: string | null;
  creator_name: string | null;
  /** 关键词数量（Prisma _count 聚合，只读） */
  keyword_count: number;
  /** 人设数量（Prisma _count 聚合，只读） */
  portrait_count: number;
  /** 图片数量（Prisma _count 聚合，只读） */
  image_count: number;
  /** 文档数量（Prisma _count 聚合，只读） */
  document_count: number;
}

export interface CreateKnowledgeBaseRequest {
  name: string;
  /** undefined=不提供, string=新值, null=显式清除 */
  description?: string | null;
  scope: KnowledgeScope;
  company_id?: number;
  project_id?: number;
}

export interface UpdateKnowledgeBaseRequest {
  name?: string;
  /** undefined=不修改, string=新值, null=显式清除 */
  description?: string | null;
  scope?: KnowledgeScope;
  company_id?: number;
  project_id?: number;
  status?: boolean;
}

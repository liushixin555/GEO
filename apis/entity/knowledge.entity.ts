/** @module knowledge-entity — 知识库子实体层（关键词、展开词、人设、图片、文档、挖掘词） */

// ─── 关键词 ───

/** 关键词基础实体（Prisma 单表字段） */
export interface KnowledgeKeyword {
  id: number;
  /** 关联的知识库 ID（外键 → knowledge_bases.id） */
  base_id: number;
  /** 关键词，最长 200 字符（Prisma @db.VarChar(200)） */
  keyword: string;
  seed_word: string | null;
  group_id: number | null;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
  /** 软删除时间戳，null 表示未删除 */
  deleted_at: Date | null;
  /** 被文章引用的数量（非数据库字段，由 service 层填充） */
  article_count?: number;
}

/** 关键词详情（含关联解析），用于列表/详情 API 返回 */
export interface KnowledgeKeywordDetail extends KnowledgeKeyword {
  /** 创建者姓名（Prisma creator 关联解析） */
  creator_name: string | null;
  /** 展开词列表（Prisma include 关联查询） */
  expanded_words: KeywordExpandedWord[];
}

/** 展开词实体（Prisma 单表字段） */
export interface KeywordExpandedWord {
  id: number;
  keyword_id: number;
  word: string;
  selected: boolean;
  created_at: Date;
  updated_at: Date;
  /** 软删除时间戳，null 表示未删除 */
  deleted_at: Date | null;
}

/** 展开词输入项（DTO 投影） */
export interface ExpandedWordInput {
  word: string;
  selected: boolean;
}

export interface CreateKeywordRequest {
  /** 关键词，最长 200 字符（Prisma @db.VarChar(200)） */
  keyword: string;
  expanded_words?: ExpandedWordInput[];
}

export interface UpdateKeywordRequest {
  /** undefined=不修改, string=新值 */
  keyword?: string;
  expanded_words?: ExpandedWordInput[];
}

// ─── 人设 ───

/** 人设基础实体（Prisma 单表字段） */
export interface KnowledgePortrait {
  id: number;
  /** 关联的知识库 ID（外键 → knowledge_bases.id） */
  base_id: number;
  /** 标题，最长 200 字符（Prisma @db.VarChar(200)） */
  title: string;
  content: string | null;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
  /** 软删除时间戳，null 表示未删除 */
  deleted_at: Date | null;
  /** 被文章引用的数量（非数据库字段，由 service 层填充） */
  article_count?: number;
}

/** 人设详情（含关联解析），用于列表/详情 API 返回 */
export interface KnowledgePortraitDetail extends KnowledgePortrait {
  /** 创建者姓名（Prisma creator 关联解析） */
  creator_name: string | null;
}

export interface CreatePortraitRequest {
  /** 标题，最长 200 字符（Prisma @db.VarChar(200)） */
  title: string;
  /** undefined=不提供, string=新值, null=显式清除 */
  content?: string | null;
}

export interface UpdatePortraitRequest {
  /** undefined=不修改, string=新值 */
  title?: string;
  /** undefined=不修改, string=新值, null=显式清除 */
  content?: string | null;
}

// ─── 图片 ───

/** 图片基础实体（Prisma 单表字段） */
export interface KnowledgeImage {
  id: number;
  /** 关联的知识库 ID（外键 → knowledge_bases.id） */
  base_id: number;
  /** 标题，最长 200 字符（Prisma @db.VarChar(200)） */
  title: string;
  /** 描述，最长 500 字符（Prisma @db.VarChar(500)） */
  description: string | null;
  /** 图片 URL，最长 500 字符（Prisma @db.VarChar(500)） */
  image_url: string;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
  /** 软删除时间戳，null 表示未删除 */
  deleted_at: Date | null;
  /** 被文章引用的数量（非数据库字段，由 service 层填充） */
  article_count?: number;
}

/** 图片详情（含关联解析），用于列表/详情 API 返回 */
export interface KnowledgeImageDetail extends KnowledgeImage {
  /** 创建者姓名（Prisma creator 关联解析） */
  creator_name: string | null;
}

export interface CreateImageRequest {
  /** 标题，最长 200 字符（Prisma @db.VarChar(200)） */
  title: string;
  /** undefined=不提供, string=新值, null=显式清除 */
  description?: string | null;
  /** 图片 URL，最长 500 字符（Prisma @db.VarChar(500)） */
  image_url: string;
}

export interface UpdateImageRequest {
  /** undefined=不修改, string=新值 */
  title?: string;
  /** undefined=不修改, string=新值, null=显式清除 */
  description?: string | null;
}

// ─── 文档 ───

/** 文档基础实体（Prisma 单表字段） */
export interface KnowledgeDocument {
  id: number;
  /** 关联的知识库 ID（外键 → knowledge_bases.id） */
  base_id: number;
  /** 标题，最长 200 字符（Prisma @db.VarChar(200)） */
  title: string;
  /** 描述，最长 500 字符（Prisma @db.VarChar(500)） */
  description: string | null;
  file_url: string;
  /** 文件名，最长 255 字符（Prisma @db.VarChar(255)） */
  file_name: string;
  /** MIME 类型，最长 20 字符（Prisma @db.VarChar(20)），如 'application/pdf' */
  file_type: string;
  /** 文件大小（字节），必须 > 0 */
  file_size: number;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
  /** 软删除时间戳，null 表示未删除 */
  deleted_at: Date | null;
}

/** 文档详情（含关联解析），用于列表/详情 API 返回 */
export interface KnowledgeDocumentDetail extends KnowledgeDocument {
  /** 创建者姓名（Prisma creator 关联解析） */
  creator_name: string | null;
}

export interface CreateDocumentRequest {
  /** 标题，最长 200 字符（Prisma @db.VarChar(200)） */
  title: string;
  /** undefined=不提供, string=新值, null=显式清除 */
  description?: string | null;
  file_url: string;
  /** 文件名，最长 255 字符（Prisma @db.VarChar(255)） */
  file_name: string;
  /** MIME 类型，最长 20 字符（Prisma @db.VarChar(20)），如 'application/pdf' */
  file_type: string;
  /** 文件大小（字节），必须 > 0 */
  file_size: number;
}

export interface UpdateDocumentRequest {
  /** undefined=不修改, string=新值 */
  title?: string;
  /** undefined=不修改, string=新值, null=显式清除 */
  description?: string | null;
}

// ─── 挖掘词 ───

/** 挖掘词实体（无 updated_at 字段，Prisma 未定义） */
export interface MinedKeyword {
  id: number;
  /** 关联的知识库 ID（外键 → knowledge_bases.id） */
  base_id: number;
  /** 关键词，最长 200 字符（Prisma @db.VarChar(200)） */
  keyword: string;
  selected: boolean;
  created_by: number | null;
  created_at: Date;
  /** 软删除时间戳，null 表示未删除 */
  deleted_at: Date | null;
}

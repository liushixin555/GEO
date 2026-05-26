/** @module company-entity — 公司实体层，定义 Company 相关的持久化模型、DTO 和视图类型 */

/** 用户引用（ID + 姓名），用于公司/项目关联展示，数据来自 Prisma 查询 */
export interface UserRef {
  id: number;
  cn_name: string;
}

/**
 * 公司持久化实体（对应 Prisma Company model）
 * 多租户核心实体，关联 Project、KnowledgeBase、Todo、User 等所有业务实体
 */
export interface Company {
  id: number;
  /** 公司简称，最长 50 字符（Prisma @db.VarChar(50)） */
  short_name: string;
  /** 公司全称，最长 200 字符（Prisma @db.VarChar(200)） */
  full_name: string;
  /** 地址，最长 500 字符（Prisma @db.VarChar(500)），可为空 */
  address: string | null;
  /** 联系人姓名（PII），最长 100 字符（Prisma @db.VarChar(100)） */
  contact_person: string;
  /** 联系电话（PII），最长 20 字符（Prisma @db.VarChar(20)），格式：数字、+、-、()、#、空格 */
  contact_phone: string;
  /** 状态：true=启用，false=禁用。禁用后关联用户/项目的可见性由 Service 层控制 */
  status: boolean;
  /** 创建者用户 ID（sysadmin），与 Article/Skills/KnowledgeBase 的 created_by 一致 */
  created_by: number | null;
  /** 更新者用户 ID（sysadmin），用于审计追踪 */
  updated_by: number | null;
  created_at: Date;
  updated_at: Date;
  /** 软删除时间戳，null 表示未删除 */
  deleted_at: Date | null;
}

/** 公司列表项（不含 PII 和软删除元数据），用于列表 API 返回 */
export interface CompanyListItem extends Omit<Company, 'contact_person' | 'contact_phone' | 'address' | 'deleted_at' | 'created_by' | 'updated_by'> {
  /** 关联用户数量（含 admin + view） */
  user_count?: number;
  /** 关联项目数量 */
  project_count?: number;
}

/** 公司详情视图（排除 deleted_at），含计算字段 operator/viewer */
export interface CompanyDetail extends Omit<Company, 'deleted_at'> {
  /** 运营者用户 ID 列表（计算字段，来自 User.companyId + User.role='admin'） */
  operator_ids: number[];
  /** 运营者引用列表 */
  operators: UserRef[];
  /** 查看者用户 ID 列表（计算字段，来自 User.companyId + User.role='view'） */
  viewer_ids: number[];
  /** 查看者引用列表 */
  viewers: UserRef[];
}

/** 创建公司请求（created_by 由 Controller 从 JWT 注入，不暴露给客户端） */
export interface CreateCompanyRequest {
  /** 公司简称，最长 50 字符 */
  short_name: string;
  /** 公司全称，最长 200 字符 */
  full_name: string;
  /** 地址，最长 500 字符。undefined=不提供, string=新值, null=显式清除 */
  address?: string | null;
  /** 联系人姓名，最长 100 字符 */
  contact_person: string;
  /** 联系电话，最长 20 字符，格式：数字、+、-、()、#、空格 */
  contact_phone: string;
  /**
   * 运营者用户 ID 列表（全量替换，传入空数组将清空所有运营者）。
   * 与 viewer_ids 互斥，同一用户不可同时出现在两个列表中。
   * 最多 100 个（Schema 层约束）。sysadmin 角色不可被关联。
   */
  operator_ids: number[];
  /**
   * 查看者用户 ID 列表（可选，全量替换）。
   * 与 operator_ids 互斥，同一用户不可同时出现在两个列表中。
   * 最多 100 个（Schema 层约束）。sysadmin 角色不可被关联。
   */
  viewer_ids?: number[];
}

/** 更新公司请求（部分更新，仅提供的字段会被修改） */
export interface UpdateCompanyRequest {
  /** 公司简称，最长 50 字符 */
  short_name?: string;
  /** 公司全称，最长 200 字符 */
  full_name?: string;
  /** 地址，最长 500 字符。undefined=不修改, string=新值, null=显式清除 */
  address?: string | null;
  /** 联系人姓名，最长 100 字符 */
  contact_person?: string;
  /** 联系电话，最长 20 字符 */
  contact_phone?: string;
  /**
   * 运营者用户 ID 列表（全量替换）。
   * 与 viewer_ids 互斥，同一用户不可同时出现在两个列表中。
   * 最多 100 个（Schema 层约束）。sysadmin 角色不可被关联。
   */
  operator_ids?: number[];
  /**
   * 查看者用户 ID 列表（可选，全量替换）。
   * 与 operator_ids 互斥，同一用户不可同时出现在两个列表中。
   * 最多 100 个（Schema 层约束）。sysadmin 角色不可被关联。
   */
  viewer_ids?: number[];
}

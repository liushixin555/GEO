/** @module skills-entity — 技能实体层 */

/** 技能基础实体（Prisma Skills 表字段） */
export interface Skills {
  id: number;
  /** 技能名称，最长 200 字符（Prisma @db.VarChar(200)），全局唯一（@@unique([name])） */
  name: string;
  /** 描述，最长 500 字符（Prisma @db.VarChar(500)） */
  description: string | null;
  /** 技能文件目录路径（服务端内部使用，空字符串=未关联目录文件） */
  skill_dir: string;
  /** 创建者用户 ID */
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
  /** 软删除时间戳，null 表示未删除（Prisma deletedAt） */
  deleted_at: Date | null;
}

/** 技能详情（含关联解析），用于列表/详情 API 返回，不暴露 skill_dir 服务器路径 */
export interface SkillsDetail extends Omit<Skills, 'skill_dir'> {
  /** 创建者姓名（来自 User 关联） */
  creator_name: string | null;
}

/** 创建技能请求（created_by 由 Controller 从 JWT 注入，不暴露给客户端） */
export interface CreateSkillsRequest {
  /** 最长 200 字符（Prisma @db.VarChar(200)） */
  name: string;
  /** 最长 500 字符（Prisma @db.VarChar(500)） */
  description?: string;
  /** 技能文件目录路径 */
  skill_dir: string;
}

/** 更新技能请求（skill_dir 不可更新，需重新上传） */
export interface UpdateSkillsRequest {
  name?: string;
  /** undefined=不修改, string=新值, null=显式清除 */
  description?: string | null;
}

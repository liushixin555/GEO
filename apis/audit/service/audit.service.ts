import {
  AuditDetail,
  AuditListItem,
  AuditListQuery,
  CreateAuditRequest,
  CreateAuditResponse,
  DetectRequest,
  DetectResponse,
  StatusResponse,
} from '../entity/audit.entity';

/**
 * 诊断管理 Service 接口
 */
export interface IAuditService {
  /** 列表查询（不含 result JSON） */
  list(
    userId: number,
    role: string,
    query: AuditListQuery
  ): Promise<{ list: AuditListItem[]; total: number }>;

  /** 单条详情（含 result + prompts） */
  get(jobId: string, userId: number, role: string): Promise<AuditDetail | null>;

  /** 软删除 */
  remove(jobId: string, userId: number, role: string): Promise<void>;

  /** 品牌自动检测 */
  detect(req: DetectRequest): Promise<DetectResponse>;

  /** 创建诊断任务 + 生成提示词计划（同步返回） */
  create(req: CreateAuditRequest, userId: number, companyId: number | null): Promise<CreateAuditResponse>;

  /** 触发批量执行（异步，立即返回） */
  execute(jobId: string, userId: number, role: string): Promise<{ dispatched: boolean }>;

  /** 基于已有诊断的配置重新诊断（创建新任务并自动触发执行） */
  rerun(jobId: string, userId: number, role: string, companyId: number | null): Promise<{ jobId: string; total: number; engineCount: number }>;

  /** 查询执行状态 */
  status(jobId: string, userId: number, role: string): Promise<StatusResponse>;

  /** 下载诊断 Skill ZIP（返回 Buffer） */
  downloadSkill(jobId: string, userId: number, role: string): Promise<{ buffer: Buffer; filename: string }>;
}


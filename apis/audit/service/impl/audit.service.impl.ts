import { IAuditService } from '../audit.service';
import {
  AuditDetail,
  AuditListItem,
  AuditListQuery,
  AuditPromptDetail,
  AuditResult,
  CreateAuditRequest,
  CreateAuditResponse,
  DetectRequest,
  DetectResponse,
  StatusResponse,
} from '../../entity/audit.entity';
import { getPrisma } from '../../../utils/db.util';
import { AppError } from '../../../errors';
import { randomUUID } from 'crypto';

import { detectBrand } from '../../engine/detect';
import { buildAllPrompts } from '../../engine/prompt-plan';
import { loadEnabledEngines, queryEngine, engineKey } from '../../engine/engine-client';
import { scoreAll, type PromptResult } from '../../engine/aggregator';
import { runWithConcurrency } from '../../engine/concurrency';
import { buildAuditSkillZip } from '../../skill/skill-packager';
import { queryTavily } from '../../engine/tavily-client';

/**
 * 诊断管理 Service 实现（Prisma）
 *
 * 权限模型：
 *   - sysadmin：可看所有诊断
 *   - admin：仅看自己 userId 的诊断
 */
export class AuditServiceImpl implements IAuditService {
  async list(
    userId: number,
    role: string,
    query: AuditListQuery
  ): Promise<{ list: AuditListItem[]; total: number }> {
    const { page, pageSize, status, search } = query;

    const where: Record<string, unknown> = { deletedAt: null };
    if (role !== 'sysadmin') {
      where.userId = userId;
    }
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { brand: { contains: search, mode: 'insensitive' } },
        { website: { contains: search, mode: 'insensitive' } },
        { industry: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      getPrisma().audit.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          jobId: true,
          userId: true,
          companyId: true,
          brand: true,
          website: true,
          industry: true,
          tier: true,
          status: true,
          score: true,
          grade: true,
          engineCount: true,
          promptTotal: true,
          promptDone: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      getPrisma().audit.count({ where }),
    ]);

    return { list: rows as unknown as AuditListItem[], total };
  }

  async get(jobId: string, userId: number, role: string): Promise<AuditDetail | null> {
    const audit = await getPrisma().audit.findFirst({
      where: { jobId, deletedAt: null, ...(role !== 'sysadmin' ? { userId } : {}) },
      include: {
        prompts: {
          orderBy: { promptIndex: 'asc' },
          include: { result: true },
        },
      },
    });
    if (!audit) return null;

    const prompts: AuditPromptDetail[] = audit.prompts.map((p) => ({
      id: p.id,
      promptIndex: p.promptIndex,
      category: p.category as AuditPromptDetail['category'],
      engine: p.engine,
      llmModelId: p.llmModelId,
      prompt: p.prompt,
      result: p.result
        ? {
            id: p.result.id,
            mentioned: p.result.mentioned,
            snippet: p.result.snippet,
            sentiment: p.result.sentiment,
            sourceType: p.result.sourceType,
            blindSpot: p.result.blindSpot,
            latencyMs: p.result.latencyMs,
            error: p.result.error,
          }
        : null,
    }));

    return {
      id: audit.id,
      jobId: audit.jobId,
      userId: audit.userId,
      companyId: audit.companyId,
      brand: audit.brand,
      website: audit.website,
      industry: audit.industry,
      tier: audit.tier as AuditDetail['tier'],
      status: audit.status as AuditDetail['status'],
      score: audit.score,
      grade: audit.grade,
      engineCount: audit.engineCount,
      promptTotal: audit.promptTotal,
      promptDone: audit.promptDone,
      createdAt: audit.createdAt.toISOString(),
      updatedAt: audit.updatedAt.toISOString(),
      description: audit.description,
      competitors: (audit.competitors as string[] | null) ?? null,
      keywords: (audit.keywords as string[] | null) ?? null,
      features: (audit.features as string[] | null) ?? null,
      result: (audit.result as AuditResult | null) ?? null,
      aioResult: audit.aioResult,
      technicalResult: audit.technicalResult,
      seoScoreResult: audit.seoScoreResult,
      contentOptimizerResult: audit.contentOptimizerResult,
      prompts,
    };
  }

  async remove(jobId: string, userId: number, role: string): Promise<void> {
    const audit = await getPrisma().audit.findFirst({
      where: { jobId, deletedAt: null, ...(role !== 'sysadmin' ? { userId } : {}) },
      select: { id: true },
    });
    if (!audit) {
      throw new AppError(404, '诊断任务不存在或无权操作');
    }
    await getPrisma().audit.update({
      where: { id: audit.id },
      data: { deletedAt: new Date() },
    });
  }

  // ────────────── Phase 3：引擎执行链 ──────────────

  async detect(req: DetectRequest): Promise<DetectResponse> {
    return detectBrand(req.website);
  }

  async create(
    req: CreateAuditRequest,
    userId: number,
    companyId: number | null
  ): Promise<CreateAuditResponse> {
    // 加载所有启用的 LlmModel —— 每个 LlmModel 都作为一个独立引擎实例参与诊断
    const engines = await loadEnabledEngines();
    if (engines.size === 0) {
      throw new AppError(400, '尚未配置任何启用的 LLM 引擎，请联系系统管理员到「系统管理 → 模型管理」配置');
    }
    const engineIds = Array.from(engines.keys());

    // 生成提示词计划
    const prompts = buildAllPrompts({
      brand: req.brand,
      industry: req.industry || req.brand,
      competitors: req.competitors,
      keywords: req.keywords,
      features: req.features,
      suggestedPrompts: req.suggestedPrompts,
    });

    if (prompts.length === 0) {
      throw new AppError(400, '提示词计划生成失败，请补充品牌/行业信息');
    }

    const jobId = randomUUID();

    // 持久化诊断 + 提示词计划（事务）
    const audit = await getPrisma().$transaction(async (tx) => {
      const auditRow = await tx.audit.create({
        data: {
          jobId,
          userId,
          companyId,
          brand: req.brand,
          website: req.website,
          industry: req.industry,
          description: req.description,
          competitors: req.competitors ?? undefined,
          keywords: req.keywords ?? undefined,
          features: req.features ?? undefined,
          tier: req.tier,
          status: 'processing',
          engineCount: engineIds.length,
          promptTotal: prompts.length * engineIds.length,
          promptDone: 0,
        },
      });

      // 每个 prompt × 每个启用的 LlmModel → 一条 AuditPrompt
      // engine 字段存 `${provider}:${modelName}`，作为引擎实例的唯一标识
      const promptRows: Array<{ prompt: string; promptIndex: number; category: string; engine: string; llmModelId: number }> = [];
      let idx = 0;
      for (const p of prompts) {
        for (const id of engineIds) {
          const cfg = engines.get(id)!;
          promptRows.push({
            prompt: p.prompt,
            promptIndex: idx,
            category: p.category,
            engine: engineKey(cfg),
            llmModelId: cfg.id,
          });
          idx++;
        }
      }

      await tx.auditPrompt.createMany({
        data: promptRows.map((p) => ({
          auditId: auditRow.id,
          promptIndex: p.promptIndex,
          category: p.category,
          engine: p.engine,
          llmModelId: p.llmModelId,
          prompt: p.prompt,
        })),
      });

      return auditRow;
    });

    // plan 字段：返回每个 prompt × 每个引擎的执行计划
    const plan: CreateAuditResponse['plan'] = [];
    let planIdx = 0;
    for (const p of prompts) {
      for (const id of engineIds) {
        const cfg = engines.get(id)!;
        plan.push({
          engine: engineKey(cfg),
          prompt: p.prompt,
          promptIndex: planIdx,
          category: p.category,
        });
        planIdx++;
      }
    }

    return {
      jobId: audit.jobId,
      total: prompts.length * engineIds.length,
      engineCount: engineIds.length,
      plan,
    };
  }

  async execute(jobId: string, userId: number, role: string): Promise<{ dispatched: boolean }> {
    // 权限校验 + 加载诊断
    const audit = await getPrisma().audit.findFirst({
      where: { jobId, deletedAt: null, ...(role !== 'sysadmin' ? { userId } : {}) },
      select: { id: true, brand: true, status: true, promptTotal: true },
    });
    if (!audit) {
      throw new AppError(404, '诊断任务不存在或无权操作');
    }
    if (audit.status === 'complete') {
      return { dispatched: false };
    }
    if (audit.status === 'failed') {
      throw new AppError(400, '诊断任务此前已失败，请重新创建');
    }

    // fire-and-forget — 后台运行
    void this.runAuditJob(audit.id, audit.brand).catch((err) => {
      console.error(JSON.stringify({
        level: 'error',
        type: 'audit_run_fatal',
        jobId,
        error: err instanceof Error ? err.message : String(err),
      }));
    });

    return { dispatched: true };
  }

  /**
   * 重新诊断 —— 基于已有诊断的配置创建新任务并自动触发执行。
   *
   * 复用原 audit 的 brand/website/industry/description/competitors/keywords/features/tier，
   * 不继承原 jobId、状态、结果。
   */
  async rerun(
    jobId: string,
    userId: number,
    role: string,
    companyId: number | null,
  ): Promise<{ jobId: string; total: number; engineCount: number }> {
    // 权限校验 + 加载原诊断配置
    const origin = await getPrisma().audit.findFirst({
      where: { jobId, deletedAt: null, ...(role !== 'sysadmin' ? { userId } : {}) },
      select: {
        brand: true,
        website: true,
        industry: true,
        description: true,
        competitors: true,
        keywords: true,
        features: true,
        tier: true,
      },
    });
    if (!origin) {
      throw new AppError(404, '原诊断任务不存在或无权操作');
    }

    // 复用 create 创建新任务
    const created = await this.create(
      {
        brand: origin.brand,
        website: origin.website ?? undefined,
        industry: origin.industry ?? undefined,
        description: origin.description ?? undefined,
        competitors: (origin.competitors as string[] | null) ?? undefined,
        keywords: (origin.keywords as string[] | null) ?? undefined,
        features: (origin.features as string[] | null) ?? undefined,
        tier: origin.tier as 'free' | 'pro',
      },
      userId,
      companyId,
    );

    // 自动触发执行（忽略 dispatched 返回值，新任务一定是 processing）
    await this.execute(created.jobId, userId, role);

    return { jobId: created.jobId, total: created.total, engineCount: created.engineCount };
  }

  /** 后台执行：拉取所有 AuditPrompt，并发调用引擎，落库结果，最后聚合 */
  private async runAuditJob(auditId: number, brand: string): Promise<void> {
    const prisma = getPrisma();

    // 标记进行中
    await prisma.audit.update({
      where: { id: auditId },
      data: { status: 'processing', promptDone: 0 },
    });

    // 拉取诊断 + 引擎配置
    const audit = await prisma.audit.findUnique({
      where: { id: auditId },
      select: { id: true, brand: true },
    });
    if (!audit) return;

    const engines = await loadEnabledEngines();
    if (engines.size === 0) {
      await prisma.audit.update({
        where: { id: auditId },
        data: { status: 'failed', result: { error: 'no_engine_configured' } as any },
      });
      return;
    }

    // 拉取所有未执行的 AuditPrompt
    const pendingPrompts = await prisma.auditPrompt.findMany({
      where: { auditId, result: null },
      orderBy: { promptIndex: 'asc' },
      select: { id: true, promptIndex: true, category: true, engine: true, llmModelId: true, prompt: true },
    });

    if (pendingPrompts.length === 0) {
      // 直接聚合（如重跑）
      await this.finalize(auditId);
      return;
    }

    // 构建任务列表 —— 引擎配置按 llmModelId 查找（engine 字段仅用于并发限流分组）
    const tasks = pendingPrompts.map((p) => ({
      auditPromptId: p.id,
      llmModelId: p.llmModelId,
      engine: p.engine,
      prompt: p.prompt,
      promptIndex: p.promptIndex,
      category: p.category,
    }));

    // 并发执行
    const results = await runWithConcurrency(tasks, async (task) => {
      const cfg = task.llmModelId != null ? engines.get(task.llmModelId) : undefined;
      if (!cfg) {
        return { task, text: '', error: `LlmModel #${task.llmModelId} 未配置或已禁用`, latencyMs: 0 };
      }
      const r = await queryEngine(cfg, task.prompt);
      return { task, text: r.text, error: r.error, latencyMs: r.latencyMs };
    });

    // 逐个落库 AuditPromptResult + 累加 promptDone
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const task = tasks[i];
      if (r instanceof Error) {
        await prisma.auditPromptResult.create({
          data: {
            auditPromptId: task.auditPromptId,
            mentioned: false,
            error: r.message,
          },
        });
        continue;
      }
      const typed = r as { task: typeof task; text: string; error: string | null; latencyMs: number };
      // 复用 analyzeMentions 做 mentioned 判定（避免循环依赖，inline 一份）
      const mentioned = simpleMentionCheck(typed.text, audit.brand);
      const snippet = mentioned ? extractSnippet(typed.text, audit.brand) : null;
      await prisma.auditPromptResult.create({
        data: {
          auditPromptId: task.auditPromptId,
          mentioned,
          snippet,
          fullResponse: typed.text,
          sentiment: null,
          sourceType: null,
          blindSpot: !mentioned,
          latencyMs: typed.latencyMs,
          error: typed.error,
        },
      });
      // 增量更新计数（避免最后一次性 set 与轮询竞态）
      await prisma.audit.update({
        where: { id: auditId },
        data: { promptDone: { increment: 1 } },
      });
    }

    // 聚合
    await this.finalize(auditId);
  }

  /** 完成阶段：聚合所有结果 → 写 result + score + status=complete */
  private async finalize(auditId: number): Promise<void> {
    const prisma = getPrisma();

    const audit = await prisma.audit.findUnique({
      where: { id: auditId },
      select: { brand: true, website: true, industry: true },
    });
    if (!audit) return;
    const brand = audit.brand;

    const prompts = await prisma.auditPrompt.findMany({
      where: { auditId },
      include: {
        result: true,
      },
    });

    const promptResults: PromptResult[] = prompts
      .filter((p) => p.result && !p.result.error)
      .map((p) => ({
        prompt: p.prompt,
        category: p.category as PromptResult['category'],
        engine: p.engine,
        text: p.result?.fullResponse || '',
        error: p.result?.error || null,
      }));

    // 引擎列表：按首次出现顺序保留（稳定），用于聚合分组
    const engines: string[] = [];
    const seenEngine = new Set<string>();
    for (const p of prompts) {
      if (!seenEngine.has(p.engine)) {
        seenEngine.add(p.engine);
        engines.push(p.engine);
      }
    }

    // 拉取 Tavily 网络证据（聚焦中国市场；未配置 key 时返回空结果，自动降级）
    const tavilyQuery = [brand, audit.industry].filter(Boolean).join(' ');
    const tavily = tavilyQuery
      ? await queryTavily(tavilyQuery, { maxResults: 8 })
      : { answer: '', results: [] };

    const { result, perPromptMeta } = scoreAll(promptResults, brand, engines, {
      webAnswer: tavily.answer,
      webSources: tavily.results,
      brandUrl: audit.website,
    });

    // 把 perPromptMeta（mentioned/snippet/blindSpot）回写到 AuditPromptResult
    // 之前写入时只做了简单检测，这里用聚合结果覆盖
    for (const p of prompts) {
      const meta = perPromptMeta.get(p.prompt);
      if (!meta || !p.result) continue;
      await prisma.auditPromptResult.update({
        where: { auditPromptId: p.id },
        data: {
          mentioned: meta.mentioned,
          snippet: meta.snippet,
          blindSpot: meta.blindSpot,
        },
      });
    }

    await prisma.audit.update({
      where: { id: auditId },
      data: {
        status: 'complete',
        score: result.overall_score,
        grade: result.grade,
        result: result as any,
      },
    });
  }

  async status(jobId: string, userId: number, role: string): Promise<StatusResponse> {
    const audit = await getPrisma().audit.findFirst({
      where: { jobId, deletedAt: null, ...(role !== 'sysadmin' ? { userId } : {}) },
      select: { status: true, promptDone: true, promptTotal: true, score: true, grade: true, result: true },
    });
    if (!audit) {
      throw new AppError(404, '诊断任务不存在或无权查看');
    }
    return {
      status: audit.status as StatusResponse['status'],
      done: audit.promptDone,
      total: audit.promptTotal,
      score: audit.score,
      grade: audit.grade,
      result: (audit.result as AuditResult | null) ?? null,
    };
  }

  // ────────────── Phase 5：Skill ZIP 下载 ──────────────

  async downloadSkill(jobId: string, userId: number, role: string): Promise<{ buffer: Buffer; filename: string }> {
    const detail = await this.get(jobId, userId, role);
    if (!detail) {
      throw new AppError(404, '诊断任务不存在或无权操作');
    }
    if (detail.status !== 'complete') {
      throw new AppError(400, '诊断任务尚未完成，无法下载报告');
    }
    const buffer = buildAuditSkillZip(detail, detail.result);
    const safeBrand = detail.brand.replace(/[^\w\u4e00-\u9fa5-]/g, '_').slice(0, 40);
    const date = new Date().toISOString().slice(0, 10);
    return {
      buffer,
      filename: `audit-${safeBrand}-${date}.zip`,
    };
  }
}

// ────────────── 工具：简单的提及检测（runAuditJob 内联使用，避免循环依赖） ──────────────

function simpleMentionCheck(text: string, brand: string): boolean {
  if (!text || !brand) return false;
  const lower = text.toLowerCase();
  const brandLower = brand.toLowerCase();
  const unknownPatterns = [
    '我没有关于', '我不了解', '没有找到', '没有相关信息', '没有找到相关信息',
    '目前没有', '暂时没有', '无法提供', '无法回答',
    '我没有听说过', '我未听说过', '不在我的知识',
    "i don't have information", "i'm not familiar with", 'no information available',
  ];
  if (unknownPatterns.some((p) => lower.includes(p))) return false;
  return lower.includes(brandLower);
}

function extractSnippet(text: string, brand: string, maxLen = 200): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  const brandLower = brand.toLowerCase();
  const idx = lower.indexOf(brandLower);
  if (idx === -1) return null;
  const start = Math.max(0, idx - 50);
  return text.slice(start, start + maxLen).trim();
}

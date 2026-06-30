import * as cron from 'node-cron';
import { ScheduledTask } from 'node-cron';
import config from '../config';
import { getPrisma } from '../utils';
import { createLlmService } from '../service';

const llmService = createLlmService();

let task: ScheduledTask | null = null;
let isRunning = false;

function normalizeArticleSkillIds(raw: unknown): number[] {
  const ids = new Set<number>();

  const collect = (value: unknown) => {
    if (value == null) return;
    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }
    if (typeof value === 'object') {
      const maybeId = (value as { id?: unknown }).id;
      if (maybeId !== undefined) collect(maybeId);
      return;
    }
    const numeric = Number(value);
    if (Number.isInteger(numeric) && numeric > 0) {
      ids.add(numeric);
    }
  };

  collect(raw);
  return Array.from(ids);
}

function normalizeArticleImageUrls(raw: unknown): string[] {
  const urls = new Set<string>();

  const collect = (value: unknown) => {
    if (value == null) return;
    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) urls.add(trimmed);
    }
  };

  collect(raw);
  return Array.from(urls);
}

async function getDefaultArticleSkill(prisma: any): Promise<{ id: number; skillDir: string } | null> {
  const record = await prisma.skills.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { name: 'geo-content-generator' },
        { skillDir: { contains: 'geo-content-generator-v8' } },
      ],
    },
    select: { id: true, skillDir: true },
    orderBy: { id: 'asc' },
  });

  return record?.skillDir ? record : null;
}

export function startArticleGenerationCron(): void {
  if (!config.cron.articleGenerationEnabled) {
    console.log('[文章生成] 定时任务已禁用');
    return;
  }

  const expression = config.cron.articleGenerationInterval;
  if (!cron.validate(expression)) {
    console.error(`[文章生成] 无效的cron表达式: ${expression}`);
    return;
  }

  task = cron.schedule(expression, () => {
    processNextGeneratingArticle();
  });

  console.log(`[文章生成] 定时任务已启动 (${expression})`);
}

export function stopArticleGenerationCron(): void {
  if (task) {
    task.stop();
    task = null;
    console.log('[文章生成] 定时任务已停止');
  }
}

async function processSingleArticle(prisma: any, article: any): Promise<void> {
  console.log(`[文章生成] 开始处理文章 #${article.id}: ${article.title}`);

  let previousContent = '';
  const latestVersion = await prisma.articleVersion.findFirst({
    where: { articleId: article.id },
    orderBy: { version: 'desc' },
    select: { content: true },
  });
  if (latestVersion?.content) {
    previousContent = latestVersion.content;
  }

  const knowledgeBases = await prisma.knowledgeBase.findMany({
    where: { projectId: article.projectId, status: true },
    select: { id: true },
  });
  const baseIds = knowledgeBases.map((kb: any) => kb.id);
  const selectedImageUrls = normalizeArticleImageUrls(article.images);
  const images = selectedImageUrls.length > 0
    ? await prisma.knowledgeImage.findMany({
      where: {
        baseId: { in: baseIds },
        imageUrl: { in: selectedImageUrls },
      },
    })
    : [];

  let skillIds = normalizeArticleSkillIds(article.skills);
  if (skillIds.length === 0) {
    const defaultSkill = await getDefaultArticleSkill(prisma);
    if (defaultSkill) {
      skillIds = [defaultSkill.id];
      await prisma.article.update({
        where: { id: article.id },
        data: { skills: skillIds },
      });
      console.warn(`[文章生成] 文章 #${article.id} 未选择技能，已自动使用默认技能 ${defaultSkill.skillDir}`);
    } else {
      console.warn(`[文章生成] 文章 #${article.id} 未选择技能，且未找到默认 geo-content-generator 技能`);
    }
  }

  const skillRecords = skillIds.length > 0
    ? await prisma.skills.findMany({
      where: { id: { in: skillIds }, deletedAt: null },
      select: { skillDir: true },
    })
    : [];
  const skillDirs = skillRecords.map((item: any) => item.skillDir).filter(Boolean);

  if (skillIds.length > 0 && skillDirs.length === 0) {
    console.warn(`[文章生成] 文章 #${article.id} 已选择技能 ${skillIds.join(',')}，但未找到可用技能目录`);
  }

  const imageResources = images.map((img: any) => ({
    title: img.title,
    description: img.description || '',
    imageUrl: img.imageUrl,
  }));

  const project = await prisma.project.findFirst({
    where: { id: article.projectId, deletedAt: null },
    select: {
      id: true,
      companyId: true,
      fullName: true,
      shortName: true,
      company: {
        select: {
          fullName: true,
          shortName: true,
        },
      },
    },
  });

  const generation = await llmService.generateArticle({
    title: article.title || '',
    keywords: article.keywords || '',
    portrait: article.portrait || '通用读者',
    images: imageResources,
    skills: skillDirs,
    projectId: project?.id ?? article.projectId,
    companyId: project?.companyId,
    revisionInstruction: article.revisionInstruction || undefined,
    previousContent: previousContent || undefined,
    companyName: project?.company?.fullName,
    companyShortName: project?.company?.shortName,
    projectName: project?.fullName,
    projectShortName: project?.shortName,
  });
  let content = generation.content;
  {
    const headingMatch = content.match(/^#{1,6}\s+/m);
    const headingIndex = headingMatch?.index;
    if (typeof headingIndex === 'number' && headingIndex > 0) {
      const prefix = content.slice(0, headingIndex).trim();
      if (prefix && /(?:now|let\s+me|i'?ll?|here'?s)\s+(?:count|check|verify|write|produce|generate|correct|fix|adjust|trim|rewrite|revise)/i.test(prefix)) {
        content = content.slice(headingIndex).trimStart();
      }
    }
  }

  let title = article.title;
  if (!title) {
    const firstLine = content.split('\n').map((l: string) => l.replace(/^#+\s*/, '').trim()).find((l: string) => l.length > 0);
    if (firstLine) title = firstLine;
  }

  if (!generation.qualityPassed) {
    await prisma.$transaction(async (tx: any) => {
      await tx.articleGenerationDebug.create({
        data: {
          articleId: article.id,
          articleVersionId: null,
          modelName: generation.debug.modelName,
          skillDirs: generation.debug.skillDirs,
          requiredReferenceFiles: generation.debug.requiredReferenceFiles,
          systemPrompt: generation.debug.systemPrompt,
          userPrompt: generation.debug.userPrompt,
          toolCalls: generation.debug.toolCalls,
          rawLlmOutput: generation.debug.rawLlmOutput,
          cleanedOutput: generation.debug.cleanedOutput,
          warnings: generation.debug.warnings,
          retrievedEvidenceCards: generation.debug.retrievedEvidenceCards,
          evidenceRetrievalQuery: generation.debug.evidenceRetrievalQuery,
          evidenceWarnings: generation.debug.evidenceWarnings,
        },
      });

      await tx.article.update({
        where: { id: article.id },
        data: {
          status: 'generate_failed',
        },
      });
    });

    console.warn(`[文章生成] 文章 #${article.id} 未通过质量校验，已标记为 generate_failed`);
    return;
  }

  const newVersion = Math.floor(article.version) + 1.0;

  await prisma.$transaction(async (tx: any) => {
    const versionRecord = await tx.articleVersion.create({
      data: {
        articleId: article.id,
        version: newVersion,
        content,
        createdBy: null,
      },
    });

    await tx.articleGenerationDebug.create({
      data: {
        articleId: article.id,
        articleVersionId: versionRecord.id,
        modelName: generation.debug.modelName,
        skillDirs: generation.debug.skillDirs,
        requiredReferenceFiles: generation.debug.requiredReferenceFiles,
        systemPrompt: generation.debug.systemPrompt,
        userPrompt: generation.debug.userPrompt,
        toolCalls: generation.debug.toolCalls,
        rawLlmOutput: generation.debug.rawLlmOutput,
        cleanedOutput: generation.debug.cleanedOutput,
        warnings: generation.debug.warnings,
        retrievedEvidenceCards: generation.debug.retrievedEvidenceCards,
        evidenceRetrievalQuery: generation.debug.evidenceRetrievalQuery,
        evidenceWarnings: generation.debug.evidenceWarnings,
      },
    });

    for (const evidenceCard of generation.debug.retrievedEvidenceCards) {
      const evidenceCardId = Number((evidenceCard as { id?: unknown }).id);
      if (!Number.isInteger(evidenceCardId) || evidenceCardId <= 0) continue;
      await tx.articleEvidenceCard.upsert({
        where: {
          articleId_evidenceCardId: {
            articleId: article.id,
            evidenceCardId,
          },
        },
        update: {
          usageType: 'injected',
        },
        create: {
          articleId: article.id,
          evidenceCardId,
          usageType: 'injected',
        },
      });
    }

    await tx.article.update({
      where: { id: article.id },
      data: {
        title,
        content,
        revisionInstruction: null,
        version: newVersion,
        status: 'pending_review',
      },
    });
  });

  console.log(`[文章生成] 文章 #${article.id} 生成完成，状态已更新为 pending_review`);
}

export async function processNextGeneratingArticle(): Promise<void> {
  if (isRunning) {
    console.log('[文章生成] 上一批次仍在执行，跳过本次调度');
    return;
  }

  isRunning = true;
  const prisma = getPrisma();

  try {
    const articles = await prisma.article.findMany({
      where: { status: 'generating' },
      orderBy: { updatedAt: 'asc' },
    });

    if (articles.length === 0) {
      return;
    }

    console.log(`[文章生成] 取到 ${articles.length} 篇待生成文章`);

    let successCount = 0;
    for (const article of articles) {
      try {
        await processSingleArticle(prisma, article);
        successCount++;
      } catch (err: any) {
        console.error(`[文章生成] 文章 #${article.id} 处理失败: ${err.message}`);
        try {
          await prisma.article.update({
            where: { id: article.id },
            data: { status: 'generate_failed' },
          });
          console.log(`[文章生成] 文章 #${article.id} 已标记为 generate_failed`);
        } catch (updateErr: any) {
          console.error(`[文章生成] 更新失败状态时出错: ${updateErr.message}`);
        }
      }
    }

    console.log(`[文章生成] 处理完成，成功 ${successCount}/${articles.length}`);
  } catch (err: any) {
    console.error(`[文章生成] 批次处理失败: ${err.message}`);
  } finally {
    isRunning = false;
  }
}

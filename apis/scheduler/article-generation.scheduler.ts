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
  const images = await prisma.knowledgeImage.findMany({
    where: { baseId: { in: baseIds } },
  });

  const skillIds = normalizeArticleSkillIds(article.skills);
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

  const content = await llmService.generateArticle({
    title: article.title || '',
    keywords: article.keywords || '',
    portrait: article.portrait || '通用读者',
    images: imageResources,
    skills: skillDirs,
    previousContent: previousContent || undefined,
    companyName: project?.company?.fullName,
    companyShortName: project?.company?.shortName,
    projectName: project?.fullName,
    projectShortName: project?.shortName,
  });

  let title = article.title;
  if (!title) {
    const firstLine = content.split('\n').map((l: string) => l.replace(/^#+\s*/, '').trim()).find((l: string) => l.length > 0);
    if (firstLine) title = firstLine;
  }

  const newVersion = Math.floor(article.version) + 1.0;

  await prisma.$transaction([
    prisma.articleVersion.create({
      data: {
        articleId: article.id,
        version: newVersion,
        content,
        createdBy: null,
      },
    }),
    prisma.article.update({
      where: { id: article.id },
      data: {
        title,
        content,
        version: newVersion,
        status: 'pending_review',
      },
    }),
  ]);

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

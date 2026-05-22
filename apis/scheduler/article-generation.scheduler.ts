import * as cron from 'node-cron';
import { ScheduledTask } from 'node-cron';
import config from '../config';
import { getPrisma } from '../utils';
import { LlmServiceImpl } from '../service/impl/llm.service.impl';

const llmService = new LlmServiceImpl();

let task: ScheduledTask | null = null;
let isRunning = false;

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

export async function processNextGeneratingArticle(): Promise<void> {
  if (isRunning) {
    console.log('[文章生成] 上一批次仍在执行，跳过本次调度');
    return;
  }

  isRunning = true;
  const prisma = getPrisma();

  try {
    const article = await prisma.article.findFirst({
      where: { status: 'generating' },
      orderBy: { updatedAt: 'asc' },
    });

    if (!article) {
      return;
    }

    console.log(`[文章生成] 开始处理文章 #${article.id}: ${article.title}`);

    // Get project knowledge images via knowledge bases
    const knowledgeBases = await prisma.knowledgeBase.findMany({
      where: { projectId: article.projectId, status: true },
      select: { id: true },
    });
    const baseIds = knowledgeBases.map(kb => kb.id);
    const images = await prisma.knowledgeImage.findMany({
      where: { baseId: { in: baseIds } },
    });

    // Get skills name if skills field is set
    let skillsName = '';
    if (article.skills) {
      const skillsId = typeof article.skills === 'object' ? (article.skills as any).id : article.skills;
      if (skillsId) {
        const skillsRecord = await prisma.skills.findFirst({ where: { id: Number(skillsId) } });
        if (skillsRecord) skillsName = skillsRecord.name;
      }
    }

    const imageResources = images.map(img => ({
      title: img.title,
      description: img.description || '',
      imageUrl: img.imageUrl,
    }));

    const content = await llmService.generateArticle({
      title: article.title,
      keywords: article.keywords || '',
      portrait: article.portrait || '通用读者',
      images: imageResources,
      skills: skillsName,
    });

    // Save generated content and update status
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
          content,
          version: newVersion,
          status: 'pending_review',
        },
      }),
    ]);

    console.log(`[文章生成] 文章 #${article.id} 生成完成，状态已更新为 pending_review`);
  } catch (err: any) {
    console.error(`[文章生成] 处理失败: ${err.message}`);

    // Mark failed article
    try {
      const failedArticle = await prisma.article.findFirst({
        where: { status: 'generating' },
        orderBy: { updatedAt: 'asc' },
      });
      if (failedArticle) {
        await prisma.article.update({
          where: { id: failedArticle.id },
          data: { status: 'generate_failed' },
        });
        console.log(`[文章生成] 文章 #${failedArticle.id} 已标记为 generate_failed`);
      }
    } catch (updateErr: any) {
      console.error(`[文章生成] 更新失败状态时出错: ${updateErr.message}`);
    }
  } finally {
    isRunning = false;
  }
}

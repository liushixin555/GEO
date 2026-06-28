import { Prisma } from '@prisma/client';
import { BusinessError, ForbiddenError, NotFoundError } from '../../errors';
import { getPrisma } from '../../utils';
import { collectCitationSources, normalizeCitationPlatforms } from '../../utils/citation-collector.util';
import { buildArticleCitationQuestions } from '../../utils/citation-question-bank.util';
import { normalizeCitationUrl } from '../../utils/citation-url.util';
import type {
  CitationAutoRunInput,
  CitationDiagnosisAuth,
  CitationDiagnosisListParams,
  CitationDetectionRunInput,
  ICitationDiagnosisService,
  PublishedArticleLinkInput,
} from '../citation-diagnosis.service';

export class CitationDiagnosisServiceImpl implements ICitationDiagnosisService {
  private async assertArticleAccess(articleId: number, auth: CitationDiagnosisAuth) {
    const article = await getPrisma().article.findFirst({
      where: { id: articleId, deletedAt: null },
      include: {
        project: {
          include: {
            operators: true,
            company: { select: { status: true } },
          },
        },
      },
    });
    if (!article) throw new NotFoundError('文章');

    if (auth.role !== 'sysadmin') {
      const hasAccess = article.project?.operators?.some((op: any) => op.userId === auth.userId);
      if (!hasAccess || article.project?.status !== true || article.project?.company?.status !== true) {
        throw new ForbiddenError('无权操作该文章');
      }
    }

    return article;
  }

  private async assertProjectAccess(projectId: number, auth: CitationDiagnosisAuth) {
    if (auth.role === 'sysadmin') return;
    const project = await getPrisma().project.findFirst({
      where: {
        id: projectId,
        status: true,
        company: { status: true },
        operators: { some: { userId: auth.userId } },
      },
    });
    if (!project) throw new ForbiddenError('无权操作该项目');
  }

  private async accessibleArticleIds(params: CitationDiagnosisListParams, auth: CitationDiagnosisAuth): Promise<number[]> {
    const articleWhere: any = { deletedAt: null };
    if (params.projectId) articleWhere.projectId = params.projectId;
    if (params.search) {
      articleWhere.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { keywords: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (auth.role !== 'sysadmin') {
      articleWhere.project = {
        status: true,
        company: { status: true },
        operators: { some: { userId: auth.userId } },
      };
    }
    const articles = await getPrisma().article.findMany({ where: articleWhere, select: { id: true } });
    return articles.map((item) => item.id);
  }

  async createPublishedLink(input: PublishedArticleLinkInput, auth: CitationDiagnosisAuth): Promise<any> {
    await this.assertArticleAccess(input.article_id, auth);

    const { normalizedUrl, domain } = normalizeCitationUrl(input.url);
    if (!normalizedUrl) throw new BusinessError('发布链接不能为空');

    const rows = await getPrisma().$queryRaw<any[]>(Prisma.sql`
      INSERT INTO published_article_links
        (article_id, schedule_id, platform_name, url, normalized_url, domain, created_by)
      VALUES
        (${input.article_id}, ${input.schedule_id ?? null}, ${input.platform_name ?? null}, ${input.url.trim()}, ${normalizedUrl}, ${domain}, ${auth.userId ?? null})
      RETURNING
        id,
        article_id AS "articleId",
        schedule_id AS "scheduleId",
        platform_name AS "platformName",
        url,
        normalized_url AS "normalizedUrl",
        domain,
        created_by AS "createdBy",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `);

    return this.mapPublishedLink(rows[0]);
  }

  async listPublishedLinks(params: CitationDiagnosisListParams, auth: CitationDiagnosisAuth): Promise<{ list: any[]; total: number }> {
    const articleIds = await this.accessibleArticleIds(params, auth);
    if (articleIds.length === 0) return { list: [], total: 0 };

    const offset = (params.page - 1) * params.pageSize;
    const [items, countRows] = await Promise.all([
      getPrisma().$queryRaw<any[]>(Prisma.sql`
        SELECT
          id,
          article_id AS "articleId",
          schedule_id AS "scheduleId",
          platform_name AS "platformName",
          url,
          normalized_url AS "normalizedUrl",
          domain,
          created_by AS "createdBy",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM published_article_links
        WHERE deleted_at IS NULL AND article_id IN (${Prisma.join(articleIds)})
        ORDER BY id DESC
        OFFSET ${offset}
        LIMIT ${params.pageSize}
      `),
      getPrisma().$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM published_article_links
        WHERE deleted_at IS NULL AND article_id IN (${Prisma.join(articleIds)})
      `),
    ]);

    const articles = await this.loadArticles(items.map((item: any) => item.articleId));
    return {
      list: items.map((item: any) => ({ ...this.mapPublishedLink(item), article: articles.get(item.articleId) ?? null })),
      total: Number(countRows[0]?.count ?? 0),
    };
  }

  async createDetectionRun(input: CitationDetectionRunInput, auth: CitationDiagnosisAuth): Promise<any> {
    if (input.project_id) {
      await this.assertProjectAccess(input.project_id, auth);
    }
    return this.saveDetectionRun(input, auth, 'completed');
  }

  private async saveDetectionRun(input: CitationDetectionRunInput, auth: CitationDiagnosisAuth, status: string): Promise<any> {
    const now = new Date();
    const normalizedSources = input.sources.map((source) => {
      const normalized = normalizeCitationUrl(source.url);
      return {
        source,
        normalizedUrl: normalized.normalizedUrl,
        domain: normalized.domain,
      };
    });

    return getPrisma().$transaction(async (tx: any) => {
      const runRows = await tx.$queryRaw(Prisma.sql`
        INSERT INTO ai_citation_detection_runs
          (project_id, model_name, prompt, answer, status, created_by, completed_at)
        VALUES
          (${input.project_id ?? null}, ${input.model_name}, ${input.prompt ?? null}, ${input.answer ?? null}, ${status}, ${auth.userId ?? null}, ${now})
        RETURNING
          id,
          project_id AS "projectId",
          model_name AS "modelName",
          prompt,
          answer,
          status,
          created_at AS "createdAt",
          completed_at AS "completedAt"
      `);
      const run = runRows[0];

      const sourceUrls = normalizedSources.map((item) => item.normalizedUrl).filter(Boolean);
      const linkRows = sourceUrls.length > 0
        ? await tx.$queryRaw(Prisma.sql`
            SELECT
              id,
              article_id AS "articleId",
              normalized_url AS "normalizedUrl"
            FROM published_article_links
            WHERE deleted_at IS NULL AND normalized_url IN (${Prisma.join(sourceUrls)})
          `)
        : [];
      const linkByUrl = new Map<string, any>(linkRows.map((item: any) => [item.normalizedUrl, item]));

      const records: any[] = [];
      for (const { source, normalizedUrl, domain } of normalizedSources) {
        const matchedLink = linkByUrl.get(normalizedUrl);
        const recordRows = await tx.$queryRaw(Prisma.sql`
          INSERT INTO ai_citation_records
            (run_id, model_name, source_url, normalized_source_url, source_title, domain, matched, article_id, article_link_id)
          VALUES
            (${run.id}, ${input.model_name}, ${source.url}, ${normalizedUrl}, ${source.title ?? null}, ${domain}, ${Boolean(matchedLink)}, ${matchedLink?.articleId ?? null}, ${matchedLink?.id ?? null})
          RETURNING
            id,
            run_id AS "runId",
            model_name AS "modelName",
            source_url AS "sourceUrl",
            normalized_source_url AS "normalizedSourceUrl",
            source_title AS "sourceTitle",
            domain,
            matched,
            article_id AS "articleId",
            article_link_id AS "articleLinkId",
            created_at AS "createdAt"
        `);
        const record = recordRows[0];
        records.push(record);

        if (record.matched && record.articleId) {
          await tx.$executeRaw(Prisma.sql`
            INSERT INTO article_model_citation_marks
              (article_id, model_name, first_matched_at, last_matched_at, match_count)
            VALUES
              (${record.articleId}, ${input.model_name}, ${now}, ${now}, 1)
            ON CONFLICT (article_id, model_name)
            DO UPDATE SET
              last_matched_at = EXCLUDED.last_matched_at,
              match_count = article_model_citation_marks.match_count + 1,
              updated_at = NOW()
          `);
        }
      }

      const matchedRecords = records.filter((record: any) => record.matched && record.articleId);
      return {
        id: run.id,
        model_name: run.modelName,
        project_id: run.projectId,
        prompt: run.prompt,
        answer: run.answer,
        status: run.status,
        created_at: run.createdAt,
        completed_at: run.completedAt,
        records: records.map((record: any) => this.mapRecord(record)),
        matched_count: matchedRecords.length,
      };
    });
  }

  async runAutomaticDetection(input: CitationAutoRunInput, auth: CitationDiagnosisAuth): Promise<any> {
    if (input.project_id) {
      await this.assertProjectAccess(input.project_id, auth);
    }

    const limit = Math.min(Math.max(Number(input.limit || 3), 1), 20);
    const questionCount = Math.min(Math.max(Number(input.question_count || 1), 1), 5);
    const platforms = normalizeCitationPlatforms(input.platforms);
    const links = await this.loadDetectionTargets(input, auth, limit);

    const results: any[] = [];
    for (const link of links) {
      const questions = buildArticleCitationQuestions(link, questionCount);
      for (const question of questions) {
        const prompt = [
          question,
          `请联网搜索并回答。若引用来源中出现这篇已发布文章，请保留原始 URL：${link.url}`,
        ].join('\n');
        for (const platform of platforms) {
          const collected = await collectCitationSources(platform, prompt);
          const run = await this.saveDetectionRun({
            project_id: link.projectId,
            model_name: platform,
            prompt,
            answer: collected.answer || collected.error || null,
            sources: collected.sources,
          }, auth, collected.status === 'success' ? 'completed' : collected.status);
          results.push({
            article_id: link.articleId,
            link_id: link.id,
            model_name: platform,
            status: collected.status,
            matched_count: run.matched_count,
            error: collected.error,
          });
        }
      }
    }

    return {
      scanned_links: links.length,
      platforms,
      results,
      matched_count: results.reduce((sum, item) => sum + Number(item.matched_count || 0), 0),
    };
  }

  async listLedger(params: CitationDiagnosisListParams, auth: CitationDiagnosisAuth): Promise<{ list: any[]; total: number }> {
    const articleIds = await this.accessibleArticleIds(params, auth);
    if (articleIds.length === 0) return { list: [], total: 0 };

    const offset = (params.page - 1) * params.pageSize;
    const search = params.search ? `%${params.search}%` : null;
    const status = params.status || null;
    const searchWhere = search
      ? Prisma.sql`AND (a.title ILIKE ${search} OR a.keywords ILIKE ${search} OR pal.url ILIKE ${search} OR COALESCE(pal.platform_name, pp.name) ILIKE ${search})`
      : Prisma.empty;
    const statusWhere = status ? Prisma.sql`AND COALESCE(ps.status::text, a.status::text) = ${status}` : Prisma.empty;

    const [rows, countRows] = await Promise.all([
      getPrisma().$queryRaw<any[]>(Prisma.sql`
        SELECT
          COALESCE(ps.updated_at, pal.created_at, a.updated_at) AS "publishedAt",
          COALESCE(pal.platform_name, pp.name) AS "publishPlatform",
          a.id AS "articleId",
          a.title AS "articleTitle",
          a.keywords AS "topicWords",
          a.article_type AS "articleType",
          COALESCE(pp.taxonomy, CASE WHEN pal.platform_name IS NULL THEN NULL ELSE '第三方自媒体/新闻' END) AS "publishChannelType",
          pal.url AS "publishLink",
          u.cn_name AS "publisher",
          COALESCE(ps.status::text, a.status::text) AS "status",
          COALESCE(mark_agg.models, '') AS "citationModels",
          COALESCE(mark_agg.match_count, 0)::int AS "citationMatchCount"
        FROM publishing_schedules ps
        JOIN articles a ON a.id = ps.article_id
        LEFT JOIN LATERAL (
          SELECT *
          FROM published_article_links link
          WHERE link.deleted_at IS NULL
            AND (link.schedule_id = ps.id OR link.article_id = a.id)
          ORDER BY CASE WHEN link.schedule_id = ps.id THEN 0 ELSE 1 END, link.updated_at DESC, link.id DESC
          LIMIT 1
        ) pal ON true
        LEFT JOIN LATERAL (
          SELECT platform_id
          FROM publishing_platform_orders order_item
          WHERE order_item.schedule_id = ps.id
          ORDER BY order_item.updated_at DESC, order_item.id DESC
          LIMIT 1
        ) ppo ON true
        LEFT JOIN users u ON u.id = COALESCE(ps.created_by, a.created_by)
        LEFT JOIN publishing_platforms pp ON pp.name = pal.platform_name
          OR pp.id = ppo.platform_id
        LEFT JOIN (
          SELECT
            article_id,
            STRING_AGG(model_name, ',' ORDER BY model_name) AS models,
            SUM(match_count) AS match_count
          FROM article_model_citation_marks
          GROUP BY article_id
        ) mark_agg ON mark_agg.article_id = a.id
        WHERE ps.deleted_at IS NULL
          AND a.deleted_at IS NULL
          AND a.id IN (${Prisma.join(articleIds)})
          ${searchWhere}
          ${statusWhere}
        ORDER BY COALESCE(ps.updated_at, pal.created_at, a.updated_at) DESC, pal.id DESC
        OFFSET ${offset}
        LIMIT ${params.pageSize}
      `),
      getPrisma().$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM publishing_schedules ps
        JOIN articles a ON a.id = ps.article_id
        LEFT JOIN LATERAL (
          SELECT *
          FROM published_article_links link
          WHERE link.deleted_at IS NULL
            AND (link.schedule_id = ps.id OR link.article_id = a.id)
          ORDER BY CASE WHEN link.schedule_id = ps.id THEN 0 ELSE 1 END, link.updated_at DESC, link.id DESC
          LIMIT 1
        ) pal ON true
        LEFT JOIN LATERAL (
          SELECT platform_id
          FROM publishing_platform_orders order_item
          WHERE order_item.schedule_id = ps.id
          ORDER BY order_item.updated_at DESC, order_item.id DESC
          LIMIT 1
        ) ppo ON true
        LEFT JOIN publishing_platforms pp ON pp.name = pal.platform_name
          OR pp.id = ppo.platform_id
        WHERE ps.deleted_at IS NULL
          AND a.deleted_at IS NULL
          AND a.id IN (${Prisma.join(articleIds)})
          ${searchWhere}
          ${statusWhere}
      `),
    ]);

    return {
      list: rows.map((item: any) => ({
        published_at: item.publishedAt,
        publish_platform: item.publishPlatform,
        article_id: item.articleId,
        article_title: item.articleTitle,
        topic_words: item.topicWords,
        semantic_tags: item.topicWords,
        article_type: item.articleType,
        publish_channel_type: item.publishChannelType,
        publish_link: item.publishLink,
        publisher: item.publisher,
        status: item.status,
        citation_models: item.citationModels ? String(item.citationModels).split(',').filter(Boolean) : [],
        citation_match_count: item.citationMatchCount,
      })),
      total: Number(countRows[0]?.count ?? 0),
    };
  }

  async listDetectionRuns(params: CitationDiagnosisListParams, auth: CitationDiagnosisAuth): Promise<{ list: any[]; total: number }> {
    if (params.projectId) {
      await this.assertProjectAccess(params.projectId, auth);
    }

    const where = params.projectId
      ? Prisma.sql`WHERE project_id = ${params.projectId}`
      : Prisma.empty;
    const offset = (params.page - 1) * params.pageSize;

    const [runs, countRows] = await Promise.all([
      getPrisma().$queryRaw<any[]>(Prisma.sql`
        SELECT
          id,
          project_id AS "projectId",
          model_name AS "modelName",
          prompt,
          status,
          created_at AS "createdAt",
          completed_at AS "completedAt"
        FROM ai_citation_detection_runs
        ${where}
        ORDER BY id DESC
        OFFSET ${offset}
        LIMIT ${params.pageSize}
      `),
      getPrisma().$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM ai_citation_detection_runs
        ${where}
      `),
    ]);

    const records = runs.length > 0
      ? await getPrisma().$queryRaw<any[]>(Prisma.sql`
          SELECT
            id,
            run_id AS "runId",
            model_name AS "modelName",
            source_url AS "sourceUrl",
            normalized_source_url AS "normalizedSourceUrl",
            source_title AS "sourceTitle",
            domain,
            matched,
            article_id AS "articleId",
            article_link_id AS "articleLinkId",
            created_at AS "createdAt"
          FROM ai_citation_records
          WHERE run_id IN (${Prisma.join(runs.map((item: any) => item.id))})
          ORDER BY id ASC
        `)
      : [];
    const recordsByRun = new Map<number, any[]>();
    for (const record of records) {
      const list = recordsByRun.get(record.runId) || [];
      list.push(record);
      recordsByRun.set(record.runId, list);
    }

    return {
      list: runs.map((item: any) => {
        const runRecords = recordsByRun.get(item.id) || [];
        return {
          id: item.id,
          model_name: item.modelName,
          project_id: item.projectId,
          prompt: item.prompt,
          status: item.status,
          created_at: item.createdAt,
          completed_at: item.completedAt,
          matched_count: runRecords.filter((record: any) => record.matched).length,
          records: runRecords.map((record: any) => this.mapRecord(record)),
        };
      }),
      total: Number(countRows[0]?.count ?? 0),
    };
  }

  async listMarks(params: CitationDiagnosisListParams, auth: CitationDiagnosisAuth): Promise<{ list: any[]; total: number }> {
    const articleIds = await this.accessibleArticleIds(params, auth);
    if (articleIds.length === 0) return { list: [], total: 0 };

    const offset = (params.page - 1) * params.pageSize;
    const [items, countRows] = await Promise.all([
      getPrisma().$queryRaw<any[]>(Prisma.sql`
        SELECT
          id,
          article_id AS "articleId",
          model_name AS "modelName",
          first_matched_at AS "firstMatchedAt",
          last_matched_at AS "lastMatchedAt",
          match_count AS "matchCount"
        FROM article_model_citation_marks
        WHERE article_id IN (${Prisma.join(articleIds)})
        ORDER BY last_matched_at DESC, id DESC
        OFFSET ${offset}
        LIMIT ${params.pageSize}
      `),
      getPrisma().$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM article_model_citation_marks
        WHERE article_id IN (${Prisma.join(articleIds)})
      `),
    ]);

    const articles = await this.loadArticles(items.map((item: any) => item.articleId));
    return {
      list: items.map((item: any) => ({
        id: item.id,
        article_id: item.articleId,
        model_name: item.modelName,
        first_matched_at: item.firstMatchedAt,
        last_matched_at: item.lastMatchedAt,
        match_count: item.matchCount,
        article: articles.get(item.articleId) ?? null,
      })),
      total: Number(countRows[0]?.count ?? 0),
    };
  }

  private async loadArticles(articleIds: number[]): Promise<Map<number, any>> {
    if (articleIds.length === 0) return new Map();
    const articles = await getPrisma().article.findMany({
      where: { id: { in: Array.from(new Set(articleIds)) } },
      select: { id: true, title: true, keywords: true, projectId: true },
    });
    return new Map(articles.map((article) => [article.id, {
      id: article.id,
      title: article.title,
      keywords: article.keywords,
      project_id: article.projectId,
    }]));
  }

  private async loadDetectionTargets(input: CitationAutoRunInput, auth: CitationDiagnosisAuth, limit: number): Promise<any[]> {
    const articleWhere: any = { deletedAt: null };
    if (input.project_id) articleWhere.projectId = input.project_id;
    if (input.article_ids?.length) articleWhere.id = { in: input.article_ids };
    if (auth.role !== 'sysadmin') {
      articleWhere.project = {
        status: true,
        company: { status: true },
        operators: { some: { userId: auth.userId } },
      };
    }
    const articles = await getPrisma().article.findMany({
      where: articleWhere,
      select: { id: true },
    });
    const articleIds = articles.map((article) => article.id);
    if (articleIds.length === 0) return [];

    return getPrisma().$queryRaw<any[]>(Prisma.sql`
      SELECT
        pal.id,
        pal.article_id AS "articleId",
        pal.url,
        a.project_id AS "projectId",
        a.title,
        a.keywords
      FROM published_article_links pal
      JOIN articles a ON a.id = pal.article_id
      WHERE pal.deleted_at IS NULL
        AND a.deleted_at IS NULL
        AND pal.article_id IN (${Prisma.join(articleIds)})
      ORDER BY pal.updated_at DESC, pal.id DESC
      LIMIT ${limit}
    `);
  }

  private mapPublishedLink(item: any) {
    return {
      id: item.id,
      article_id: item.articleId,
      schedule_id: item.scheduleId,
      platform_name: item.platformName,
      url: item.url,
      normalized_url: item.normalizedUrl,
      domain: item.domain,
      created_by: item.createdBy,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };
  }

  private mapRecord(item: any) {
    return {
      id: item.id,
      run_id: item.runId,
      model_name: item.modelName,
      source_url: item.sourceUrl,
      normalized_source_url: item.normalizedSourceUrl,
      source_title: item.sourceTitle,
      domain: item.domain,
      matched: item.matched,
      article_id: item.articleId,
      article_link_id: item.articleLinkId,
      created_at: item.createdAt,
    };
  }
}

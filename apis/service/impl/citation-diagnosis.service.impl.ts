import { Prisma } from '@prisma/client';
import { BusinessError, ForbiddenError, NotFoundError } from '../../errors';
import { getPrisma } from '../../utils';
import { normalizeCitationUrl } from '../../utils/citation-url.util';
import type {
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
          (${input.project_id ?? null}, ${input.model_name}, ${input.prompt ?? null}, ${input.answer ?? null}, 'completed', ${auth.userId ?? null}, ${now})
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

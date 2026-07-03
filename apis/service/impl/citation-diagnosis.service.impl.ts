import { Prisma } from '@prisma/client';
import { BusinessError, ForbiddenError, NotFoundError } from '../../errors';
import { getPrisma } from '../../utils';
import { collectCitationSourcesForModel, loadEnabledCitationModels } from '../../utils/citation-collector.util';
import { buildArticleCitationQuestions } from '../../utils/citation-question-bank.util';
import { isInternalPublishedLinkUrl, normalizeCitationUrl } from '../../utils/citation-url.util';
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
    if (isInternalPublishedLinkUrl(input.url)) {
      throw new BusinessError('该链接不是最终公开发布链接，请等待平台发布后填写真实文章 URL');
    }

    const rows = await getPrisma().$queryRaw<any[]>(Prisma.sql`
      INSERT INTO published_article_links
        (article_id, schedule_id, platform_name, url, normalized_url, domain, created_by)
      VALUES
        (${input.article_id}, ${input.schedule_id ?? null}, ${input.platform_name ?? null}, ${input.url.trim()}, ${normalizedUrl}, ${domain}, ${auth.userId ?? null})
      ON CONFLICT (article_id, normalized_url) WHERE deleted_at IS NULL
      DO UPDATE SET
        schedule_id = COALESCE(EXCLUDED.schedule_id, published_article_links.schedule_id),
        platform_name = COALESCE(EXCLUDED.platform_name, published_article_links.platform_name),
        url = EXCLUDED.url,
        domain = EXCLUDED.domain,
        created_by = COALESCE(EXCLUDED.created_by, published_article_links.created_by),
        updated_at = NOW()
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
    if (input.article_id) {
      const article = await this.assertArticleAccess(input.article_id, auth);
      if (input.project_id && article.projectId !== input.project_id) {
        throw new BusinessError('article_id does not belong to project_id');
      }
    }
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
          (project_id, target_article_id, target_article_link_id, model_name, prompt, answer, status, created_by, completed_at)
        VALUES
          (${input.project_id ?? null}, ${input.article_id ?? null}, ${input.article_link_id ?? null}, ${input.model_name}, ${input.prompt ?? null}, ${input.answer ?? null}, ${status}, ${auth.userId ?? null}, ${now})
        RETURNING
          id,
          project_id AS "projectId",
          target_article_id AS "targetArticleId",
          target_article_link_id AS "targetArticleLinkId",
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
            WHERE deleted_at IS NULL
              AND (
                normalized_url IN (${Prisma.join(sourceUrls)})
                OR regexp_replace(normalized_url, '^https?://', '') IN (${Prisma.join(sourceUrls)})
              )
          `)
        : [];
      const linkByUrl = new Map<string, any>();
      for (const item of linkRows) {
        linkByUrl.set(item.normalizedUrl, item);
        linkByUrl.set(String(item.normalizedUrl || '').replace(/^https?:\/\//i, ''), item);
      }

      const records: any[] = [];
      for (const [index, { source, normalizedUrl, domain }] of normalizedSources.entries()) {
        const matchedLink = linkByUrl.get(normalizedUrl);
        const answerSnippet = this.trimNullable(source.answer_snippet ?? input.answer ?? null, 5000);
        const citationSnippet = this.trimNullable(source.citation_snippet ?? source.title ?? null, 5000);
        const sourceIndex = source.source_index ?? index;
        const rawSource = this.stringifyRawSource(source.raw_source ?? source);
        const recordRows = await tx.$queryRaw(Prisma.sql`
          INSERT INTO ai_citation_records
            (run_id, model_name, source_url, normalized_source_url, source_title, answer_snippet, citation_snippet, source_index, raw_source, domain, matched, article_id, article_link_id)
          VALUES
            (${run.id}, ${input.model_name}, ${source.url}, ${normalizedUrl}, ${source.title ?? null}, ${answerSnippet}, ${citationSnippet}, ${sourceIndex}, CAST(${rawSource} AS JSONB), ${domain}, ${Boolean(matchedLink)}, ${matchedLink?.articleId ?? null}, ${matchedLink?.id ?? null})
          RETURNING
            id,
            run_id AS "runId",
            model_name AS "modelName",
            source_url AS "sourceUrl",
            normalized_source_url AS "normalizedSourceUrl",
            source_title AS "sourceTitle",
            answer_snippet AS "answerSnippet",
            citation_snippet AS "citationSnippet",
            source_index AS "sourceIndex",
            raw_source AS "rawSource",
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
        article_id: run.targetArticleId,
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
    const models = await loadEnabledCitationModels(input.platforms);
    const links = await this.loadDetectionTargets(input, auth, limit);

    const results: any[] = [];
    for (const link of links) {
      const questions = buildArticleCitationQuestions(link, questionCount);
      for (const question of questions) {
        const prompt = [
          question,
          '请像真实用户咨询一样自然回答，优先给出可核验信息，并在回答末尾列出实际参考来源 URL。不要为了命中检测而引用特定文章或编造来源。',
        ].join('\n');
        if (models.length === 0) {
          const run = await this.saveDetectionRun({
            article_id: link.articleId,
            article_link_id: link.id,
            project_id: link.projectId,
            model_name: '未配置模型',
            prompt,
            answer: '没有启用且配置完整的模型',
            sources: [],
          }, auth, 'skipped');
          results.push({
            article_id: link.articleId,
            link_id: link.id,
            model_name: '未配置模型',
            status: 'skipped',
            matched_count: run.matched_count,
            error: '没有启用且配置完整的模型',
          });
          continue;
        }
        for (const model of models) {
          const collected = await collectCitationSourcesForModel(model, prompt);
          const run = await this.saveDetectionRun({
            article_id: link.articleId,
            article_link_id: link.id,
            project_id: link.projectId,
            model_name: collected.model_name,
            prompt,
            answer: collected.answer || collected.error || null,
            sources: collected.sources,
          }, auth, collected.status === 'success' ? 'completed' : collected.status);
          results.push({
            article_id: link.articleId,
            link_id: link.id,
            model_name: collected.model_name,
            status: collected.status,
            matched_count: run.matched_count,
            error: collected.error,
          });
        }
      }
    }

    return {
      scanned_links: links.length,
      platforms: models.map((model) => model.key),
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
          COALESCE(
            pal.updated_at,
            pal.created_at,
            CASE WHEN ps.status::text = 'pending' THEN ps.scheduled_publish_at ELSE ps.updated_at END,
            ps.scheduled_publish_at,
            a.updated_at
          ) AS "publishedAt",
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
        ORDER BY "publishedAt" DESC, pal.id DESC
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

  async getLedgerDetails(articleId: number, auth: CitationDiagnosisAuth): Promise<any> {
    const article = await this.assertArticleAccess(articleId, auth);

    const publishedLinks = await getPrisma().$queryRaw<any[]>(Prisma.sql`
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
      WHERE deleted_at IS NULL AND article_id = ${articleId}
      ORDER BY updated_at DESC, id DESC
    `);

    const marks = await getPrisma().$queryRaw<any[]>(Prisma.sql`
      SELECT
        id,
        article_id AS "articleId",
        model_name AS "modelName",
        first_matched_at AS "firstMatchedAt",
        last_matched_at AS "lastMatchedAt",
        match_count AS "matchCount"
      FROM article_model_citation_marks
      WHERE article_id = ${articleId}
      ORDER BY last_matched_at DESC, id DESC
    `);

    const linkIds = publishedLinks.map((item: any) => item.id);
    const recordWhere = linkIds.length > 0
      ? Prisma.sql`(r.article_id = ${articleId} OR r.article_link_id IN (${Prisma.join(linkIds)}))`
      : Prisma.sql`r.article_id = ${articleId}`;
    const targetRuns = await getPrisma().$queryRaw<any[]>(Prisma.sql`
      SELECT
        id,
        project_id AS "projectId",
        target_article_id AS "targetArticleId",
        target_article_link_id AS "targetArticleLinkId",
        model_name AS "modelName",
        prompt,
        answer,
        status,
        created_at AS "createdAt",
        completed_at AS "completedAt"
      FROM ai_citation_detection_runs
      WHERE target_article_id = ${articleId}
    `);
    const linkedRunRows = await getPrisma().$queryRaw<any[]>(Prisma.sql`
      SELECT DISTINCT r.run_id AS "runId"
      FROM ai_citation_records r
      WHERE ${recordWhere}
    `);
    const runIds = Array.from(new Set([
      ...targetRuns.map((item: any) => item.id),
      ...linkedRunRows.map((item: any) => item.runId),
    ]));
    const linkIdSet = new Set<number>(linkIds);
    const runs = runIds.length > 0
      ? await getPrisma().$queryRaw<any[]>(Prisma.sql`
          SELECT
            id,
            project_id AS "projectId",
            target_article_id AS "targetArticleId",
            target_article_link_id AS "targetArticleLinkId",
            model_name AS "modelName",
            prompt,
            answer,
            status,
            created_at AS "createdAt",
            completed_at AS "completedAt"
          FROM ai_citation_detection_runs
          WHERE id IN (${Prisma.join(runIds)})
          ORDER BY created_at DESC, id DESC
        `)
      : [];
    const records = runIds.length > 0
      ? await getPrisma().$queryRaw<any[]>(Prisma.sql`
          SELECT
            r.id,
            r.run_id AS "runId",
            r.model_name AS "modelName",
            r.source_url AS "sourceUrl",
            r.normalized_source_url AS "normalizedSourceUrl",
            r.source_title AS "sourceTitle",
            r.answer_snippet AS "answerSnippet",
            r.citation_snippet AS "citationSnippet",
            r.source_index AS "sourceIndex",
            r.raw_source AS "rawSource",
            r.domain,
            r.matched,
            r.article_id AS "articleId",
            r.article_link_id AS "articleLinkId",
            r.created_at AS "createdAt"
          FROM ai_citation_records r
          WHERE r.run_id IN (${Prisma.join(runIds)})
          ORDER BY r.run_id DESC, r.source_index ASC NULLS LAST, r.id ASC
        `)
      : [];

    const runsById = new Map<number, any>();
    for (const run of runs) {
      runsById.set(run.id, {
        id: run.id,
        article_id: run.targetArticleId,
        model_name: run.modelName,
        project_id: run.projectId,
        prompt: run.prompt,
        answer: run.answer,
        status: run.status,
        created_at: run.createdAt,
        completed_at: run.completedAt,
        matched_count: 0,
        records: [],
      });
    }
    for (const record of records) {
      const run = runsById.get(record.runId);
      if (!run) continue;
      if (this.isRecordMatchedForArticle(record, articleId, linkIdSet)) run.matched_count += 1;
      run.records.push(this.mapRecord(record));
    }

    const mappedLinks = publishedLinks.map((item: any) => this.mapPublishedLink(item));
    const mappedMarks = marks.map((item: any) => ({
      id: item.id,
      article_id: item.articleId,
      model_name: item.modelName,
      first_matched_at: item.firstMatchedAt,
      last_matched_at: item.lastMatchedAt,
      match_count: item.matchCount,
    }));
    const mappedRuns = Array.from(runsById.values());
    const matchedCount = records.filter((record: any) => this.isRecordMatchedForArticle(record, articleId, linkIdSet)).length;

    return {
      article: {
        id: article.id,
        project_id: article.projectId,
        title: article.title,
        keywords: article.keywords,
        article_type: article.articleType,
        status: article.status,
        created_at: article.createdAt,
        updated_at: article.updatedAt,
      },
      published_links: mappedLinks,
      citation_marks: mappedMarks,
      detection_runs: mappedRuns,
      summary: {
        published_link_count: mappedLinks.length,
        detection_run_count: mappedRuns.length,
        record_count: records.length,
        matched_count: matchedCount,
        citation_models: mappedMarks.map((item: any) => item.model_name),
      },
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
            target_article_id AS "targetArticleId",
            target_article_link_id AS "targetArticleLinkId",
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
            answer_snippet AS "answerSnippet",
            citation_snippet AS "citationSnippet",
            source_index AS "sourceIndex",
            raw_source AS "rawSource",
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
          article_id: item.targetArticleId,
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
        ${input.article_link_ids?.length ? Prisma.sql`AND pal.id IN (${Prisma.join(input.article_link_ids)})` : Prisma.empty}
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
      answer_snippet: item.answerSnippet,
      citation_snippet: item.citationSnippet,
      source_index: item.sourceIndex,
      raw_source: item.rawSource,
      domain: item.domain,
      matched: item.matched,
      article_id: item.articleId,
      article_link_id: item.articleLinkId,
      created_at: item.createdAt,
    };
  }

  private trimNullable(value: unknown, maxLength: number): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
  }

  private stringifyRawSource(value: unknown): string | null {
    if (value === undefined || value === null) return null;
    try {
      return JSON.stringify(value);
    } catch {
      return JSON.stringify({ unavailable: true });
    }
  }

  private isRecordMatchedForArticle(record: any, articleId: number, linkIds: Set<number>): boolean {
    if (!record?.matched) return false;
    if (record.articleId === articleId) return true;
    return typeof record.articleLinkId === 'number' && linkIds.has(record.articleLinkId);
  }
}

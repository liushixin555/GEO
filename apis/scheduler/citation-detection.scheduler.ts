import * as cron from 'node-cron';
import { ScheduledTask } from 'node-cron';
import { Prisma } from '@prisma/client';
import config from '../config';
import { createCitationDiagnosisService } from '../service';
import { getPrisma } from '../utils';
import { CITATION_DETECTION_DELAY_HOURS } from '../utils/citation-detection-schedule.util';

const citationDiagnosisService = createCitationDiagnosisService();

const BATCH_LIMIT = 5;
const QUESTION_COUNT = 2;
const DEDUPE_HOURS = 24;

let task: ScheduledTask | null = null;
let isRunning = false;

interface DetectionTargetLink {
  id: number;
  articleId: number;
}

export function startCitationDetectionCron(): void {
  if (!config.cron.citationDetectionEnabled) {
    console.log('[citation-detection] cron disabled');
    return;
  }

  const expression = config.cron.citationDetectionInterval;
  if (!cron.validate(expression)) {
    console.error(`[citation-detection] invalid cron expression: ${expression}`);
    return;
  }

  task = cron.schedule(expression, () => {
    processCitationDetection();
  });
  console.log(`[citation-detection] cron started (${expression})`);
}

export function stopCitationDetectionCron(): void {
  if (task) {
    task.stop();
    task = null;
    console.log('[citation-detection] cron stopped');
  }
}

export async function processCitationDetection(): Promise<void> {
  if (isRunning) {
    console.log('[citation-detection] previous batch is still running, skip this tick');
    return;
  }

  isRunning = true;
  try {
    const targets = await loadPendingPublishedLinks();
    let failed = 0;
    let skipped = 0;
    let matched = 0;

    for (const target of targets) {
      try {
        const result = await citationDiagnosisService.runAutomaticDetection(
          {
            article_ids: [target.articleId],
            article_link_ids: [target.id],
            limit: 1,
            question_count: QUESTION_COUNT,
          },
          { role: 'sysadmin' }
        );
        matched += Number(result.matched_count || 0);
        skipped += result.results.filter((item: any) => item.status === 'skipped').length;
      } catch (err: any) {
        failed++;
        console.error(`[citation-detection] link ${target.id} failed: ${err.message}`);
      }
    }

    console.log(`[citation-detection] completed: scanned ${targets.length}, matched ${matched}, skipped ${skipped}, failed ${failed}`);
  } catch (err: any) {
    console.error(`[citation-detection] batch failed: ${err.message}`);
  } finally {
    isRunning = false;
  }
}

async function loadPendingPublishedLinks(): Promise<DetectionTargetLink[]> {
  return getPrisma().$queryRaw<DetectionTargetLink[]>(Prisma.sql`
    SELECT
      pal.id,
      pal.article_id AS "articleId"
    FROM published_article_links pal
    JOIN articles a ON a.id = pal.article_id
    WHERE pal.deleted_at IS NULL
      AND a.deleted_at IS NULL
      AND pal.normalized_url IS NOT NULL
      AND pal.updated_at <= NOW() - (${CITATION_DETECTION_DELAY_HOURS} * INTERVAL '1 hour')
      AND (
        pal.domain IS NULL
        OR (
          pal.domain <> 'ruan.net'
          AND pal.domain NOT LIKE '%.ruan.net'
        )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM ai_citation_detection_runs run
        WHERE run.target_article_link_id = pal.id
          AND run.created_at >= NOW() - (${DEDUPE_HOURS} * INTERVAL '1 hour')
      )
    ORDER BY pal.updated_at ASC, pal.id ASC
    LIMIT ${BATCH_LIMIT}
  `);
}

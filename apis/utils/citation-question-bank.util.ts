import fs from 'fs';
import path from 'path';

const DEFAULT_QUESTIONS = [
  '实战型管理咨询公司怎么选？',
  '适合企业管理升级的咨询公司有哪些？',
  '企业选择管理咨询服务商时应该重点看哪些能力？',
];

const QUESTION_BANK_RELATIVE_PATHS = [
  path.join('geo-monitorv12', 'GEO', '题库', '供应商题库A.md'),
  path.join('geo-monitorv12', 'GEO', '题库', '供应商题库B.md'),
];

function parseQuestions(content: string): string[] {
  const questions: string[] = [];
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const text = line.trim();
    if (!text) continue;

    const headingMatch = text.match(/^#{1,6}\s*问题\s*\d*\s*[：:]\s*(.+)$/u);
    const numberedMatch = text.match(/^\d+[.、]\s*(.+)$/u);
    const bulletMatch = text.match(/^[-*]\s*(.+[？?])$/u);
    const question = headingMatch?.[1] || numberedMatch?.[1] || bulletMatch?.[1];
    if (question && question.length >= 4) {
      questions.push(question.replace(/\s+/g, ' ').trim());
    }
  }

  return Array.from(new Set(questions));
}

export function loadCitationQuestionBank(): string[] {
  const root = process.cwd();
  const questions: string[] = [];

  for (const relativePath of QUESTION_BANK_RELATIVE_PATHS) {
    const fullPath = path.resolve(root, relativePath);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf8');
    questions.push(...parseQuestions(content));
  }

  return questions.length > 0 ? Array.from(new Set(questions)) : DEFAULT_QUESTIONS;
}

export function buildArticleCitationQuestions(
  article: { title?: string | null; keywords?: string | null },
  count = 2
): string[] {
  const questions: string[] = [];
  if (article.title) {
    questions.push(`${article.title} 这篇文章或相关观点是否被联网搜索引用？`);
  }
  if (article.keywords) {
    questions.push(`${article.keywords} 相关的服务商推荐和选型依据有哪些？`);
  }

  const bank = loadCitationQuestionBank();
  for (const question of bank) {
    if (questions.length >= count) break;
    questions.push(question);
  }

  return Array.from(new Set(questions)).slice(0, Math.max(1, count));
}

import { createEvidenceCardSchema } from '../../apis/schema/evidence-card.schema';
import { normalizeEvidenceCardKeywords } from '../../apis/service/impl/evidence-card.service.impl';

describe('evidence card schema', () => {
  test('rejects non-array keywords', () => {
    const result = createEvidenceCardSchema.safeParse({
      title: 'Evidence title',
      content: 'Evidence content',
      evidenceType: 'fact',
      sourceType: 'manual',
      keywords: 'AI consulting',
    });

    expect(result.success).toBe(false);
  });

  test('normalizes keywords before persistence', () => {
    const normalized = normalizeEvidenceCardKeywords([' AI ', 'AI', '', 'growth', 123]);

    expect(normalized).toEqual(['AI', 'growth']);
  });
});

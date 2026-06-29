import { createPortraitSchema } from '../../apis/schema/knowledge.schema';

describe('knowledge portrait schema', () => {
  test('allows portrait content up to 300000 characters', () => {
    const result = createPortraitSchema.safeParse({
      title: 'Long portrait',
      content: 'a'.repeat(300000),
    });

    expect(result.success).toBe(true);
  });

  test('rejects portrait content longer than 300000 characters', () => {
    const result = createPortraitSchema.safeParse({
      title: 'Too long portrait',
      content: 'a'.repeat(300001),
    });

    expect(result.success).toBe(false);
  });
});

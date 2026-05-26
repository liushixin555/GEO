/**
 * @jest-environment node
 */
import {
  articleStatusSchema,
  createArticleSchema,
  updateArticleSchema,
  reviewArticleSchema,
  updateContentSchema,
  listArticlesSchema,
} from '../../apis/schema/article.schema';

// ─── articleStatusSchema ────────────────────────────────────────────
describe('articleStatusSchema', () => {
  const validStatuses = [
    'draft',
    'manual_writing',
    'generating',
    'generate_failed',
    'pending_review',
    'approved',
  ];

  it.each(validStatuses)('应接受有效状态 "%s"', (status) => {
    expect(articleStatusSchema.parse(status)).toBe(status);
  });

  it('应拒绝无效状态字符串', () => {
    const result = articleStatusSchema.safeParse('invalid_status');
    expect(result.success).toBe(false);
  });

  it('应拒绝空字符串', () => {
    const result = articleStatusSchema.safeParse('');
    expect(result.success).toBe(false);
  });

  it('应拒绝数字', () => {
    const result = articleStatusSchema.safeParse(0);
    expect(result.success).toBe(false);
  });

  it('应拒绝 null', () => {
    const result = articleStatusSchema.safeParse(null);
    expect(result.success).toBe(false);
  });

  it('应拒绝 undefined', () => {
    const result = articleStatusSchema.safeParse(undefined);
    expect(result.success).toBe(false);
  });

  it('应拒绝数组', () => {
    const result = articleStatusSchema.safeParse(['draft']);
    expect(result.success).toBe(false);
  });

  it('应拒绝对象', () => {
    const result = articleStatusSchema.safeParse({ status: 'draft' });
    expect(result.success).toBe(false);
  });

  it('应拒绝大小写不匹配的状态', () => {
    const result = articleStatusSchema.safeParse('Draft');
    expect(result.success).toBe(false);
  });

  it('应提取正确的枚举选项', () => {
    expect(articleStatusSchema.options).toEqual(validStatuses);
  });
});

// ─── createArticleSchema ────────────────────────────────────────────
describe('createArticleSchema', () => {
  it('应接受空对象（所有字段可选）', () => {
    const result = createArticleSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  // --- title ---
  describe('title', () => {
    it('应接受有效标题', () => {
      expect(createArticleSchema.parse({ title: '测试标题' }).title).toBe('测试标题');
    });

    it('应接受空字符串', () => {
      expect(createArticleSchema.parse({ title: '' }).title).toBe('');
    });

    it('应接受最长500字符标题', () => {
      const title = 'a'.repeat(500);
      expect(createArticleSchema.parse({ title }).title).toBe(title);
    });

    it('应拒绝超过500字符的标题', () => {
      const result = createArticleSchema.safeParse({ title: 'a'.repeat(501) });
      expect(result.success).toBe(false);
    });

    it('应接受 unicode 标题', () => {
      const title = '中文标题🎉emoji';
      expect(createArticleSchema.parse({ title }).title).toBe(title);
    });
  });

  // --- article_type ---
  describe('article_type', () => {
    it('应接受有效 article_type', () => {
      expect(createArticleSchema.parse({ article_type: 'seo' }).article_type).toBe('seo');
    });

    it('应接受最长50字符', () => {
      const article_type = 'a'.repeat(50);
      expect(createArticleSchema.parse({ article_type }).article_type).toBe(article_type);
    });

    it('应拒绝超过50字符', () => {
      const result = createArticleSchema.safeParse({ article_type: 'a'.repeat(51) });
      expect(result.success).toBe(false);
    });
  });

  // --- write_mode ---
  describe('write_mode', () => {
    it('应接受有效 write_mode', () => {
      expect(createArticleSchema.parse({ write_mode: 'auto' }).write_mode).toBe('auto');
    });

    it('应接受最长20字符', () => {
      const write_mode = 'x'.repeat(20);
      expect(createArticleSchema.parse({ write_mode }).write_mode).toBe(write_mode);
    });

    it('应拒绝超过20字符', () => {
      const result = createArticleSchema.safeParse({ write_mode: 'x'.repeat(21) });
      expect(result.success).toBe(false);
    });
  });

  // --- keywords ---
  describe('keywords', () => {
    it('应接受有效关键词', () => {
      expect(createArticleSchema.parse({ keywords: 'SEO,关键词' }).keywords).toBe('SEO,关键词');
    });

    it('应接受最长500字符', () => {
      const keywords = 'k'.repeat(500);
      expect(createArticleSchema.parse({ keywords }).keywords).toBe(keywords);
    });

    it('应拒绝超过500字符', () => {
      const result = createArticleSchema.safeParse({ keywords: 'k'.repeat(501) });
      expect(result.success).toBe(false);
    });
  });

  // --- portrait ---
  describe('portrait', () => {
    it('应接受有效画像', () => {
      expect(createArticleSchema.parse({ portrait: '人物画像' }).portrait).toBe('人物画像');
    });

    it('应接受最长2000字符', () => {
      const portrait = 'p'.repeat(2000);
      expect(createArticleSchema.parse({ portrait }).portrait).toBe(portrait);
    });

    it('应拒绝超过2000字符', () => {
      const result = createArticleSchema.safeParse({ portrait: 'p'.repeat(2001) });
      expect(result.success).toBe(false);
    });
  });

  // --- images ---
  describe('images', () => {
    it('应接受有效图片数组', () => {
      expect(createArticleSchema.parse({ images: ['a.jpg', 'b.png'] }).images).toEqual(['a.jpg', 'b.png']);
    });

    it('应接受空数组', () => {
      expect(createArticleSchema.parse({ images: [] }).images).toEqual([]);
    });

    it('应接受 null', () => {
      expect(createArticleSchema.parse({ images: null }).images).toBeNull();
    });

    it('应接受最多20张图片', () => {
      const images = Array.from({ length: 20 }, (_, i) => `img${i}.jpg`);
      expect(createArticleSchema.parse({ images }).images).toHaveLength(20);
    });

    it('应拒绝超过20张图片', () => {
      const images = Array.from({ length: 21 }, (_, i) => `img${i}.jpg`);
      const result = createArticleSchema.safeParse({ images });
      expect(result.success).toBe(false);
    });

    it('应接受最长2000字符的图片URL', () => {
      const url = 'https://' + 'a'.repeat(1988) + '.jpg';
      expect(url.length).toBe(2000);
      expect(createArticleSchema.parse({ images: [url] }).images).toEqual([url]);
    });

    it('应拒绝超过2000字符的图片URL', () => {
      const url = 'https://' + 'a'.repeat(1989) + '.jpg';
      expect(url.length).toBe(2001);
      const result = createArticleSchema.safeParse({ images: [url] });
      expect(result.success).toBe(false);
    });

    it('应拒绝非数组非null的 images', () => {
      const result = createArticleSchema.safeParse({ images: 'not-array' });
      expect(result.success).toBe(false);
    });
  });

  // --- skills ---
  describe('skills', () => {
    it('应接受有效技能ID数组', () => {
      expect(createArticleSchema.parse({ skills: [1, 2, 3] }).skills).toEqual([1, 2, 3]);
    });

    it('应接受 null', () => {
      expect(createArticleSchema.parse({ skills: null }).skills).toBeNull();
    });

    it('应接受空数组', () => {
      expect(createArticleSchema.parse({ skills: [] }).skills).toEqual([]);
    });

    it('应接受最多50个技能ID', () => {
      const skills = Array.from({ length: 50 }, (_, i) => i + 1);
      expect(createArticleSchema.parse({ skills }).skills).toHaveLength(50);
    });

    it('应拒绝超过50个技能ID', () => {
      const skills = Array.from({ length: 51 }, (_, i) => i + 1);
      const result = createArticleSchema.safeParse({ skills });
      expect(result.success).toBe(false);
    });

    it('应接受 0 作为合法ID', () => {
      expect(createArticleSchema.parse({ skills: [0] }).skills).toEqual([0]);
    });

    it('应拒绝负数技能ID', () => {
      const result = createArticleSchema.safeParse({ skills: [-1] });
      expect(result.success).toBe(false);
    });

    it('应拒绝浮点数技能ID', () => {
      const result = createArticleSchema.safeParse({ skills: [1.5] });
      expect(result.success).toBe(false);
    });

    it('应拒绝字符串技能ID', () => {
      const result = createArticleSchema.safeParse({ skills: ['1'] as unknown as number[] });
      expect(result.success).toBe(false);
    });
  });

  // --- llm_model_id ---
  describe('llm_model_id', () => {
    it('应接受有效模型ID', () => {
      expect(createArticleSchema.parse({ llm_model_id: 1 }).llm_model_id).toBe(1);
    });

    it('应接受 null', () => {
      expect(createArticleSchema.parse({ llm_model_id: null }).llm_model_id).toBeNull();
    });

    it('应接受 0', () => {
      expect(createArticleSchema.parse({ llm_model_id: 0 }).llm_model_id).toBe(0);
    });

    it('应拒绝负数', () => {
      const result = createArticleSchema.safeParse({ llm_model_id: -1 });
      expect(result.success).toBe(false);
    });

    it('应拒绝浮点数', () => {
      const result = createArticleSchema.safeParse({ llm_model_id: 1.5 });
      expect(result.success).toBe(false);
    });
  });

  // --- content ---
  describe('content', () => {
    it('应接受有效内容', () => {
      expect(createArticleSchema.parse({ content: '文章内容' }).content).toBe('文章内容');
    });

    it('应接受空字符串', () => {
      expect(createArticleSchema.parse({ content: '' }).content).toBe('');
    });

    it('应接受最长500000字符', () => {
      const content = 'c'.repeat(500_000);
      expect(createArticleSchema.parse({ content }).content).toBe(content);
    });

    it('应拒绝超过500000字符', () => {
      const result = createArticleSchema.safeParse({ content: 'c'.repeat(500_001) });
      expect(result.success).toBe(false);
    });
  });

  // --- status ---
  describe('status', () => {
    it('应接受 draft', () => {
      expect(createArticleSchema.parse({ status: 'draft' }).status).toBe('draft');
    });

    it('应接受 generating', () => {
      expect(createArticleSchema.parse({ status: 'generating' }).status).toBe('generating');
    });

    it('应接受 manual_writing', () => {
      expect(createArticleSchema.parse({ status: 'manual_writing' }).status).toBe('manual_writing');
    });

    it('应拒绝 create 不允许的状态（如 approved）', () => {
      const result = createArticleSchema.safeParse({ status: 'approved' });
      expect(result.success).toBe(false);
    });

    it('应拒绝 invalid 状态', () => {
      const result = createArticleSchema.safeParse({ status: 'invalid' });
      expect(result.success).toBe(false);
    });
  });

  // --- strict mode ---
  describe('strict 模式', () => {
    it('应拒绝未知字段', () => {
      const result = createArticleSchema.safeParse({ unknown_field: 'value' });
      expect(result.success).toBe(false);
    });

    it('应拒绝未知字段即使有有效字段', () => {
      const result = createArticleSchema.safeParse({ title: '标题', extra: true });
      expect(result.success).toBe(false);
    });
  });

  // --- 完整对象 ---
  describe('完整有效对象', () => {
    it('应接受所有字段', () => {
      const data = {
        title: '完整文章',
        article_type: 'seo',
        write_mode: 'auto',
        keywords: '关键词',
        portrait: '画像',
        images: ['img1.jpg'],
        skills: [1, 2],
        llm_model_id: 1,
        content: '内容',
        status: 'draft' as const,
      };
      const result = createArticleSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});

// ─── updateArticleSchema ────────────────────────────────────────────
describe('updateArticleSchema', () => {
  it('应接受空对象（所有字段可选）', () => {
    const result = updateArticleSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  // --- title / article_type / write_mode / keywords / portrait ---
  describe('继承字段约束', () => {
    it('应接受最长500字符标题', () => {
      expect(updateArticleSchema.parse({ title: 'a'.repeat(500) }).title).toHaveLength(500);
    });

    it('应拒绝超过500字符标题', () => {
      expect(updateArticleSchema.safeParse({ title: 'a'.repeat(501) }).success).toBe(false);
    });

    it('应接受最长50字符 article_type', () => {
      expect(updateArticleSchema.parse({ article_type: 'a'.repeat(50) }).article_type).toHaveLength(50);
    });

    it('应拒绝超过50字符 article_type', () => {
      expect(updateArticleSchema.safeParse({ article_type: 'a'.repeat(51) }).success).toBe(false);
    });
  });

  // --- status (update 允许所有6个状态) ---
  describe('status', () => {
    const allStatuses = [
      'draft', 'manual_writing', 'generating', 'generate_failed',
      'pending_review', 'approved',
    ];

    it.each(allStatuses)('应允许更新状态为 "%s"', (status) => {
      expect(updateArticleSchema.parse({ status }).status).toBe(status);
    });

    it('应拒绝无效状态', () => {
      expect(updateArticleSchema.safeParse({ status: 'invalid' }).success).toBe(false);
    });
  });

  // --- images / skills (nullable) ---
  describe('可空数组字段', () => {
    it('应接受 null images', () => {
      expect(updateArticleSchema.parse({ images: null }).images).toBeNull();
    });

    it('应接受 null skills', () => {
      expect(updateArticleSchema.parse({ skills: null }).skills).toBeNull();
    });

    it('应拒绝超过20张图片', () => {
      const images = Array.from({ length: 21 }, (_, i) => `img${i}.jpg`);
      expect(updateArticleSchema.safeParse({ images }).success).toBe(false);
    });

    it('应拒绝超过50个技能ID', () => {
      const skills = Array.from({ length: 51 }, (_, i) => i + 1);
      expect(updateArticleSchema.safeParse({ skills }).success).toBe(false);
    });

    it('应拒绝负数技能ID', () => {
      expect(updateArticleSchema.safeParse({ skills: [-1] }).success).toBe(false);
    });
  });

  // --- llm_model_id ---
  describe('llm_model_id', () => {
    it('应接受 null', () => {
      expect(updateArticleSchema.parse({ llm_model_id: null }).llm_model_id).toBeNull();
    });

    it('应拒绝负数', () => {
      expect(updateArticleSchema.safeParse({ llm_model_id: -1 }).success).toBe(false);
    });
  });

  // --- strict mode ---
  describe('strict 模式', () => {
    it('应拒绝未知字段', () => {
      expect(updateArticleSchema.safeParse({ extra: true }).success).toBe(false);
    });
  });
});

// ─── reviewArticleSchema ────────────────────────────────────────────
describe('reviewArticleSchema', () => {
  it('应接受 approved: true', () => {
    expect(reviewArticleSchema.parse({ approved: true }).approved).toBe(true);
  });

  it('应接受 approved: false', () => {
    expect(reviewArticleSchema.parse({ approved: false }).approved).toBe(false);
  });

  it('应拒绝缺少 approved 字段', () => {
    expect(reviewArticleSchema.safeParse({}).success).toBe(false);
  });

  it('应拒绝字符串 "true"', () => {
    expect(reviewArticleSchema.safeParse({ approved: 'true' as unknown as boolean }).success).toBe(false);
  });

  it('应拒绝数字 1', () => {
    expect(reviewArticleSchema.safeParse({ approved: 1 as unknown as boolean }).success).toBe(false);
  });

  it('应拒绝 null', () => {
    expect(reviewArticleSchema.safeParse({ approved: null as unknown as boolean }).success).toBe(false);
  });

  it('应拒绝未知字段（strict）', () => {
    expect(reviewArticleSchema.safeParse({ approved: true, comment: '不错' }).success).toBe(false);
  });
});

// ─── updateContentSchema ────────────────────────────────────────────
describe('updateContentSchema', () => {
  it('应接受有效内容', () => {
    expect(updateContentSchema.parse({ content: '文章内容' }).content).toBe('文章内容');
  });

  it('应接受最长500000字符', () => {
    const content = 'c'.repeat(500_000);
    expect(updateContentSchema.parse({ content }).content).toBe(content);
  });

  it('应拒绝空字符串（min 1）', () => {
    expect(updateContentSchema.safeParse({ content: '' }).success).toBe(false);
  });

  it('应拒绝超过500000字符', () => {
    expect(updateContentSchema.safeParse({ content: 'c'.repeat(500_001) }).success).toBe(false);
  });

  it('应拒绝缺少 content 字段', () => {
    expect(updateContentSchema.safeParse({}).success).toBe(false);
  });

  it('应拒绝非字符串 content', () => {
    expect(updateContentSchema.safeParse({ content: 123 as unknown as string }).success).toBe(false);
  });

  it('应拒绝 null content', () => {
    expect(updateContentSchema.safeParse({ content: null as unknown as string }).success).toBe(false);
  });

  it('应拒绝未知字段（strict）', () => {
    expect(updateContentSchema.safeParse({ content: '有效', extra: true }).success).toBe(false);
  });

  it('应接受包含 HTML 的内容', () => {
    const html = '<p>Hello <b>World</b></p>';
    expect(updateContentSchema.parse({ content: html }).content).toBe(html);
  });

  it('应接受包含 unicode 的内容', () => {
    const content = '中文内容 🎉 émoji àccent';
    expect(updateContentSchema.parse({ content }).content).toBe(content);
  });

  it('应接受单字符内容', () => {
    expect(updateContentSchema.parse({ content: 'a' }).content).toBe('a');
  });
});

// ─── listArticlesSchema ─────────────────────────────────────────────
describe('listArticlesSchema', () => {
  it('应使用默认值（page=1, pageSize=10）', () => {
    const result = listArticlesSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
  });

  // --- page ---
  describe('page', () => {
    it('应接受有效页码', () => {
      expect(listArticlesSchema.parse({ page: 1 }).page).toBe(1);
    });

    it('应接受大页码', () => {
      expect(listArticlesSchema.parse({ page: 999 }).page).toBe(999);
    });

    it('应将字符串页码强制转换为数字（coerce）', () => {
      expect(listArticlesSchema.parse({ page: '5' }).page).toBe(5);
    });

    it('应拒绝小于1的页码', () => {
      expect(listArticlesSchema.safeParse({ page: 0 }).success).toBe(false);
    });

    it('应拒绝负页码', () => {
      expect(listArticlesSchema.safeParse({ page: -1 }).success).toBe(false);
    });

    it('应拒绝非整数页码', () => {
      expect(listArticlesSchema.safeParse({ page: 1.5 }).success).toBe(false);
    });
  });

  // --- pageSize ---
  describe('pageSize', () => {
    it('应接受有效 pageSize', () => {
      expect(listArticlesSchema.parse({ pageSize: 20 }).pageSize).toBe(20);
    });

    it('应接受最大值100', () => {
      expect(listArticlesSchema.parse({ pageSize: 100 }).pageSize).toBe(100);
    });

    it('应接受最小值1', () => {
      expect(listArticlesSchema.parse({ pageSize: 1 }).pageSize).toBe(1);
    });

    it('应将字符串 pageSize 强制转换', () => {
      expect(listArticlesSchema.parse({ pageSize: '50' }).pageSize).toBe(50);
    });

    it('应拒绝超过100的 pageSize', () => {
      expect(listArticlesSchema.safeParse({ pageSize: 101 }).success).toBe(false);
    });

    it('应拒绝小于1的 pageSize', () => {
      expect(listArticlesSchema.safeParse({ pageSize: 0 }).success).toBe(false);
    });

    it('应拒绝非整数 pageSize', () => {
      expect(listArticlesSchema.safeParse({ pageSize: 10.5 }).success).toBe(false);
    });
  });

  // --- search ---
  describe('search', () => {
    it('应接受有效搜索字符串', () => {
      expect(listArticlesSchema.parse({ search: '关键词' }).search).toBe('关键词');
    });

    it('应接受最长200字符', () => {
      const search = 's'.repeat(200);
      expect(listArticlesSchema.parse({ search }).search).toBe(search);
    });

    it('应拒绝超过200字符', () => {
      expect(listArticlesSchema.safeParse({ search: 's'.repeat(201) }).success).toBe(false);
    });
  });

  // --- status ---
  describe('status', () => {
    const validStatuses = [
      'draft', 'manual_writing', 'generating', 'generate_failed',
      'pending_review', 'approved',
    ];

    it.each(validStatuses)('应接受状态 "%s"', (status) => {
      expect(listArticlesSchema.parse({ status }).status).toBe(status);
    });

    it('应拒绝无效状态', () => {
      expect(listArticlesSchema.safeParse({ status: 'invalid' }).success).toBe(false);
    });
  });

  // --- 非严格模式 ---
  describe('非 strict 模式', () => {
    it('应允许未知字段（无 strict）', () => {
      const result = listArticlesSchema.safeParse({ extra: 'value' });
      expect(result.success).toBe(true);
    });
  });

  // --- 完整查询 ---
  describe('完整查询参数', () => {
    it('应接受所有查询参数', () => {
      const result = listArticlesSchema.parse({
        page: 2,
        pageSize: 25,
        search: '测试',
        status: 'draft',
      });
      expect(result).toEqual({
        page: 2,
        pageSize: 25,
        search: '测试',
        status: 'draft',
      });
    });

    it('应正确强制转换字符串数字参数', () => {
      const result = listArticlesSchema.parse({
        page: '3',
        pageSize: '50',
      });
      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(50);
    });
  });
});

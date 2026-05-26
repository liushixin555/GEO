import {
  mapCompany,
  mapSkills,
  mapUser,
  mapLlmModel,
  mapSystemConfig,
  mapProject,
  mapArticle,
  mapArticleVersion,
  mapPublishingPlatform,
  mapKeyword,
  mapPortrait,
  mapKnowledgeImage,
  mapKnowledgeDocument,
  mapMinedKeyword,
  mapTodo,
  mapTodoLog,
} from '../../apis/map/index';

// ============================================================
// mapCompany
// ============================================================
describe('mapCompany', () => {
  const basePrisma = {
    id: 1,
    shortName: 'TestCo',
    fullName: 'Test Company Ltd',
    address: '123 Test St',
    contactPerson: 'Alice',
    contactPhone: '13800138000',
    status: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-01'),
    deletedAt: null,
  };

  test('正确映射所有字段', () => {
    const result = mapCompany(basePrisma);
    expect(result).toEqual({
      id: 1,
      short_name: 'TestCo',
      full_name: 'Test Company Ltd',
      address: '123 Test St',
      contact_person: 'Alice',
      contact_phone: '13800138000',
      status: true,
      created_by: null,
      updated_by: null,
      created_at: basePrisma.createdAt,
      updated_at: basePrisma.updatedAt,
      deleted_at: null,
    });
  });

  test('address 为 null 时正确映射', () => {
    const result = mapCompany({ ...basePrisma, address: null });
    expect(result.address).toBeNull();
  });

  test('status 为 false 时正确映射', () => {
    const result = mapCompany({ ...basePrisma, status: false });
    expect(result.status).toBe(false);
  });

  test('不同 id 值正确映射', () => {
    const result = mapCompany({ ...basePrisma, id: 999 });
    expect(result.id).toBe(999);
  });

  test('deletedAt 有值时正确映射', () => {
    const deletedDate = new Date('2024-12-01');
    const result = mapCompany({ ...basePrisma, deletedAt: deletedDate });
    expect(result.deleted_at).toEqual(deletedDate);
  });

  test('contactPhone 为空字符串时正确映射', () => {
    const result = mapCompany({ ...basePrisma, contactPhone: '' });
    expect(result.contact_phone).toBe('');
  });

  test('full_name 为空字符串时正确映射', () => {
    const result = mapCompany({ ...basePrisma, fullName: '' });
    expect(result.full_name).toBe('');
  });

  test('不同 id 正确映射', () => {
    const result = mapCompany({ ...basePrisma, id: 42 });
    expect(result.id).toBe(42);
  });

  test('shortName 为空字符串时正确映射', () => {
    const result = mapCompany({ ...basePrisma, shortName: '' });
    expect(result.short_name).toBe('');
  });
});

// ============================================================
// mapSkills
// ============================================================
describe('mapSkills', () => {
  const basePrisma = {
    id: 10,
    name: 'SEO写作',
    description: 'SEO文章写作技能',
    createdBy: 5,
    creator: { cnName: '张三' },
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-07-01'),
    deletedAt: null,
  };

  test('正确映射所有字段（含 creator 关联）', () => {
    const result = mapSkills(basePrisma);
    expect(result).toEqual({
      id: 10,
      name: 'SEO写作',
      description: 'SEO文章写作技能',
      created_by: 5,
      creator_name: '张三',
      created_at: basePrisma.createdAt,
      updated_at: basePrisma.updatedAt,
      deleted_at: null,
    });
  });

  test('createdBy 为 null 时 created_by 为 null', () => {
    const result = mapSkills({ ...basePrisma, createdBy: null });
    expect(result.created_by).toBeNull();
  });

  test('creator 为 null 时 creator_name 为 null', () => {
    const result = mapSkills({ ...basePrisma, creator: null });
    expect(result.creator_name).toBeNull();
  });

  test('creator 存在但 cnName 为空字符串时返回 null（|| null 走 falsy）', () => {
    const result = mapSkills({ ...basePrisma, creator: { cnName: '' } });
    expect(result.creator_name).toBeNull();
  });

  test('createdBy 为 undefined 时使用 null', () => {
    const { createdBy, ...withoutCreatedBy } = basePrisma;
    const result = mapSkills(withoutCreatedBy);
    expect(result.created_by).toBeNull();
  });

  test('description 为 null 时正确映射', () => {
    const result = mapSkills({ ...basePrisma, description: null });
    expect(result.description).toBeNull();
  });

  test('deletedAt 有值时正确映射', () => {
    const deletedDate = new Date('2024-12-01');
    const result = mapSkills({ ...basePrisma, deletedAt: deletedDate });
    expect(result.deleted_at).toEqual(deletedDate);
  });

  test('name 为空字符串时正确映射', () => {
    const result = mapSkills({ ...basePrisma, name: '' });
    expect(result.name).toBe('');
  });
});

// ============================================================
// mapUser
// ============================================================
describe('mapUser', () => {
  const basePrisma = {
    id: 1,
    username: 'admin01',
    cnName: '管理员',
    role: 'admin' as const,
    status: true,
    companyId: 10,
    company: { shortName: 'TestCo' },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-05-20'),
  };

  test('正确映射所有字段（含 company 关联）', () => {
    const result = mapUser(basePrisma);
    expect(result).toEqual({
      id: 1,
      username: 'admin01',
      cn_name: '管理员',
      role: 'admin',
      status: true,
      company_id: 10,
      company_name: 'TestCo',
      created_at: basePrisma.createdAt,
      updated_at: basePrisma.updatedAt,
    });
  });

  test('companyId 为 null 时 company_id 为 null', () => {
    const result = mapUser({ ...basePrisma, companyId: null });
    expect(result.company_id).toBeNull();
  });

  test('company 为 null 时 company_name 为空字符串', () => {
    const result = mapUser({ ...basePrisma, company: null });
    expect(result.company_name).toBe('');
  });

  test('company 存在但 shortName 为空字符串', () => {
    const result = mapUser({ ...basePrisma, company: { shortName: '' } });
    expect(result.company_name).toBe('');
  });

  test('companyId 为 undefined 时 company_id 为 null', () => {
    const { companyId, ...withoutCompanyId } = basePrisma;
    const result = mapUser({ ...withoutCompanyId, company: null });
    expect(result.company_id).toBeNull();
  });

  test('role 为 sysadmin 时正确映射', () => {
    const result = mapUser({ ...basePrisma, role: 'sysadmin' });
    expect(result.role).toBe('sysadmin');
  });

  test('role 为 view 时正确映射', () => {
    const result = mapUser({ ...basePrisma, role: 'view' });
    expect(result.role).toBe('view');
  });

  test('status 为 false 时正确映射', () => {
    const result = mapUser({ ...basePrisma, status: false });
    expect(result.status).toBe(false);
  });

  test('cnName 为 null 时正确映射', () => {
    const result = mapUser({ ...basePrisma, cnName: null });
    expect(result.cn_name).toBeNull();
  });

  test('cnName 为空字符串时正确映射', () => {
    const result = mapUser({ ...basePrisma, cnName: '' });
    expect(result.cn_name).toBe('');
  });

  test('company 为 undefined 时 company_name 为空字符串', () => {
    const { company, ...rest } = basePrisma;
    const result = mapUser(rest);
    expect(result.company_name).toBe('');
  });
});

// ============================================================
// mapLlmModel
// ============================================================
describe('mapLlmModel', () => {
  const basePrisma = {
    id: 1,
    provider: 'OpenAI',
    baseUrl: 'https://api.openai.com',
    apiKey: 'sk-test-key-value-here',
    modelName: 'gpt-4',
    status: true,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-08-01'),
  };

  test('正确映射所有字段（apiKey 脱敏）', () => {
    const result = mapLlmModel(basePrisma);
    expect(result).toEqual({
      id: 1,
      provider: 'OpenAI',
      base_url: 'https://api.openai.com',
      api_key: 'sk-t****here',
      model_name: 'gpt-4',
      status: true,
      created_at: basePrisma.createdAt,
      updated_at: basePrisma.updatedAt,
    });
  });

  test('apiKey 脱敏格式：前4位+****+后4位', () => {
    const result = mapLlmModel({ ...basePrisma, apiKey: 'abcdefghijklmnop' });
    expect(result.api_key).toBe('abcd****mnop');
  });

  test('apiKey 为 null 时返回空字符串', () => {
    const result = mapLlmModel({ ...basePrisma, apiKey: null });
    expect(result.api_key).toBe('');
  });

  test('apiKey 为 undefined 时返回空字符串', () => {
    const { apiKey, ...rest } = basePrisma;
    const result = mapLlmModel(rest);
    expect(result.api_key).toBe('');
  });

  test('apiKey 为空字符串时返回空字符串', () => {
    const result = mapLlmModel({ ...basePrisma, apiKey: '' });
    expect(result.api_key).toBe('');
  });

  test('apiKey 为短字符串时正确脱敏', () => {
    const result = mapLlmModel({ ...basePrisma, apiKey: 'sk-k' });
    // 'sk-k'.slice(0,4) = 'sk-k', 'sk-k'.slice(-4) = 'sk-k'
    expect(result.api_key).toBe('sk-k****sk-k');
  });

  test('status 为 false 时正确映射', () => {
    const result = mapLlmModel({ ...basePrisma, status: false });
    expect(result.status).toBe(false);
  });

  test('不同 provider 和 modelName 正确映射', () => {
    const result = mapLlmModel({ ...basePrisma, provider: 'Anthropic', modelName: 'claude-3' });
    expect(result.provider).toBe('Anthropic');
    expect(result.model_name).toBe('claude-3');
  });

  test('baseUrl 为 null 时正确映射', () => {
    const result = mapLlmModel({ ...basePrisma, baseUrl: null });
    expect(result.base_url).toBeNull();
  });

  test('id 为数字类型时正确映射', () => {
    const result = mapLlmModel({ ...basePrisma, id: 42 });
    expect(result.id).toBe(42);
  });
});

// ============================================================
// mapSystemConfig
// ============================================================
describe('mapSystemConfig', () => {
  const basePrisma = {
    id: 1,
    configKey: 'max_articles',
    configValue: '100',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
  };

  test('正确映射所有字段', () => {
    const result = mapSystemConfig(basePrisma);
    expect(result).toEqual({
      id: 1,
      config_key: 'max_articles',
      config_value: '100',
      created_at: basePrisma.createdAt,
      updated_at: basePrisma.updatedAt,
    });
  });

  test('不同 configKey/configValue 正确映射', () => {
    const result = mapSystemConfig({ ...basePrisma, configKey: 'site_name', configValue: 'MySite' });
    expect(result.config_key).toBe('site_name');
    expect(result.config_value).toBe('MySite');
  });

  test('configValue 为空字符串时正确映射', () => {
    const result = mapSystemConfig({ ...basePrisma, configValue: '' });
    expect(result.config_value).toBe('');
  });

  test('configValue 为 JSON 字符串时正确映射', () => {
    const result = mapSystemConfig({ ...basePrisma, configValue: '{"key":"value"}' });
    expect(result.config_value).toBe('{"key":"value"}');
  });

  test('configKey 包含特殊字符时正确映射', () => {
    const result = mapSystemConfig({ ...basePrisma, configKey: 'app.feature_toggle' });
    expect(result.config_key).toBe('app.feature_toggle');
  });
});

// ============================================================
// mapProject
// ============================================================
describe('mapProject', () => {
  const basePrisma = {
    id: 1,
    shortName: 'ProjA',
    fullName: 'Project Alpha',
    description: 'Test project',
    companyId: 10,
    company: { shortName: 'TestCo' },
    operators: [
      { userId: 1, user: { id: 1, cnName: '张三' } },
      { userId: 2, user: { id: 2, cnName: '李四' } },
    ],
    viewers: [
      { userId: 3, user: { id: 3, cnName: '王五' } },
    ],
    status: true,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-06-01'),
  };

  test('正确映射所有字段（含 operators/viewers 关联）', () => {
    const result = mapProject(basePrisma);
    expect(result).toEqual({
      id: 1,
      short_name: 'ProjA',
      full_name: 'Project Alpha',
      description: 'Test project',
      company_id: 10,
      company_name: 'TestCo',
      operator_ids: [1, 2],
      operator_names: ['张三', '李四'],
      viewer_ids: [3],
      viewer_names: ['王五'],
      status: true,
      created_at: basePrisma.createdAt,
      updated_at: basePrisma.updatedAt,
    });
  });

  test('operators 为空数组时 operator_ids 和 operator_names 为空', () => {
    const result = mapProject({ ...basePrisma, operators: [] });
    expect(result.operator_ids).toEqual([]);
    expect(result.operator_names).toEqual([]);
  });

  test('viewers 为空数组时 viewer_ids 和 viewer_names 为空', () => {
    const result = mapProject({ ...basePrisma, viewers: [] });
    expect(result.viewer_ids).toEqual([]);
    expect(result.viewer_names).toEqual([]);
  });

  test('operators/viewers 均为 undefined 时默认为空数组', () => {
    const { operators, viewers, ...rest } = basePrisma;
    const result = mapProject(rest);
    expect(result.operator_ids).toEqual([]);
    expect(result.operator_names).toEqual([]);
    expect(result.viewer_ids).toEqual([]);
    expect(result.viewer_names).toEqual([]);
  });

  test('operator 中 user 为 null 时使用 userId', () => {
    const input = {
      ...basePrisma,
      operators: [{ userId: 99, user: null }],
    };
    const result = mapProject(input);
    expect(result.operator_ids).toEqual([99]);
    expect(result.operator_names).toEqual(['']);
  });

  test('viewer 中 user 为 null 时使用 userId', () => {
    const input = {
      ...basePrisma,
      viewers: [{ userId: 88, user: null }],
    };
    const result = mapProject(input);
    expect(result.viewer_ids).toEqual([88]);
    expect(result.viewer_names).toEqual(['']);
  });

  test('company 为 null 时 company_name 为空字符串', () => {
    const result = mapProject({ ...basePrisma, company: null });
    expect(result.company_name).toBe('');
  });

  test('description 为 null 时正确映射', () => {
    const result = mapProject({ ...basePrisma, description: null });
    expect(result.description).toBeNull();
  });

  test('status 为 false 时正确映射', () => {
    const result = mapProject({ ...basePrisma, status: false });
    expect(result.status).toBe(false);
  });

  test('operator 中 user.id 与 userId 不同时优先使用 user.id', () => {
    const input = {
      ...basePrisma,
      operators: [{ userId: 50, user: { id: 60, cnName: '测试' } }],
    };
    const result = mapProject(input);
    expect(result.operator_ids).toEqual([60]);
  });

  test('operator 中 user 存在但 cnName 为空字符串时返回空字符串', () => {
    const input = {
      ...basePrisma,
      operators: [{ userId: 1, user: { id: 1, cnName: '' } }],
    };
    const result = mapProject(input);
    expect(result.operator_names).toEqual(['']);
  });

  test('company 存在但 shortName 为空字符串时返回空字符串', () => {
    const result = mapProject({ ...basePrisma, company: { shortName: '' } });
    expect(result.company_name).toBe('');
  });

  test('多个 operators 和 viewers 正确映射', () => {
    const input = {
      ...basePrisma,
      operators: [
        { userId: 1, user: { id: 1, cnName: 'A' } },
        { userId: 2, user: { id: 2, cnName: 'B' } },
        { userId: 3, user: { id: 3, cnName: 'C' } },
      ],
      viewers: [
        { userId: 4, user: { id: 4, cnName: 'D' } },
        { userId: 5, user: { id: 5, cnName: 'E' } },
      ],
    };
    const result = mapProject(input);
    expect(result.operator_ids).toEqual([1, 2, 3]);
    expect(result.operator_names).toEqual(['A', 'B', 'C']);
    expect(result.viewer_ids).toEqual([4, 5]);
    expect(result.viewer_names).toEqual(['D', 'E']);
  });

  test('viewer 中 user 存在但 cnName 为空时返回空字符串', () => {
    const input = {
      ...basePrisma,
      viewers: [{ userId: 10, user: { id: 10, cnName: '' } }],
    };
    const result = mapProject(input);
    expect(result.viewer_names).toEqual(['']);
  });
});

// ============================================================
// mapArticle
// ============================================================
describe('mapArticle', () => {
  const basePrisma = {
    id: 1,
    projectId: 10,
    title: 'Test Article',
    articleType: 'seo',
    writeMode: 'auto',
    keywords: 'keyword1,keyword2',
    portrait: 'portrait content',
    images: ['img1.jpg', 'img2.jpg'],
    skills: [1, 2, 3],
    llmModelId: 3,
    content: 'Article content here',
    version: 2,
    status: 'draft',
    createdBy: 1,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-07-01'),
    deletedAt: null,
    creator: { cnName: '张三' },
    _count: { schedules: 3 },
  };

  test('正确映射所有字段', () => {
    const result = mapArticle(basePrisma);
    expect(result).toEqual({
      id: 1,
      project_id: 10,
      title: 'Test Article',
      article_type: 'seo',
      write_mode: 'auto',
      keywords: 'keyword1,keyword2',
      portrait: 'portrait content',
      images: ['img1.jpg', 'img2.jpg'],
      skills: [1, 2, 3],
      llm_model_id: 3,
      content: 'Article content here',
      version: 2,
      status: 'draft',
      created_by: 1,
      created_at: basePrisma.createdAt,
      updated_at: basePrisma.updatedAt,
      deleted_at: null,
      creator_name: '张三',
      schedule_count: 3,
    });
  });

  test('articleType 为 null 时正确映射', () => {
    const result = mapArticle({ ...basePrisma, articleType: null });
    expect(result.article_type).toBeNull();
  });

  test('articleType 为 undefined 时映射为 null', () => {
    const { articleType, ...rest } = basePrisma;
    const result = mapArticle(rest as any);
    expect(result.article_type).toBeNull();
  });

  test('writeMode 为 null 时正确映射', () => {
    const result = mapArticle({ ...basePrisma, writeMode: null });
    expect(result.write_mode).toBeNull();
  });

  test('writeMode 为 undefined 时映射为 null', () => {
    const { writeMode, ...rest } = basePrisma;
    const result = mapArticle(rest as any);
    expect(result.write_mode).toBeNull();
  });

  test('llmModelId 为 null 时映射为 null', () => {
    const result = mapArticle({ ...basePrisma, llmModelId: null });
    expect(result.llm_model_id).toBeNull();
  });

  test('llmModelId 为 undefined 时映射为 null', () => {
    const { llmModelId, ...rest } = basePrisma;
    const result = mapArticle(rest as any);
    expect(result.llm_model_id).toBeNull();
  });

  test('createdBy 为 null 时映射为 null', () => {
    const result = mapArticle({ ...basePrisma, createdBy: null });
    expect(result.created_by).toBeNull();
  });

  test('createdBy 为 undefined 时映射为 null', () => {
    const { createdBy, ...rest } = basePrisma;
    const result = mapArticle(rest as any);
    expect(result.created_by).toBeNull();
  });

  test('images 为 null 时正确映射', () => {
    const result = mapArticle({ ...basePrisma, images: null });
    expect(result.images).toBeNull();
  });

  test('keywords 为 null 时正确映射', () => {
    const result = mapArticle({ ...basePrisma, keywords: null });
    expect(result.keywords).toBeNull();
  });

  test('portrait 为 null 时正确映射', () => {
    const result = mapArticle({ ...basePrisma, portrait: null });
    expect(result.portrait).toBeNull();
  });

  test('content 为空字符串时正确映射', () => {
    const result = mapArticle({ ...basePrisma, content: '' });
    expect(result.content).toBe('');
  });

  test('version 为 0 时正确映射', () => {
    const result = mapArticle({ ...basePrisma, version: 0 });
    expect(result.version).toBe(0);
  });

  test('images 为空数组时正确映射', () => {
    const result = mapArticle({ ...basePrisma, images: [] });
    expect(result.images).toEqual([]);
  });

  test('status 为 approved 时正确映射', () => {
    const result = mapArticle({ ...basePrisma, status: 'approved' });
    expect(result.status).toBe('approved');
  });

  test('_count.schedules 不存在时 schedule_count 默认为 0', () => {
    const { _count, ...rest } = basePrisma;
    const result = mapArticle(rest);
    expect(result.schedule_count).toBe(0);
  });

  test('_count 不存在时 schedule_count 默认为 0', () => {
    const { _count, ...rest } = basePrisma;
    const result = mapArticle({ ...rest });
    expect(result.schedule_count).toBe(0);
  });
});

// ============================================================
// mapArticleVersion
// ============================================================
describe('mapArticleVersion', () => {
  const basePrisma = {
    id: 1,
    articleId: 10,
    version: 3,
    content: 'Version 3 content',
    createdBy: 5,
    createdAt: new Date('2024-04-01'),
    deletedAt: null,
  };

  test('正确映射所有字段', () => {
    const result = mapArticleVersion(basePrisma);
    expect(result).toEqual({
      id: 1,
      article_id: 10,
      version: 3,
      content: 'Version 3 content',
      created_by: 5,
      created_at: basePrisma.createdAt,
      deleted_at: null,
    });
  });

  test('createdBy 为 null 时映射为 null', () => {
    const result = mapArticleVersion({ ...basePrisma, createdBy: null });
    expect(result.created_by).toBeNull();
  });

  test('createdBy 为 undefined 时映射为 null', () => {
    const { createdBy, ...rest } = basePrisma;
    const result = mapArticleVersion(rest as any);
    expect(result.created_by).toBeNull();
  });

  test('content 为空字符串时正确映射', () => {
    const result = mapArticleVersion({ ...basePrisma, content: '' });
    expect(result.content).toBe('');
  });

  test('version 为 0 时正确映射', () => {
    const result = mapArticleVersion({ ...basePrisma, version: 0 });
    expect(result.version).toBe(0);
  });

  test('version 为大数值时正确映射', () => {
    const result = mapArticleVersion({ ...basePrisma, version: 100 });
    expect(result.version).toBe(100);
  });
});

// ============================================================
// mapPublishingPlatform
// ============================================================
describe('mapPublishingPlatform', () => {
  const basePrisma = {
    id: 1,
    rmResourceId: 100,
    name: '微信公众号',
    taxonomy: '科技',
    price: 500,
    remark: '优质号',
    includeRate: 0.8,
    publishRate: 0.9,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-01'),
  };

  test('正确映射所有字段', () => {
    const result = mapPublishingPlatform(basePrisma);
    expect(result).toEqual({
      id: 1,
      rm_resource_id: 100,
      name: '微信公众号',
      taxonomy: '科技',
      price: 500,
      remark: '优质号',
      include_rate: 0.8,
      publish_rate: 0.9,
      created_at: basePrisma.createdAt,
      updated_at: basePrisma.updatedAt,
    });
  });

  test('remark 为 null 时正确映射', () => {
    const result = mapPublishingPlatform({ ...basePrisma, remark: null });
    expect(result.remark).toBeNull();
  });

  test('price 为 0 时正确映射', () => {
    const result = mapPublishingPlatform({ ...basePrisma, price: 0 });
    expect(result.price).toBe(0);
  });

  test('includeRate 为 0 时正确映射', () => {
    const result = mapPublishingPlatform({ ...basePrisma, includeRate: 0 });
    expect(result.include_rate).toBe(0);
  });

  test('publishRate 为 0 时正确映射', () => {
    const result = mapPublishingPlatform({ ...basePrisma, publishRate: 0 });
    expect(result.publish_rate).toBe(0);
  });

  test('taxonomy 为 null 时正确映射', () => {
    const result = mapPublishingPlatform({ ...basePrisma, taxonomy: null });
    expect(result.taxonomy).toBeNull();
  });

  test('name 为空字符串时正确映射', () => {
    const result = mapPublishingPlatform({ ...basePrisma, name: '' });
    expect(result.name).toBe('');
  });

  test('rmResourceId 为 null 时正确映射', () => {
    const result = mapPublishingPlatform({ ...basePrisma, rmResourceId: null });
    expect(result.rm_resource_id).toBeNull();
  });

  test('includeRate 为 1 时正确映射', () => {
    const result = mapPublishingPlatform({ ...basePrisma, includeRate: 1 });
    expect(result.include_rate).toBe(1);
  });
});

// ============================================================
// mapKeyword
// ============================================================
describe('mapKeyword', () => {
  const basePrisma = {
    id: 1,
    baseId: 10,
    keyword: '人工智能',
    seedWord: 'AI',
    groupId: 5,
    createdBy: 3,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-05-01'),
  };

  test('正确映射所有字段', () => {
    const result = mapKeyword(basePrisma);
    expect(result).toEqual({
      id: 1,
      base_id: 10,
      keyword: '人工智能',
      seed_word: 'AI',
      group_id: 5,
      created_by: 3,
      created_at: basePrisma.createdAt,
      updated_at: basePrisma.updatedAt,
      deleted_at: null,
    });
  });

  test('seedWord 为 null 时映射为 null', () => {
    const result = mapKeyword({ ...basePrisma, seedWord: null });
    expect(result.seed_word).toBeNull();
  });

  test('seedWord 为 undefined 时映射为 null', () => {
    const { seedWord, ...rest } = basePrisma;
    const result = mapKeyword(rest);
    expect(result.seed_word).toBeNull();
  });

  test('groupId 为 null 时映射为 null', () => {
    const result = mapKeyword({ ...basePrisma, groupId: null });
    expect(result.group_id).toBeNull();
  });

  test('groupId 为 undefined 时映射为 null', () => {
    const { groupId, ...rest } = basePrisma;
    const result = mapKeyword(rest);
    expect(result.group_id).toBeNull();
  });

  test('createdBy 为 null 时映射为 null', () => {
    const result = mapKeyword({ ...basePrisma, createdBy: null });
    expect(result.created_by).toBeNull();
  });

  test('createdBy 为 undefined 时映射为 null', () => {
    const { createdBy, ...rest } = basePrisma;
    const result = mapKeyword(rest);
    expect(result.created_by).toBeNull();
  });

  test('keyword 为空字符串时正确映射', () => {
    const result = mapKeyword({ ...basePrisma, keyword: '' });
    expect(result.keyword).toBe('');
  });

  test('seedWord 为空字符串时保持为空字符串（?? 只对 null/undefined 生效）', () => {
    const result = mapKeyword({ ...basePrisma, seedWord: '' });
    expect(result.seed_word).toBe('');
  });
});

// ============================================================
// mapPortrait
// ============================================================
describe('mapPortrait', () => {
  const basePrisma = {
    id: 1,
    baseId: 10,
    title: '用户画像A',
    content: '画像内容描述',
    createdBy: 2,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-06-01'),
  };

  test('正确映射所有字段', () => {
    const result = mapPortrait(basePrisma);
    expect(result).toEqual({
      id: 1,
      base_id: 10,
      title: '用户画像A',
      content: '画像内容描述',
      created_by: 2,
      created_at: basePrisma.createdAt,
      updated_at: basePrisma.updatedAt,
      deleted_at: null,
    });
  });

  test('createdBy 为 null 时映射为 null', () => {
    const result = mapPortrait({ ...basePrisma, createdBy: null });
    expect(result.created_by).toBeNull();
  });

  test('createdBy 为 undefined 时映射为 null', () => {
    const { createdBy, ...rest } = basePrisma;
    const result = mapPortrait(rest);
    expect(result.created_by).toBeNull();
  });

  test('title 为空字符串时正确映射', () => {
    const result = mapPortrait({ ...basePrisma, title: '' });
    expect(result.title).toBe('');
  });

  test('content 为 null 时正确映射', () => {
    const result = mapPortrait({ ...basePrisma, content: null });
    expect(result.content).toBeNull();
  });

  test('content 为空字符串时正确映射', () => {
    const result = mapPortrait({ ...basePrisma, content: '' });
    expect(result.content).toBe('');
  });
});

// ============================================================
// mapKnowledgeImage
// ============================================================
describe('mapKnowledgeImage', () => {
  const basePrisma = {
    id: 1,
    baseId: 10,
    title: '示例图片',
    description: '图片描述',
    imageUrl: 'https://example.com/img.jpg',
    createdBy: 3,
    createdAt: new Date('2024-04-01'),
    updatedAt: new Date('2024-07-01'),
  };

  test('正确映射所有字段', () => {
    const result = mapKnowledgeImage(basePrisma);
    expect(result).toEqual({
      id: 1,
      base_id: 10,
      title: '示例图片',
      description: '图片描述',
      image_url: 'https://example.com/img.jpg',
      created_by: 3,
      created_at: basePrisma.createdAt,
      updated_at: basePrisma.updatedAt,
      deleted_at: null,
    });
  });

  test('createdBy 为 null 时映射为 null', () => {
    const result = mapKnowledgeImage({ ...basePrisma, createdBy: null });
    expect(result.created_by).toBeNull();
  });

  test('createdBy 为 undefined 时映射为 null', () => {
    const { createdBy, ...rest } = basePrisma;
    const result = mapKnowledgeImage(rest);
    expect(result.created_by).toBeNull();
  });

  test('description 为 null 时正确映射', () => {
    const result = mapKnowledgeImage({ ...basePrisma, description: null });
    expect(result.description).toBeNull();
  });

  test('imageUrl 为 null 时正确映射', () => {
    const result = mapKnowledgeImage({ ...basePrisma, imageUrl: null });
    expect(result.image_url).toBeNull();
  });

  test('title 为空字符串时正确映射', () => {
    const result = mapKnowledgeImage({ ...basePrisma, title: '' });
    expect(result.title).toBe('');
  });
});

// ============================================================
// mapKnowledgeDocument
// ============================================================
describe('mapKnowledgeDocument', () => {
  const basePrisma = {
    id: 1,
    baseId: 10,
    title: '测试文档',
    description: '文档描述',
    fileUrl: 'https://example.com/doc.pdf',
    fileName: 'test.pdf',
    fileType: 'application/pdf',
    fileSize: 1024,
    createdBy: 4,
    createdAt: new Date('2024-05-01'),
    updatedAt: new Date('2024-08-01'),
  };

  test('正确映射所有字段', () => {
    const result = mapKnowledgeDocument(basePrisma);
    expect(result).toEqual({
      id: 1,
      base_id: 10,
      title: '测试文档',
      description: '文档描述',
      file_url: 'https://example.com/doc.pdf',
      file_name: 'test.pdf',
      file_type: 'application/pdf',
      file_size: 1024,
      created_by: 4,
      created_at: basePrisma.createdAt,
      updated_at: basePrisma.updatedAt,
      deleted_at: null,
    });
  });

  test('createdBy 为 null 时映射为 null', () => {
    const result = mapKnowledgeDocument({ ...basePrisma, createdBy: null });
    expect(result.created_by).toBeNull();
  });

  test('createdBy 为 undefined 时映射为 null', () => {
    const { createdBy, ...rest } = basePrisma;
    const result = mapKnowledgeDocument(rest);
    expect(result.created_by).toBeNull();
  });

  test('fileSize 为 0 时正确映射', () => {
    const result = mapKnowledgeDocument({ ...basePrisma, fileSize: 0 });
    expect(result.file_size).toBe(0);
  });

  test('description 为 null 时正确映射', () => {
    const result = mapKnowledgeDocument({ ...basePrisma, description: null });
    expect(result.description).toBeNull();
  });

  test('fileType 为空字符串时正确映射', () => {
    const result = mapKnowledgeDocument({ ...basePrisma, fileType: '' });
    expect(result.file_type).toBe('');
  });

  test('fileName 为空字符串时正确映射', () => {
    const result = mapKnowledgeDocument({ ...basePrisma, fileName: '' });
    expect(result.file_name).toBe('');
  });

  test('fileUrl 为 null 时正确映射', () => {
    const result = mapKnowledgeDocument({ ...basePrisma, fileUrl: null });
    expect(result.file_url).toBeNull();
  });
});

// ============================================================
// mapMinedKeyword
// ============================================================
describe('mapMinedKeyword', () => {
  const basePrisma = {
    id: 1,
    baseId: 10,
    keyword: '深度学习',
    selected: true,
    createdBy: 5,
    createdAt: new Date('2024-06-01'),
  };

  test('正确映射所有字段', () => {
    const result = mapMinedKeyword(basePrisma);
    expect(result).toEqual({
      id: 1,
      base_id: 10,
      keyword: '深度学习',
      selected: true,
      created_by: 5,
      created_at: basePrisma.createdAt,
      deleted_at: null,
    });
  });

  test('selected 为 false 时正确映射', () => {
    const result = mapMinedKeyword({ ...basePrisma, selected: false });
    expect(result.selected).toBe(false);
  });

  test('createdBy 为 null 时映射为 null', () => {
    const result = mapMinedKeyword({ ...basePrisma, createdBy: null });
    expect(result.created_by).toBeNull();
  });

  test('createdBy 为 undefined 时映射为 null', () => {
    const { createdBy, ...rest } = basePrisma;
    const result = mapMinedKeyword(rest);
    expect(result.created_by).toBeNull();
  });

  test('keyword 为空字符串时正确映射', () => {
    const result = mapMinedKeyword({ ...basePrisma, keyword: '' });
    expect(result.keyword).toBe('');
  });
});

// ============================================================
// mapTodo
// ============================================================
describe('mapTodo', () => {
  const dueDate = new Date('2024-12-31T10:00:00Z');
  const basePrisma = {
    id: 1,
    title: '完成文章审核',
    companyId: 10,
    company: { shortName: 'TestCo' },
    projectId: 20,
    project: { shortName: 'ProjA' },
    objectType: 'article',
    objectId: 100,
    action: 'review',
    source: 'system',
    priority: 'high',
    assigneeId: 5,
    assignee: { cnName: '审核员' },
    status: 'pending',
    createdById: 3,
    createdBy: { cnName: '创建者' },
    dueAt: dueDate,
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-06-15'),
  };

  test('正确映射所有字段', () => {
    const result = mapTodo(basePrisma);
    expect(result).toEqual({
      id: 1,
      title: '完成文章审核',
      company_id: 10,
      company_name: 'TestCo',
      project_id: 20,
      project_name: 'ProjA',
      object_type: 'article',
      object_id: 100,
      action: 'review',
      source: 'system',
      priority: 'high',
      assignee_id: 5,
      assignee_name: '审核员',
      status: 'pending',
      created_by_id: 3,
      created_by_name: '创建者',
      due_at: dueDate.toISOString(),
      created_at: basePrisma.createdAt,
      updated_at: basePrisma.updatedAt,
    });
  });

  test('projectId 为 null 时映射为 null', () => {
    const result = mapTodo({ ...basePrisma, projectId: null });
    expect(result.project_id).toBeNull();
  });

  test('projectId 为 undefined 时映射为 null', () => {
    const { projectId, ...rest } = basePrisma;
    const result = mapTodo({ ...rest, project: null });
    expect(result.project_id).toBeNull();
  });

  test('project 为 null 时 project_name 为 null', () => {
    const result = mapTodo({ ...basePrisma, project: null });
    expect(result.project_name).toBeNull();
  });

  test('project 存在但 shortName 为空字符串时 project_name 为 null', () => {
    const result = mapTodo({ ...basePrisma, project: { shortName: '' } });
    expect(result.project_name).toBeNull();
  });

  test('objectId 为 null 时映射为 null', () => {
    const result = mapTodo({ ...basePrisma, objectId: null });
    expect(result.object_id).toBeNull();
  });

  test('objectId 为 undefined 时映射为 null', () => {
    const { objectId, ...rest } = basePrisma;
    const result = mapTodo(rest);
    expect(result.object_id).toBeNull();
  });

  test('company 为 null 时 company_name 为空字符串', () => {
    const result = mapTodo({ ...basePrisma, company: null });
    expect(result.company_name).toBe('');
  });

  test('company 存在但 shortName 为空字符串时 company_name 为空字符串', () => {
    const result = mapTodo({ ...basePrisma, company: { shortName: '' } });
    expect(result.company_name).toBe('');
  });

  test('assignee 为 null 时 assignee_name 为空字符串', () => {
    const result = mapTodo({ ...basePrisma, assignee: null });
    expect(result.assignee_name).toBe('');
  });

  test('assignee 存在但 cnName 为空字符串时 assignee_name 为空字符串', () => {
    const result = mapTodo({ ...basePrisma, assignee: { cnName: '' } });
    expect(result.assignee_name).toBe('');
  });

  test('createdBy 为 null 时 created_by_name 为空字符串', () => {
    const result = mapTodo({ ...basePrisma, createdBy: null });
    expect(result.created_by_name).toBe('');
  });

  test('createdBy 存在但 cnName 为空字符串时 created_by_name 为空字符串', () => {
    const result = mapTodo({ ...basePrisma, createdBy: { cnName: '' } });
    expect(result.created_by_name).toBe('');
  });

  test('dueAt 为 null 时映射为 null', () => {
    const result = mapTodo({ ...basePrisma, dueAt: null });
    expect(result.due_at).toBeNull();
  });

  test('dueAt 为 undefined 时映射为 null', () => {
    const { dueAt, ...rest } = basePrisma;
    const result = mapTodo(rest);
    expect(result.due_at).toBeNull();
  });

  test('dueAt 存在时转换为 ISO 字符串', () => {
    const result = mapTodo(basePrisma);
    expect(result.due_at).toBe(dueDate.toISOString());
  });

  test('status 为不同值时正确映射', () => {
    const result = mapTodo({ ...basePrisma, status: 'completed' });
    expect(result.status).toBe('completed');
  });

  test('priority 为不同值时正确映射', () => {
    const result = mapTodo({ ...basePrisma, priority: 'low' });
    expect(result.priority).toBe('low');
  });

  test('title 为空字符串时正确映射', () => {
    const result = mapTodo({ ...basePrisma, title: '' });
    expect(result.title).toBe('');
  });

  test('dueAt.toISOString() 返回正确的格式', () => {
    const result = mapTodo(basePrisma);
    // 验证 ISO 字符串格式
    expect(result.due_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});

// ============================================================
// mapTodoLog
// ============================================================
describe('mapTodoLog', () => {
  const basePrisma = {
    id: 1,
    todoId: 10,
    operatorId: 5,
    operator: { cnName: '操作员' },
    action: 'status_change',
    objectType: 'todo',
    objectId: 10,
    remark: '状态已更新',
    createdAt: new Date('2024-06-10'),
  };

  test('正确映射所有字段', () => {
    const result = mapTodoLog(basePrisma);
    expect(result).toEqual({
      id: 1,
      todo_id: 10,
      operator_id: 5,
      operator_name: '操作员',
      action: 'status_change',
      object_type: 'todo',
      object_id: 10,
      remark: '状态已更新',
      created_at: basePrisma.createdAt,
    });
  });

  test('objectType 为 null 时映射为 null', () => {
    const result = mapTodoLog({ ...basePrisma, objectType: null });
    expect(result.object_type).toBeNull();
  });

  test('objectType 为 undefined 时映射为 null', () => {
    const { objectType, ...rest } = basePrisma;
    const result = mapTodoLog(rest);
    expect(result.object_type).toBeNull();
  });

  test('objectId 为 null 时映射为 null', () => {
    const result = mapTodoLog({ ...basePrisma, objectId: null });
    expect(result.object_id).toBeNull();
  });

  test('objectId 为 undefined 时映射为 null', () => {
    const { objectId, ...rest } = basePrisma;
    const result = mapTodoLog(rest);
    expect(result.object_id).toBeNull();
  });

  test('remark 为 null 时映射为 null', () => {
    const result = mapTodoLog({ ...basePrisma, remark: null });
    expect(result.remark).toBeNull();
  });

  test('remark 为 undefined 时映射为 null', () => {
    const { remark, ...rest } = basePrisma;
    const result = mapTodoLog(rest);
    expect(result.remark).toBeNull();
  });

  test('operator 为 null 时 operator_name 为空字符串', () => {
    const result = mapTodoLog({ ...basePrisma, operator: null });
    expect(result.operator_name).toBe('');
  });

  test('operator 存在但 cnName 为空字符串时 operator_name 为空字符串', () => {
    const result = mapTodoLog({ ...basePrisma, operator: { cnName: '' } });
    expect(result.operator_name).toBe('');
  });

  test('action 为不同值时正确映射', () => {
    const result = mapTodoLog({ ...basePrisma, action: 'create' });
    expect(result.action).toBe('create');
  });

  test('remark 为空字符串时保持为空字符串（?? 只对 null/undefined 生效）', () => {
    const result = mapTodoLog({ ...basePrisma, remark: '' });
    expect(result.remark).toBe('');
  });

  test('operatorId 为 0 时正确映射', () => {
    const result = mapTodoLog({ ...basePrisma, operatorId: 0 });
    expect(result.operator_id).toBe(0);
  });
});

// ============================================================
// 增强测试：schedule_count 边界（mapArticle 新增字段）
// ============================================================
describe('mapArticle - schedule_count 边界', () => {
  const base = {
    id: 1,
    projectId: 10,
    title: 'T',
    articleType: null,
    writeMode: null,
    keywords: null,
    portrait: null,
    images: null,
    skills: null,
    llmModelId: null,
    content: '',
    version: 0,
    status: 'draft',
    createdBy: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  test('_count.schedules 有值时 schedule_count 正确映射', () => {
    const result = mapArticle({ ...base, _count: { schedules: 5 } });
    expect(result.schedule_count).toBe(5);
  });

  test('_count.schedules 为 0 时 schedule_count 为 0', () => {
    const result = mapArticle({ ...base, _count: { schedules: 0 } });
    expect(result.schedule_count).toBe(0);
  });

  test('_count 不存在时 schedule_count 默认为 0', () => {
    const result = mapArticle(base);
    expect(result.schedule_count).toBe(0);
  });

  test('_count.schedules 不存在时 schedule_count 默认为 0', () => {
    const result = mapArticle({ ...base, _count: {} });
    expect(result.schedule_count).toBe(0);
  });
});

// ============================================================
// 增强测试：apiKey 脱敏边界值
// ============================================================
describe('mapLlmModel - apiKey 脱敏边界', () => {
  const base = {
    id: 1,
    provider: 'OpenAI',
    baseUrl: 'https://api.openai.com',
    apiKey: 'sk-test-key-value-here',
    modelName: 'gpt-4',
    status: true,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-08-01'),
  };

  test('apiKey 恰好 8 字符：前4+****+后4 无重叠', () => {
    const result = mapLlmModel({ ...base, apiKey: '12345678' });
    expect(result.api_key).toBe('1234****5678');
  });

  test('apiKey 为 1 字符时：slice(0,4) 和 slice(-4) 都返回同一字符', () => {
    const result = mapLlmModel({ ...base, apiKey: 'a' });
    expect(result.api_key).toBe('a****a');
  });

  test('apiKey 为 4 字符时：slice(0,4)=全串，slice(-4)=全串', () => {
    const result = mapLlmModel({ ...base, apiKey: 'abcd' });
    expect(result.api_key).toBe('abcd****abcd');
  });

  test('apiKey 为 5 字符时', () => {
    const result = mapLlmModel({ ...base, apiKey: 'abcde' });
    expect(result.api_key).toBe('abcd****bcde');
  });

  test('apiKey 为 7 字符时', () => {
    const result = mapLlmModel({ ...base, apiKey: 'abcdefg' });
    expect(result.api_key).toBe('abcd****defg');
  });
});

// ============================================================
// 增强测试：不可变性（输入对象不被修改）
// ============================================================
describe('不可变性测试', () => {
  test('mapCompany 不修改输入对象', () => {
    const input = {
      id: 1,
      shortName: 'Co',
      fullName: 'Company',
      address: 'Addr',
      contactPerson: 'Alice',
      contactPhone: '123',
      status: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      deletedAt: null,
    };
    const snapshot = { ...input };
    mapCompany(input);
    expect(input).toEqual(snapshot);
  });

  test('mapUser 不修改输入对象', () => {
    const input = {
      id: 1,
      username: 'u',
      cnName: 'n',
      role: 'admin' as const,
      status: true,
      companyId: 10,
      company: { shortName: 'Co' },
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };
    const snapshot = { ...input };
    mapUser(input);
    expect(input).toEqual(snapshot);
  });

  test('mapProject 不修改输入的 operators/viewers 数组', () => {
    const ops = [{ userId: 1, user: { id: 1, cnName: 'A' } }];
    const input = {
      id: 1,
      shortName: 'P',
      fullName: 'P',
      description: '',
      companyId: 10,
      company: { shortName: 'C' },
      operators: ops,
      viewers: [],
      status: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };
    const opsSnapshot = [...ops];
    mapProject(input);
    expect(input.operators).toEqual(opsSnapshot);
  });

  test('mapTodo 不修改输入的 dueAt Date 对象', () => {
    const dueAt = new Date('2024-12-31T00:00:00Z');
    const input = {
      id: 1, title: 'T', companyId: 10, company: { shortName: 'C' },
      projectId: null, project: null, objectType: 'article', objectId: null,
      action: 'review', source: 'system', priority: 'high',
      assigneeId: 5, assignee: { cnName: 'A' }, status: 'pending',
      createdById: 3, createdBy: { cnName: 'B' },
      dueAt,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };
    const originalTime = dueAt.getTime();
    mapTodo(input);
    expect(dueAt.getTime()).toBe(originalTime);
  });
});

// ============================================================
// 增强测试：Object.freeze 输入兼容
// ============================================================
describe('Object.freeze 输入兼容', () => {
  test('mapCompany 冻结输入后仍能正常映射', () => {
    const input = Object.freeze({
      id: 1,
      shortName: 'Co',
      fullName: 'Company',
      address: null,
      contactPerson: null,
      contactPhone: null,
      status: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      deletedAt: null,
    });
    const result = mapCompany(input);
    expect(result.id).toBe(1);
    expect(result.short_name).toBe('Co');
  });

  test('mapSkills 冻结输入后仍能正常映射', () => {
    const input = Object.freeze({
      id: 1, name: 'S', description: null, skillDir: null,
      createdBy: null, creator: null,
      createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
    });
    const result = mapSkills(input);
    expect(result.id).toBe(1);
    expect(result.creator_name).toBeNull();
  });

  test('mapTodo 冻结输入后仍能正常映射', () => {
    const input = Object.freeze({
      id: 1, title: 'T', companyId: 10, company: { shortName: 'C' },
      projectId: null, project: null, objectType: 'article', objectId: null,
      action: 'review', source: 'system', priority: 'high',
      assigneeId: 5, assignee: { cnName: 'A' }, status: 'pending',
      createdById: 3, createdBy: { cnName: 'B' },
      dueAt: null,
      createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
    });
    const result = mapTodo(input);
    expect(result.id).toBe(1);
    expect(result.due_at).toBeNull();
  });
});

// ============================================================
// 增强测试：属性数量验证（防止多余或遗漏字段）
// ============================================================
describe('属性数量验证', () => {
  test('mapCompany 返回恰好 12 个属性', () => {
    const result = mapCompany({
      id: 1, shortName: 'S', fullName: 'F', address: null,
      contactPerson: null, contactPhone: null, status: true,
      createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
    });
    expect(Object.keys(result)).toHaveLength(12);
  });

  test('mapSkills 返回恰好 8 个属性', () => {
    const result = mapSkills({
      id: 1, name: 'N', description: null, skillDir: null,
      createdBy: null, creator: null,
      createdAt: new Date(), updatedAt: new Date(),
    });
    expect(Object.keys(result)).toHaveLength(8);
  });

  test('mapUser 返回恰好 9 个属性', () => {
    const result = mapUser({
      id: 1, username: 'u', cnName: 'n', role: 'admin', status: true,
      companyId: null, company: null,
      createdAt: new Date(), updatedAt: new Date(),
    });
    expect(Object.keys(result)).toHaveLength(9);
  });

  test('mapLlmModel 返回恰好 8 个属性', () => {
    const result = mapLlmModel({
      id: 1, provider: 'P', baseUrl: null, apiKey: null,
      modelName: 'M', status: true,
      createdAt: new Date(), updatedAt: new Date(),
    });
    expect(Object.keys(result)).toHaveLength(8);
  });

  test('mapSystemConfig 返回恰好 5 个属性', () => {
    const result = mapSystemConfig({
      id: 1, configKey: 'K', configValue: 'V',
      createdAt: new Date(), updatedAt: new Date(),
    });
    expect(Object.keys(result)).toHaveLength(5);
  });

  test('mapProject 返回恰好 13 个属性', () => {
    const result = mapProject({
      id: 1, shortName: 'S', fullName: 'F', description: null,
      companyId: 10, company: { shortName: 'C' },
      operators: [], viewers: [], status: true,
      createdAt: new Date(), updatedAt: new Date(),
    });
    expect(Object.keys(result)).toHaveLength(13);
  });

  test('mapArticle 返回恰好 19 个属性', () => {
    const result = mapArticle({
      id: 1, projectId: 10, title: 'T', articleType: null,
      writeMode: null, keywords: null, portrait: null,
      images: null, skills: null,
      llmModelId: null, content: '', version: 0, status: 'draft',
      createdBy: null,
      createdAt: new Date(), updatedAt: new Date(),
      deletedAt: null, creator: null, _count: { schedules: 0 },
    });
    expect(Object.keys(result)).toHaveLength(19);
  });

  test('mapArticleVersion 返回恰好 7 个属性', () => {
    const result = mapArticleVersion({
      id: 1, articleId: 10, version: 1, content: '',
      createdBy: null, createdAt: new Date(), deletedAt: null,
    });
    expect(Object.keys(result)).toHaveLength(7);
  });

  test('mapPublishingPlatform 返回恰好 10 个属性', () => {
    const result = mapPublishingPlatform({
      id: 1, rmResourceId: null, name: 'N', taxonomy: null,
      price: 0, remark: null, includeRate: 0, publishRate: 0,
      createdAt: new Date(), updatedAt: new Date(),
    });
    expect(Object.keys(result)).toHaveLength(10);
  });

  test('mapKeyword 返回恰好 9 个属性', () => {
    const result = mapKeyword({
      id: 1, baseId: 10, keyword: 'K', seedWord: null,
      groupId: null, createdBy: null,
      createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
    });
    expect(Object.keys(result)).toHaveLength(9);
  });

  test('mapPortrait 返回恰好 8 个属性', () => {
    const result = mapPortrait({
      id: 1, baseId: 10, title: 'T', content: null,
      createdBy: null, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
    });
    expect(Object.keys(result)).toHaveLength(8);
  });

  test('mapKnowledgeImage 返回恰好 9 个属性', () => {
    const result = mapKnowledgeImage({
      id: 1, baseId: 10, title: 'T', description: null,
      imageUrl: null, createdBy: null,
      createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
    });
    expect(Object.keys(result)).toHaveLength(9);
  });

  test('mapKnowledgeDocument 返回恰好 12 个属性', () => {
    const result = mapKnowledgeDocument({
      id: 1, baseId: 10, title: 'T', description: null,
      fileUrl: null, fileName: null, fileType: null, fileSize: 0,
      createdBy: null, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
    });
    expect(Object.keys(result)).toHaveLength(12);
  });

  test('mapMinedKeyword 返回恰好 7 个属性', () => {
    const result = mapMinedKeyword({
      id: 1, baseId: 10, keyword: 'K', selected: false,
      createdBy: null, createdAt: new Date(), deletedAt: null,
    });
    expect(Object.keys(result)).toHaveLength(7);
  });

  test('mapTodo 返回恰好 19 个属性', () => {
    const result = mapTodo({
      id: 1, title: 'T', companyId: 10, company: { shortName: 'C' },
      projectId: null, project: null, objectType: 'article', objectId: null,
      action: 'review', source: 'system', priority: 'high',
      assigneeId: 5, assignee: { cnName: 'A' }, status: 'pending',
      createdById: 3, createdBy: { cnName: 'B' }, dueAt: null,
      createdAt: new Date(), updatedAt: new Date(),
    });
    expect(Object.keys(result)).toHaveLength(19);
  });

  test('mapTodoLog 返回恰好 9 个属性', () => {
    const result = mapTodoLog({
      id: 1, todoId: 10, operatorId: 5, operator: { cnName: 'O' },
      action: 'create', objectType: null, objectId: null,
      remark: null, createdAt: new Date(),
    });
    expect(Object.keys(result)).toHaveLength(9);
  });
});

// ============================================================
// 增强测试：JSON 序列化安全
// ============================================================
describe('JSON 序列化安全', () => {
  test('mapCompany 结果可 JSON.stringify/parse 往返', () => {
    const date = new Date('2024-06-15T08:30:00Z');
    const result = mapCompany({
      id: 1, shortName: 'Co', fullName: 'Company', address: 'Addr',
      contactPerson: 'P', contactPhone: '123', status: true,
      createdAt: date, updatedAt: date, deletedAt: null,
    });
    const json = JSON.stringify(result);
    const parsed = JSON.parse(json);
    expect(parsed.id).toBe(1);
    expect(parsed.short_name).toBe('Co');
    expect(parsed.deleted_at).toBeNull();
  });

  test('mapLlmModel 脱敏后 apiKey 可安全序列化', () => {
    const result = mapLlmModel({
      id: 1, provider: 'P', baseUrl: 'https://api.test.com',
      apiKey: 'sk-secret-key-12345',
      modelName: 'm', status: true,
      createdAt: new Date(), updatedAt: new Date(),
    });
    const json = JSON.stringify(result);
    expect(json).not.toContain('sk-secret-key-12345');
    expect(json).toContain('sk-s****2345');
  });

  test('mapTodo 结果可 JSON.stringify/parse 往返', () => {
    const dueAt = new Date('2024-12-31T10:00:00Z');
    const result = mapTodo({
      id: 1, title: 'T', companyId: 10, company: { shortName: 'C' },
      projectId: null, project: null, objectType: 'article', objectId: null,
      action: 'review', source: 'system', priority: 'high',
      assigneeId: 5, assignee: { cnName: 'A' }, status: 'pending',
      createdById: 3, createdBy: { cnName: 'B' }, dueAt,
      createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
    });
    const json = JSON.stringify(result);
    const parsed = JSON.parse(json);
    expect(parsed.due_at).toBe(dueAt.toISOString());
    expect(parsed.company_name).toBe('C');
  });

  test('mapArticle 含数组和 null 字段可安全序列化', () => {
    const result = mapArticle({
      id: 1, projectId: 10, title: 'T', articleType: 'seo',
      writeMode: 'auto', keywords: 'k1,k2', portrait: 'p',
      images: ['a.jpg'],
      skills: [1, 2], llmModelId: 3, content: 'c', version: 1,
      status: 'draft',
      createdBy: 1,
      createdAt: new Date(), updatedAt: new Date(),
      deletedAt: null, creator: null, _count: { schedules: 0 },
    });
    const json = JSON.stringify(result);
    const parsed = JSON.parse(json);
    expect(parsed.images).toEqual(['a.jpg']);
    expect(parsed.skills).toEqual([1, 2]);
    expect(parsed.schedule_count).toBe(0);
  });
});

// ============================================================
// 增强测试：深拷贝独立性
// ============================================================
describe('深拷贝独立性', () => {
  test('mapArticle 返回的 images 数组不影响后续调用', () => {
    const input = {
      id: 1, projectId: 10, title: 'T', articleType: null,
      writeMode: null, keywords: null, portrait: null,
      images: ['a.jpg', 'b.jpg'], skills: null,
      llmModelId: null, content: '', version: 0, status: 'draft',
      createdBy: null,
      createdAt: new Date(), updatedAt: new Date(),
      deletedAt: null, creator: null, _count: { schedules: 0 },
    };
    const result1 = mapArticle(input);
    const result2 = mapArticle({ ...input, images: ['c.jpg'] });
    expect(result1.images).toEqual(['a.jpg', 'b.jpg']);
    expect(result2.images).toEqual(['c.jpg']);
  });

  test('mapProject 返回的 operator_ids 不影响后续调用', () => {
    const input = {
      id: 1, shortName: 'P', fullName: 'P', description: '',
      companyId: 10, company: { shortName: 'C' },
      operators: [{ userId: 1, user: { id: 1, cnName: 'A' } }],
      viewers: [],
      status: true,
      createdAt: new Date(), updatedAt: new Date(),
    };
    const result1 = mapProject(input);
    const result2 = mapProject({
      ...input,
      operators: [{ userId: 2, user: { id: 2, cnName: 'B' } }],
    });
    expect(result1.operator_ids).toEqual([1]);
    expect(result2.operator_ids).toEqual([2]);
  });
});

// ============================================================
// 增强测试：mapTodo dueAt 边界
// ============================================================
describe('mapTodo - dueAt 边界', () => {
  const makeInput = (dueAt: any) => ({
    id: 1, title: 'T', companyId: 10, company: { shortName: 'C' },
    projectId: null, project: null, objectType: 'article', objectId: null,
    action: 'review', source: 'system', priority: 'high',
    assigneeId: 5, assignee: { cnName: 'A' }, status: 'pending',
    createdById: 3, createdBy: { cnName: 'B' }, dueAt,
    createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
  });

  test('dueAt 为 1970-01-01 时正确转换', () => {
    const epoch = new Date('1970-01-01T00:00:00Z');
    const result = mapTodo(makeInput(epoch));
    expect(result.due_at).toBe('1970-01-01T00:00:00.000Z');
  });

  test('dueAt 为远未来日期时正确转换', () => {
    const far = new Date('2099-12-31T23:59:59Z');
    const result = mapTodo(makeInput(far));
    expect(result.due_at).toBe('2099-12-31T23:59:59.000Z');
  });

  test('dueAt 含毫秒时保留毫秒精度', () => {
    const ms = new Date('2024-06-15T10:30:45.123Z');
    const result = mapTodo(makeInput(ms));
    expect(result.due_at).toBe('2024-06-15T10:30:45.123Z');
  });
});

// ============================================================
// 增强测试：mapProject null operators/viewers
// ============================================================
describe('mapProject - null operators/viewers', () => {
  const base = {
    id: 1, shortName: 'P', fullName: 'P', description: '',
    companyId: 10, company: { shortName: 'C' },
    status: true,
    createdAt: new Date(), updatedAt: new Date(),
  };

  test('operators 为 null 时默认为空数组', () => {
    const result = mapProject({ ...base, operators: null as any, viewers: [] });
    expect(result.operator_ids).toEqual([]);
    expect(result.operator_names).toEqual([]);
  });

  test('viewers 为 null 时默认为空数组', () => {
    const result = mapProject({ ...base, operators: [], viewers: null as any });
    expect(result.viewer_ids).toEqual([]);
    expect(result.viewer_names).toEqual([]);
  });

  test('operators/viewers 同时为 null 时默认为空数组', () => {
    const result = mapProject({ ...base, operators: null as any, viewers: null as any });
    expect(result.operator_ids).toEqual([]);
    expect(result.operator_names).toEqual([]);
    expect(result.viewer_ids).toEqual([]);
    expect(result.viewer_names).toEqual([]);
  });
});

// ============================================================
// 增强测试：连续映射幂等性
// ============================================================
describe('连续映射幂等性', () => {
  test('mapCompany 对同一输入多次调用结果一致', () => {
    const input = {
      id: 1, shortName: 'Co', fullName: 'Full', address: 'A',
      contactPerson: 'P', contactPhone: '123', status: true,
      createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
      deletedAt: null,
    };
    const r1 = mapCompany(input);
    const r2 = mapCompany(input);
    expect(r1).toEqual(r2);
  });

  test('mapLlmModel 对同一输入多次调用脱敏结果一致', () => {
    const input = {
      id: 1, provider: 'P', baseUrl: 'url',
      apiKey: 'sk-abc-def-ghi',
      modelName: 'm', status: true,
      createdAt: new Date(), updatedAt: new Date(),
    };
    const r1 = mapLlmModel(input);
    const r2 = mapLlmModel(input);
    expect(r1.api_key).toBe(r2.api_key);
    expect(r1.api_key).toBe('sk-a****-ghi');
  });

  test('mapTodo 对同一输入多次调用 due_at 一致', () => {
    const input = {
      id: 1, title: 'T', companyId: 10, company: { shortName: 'C' },
      projectId: null, project: null, objectType: 'article', objectId: null,
      action: 'review', source: 'system', priority: 'high',
      assigneeId: 5, assignee: { cnName: 'A' }, status: 'pending',
      createdById: 3, createdBy: { cnName: 'B' },
      dueAt: new Date('2024-12-31T10:00:00Z'),
      createdAt: new Date(), updatedAt: new Date(),
    };
    const r1 = mapTodo(input);
    const r2 = mapTodo(input);
    expect(r1.due_at).toBe(r2.due_at);
  });
});

// ============================================================
// 增强测试：原型链安全
// ============================================================
describe('原型链安全', () => {
  test('mapUser 返回纯对象（无原型污染）', () => {
    const input = {
      id: 1, username: 'u', cnName: 'n', role: 'admin' as const,
      status: true, companyId: null, company: null,
      createdAt: new Date(), updatedAt: new Date(),
    };
    const result = mapUser(input);
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect('toString' in result).toBe(true);
    expect(result.hasOwnProperty('toString')).toBe(false);
  });

  test('mapProject 返回纯对象', () => {
    const result = mapProject({
      id: 1, shortName: 'P', fullName: 'P', description: '',
      companyId: 10, company: { shortName: 'C' },
      operators: [], viewers: [], status: true,
      createdAt: new Date(), updatedAt: new Date(),
    });
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
  });
});

// ============================================================
// 增强测试：解构模式
// ============================================================
describe('解构模式', () => {
  test('mapCompany 返回值可安全解构', () => {
    const result = mapCompany({
      id: 1, shortName: 'Co', fullName: 'Full', address: 'A',
      contactPerson: 'P', contactPhone: '123', status: true,
      createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
    });
    const { id, short_name, full_name } = result;
    expect(id).toBe(1);
    expect(short_name).toBe('Co');
    expect(full_name).toBe('Full');
  });

  test('mapUser 返回值可安全解构并传递', () => {
    const result = mapUser({
      id: 1, username: 'u', cnName: '名', role: 'admin' as const,
      status: true, companyId: 10, company: { shortName: 'C' },
      createdAt: new Date(), updatedAt: new Date(),
    });
    const { cn_name, company_name, ...rest } = result;
    expect(cn_name).toBe('名');
    expect(company_name).toBe('C');
    expect(rest.id).toBe(1);
    expect(Object.keys(rest)).toHaveLength(7);
  });

  test('mapArticle 返回值可用 Object.entries 遍历', () => {
    const result = mapArticle({
      id: 1, projectId: 10, title: 'T', articleType: null,
      writeMode: null, keywords: null, portrait: null,
      images: null, skills: null,
      llmModelId: null, content: '', version: 0, status: 'draft',
      createdBy: null,
      createdAt: new Date(), updatedAt: new Date(),
      deletedAt: null, creator: null, _count: { schedules: 0 },
    });
    const entries = Object.entries(result);
    expect(entries.length).toBe(19);
    const titleEntry = entries.find(([k]) => k === 'title');
    expect(titleEntry).toEqual(['title', 'T']);
  });
});

// ============================================================
// 增强测试：集合操作（Set/Map）
// ============================================================
describe('集合操作', () => {
  test('mapCompany 多个结果可放入 Set 去重', () => {
    const input = {
      id: 1, shortName: 'Co', fullName: 'Full', address: 'A',
      contactPerson: 'P', contactPhone: '123', status: true,
      createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
    };
    const r1 = mapCompany(input);
    const r2 = mapCompany(input);
    const set = new Set([r1, r2]);
    expect(set.size).toBe(2);
  });

  test('mapUser 结果数组可用 find/filter', () => {
    const results = [
      mapUser({ id: 1, username: 'a', cnName: 'A', role: 'admin' as const, status: true, companyId: null, company: null, createdAt: new Date(), updatedAt: new Date() }),
      mapUser({ id: 2, username: 'b', cnName: 'B', role: 'view' as const, status: true, companyId: 10, company: { shortName: 'C' }, createdAt: new Date(), updatedAt: new Date() }),
    ];
    const admins = results.filter(u => u.role === 'admin');
    expect(admins).toHaveLength(1);
    expect(admins[0].cn_name).toBe('A');
    const found = results.find(u => u.id === 2);
    expect(found?.company_name).toBe('C');
  });
});

// ============================================================
// 增强测试：属性描述符
// ============================================================
describe('属性描述符', () => {
  test('mapCompany 返回对象所有属性可写、可枚举、可配置', () => {
    const result = mapCompany({
      id: 1, shortName: 'Co', fullName: 'Full', address: 'A',
      contactPerson: 'P', contactPhone: '123', status: true,
      createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
    });
    for (const key of Object.keys(result)) {
      const desc = Object.getOwnPropertyDescriptor(result, key);
      expect(desc!.writable).toBe(true);
      expect(desc!.enumerable).toBe(true);
      expect(desc!.configurable).toBe(true);
    }
  });

  test('mapSkills 返回对象所有属性可写、可枚举、可配置', () => {
    const result = mapSkills({
      id: 1, name: 'N', description: null, skillDir: null,
      createdBy: null, creator: null,
      createdAt: new Date(), updatedAt: new Date(),
    });
    for (const key of Object.keys(result)) {
      const desc = Object.getOwnPropertyDescriptor(result, key);
      expect(desc!.writable).toBe(true);
      expect(desc!.enumerable).toBe(true);
      expect(desc!.configurable).toBe(true);
    }
  });
});

// ============================================================
// 增强测试：函数参数传递
// ============================================================
describe('函数参数传递', () => {
  test('所有 map 函数可作为高阶函数参数', () => {
    const prismaCompanies = [
      { id: 1, shortName: 'A', fullName: 'AA', address: null, contactPerson: null, contactPhone: null, status: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
      { id: 2, shortName: 'B', fullName: 'BB', address: null, contactPerson: null, contactPhone: null, status: false, createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
    ];
    const results = prismaCompanies.map(mapCompany);
    expect(results).toHaveLength(2);
    expect(results[0].short_name).toBe('A');
    expect(results[1].short_name).toBe('B');
  });

  test('mapMinedKeyword 可用于 filter + map 链', () => {
    const prismaItems = [
      { id: 1, baseId: 10, keyword: 'A', selected: true, createdBy: null, createdAt: new Date() },
      { id: 2, baseId: 10, keyword: 'B', selected: false, createdBy: null, createdAt: new Date() },
      { id: 3, baseId: 10, keyword: 'C', selected: true, createdBy: null, createdAt: new Date() },
    ];
    const selected = prismaItems.filter(i => i.selected).map(mapMinedKeyword);
    expect(selected).toHaveLength(2);
    expect(selected.map(s => s.keyword)).toEqual(['A', 'C']);
  });

  test('mapKeyword 可用于 reduce 聚合', () => {
    const prismaKeywords = [
      { id: 1, baseId: 10, keyword: 'A', seedWord: null, groupId: 1, createdBy: null, createdAt: new Date(), updatedAt: new Date() },
      { id: 2, baseId: 10, keyword: 'B', seedWord: null, groupId: 1, createdBy: null, createdAt: new Date(), updatedAt: new Date() },
      { id: 3, baseId: 10, keyword: 'C', seedWord: null, groupId: 2, createdBy: null, createdAt: new Date(), updatedAt: new Date() },
    ];
    const grouped = prismaKeywords.map(mapKeyword).reduce((acc, kw) => {
      const gid = kw.group_id ?? 'null';
      if (!acc[gid]) acc[gid] = [];
      acc[gid].push(kw.keyword);
      return acc;
    }, {} as Record<string, string[]>);
    expect(Object.keys(grouped)).toHaveLength(2);
    expect(grouped[1]).toEqual(['A', 'B']);
    expect(grouped[2]).toEqual(['C']);
  });
});

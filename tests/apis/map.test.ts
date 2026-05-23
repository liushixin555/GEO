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
      created_at: basePrisma.createdAt,
      updated_at: basePrisma.updatedAt,
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
});

// ============================================================
// mapSkills
// ============================================================
describe('mapSkills', () => {
  const basePrisma = {
    id: 10,
    name: 'SEO写作',
    description: 'SEO文章写作技能',
    skillDir: '/skills/seo',
    createdBy: 5,
    creator: { cnName: '张三' },
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-07-01'),
  };

  test('正确映射所有字段（含 creator 关联）', () => {
    const result = mapSkills(basePrisma);
    expect(result).toEqual({
      id: 10,
      name: 'SEO写作',
      description: 'SEO文章写作技能',
      skill_dir: '/skills/seo',
      created_by: 5,
      creator_name: '张三',
      created_at: basePrisma.createdAt,
      updated_at: basePrisma.updatedAt,
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
});

// ============================================================
// mapLlmModel
// ============================================================
describe('mapLlmModel', () => {
  const basePrisma = {
    id: 1,
    provider: 'OpenAI',
    baseUrl: 'https://api.openai.com',
    apiKey: 'sk-test-key',
    modelName: 'gpt-4',
    status: true,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-08-01'),
  };

  test('正确映射所有字段', () => {
    const result = mapLlmModel(basePrisma);
    expect(result).toEqual({
      id: 1,
      provider: 'OpenAI',
      base_url: 'https://api.openai.com',
      api_key: 'sk-test-key',
      model_name: 'gpt-4',
      status: true,
      created_at: basePrisma.createdAt,
      updated_at: basePrisma.updatedAt,
    });
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
    platforms: ['wechat', 'toutiao'],
    skills: 5,
    llmModelId: 3,
    content: 'Article content here',
    version: 2,
    status: 'draft',
    scheduledPublishAt: new Date('2024-12-01'),
    createdBy: 1,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-07-01'),
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
      platforms: ['wechat', 'toutiao'],
      skills: 5,
      llm_model_id: 3,
      content: 'Article content here',
      version: 2,
      status: 'draft',
      scheduled_publish_at: new Date('2024-12-01'),
      created_by: 1,
      created_at: basePrisma.createdAt,
      updated_at: basePrisma.updatedAt,
    });
  });

  test('articleType 为 null 时正确映射', () => {
    const result = mapArticle({ ...basePrisma, articleType: null });
    expect(result.article_type).toBeNull();
  });

  test('articleType 为 undefined 时映射为 null', () => {
    const { articleType, ...rest } = basePrisma;
    const result = mapArticle(rest);
    expect(result.article_type).toBeNull();
  });

  test('writeMode 为 null 时正确映射', () => {
    const result = mapArticle({ ...basePrisma, writeMode: null });
    expect(result.write_mode).toBeNull();
  });

  test('llmModelId 为 null 时映射为 null', () => {
    const result = mapArticle({ ...basePrisma, llmModelId: null });
    expect(result.llm_model_id).toBeNull();
  });

  test('llmModelId 为 undefined 时映射为 null', () => {
    const { llmModelId, ...rest } = basePrisma;
    const result = mapArticle(rest);
    expect(result.llm_model_id).toBeNull();
  });

  test('scheduledPublishAt 为 null 时映射为 null', () => {
    const result = mapArticle({ ...basePrisma, scheduledPublishAt: null });
    expect(result.scheduled_publish_at).toBeNull();
  });

  test('scheduledPublishAt 为 undefined 时映射为 null', () => {
    const { scheduledPublishAt, ...rest } = basePrisma;
    const result = mapArticle(rest);
    expect(result.scheduled_publish_at).toBeNull();
  });

  test('createdBy 为 null 时映射为 null', () => {
    const result = mapArticle({ ...basePrisma, createdBy: null });
    expect(result.created_by).toBeNull();
  });

  test('createdBy 为 undefined 时映射为 null', () => {
    const { createdBy, ...rest } = basePrisma;
    const result = mapArticle(rest);
    expect(result.created_by).toBeNull();
  });

  test('images 为 null 时正确映射', () => {
    const result = mapArticle({ ...basePrisma, images: null });
    expect(result.images).toBeNull();
  });

  test('platforms 为 null 时正确映射', () => {
    const result = mapArticle({ ...basePrisma, platforms: null });
    expect(result.platforms).toBeNull();
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
    });
  });

  test('createdBy 为 null 时映射为 null', () => {
    const result = mapArticleVersion({ ...basePrisma, createdBy: null });
    expect(result.created_by).toBeNull();
  });

  test('createdBy 为 undefined 时映射为 null', () => {
    const { createdBy, ...rest } = basePrisma;
    const result = mapArticleVersion(rest);
    expect(result.created_by).toBeNull();
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

  test('project 为 null 时 project_name 为 null', () => {
    const result = mapTodo({ ...basePrisma, project: null });
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

  test('assignee 为 null 时 assignee_name 为空字符串', () => {
    const result = mapTodo({ ...basePrisma, assignee: null });
    expect(result.assignee_name).toBe('');
  });

  test('createdBy 为 null 时 created_by_name 为空字符串', () => {
    const result = mapTodo({ ...basePrisma, createdBy: null });
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
});

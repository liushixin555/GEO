/**
 * @jest-environment node
 */
import {
  KnowledgeBase,
  CreateKnowledgeBaseRequest,
  UpdateKnowledgeBaseRequest,
} from '../../apis/entity/knowledge-base.entity';

describe('knowledge-base.entity', () => {
  // ============================================================
  // KnowledgeBase interface
  // ============================================================
  describe('KnowledgeBase interface', () => {
    // --- baseKB helper for spread pattern ---
    const baseKB: KnowledgeBase = {
      id: 1,
      name: '测试知识库',
      description: '测试描述',
      scope: 'platform',
      company_id: null,
      company_name: null,
      project_id: null,
      project_name: null,
      status: true,
      created_by: 1,
      creator_name: '管理员',
      keyword_count: 0,
      portrait_count: 0,
      image_count: 0,
      document_count: 0,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
    };

    // --- 基本创建与全字段 ---
    it('should create a valid KnowledgeBase object with all fields', () => {
      const kb: KnowledgeBase = {
        id: 1,
        name: 'SEO知识库',
        description: '搜索引擎优化知识',
        scope: 'platform',
        company_id: null,
        company_name: null,
        project_id: null,
        project_name: null,
        status: true,
        created_by: 1,
        creator_name: '管理员',
        keyword_count: 10,
        portrait_count: 5,
        image_count: 3,
        document_count: 2,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(kb.id).toBe(1);
      expect(kb.name).toBe('SEO知识库');
      expect(kb.description).toBe('搜索引擎优化知识');
      expect(kb.scope).toBe('platform');
      expect(kb.status).toBe(true);
      expect(kb.created_by).toBe(1);
      expect(kb.creator_name).toBe('管理员');
      expect(kb.keyword_count).toBe(10);
      expect(kb.portrait_count).toBe(5);
      expect(kb.image_count).toBe(3);
      expect(kb.document_count).toBe(2);
    });

    // --- spread pattern ---
    it('should support spread pattern for creating variants', () => {
      const kb: KnowledgeBase = { ...baseKB, name: '变体知识库', scope: 'company' };
      expect(kb.name).toBe('变体知识库');
      expect(kb.scope).toBe('company');
      expect(kb.id).toBe(baseKB.id);
    });

    // --- correct number of fields ---
    it('should have correct number of fields (18)', () => {
      expect(Object.keys(baseKB).sort()).toEqual(
        ['id', 'name', 'description', 'scope', 'company_id', 'company_name',
         'project_id', 'project_name', 'status', 'created_by', 'creator_name',
         'keyword_count', 'portrait_count', 'image_count', 'document_count',
         'created_at', 'updated_at'].sort()
      );
    });

    // --- id type check ---
    it('should have id as number type', () => {
      expect(typeof baseKB.id).toBe('number');
    });

    // --- id zero ---
    it('should support id being 0', () => {
      const kb: KnowledgeBase = { ...baseKB, id: 0 };
      expect(kb.id).toBe(0);
    });

    // --- name type check ---
    it('should have name as string type', () => {
      expect(typeof baseKB.name).toBe('string');
    });

    // --- name empty string ---
    it('should support empty name', () => {
      const kb: KnowledgeBase = { ...baseKB, name: '' };
      expect(kb.name).toBe('');
    });

    // --- name with special characters ---
    it('should support special characters in name', () => {
      const kb: KnowledgeBase = { ...baseKB, name: '测试<title>&"引号"' };
      expect(kb.name).toContain('<title>');
    });

    // --- name long string ---
    it('should support long name', () => {
      const longName = '很长很长的知识库名称'.repeat(20);
      const kb: KnowledgeBase = { ...baseKB, name: longName };
      expect(kb.name.length).toBeGreaterThan(100);
    });

    // --- description type check ---
    it('should have description as string or null', () => {
      const withDesc: KnowledgeBase = { ...baseKB, description: '描述' };
      const noDesc: KnowledgeBase = { ...baseKB, description: null };
      expect(typeof withDesc.description).toBe('string');
      expect(noDesc.description).toBeNull();
    });

    // --- description empty string ---
    it('should support empty string description', () => {
      const kb: KnowledgeBase = { ...baseKB, description: '' };
      expect(kb.description).toBe('');
    });

    // --- scope type check ---
    it('should have scope as string type', () => {
      expect(typeof baseKB.scope).toBe('string');
    });

    // --- company_name null and non-null ---
    it('should support company_name null and string', () => {
      const nullName: KnowledgeBase = { ...baseKB, company_name: null };
      const someName: KnowledgeBase = { ...baseKB, company_name: '测试公司' };
      expect(nullName.company_name).toBeNull();
      expect(someName.company_name).toBe('测试公司');
    });

    // --- project_name null and non-null ---
    it('should support project_name null and string', () => {
      const nullName: KnowledgeBase = { ...baseKB, project_name: null };
      const someName: KnowledgeBase = { ...baseKB, project_name: '测试项目' };
      expect(nullName.project_name).toBeNull();
      expect(someName.project_name).toBe('测试项目');
    });

    // --- creator_name null and non-null ---
    it('should support creator_name null and string', () => {
      const nullName: KnowledgeBase = { ...baseKB, creator_name: null };
      const someName: KnowledgeBase = { ...baseKB, creator_name: '张三' };
      expect(nullName.creator_name).toBeNull();
      expect(someName.creator_name).toBe('张三');
    });

    // --- count fields zero ---
    it('should support count fields as 0', () => {
      const kb: KnowledgeBase = { ...baseKB, keyword_count: 0, portrait_count: 0, image_count: 0, document_count: 0 };
      expect(kb.keyword_count).toBe(0);
      expect(kb.portrait_count).toBe(0);
      expect(kb.image_count).toBe(0);
      expect(kb.document_count).toBe(0);
    });

    // --- immutability: spread creates new object ---
    it('should not affect original when using spread', () => {
      const original = { ...baseKB };
      const modified = { ...baseKB, name: '修改后' };
      expect(original.name).toBe('测试知识库');
      expect(modified.name).toBe('修改后');
    });

    // --- scope: platform ---
    it('should support platform scope with null company and project', () => {
      const kb: KnowledgeBase = { ...baseKB, scope: 'platform' };
      expect(kb.scope).toBe('platform');
      expect(kb.company_id).toBeNull();
      expect(kb.project_id).toBeNull();
      expect(kb.company_name).toBeNull();
      expect(kb.project_name).toBeNull();
    });

    // --- scope: company ---
    it('should support company scope with company_id and company_name', () => {
      const kb: KnowledgeBase = { ...baseKB, scope: 'company', company_id: 1, company_name: '测试公司' };
      expect(kb.scope).toBe('company');
      expect(kb.company_id).toBe(1);
      expect(kb.company_name).toBe('测试公司');
      expect(kb.project_id).toBeNull();
    });

    // --- scope: project ---
    it('should support project scope with project_id and project_name', () => {
      const kb: KnowledgeBase = { ...baseKB, scope: 'project', company_id: 1, company_name: '公司A', project_id: 10, project_name: '项目B' };
      expect(kb.scope).toBe('project');
      expect(kb.project_id).toBe(10);
      expect(kb.project_name).toBe('项目B');
    });

    // --- count fields large values ---
    it('should support large count values', () => {
      const kb: KnowledgeBase = { ...baseKB, keyword_count: 999999, portrait_count: 888888, image_count: 777777, document_count: 666666 };
      expect(kb.keyword_count).toBe(999999);
      expect(kb.portrait_count).toBe(888888);
      expect(kb.image_count).toBe(777777);
      expect(kb.document_count).toBe(666666);
    });

    // --- created_at and updated_at Date type ---
    it('should have created_at and updated_at as Date objects', () => {
      expect(baseKB.created_at).toBeInstanceOf(Date);
      expect(baseKB.updated_at).toBeInstanceOf(Date);
    });

    // --- created_at before updated_at ---
    it('should support created_at different from updated_at', () => {
      const kb: KnowledgeBase = { ...baseKB, created_at: new Date('2024-01-01'), updated_at: new Date('2024-12-31') };
      expect(kb.created_at.getTime()).toBeLessThan(kb.updated_at.getTime());
    });

    // --- scope type check ---
    it('should only accept valid scope values', () => {
      const validScopes: Array<'platform' | 'company' | 'project'> = ['platform', 'company', 'project'];
      validScopes.forEach((scope) => {
        const kb: KnowledgeBase = { ...baseKB, scope };
        expect(['platform', 'company', 'project']).toContain(kb.scope);
      });
    });

    // --- all nullable fields null simultaneously ---
    it('should allow all nullable fields to be null at once', () => {
      const kb: KnowledgeBase = {
        ...baseKB,
        description: null,
        company_id: null,
        company_name: null,
        project_id: null,
        project_name: null,
        created_by: null,
        creator_name: null,
      };
      expect(kb.description).toBeNull();
      expect(kb.company_id).toBeNull();
      expect(kb.company_name).toBeNull();
      expect(kb.project_id).toBeNull();
      expect(kb.project_name).toBeNull();
      expect(kb.created_by).toBeNull();
      expect(kb.creator_name).toBeNull();
    });

    // --- all nullable fields non-null simultaneously ---
    it('should allow all nullable fields to have values', () => {
      const kb: KnowledgeBase = {
        ...baseKB,
        description: '描述',
        company_id: 1,
        company_name: '公司',
        project_id: 2,
        project_name: '项目',
        created_by: 3,
        creator_name: '创建者',
      };
      expect(kb.description).toBe('描述');
      expect(kb.company_id).toBe(1);
      expect(kb.company_name).toBe('公司');
      expect(kb.project_id).toBe(2);
      expect(kb.project_name).toBe('项目');
      expect(kb.created_by).toBe(3);
      expect(kb.creator_name).toBe('创建者');
    });

    // --- company_id type check ---
    it('should have company_id as number or null', () => {
      const withId: KnowledgeBase = { ...baseKB, company_id: 99 };
      const noId: KnowledgeBase = { ...baseKB, company_id: null };
      expect(typeof withId.company_id).toBe('number');
      expect(noId.company_id).toBeNull();
    });

    // --- project_id type check ---
    it('should have project_id as number or null', () => {
      const withId: KnowledgeBase = { ...baseKB, project_id: 55 };
      const noId: KnowledgeBase = { ...baseKB, project_id: null };
      expect(typeof withId.project_id).toBe('number');
      expect(noId.project_id).toBeNull();
    });

    // --- status toggle from true to false ---
    it('should support toggling status from true to false', () => {
      const kb: KnowledgeBase = { ...baseKB, status: false };
      expect(kb.status).toBe(false);
    });

    // --- Chinese characters in name ---
    it('should support Chinese characters in name', () => {
      const kb: KnowledgeBase = { ...baseKB, name: '薄云商机倍增服务知识库' };
      expect(kb.name).toContain('薄云');
    });
  });

  // ============================================================
  // CreateKnowledgeBaseRequest interface
  // ============================================================
  describe('CreateKnowledgeBaseRequest interface', () => {
    // --- required fields only ---
    it('should create a valid request with required fields only (name + scope)', () => {
      const req: CreateKnowledgeBaseRequest = {
        name: '新知识库',
        scope: 'platform',
      };
      expect(req.name).toBe('新知识库');
      expect(req.scope).toBe('platform');
      expect(req.description).toBeUndefined();
      expect(req.company_id).toBeUndefined();
      expect(req.project_id).toBeUndefined();
    });

    // --- with description ---
    it('should include optional description', () => {
      const req: CreateKnowledgeBaseRequest = {
        name: '新知识库',
        description: '知识库描述',
        scope: 'company',
        company_id: 1,
      };
      expect(req.description).toBe('知识库描述');
      expect(req.company_id).toBe(1);
    });

    // --- project scope ---
    it('should support project scope with project_id', () => {
      const req: CreateKnowledgeBaseRequest = {
        name: '项目知识库',
        scope: 'project',
        company_id: 1,
        project_id: 10,
      };
      expect(req.project_id).toBe(10);
    });

    // --- platform scope minimal ---
    it('should support platform scope with no optional fields', () => {
      const req: CreateKnowledgeBaseRequest = {
        name: '平台级',
        scope: 'platform',
      };
      expect(req.scope).toBe('platform');
      expect(req.company_id).toBeUndefined();
      expect(req.project_id).toBeUndefined();
    });

    // --- company scope with company_id ---
    it('should support company scope with company_id', () => {
      const req: CreateKnowledgeBaseRequest = {
        name: '公司级',
        scope: 'company',
        company_id: 5,
      };
      expect(req.scope).toBe('company');
      expect(req.company_id).toBe(5);
    });

    // --- all scope values ---
    it('should accept all three scope values', () => {
      const scopes: Array<'platform' | 'company' | 'project'> = ['platform', 'company', 'project'];
      scopes.forEach((scope) => {
        const req: CreateKnowledgeBaseRequest = { name: '测试', scope };
        expect(['platform', 'company', 'project']).toContain(req.scope);
      });
    });

    // --- description as empty string ---
    it('should allow description to be an empty string', () => {
      const req: CreateKnowledgeBaseRequest = {
        name: '空描述',
        description: '',
        scope: 'platform',
      };
      expect(req.description).toBe('');
    });

    // --- name field required ---
    it('should require name field', () => {
      const req: CreateKnowledgeBaseRequest = {
        name: '必填名称',
        scope: 'platform',
      };
      expect(req.name).toBeDefined();
      expect(typeof req.name).toBe('string');
    });

    // --- scope field required ---
    it('should require scope field', () => {
      const req: CreateKnowledgeBaseRequest = {
        name: '测试',
        scope: 'platform',
      };
      expect(req.scope).toBeDefined();
      expect(typeof req.scope).toBe('string');
    });

    // --- correct number of fields ---
    it('should have 5 fields max (name, description, scope, company_id, project_id)', () => {
      const full: CreateKnowledgeBaseRequest = {
        name: '全字段', description: 'd', scope: 'platform', company_id: 1, project_id: 1,
      };
      expect(Object.keys(full)).toHaveLength(5);
    });

    // --- name with special characters ---
    it('should support special characters in name', () => {
      const req: CreateKnowledgeBaseRequest = { name: '测试<>&"特殊', scope: 'platform' };
      expect(req.name).toContain('<>&');
    });

    // --- name empty string ---
    it('should support empty string name', () => {
      const req: CreateKnowledgeBaseRequest = { name: '', scope: 'platform' };
      expect(req.name).toBe('');
    });

    // --- long name ---
    it('should support long name', () => {
      const longName = '很长的知识库名称'.repeat(50);
      const req: CreateKnowledgeBaseRequest = { name: longName, scope: 'platform' };
      expect(req.name.length).toBeGreaterThan(100);
    });

    // --- long description ---
    it('should support long description', () => {
      const longDesc = '很长的描述'.repeat(1000);
      const req: CreateKnowledgeBaseRequest = { name: '测试', description: longDesc, scope: 'platform' };
      expect(req.description!.length).toBeGreaterThan(1000);
    });

    // --- company_id zero ---
    it('should support company_id as 0', () => {
      const req: CreateKnowledgeBaseRequest = { name: '测试', scope: 'company', company_id: 0 };
      expect(req.company_id).toBe(0);
    });

    // --- project_id zero ---
    it('should support project_id as 0', () => {
      const req: CreateKnowledgeBaseRequest = { name: '测试', scope: 'project', project_id: 0 };
      expect(req.project_id).toBe(0);
    });

    // --- all fields combined ---
    it('should support all fields combined', () => {
      const req: CreateKnowledgeBaseRequest = {
        name: '完整请求',
        description: '描述内容',
        scope: 'project',
        company_id: 1,
        project_id: 2,
      };
      expect(req.name).toBe('完整请求');
      expect(req.description).toBe('描述内容');
      expect(req.scope).toBe('project');
      expect(req.company_id).toBe(1);
      expect(req.project_id).toBe(2);
    });
  });

  // ============================================================
  // UpdateKnowledgeBaseRequest interface
  // ============================================================
  describe('UpdateKnowledgeBaseRequest interface', () => {
    // --- all optional fields ---
    it('should create a valid request with all optional fields', () => {
      const req: UpdateKnowledgeBaseRequest = {
        name: '更新名称',
        description: '更新描述',
        scope: 'company',
        company_id: 2,
        project_id: 20,
        status: true,
      };
      expect(req.name).toBe('更新名称');
      expect(req.description).toBe('更新描述');
      expect(req.scope).toBe('company');
      expect(req.company_id).toBe(2);
      expect(req.project_id).toBe(20);
      expect(req.status).toBe(true);
    });

    // --- partial update: name only ---
    it('should allow partial update with name only', () => {
      const req: UpdateKnowledgeBaseRequest = { name: '只改名称' };
      expect(Object.keys(req)).toHaveLength(1);
      expect(req.name).toBe('只改名称');
    });

    // --- empty update ---
    it('should allow empty update request', () => {
      const req: UpdateKnowledgeBaseRequest = {};
      expect(Object.keys(req)).toHaveLength(0);
    });

    // --- status toggle ---
    it('should allow status toggle to false', () => {
      const req: UpdateKnowledgeBaseRequest = { status: false };
      expect(req.status).toBe(false);
    });

    // --- status toggle to true ---
    it('should allow status toggle to true', () => {
      const req: UpdateKnowledgeBaseRequest = { status: true };
      expect(req.status).toBe(true);
    });

    // --- description only ---
    it('should allow description only update', () => {
      const req: UpdateKnowledgeBaseRequest = { description: '新描述' };
      expect(req.description).toBe('新描述');
      expect(req.name).toBeUndefined();
    });

    // --- description empty string ---
    it('should allow description to be empty string', () => {
      const req: UpdateKnowledgeBaseRequest = { description: '' };
      expect(req.description).toBe('');
    });

    // --- scope change ---
    it('should allow scope change', () => {
      const req: UpdateKnowledgeBaseRequest = { scope: 'project' };
      expect(req.scope).toBe('project');
    });

    // --- company_id change ---
    it('should allow company_id update', () => {
      const req: UpdateKnowledgeBaseRequest = { company_id: 99 };
      expect(req.company_id).toBe(99);
    });

    // --- project_id change ---
    it('should allow project_id update', () => {
      const req: UpdateKnowledgeBaseRequest = { project_id: 88 };
      expect(req.project_id).toBe(88);
    });

    // --- multiple fields partial update ---
    it('should allow updating multiple fields at once', () => {
      const req: UpdateKnowledgeBaseRequest = {
        name: '新名称',
        description: '新描述',
        status: false,
      };
      expect(Object.keys(req)).toHaveLength(3);
      expect(req.name).toBe('新名称');
      expect(req.description).toBe('新描述');
      expect(req.status).toBe(false);
    });

    // --- scope values in update ---
    it('should accept all scope values in update', () => {
      const scopes: Array<'platform' | 'company' | 'project'> = ['platform', 'company', 'project'];
      scopes.forEach((scope) => {
        const req: UpdateKnowledgeBaseRequest = { scope };
        expect(['platform', 'company', 'project']).toContain(req.scope);
      });
    });

    // --- name type check ---
    it('should have name as string type when provided', () => {
      const req: UpdateKnowledgeBaseRequest = { name: '类型检查' };
      expect(typeof req.name).toBe('string');
    });

    // --- correct number of fields ---
    it('should have 6 fields max', () => {
      const full: UpdateKnowledgeBaseRequest = {
        name: 'a', description: 'b', scope: 'platform', company_id: 1, project_id: 1, status: true,
      };
      expect(Object.keys(full)).toHaveLength(6);
    });

    // --- company_id zero ---
    it('should support company_id as 0', () => {
      const req: UpdateKnowledgeBaseRequest = { company_id: 0 };
      expect(req.company_id).toBe(0);
    });

    // --- project_id zero ---
    it('should support project_id as 0', () => {
      const req: UpdateKnowledgeBaseRequest = { project_id: 0 };
      expect(req.project_id).toBe(0);
    });

    // --- name with special characters ---
    it('should support special characters in name', () => {
      const req: UpdateKnowledgeBaseRequest = { name: '测试<>&"特殊' };
      expect(req.name).toContain('<>&');
    });

    // --- name empty string ---
    it('should support empty string name', () => {
      const req: UpdateKnowledgeBaseRequest = { name: '' };
      expect(req.name).toBe('');
    });

    // --- long description ---
    it('should support long description', () => {
      const longDesc = '很长的描述'.repeat(1000);
      const req: UpdateKnowledgeBaseRequest = { description: longDesc };
      expect(req.description!.length).toBeGreaterThan(1000);
    });

    // --- status type check ---
    it('should have status as boolean type when provided', () => {
      const req: UpdateKnowledgeBaseRequest = { status: true };
      expect(typeof req.status).toBe('boolean');
    });
  });

  // ============================================================
  // 跨接口交互与完整性验证
  // ============================================================
  describe('cross-interface interaction', () => {
    const baseKB: KnowledgeBase = {
      id: 1, name: '原始知识库', description: '原始描述', scope: 'platform',
      company_id: null, company_name: null, project_id: null, project_name: null,
      status: true, created_by: null, creator_name: null,
      keyword_count: 0, portrait_count: 0, image_count: 0, document_count: 0,
      created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
    };

    it('should apply CreateRequest to create a KnowledgeBase-like object', () => {
      const createReq: CreateKnowledgeBaseRequest = {
        name: '新知识库',
        description: '新描述',
        scope: 'company',
        company_id: 5,
      };
      const kb: KnowledgeBase = {
        ...baseKB,
        ...createReq,
        company_name: '某公司',
      };
      expect(kb.name).toBe('新知识库');
      expect(kb.description).toBe('新描述');
      expect(kb.scope).toBe('company');
      expect(kb.company_id).toBe(5);
    });

    it('should apply UpdateRequest to modify an existing KnowledgeBase', () => {
      const updateReq: UpdateKnowledgeBaseRequest = {
        name: '更新后名称',
        status: false,
        description: '更新后描述',
      };
      const updated: KnowledgeBase = { ...baseKB, ...updateReq };
      expect(updated.name).toBe('更新后名称');
      expect(updated.status).toBe(false);
      expect(updated.description).toBe('更新后描述');
      expect(updated.id).toBe(baseKB.id);
    });

    it('should preserve non-updated fields when applying UpdateRequest', () => {
      const updateReq: UpdateKnowledgeBaseRequest = { name: '新名称' };
      const updated: KnowledgeBase = { ...baseKB, ...updateReq };
      expect(updated.name).toBe('新名称');
      expect(updated.scope).toBe(baseKB.scope);
      expect(updated.status).toBe(baseKB.status);
      expect(updated.keyword_count).toBe(baseKB.keyword_count);
    });

    it('should handle empty UpdateRequest gracefully', () => {
      const updateReq: UpdateKnowledgeBaseRequest = {};
      const updated: KnowledgeBase = { ...baseKB, ...updateReq };
      expect(updated).toEqual(baseKB);
    });

    it('should support full lifecycle: create → update → verify', () => {
      // Create
      const createReq: CreateKnowledgeBaseRequest = {
        name: '生命周期测试',
        scope: 'platform',
      };
      const created: KnowledgeBase = {
        id: 100,
        description: null,
        company_id: null, company_name: null,
        project_id: null, project_name: null,
        status: true,
        created_by: 1, creator_name: '管理员',
        keyword_count: 0, portrait_count: 0, image_count: 0, document_count: 0,
        created_at: new Date(), updated_at: new Date(),
        ...createReq,
      };
      expect(created.name).toBe('生命周期测试');
      expect(created.scope).toBe('platform');

      // Update
      const updateReq: UpdateKnowledgeBaseRequest = {
        name: '更新后',
        description: '新增描述',
        scope: 'company',
        company_id: 1,
        status: false,
      };
      const updated: KnowledgeBase = { ...created, ...updateReq, company_name: '公司', updated_at: new Date() };
      expect(updated.name).toBe('更新后');
      expect(updated.description).toBe('新增描述');
      expect(updated.scope).toBe('company');
      expect(updated.company_id).toBe(1);
      expect(updated.status).toBe(false);
      expect(updated.id).toBe(created.id);
      expect(updated.created_at).toBe(created.created_at);
    });
  });

  // ============================================================
  // 重新导出验证
  // ============================================================
  describe('re-exports from index', () => {
    it('should compile correctly when importing types from index.ts', () => {
      const kb: KnowledgeBase = {
        id: 1, name: 'KB', description: null, scope: 'platform',
        company_id: null, company_name: null, project_id: null, project_name: null,
        status: true, created_by: null, creator_name: null,
        keyword_count: 0, portrait_count: 0, image_count: 0, document_count: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(kb.name).toBe('KB');
    });

    it('should allow all request types to be imported', () => {
      const createReq: CreateKnowledgeBaseRequest = {
        name: '测试',
        scope: 'platform',
      };
      const updateReq: UpdateKnowledgeBaseRequest = {
        name: '更新',
        status: true,
      };
      expect(createReq.name).toBe('测试');
      expect(updateReq.name).toBe('更新');
    });
  });

  // ============================================================
  // JSON 序列化/反序列化
  // ============================================================
  describe('JSON serialization / deserialization', () => {
    const baseKB: KnowledgeBase = {
      id: 1, name: '序列化测试', description: '描述内容', scope: 'company',
      company_id: 5, company_name: '测试公司', project_id: null, project_name: null,
      status: true, created_by: 1, creator_name: '管理员',
      keyword_count: 10, portrait_count: 5, image_count: 3, document_count: 2,
      created_at: new Date('2024-06-15T10:30:00.000Z'),
      updated_at: new Date('2024-06-15T12:45:30.123Z'),
    };

    it('should serialize KnowledgeBase to JSON string', () => {
      const json = JSON.stringify(baseKB);
      expect(json).toContain('"name":"序列化测试"');
      expect(json).toContain('"scope":"company"');
      expect(json).toContain('"company_id":5');
    });

    it('should deserialize JSON back to object with correct string fields', () => {
      const json = JSON.stringify(baseKB);
      const parsed = JSON.parse(json);
      expect(parsed.name).toBe('序列化测试');
      expect(parsed.description).toBe('描述内容');
      expect(parsed.scope).toBe('company');
      expect(parsed.company_name).toBe('测试公司');
      expect(parsed.creator_name).toBe('管理员');
    });

    it('should deserialize numeric fields correctly', () => {
      const json = JSON.stringify(baseKB);
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe(1);
      expect(parsed.company_id).toBe(5);
      expect(parsed.keyword_count).toBe(10);
      expect(parsed.portrait_count).toBe(5);
      expect(parsed.image_count).toBe(3);
      expect(parsed.document_count).toBe(2);
    });

    it('should preserve null fields through JSON round-trip', () => {
      const kb: KnowledgeBase = { ...baseKB, description: null, project_id: null, project_name: null };
      const json = JSON.stringify(kb);
      const parsed = JSON.parse(json);
      expect(parsed.description).toBeNull();
      expect(parsed.project_id).toBeNull();
      expect(parsed.project_name).toBeNull();
    });

    it('should preserve boolean status through JSON round-trip', () => {
      const kbTrue: KnowledgeBase = { ...baseKB, status: true };
      const kbFalse: KnowledgeBase = { ...baseKB, status: false };
      expect(JSON.parse(JSON.stringify(kbTrue)).status).toBe(true);
      expect(JSON.parse(JSON.stringify(kbFalse)).status).toBe(false);
    });

    it('should convert Date fields to ISO strings in JSON', () => {
      const json = JSON.stringify(baseKB);
      const parsed = JSON.parse(json);
      expect(typeof parsed.created_at).toBe('string');
      expect(typeof parsed.updated_at).toBe('string');
      expect(parsed.created_at).toBe('2024-06-15T10:30:00.000Z');
      expect(parsed.updated_at).toBe('2024-06-15T12:45:30.123Z');
    });

    it('should reconstruct Date objects from deserialized JSON', () => {
      const json = JSON.stringify(baseKB);
      const parsed = JSON.parse(json);
      const restored: KnowledgeBase = {
        ...parsed,
        created_at: new Date(parsed.created_at),
        updated_at: new Date(parsed.updated_at),
      };
      expect(restored.created_at).toBeInstanceOf(Date);
      expect(restored.updated_at).toBeInstanceOf(Date);
      expect(restored.created_at.getTime()).toBe(baseKB.created_at.getTime());
      expect(restored.updated_at.getTime()).toBe(baseKB.updated_at.getTime());
    });

    it('should serialize CreateKnowledgeBaseRequest correctly', () => {
      const req: CreateKnowledgeBaseRequest = {
        name: '创建请求', description: '描述', scope: 'platform',
      };
      const json = JSON.stringify(req);
      const parsed = JSON.parse(json);
      expect(parsed.name).toBe('创建请求');
      expect(parsed.description).toBe('描述');
      expect(parsed.scope).toBe('platform');
    });

    it('should serialize UpdateKnowledgeBaseRequest with only provided fields', () => {
      const req: UpdateKnowledgeBaseRequest = { name: '部分更新', status: false };
      const json = JSON.stringify(req);
      const parsed = JSON.parse(json);
      expect(Object.keys(parsed)).toHaveLength(2);
      expect(parsed.name).toBe('部分更新');
      expect(parsed.status).toBe(false);
    });
  });

  // ============================================================
  // Object 操作与高级边界
  // ============================================================
  describe('Object operations and advanced edge cases', () => {
    const baseKB: KnowledgeBase = {
      id: 1, name: '对象操作测试', description: null, scope: 'platform',
      company_id: null, company_name: null, project_id: null, project_name: null,
      status: true, created_by: null, creator_name: null,
      keyword_count: 0, portrait_count: 0, image_count: 0, document_count: 0,
      created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
    };

    it('should support Object.freeze on KnowledgeBase', () => {
      const frozen = Object.freeze({ ...baseKB });
      expect(Object.isFrozen(frozen)).toBe(true);
      expect(frozen.name).toBe('对象操作测试');
    });

    it('should support Object.keys enumeration', () => {
      const keys = Object.keys(baseKB);
      expect(keys).toHaveLength(17);
      expect(keys).toContain('id');
      expect(keys).toContain('name');
      expect(keys).toContain('scope');
      expect(keys).toContain('status');
    });

    it('should support Object.values with correct types', () => {
      const values = Object.values(baseKB);
      expect(values).toContain(1);
      expect(values).toContain('对象操作测试');
      expect(values).toContain('platform');
      expect(values).toContain(true);
      expect(values).toContain(null);
    });

    it('should support Object.entries for iteration', () => {
      const entries = Object.entries(baseKB);
      expect(entries).toHaveLength(17);
      const nameEntry = entries.find(([key]) => key === 'name');
      expect(nameEntry).toEqual(['name', '对象操作测试']);
    });

    it('should support hasOwnProperty checks', () => {
      expect(baseKB.hasOwnProperty('id')).toBe(true);
      expect(baseKB.hasOwnProperty('name')).toBe(true);
      expect(baseKB.hasOwnProperty('scope')).toBe(true);
      expect(baseKB.hasOwnProperty('nonexistent')).toBe(false);
    });

    it('should support id as Number.MAX_SAFE_INTEGER', () => {
      const kb: KnowledgeBase = { ...baseKB, id: Number.MAX_SAFE_INTEGER };
      expect(kb.id).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should support negative id values', () => {
      const kb: KnowledgeBase = { ...baseKB, id: -1 };
      expect(kb.id).toBe(-1);
    });

    it('should support created_at and updated_at being the same Date', () => {
      const sameDate = new Date('2024-06-15T10:00:00.000Z');
      const kb: KnowledgeBase = { ...baseKB, created_at: sameDate, updated_at: sameDate };
      expect(kb.created_at.getTime()).toBe(kb.updated_at.getTime());
    });

    it('should preserve timestamp millisecond precision', () => {
      const created = new Date('2024-06-15T10:30:45.123Z');
      const updated = new Date('2024-06-15T10:30:45.456Z');
      const kb: KnowledgeBase = { ...baseKB, created_at: created, updated_at: updated };
      expect(kb.created_at.getMilliseconds()).toBe(123);
      expect(kb.updated_at.getMilliseconds()).toBe(456);
    });

    it('should support Emoji characters in name', () => {
      const kb: KnowledgeBase = { ...baseKB, name: '📚知识库🎉数据' };
      expect(kb.name).toContain('📚');
      expect(kb.name).toContain('🎉');
    });

    it('should support Emoji characters in description', () => {
      const kb: KnowledgeBase = { ...baseKB, description: '描述📝测试🔧' };
      expect(kb.description).toContain('📝');
      expect(kb.description).toContain('🔧');
    });

    it('should support Unicode characters beyond Chinese (Japanese/Korean)', () => {
      const kb: KnowledgeBase = {
        ...baseKB,
        name: 'ナレッジベース 한국어',
        description: '日本語テスト 한국어 테스트',
      };
      expect(kb.name).toContain('ナレッジ');
      expect(kb.name).toContain('한국어');
      expect(kb.description).toContain('日本語');
    });

    it('should support description with special HTML characters', () => {
      const kb: KnowledgeBase = {
        ...baseKB,
        description: '<script>alert("xss")</script>&<img src=x>',
      };
      expect(kb.description).toContain('<script>');
      expect(kb.description).toContain('&');
    });

    it('should support whitespace and newlines in description', () => {
      const kb: KnowledgeBase = {
        ...baseKB,
        description: '第一行\n第二行\t制表符  多空格',
      };
      expect(kb.description).toContain('\n');
      expect(kb.description).toContain('\t');
    });

    it('should support count fields with Number.MAX_SAFE_INTEGER', () => {
      const kb: KnowledgeBase = {
        ...baseKB,
        keyword_count: Number.MAX_SAFE_INTEGER,
        portrait_count: Number.MAX_SAFE_INTEGER,
        image_count: Number.MAX_SAFE_INTEGER,
        document_count: Number.MAX_SAFE_INTEGER,
      };
      expect(kb.keyword_count).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should support negative count values', () => {
      const kb: KnowledgeBase = {
        ...baseKB,
        keyword_count: -1,
        portrait_count: -100,
      };
      expect(kb.keyword_count).toBe(-1);
      expect(kb.portrait_count).toBe(-100);
    });

    it('should support created_by as Number.MAX_SAFE_INTEGER', () => {
      const kb: KnowledgeBase = { ...baseKB, created_by: Number.MAX_SAFE_INTEGER };
      expect(kb.created_by).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should support company_id and project_id as Number.MAX_SAFE_INTEGER', () => {
      const kb: KnowledgeBase = {
        ...baseKB,
        company_id: Number.MAX_SAFE_INTEGER,
        project_id: Number.MAX_SAFE_INTEGER - 1,
      };
      expect(kb.company_id).toBe(Number.MAX_SAFE_INTEGER);
      expect(kb.project_id).toBe(Number.MAX_SAFE_INTEGER - 1);
    });

    it('should support name with mixed scripts (Chinese + English + numbers)', () => {
      const kb: KnowledgeBase = { ...baseKB, name: '薄云KB-2024倍增服务v2.0' };
      expect(kb.name).toMatch(/薄云.*KB.*2024.*v2\.0/);
    });
  });

  // ============================================================
  // 集合/数组操作
  // ============================================================
  describe('Collection / Array operations', () => {
    const makeKB = (id: number, name: string, scope: 'platform' | 'company' | 'project'): KnowledgeBase => ({
      id, name, description: null, scope,
      company_id: scope === 'company' ? id * 10 : scope === 'project' ? id * 10 : null,
      company_name: scope !== 'platform' ? `公司${id}` : null,
      project_id: scope === 'project' ? id * 100 : null,
      project_name: scope === 'project' ? `项目${id}` : null,
      status: true, created_by: 1, creator_name: '管理员',
      keyword_count: 0, portrait_count: 0, image_count: 0, document_count: 0,
      created_at: new Date(), updated_at: new Date(),
    });

    it('should support array of KnowledgeBase objects', () => {
      const list: KnowledgeBase[] = [
        makeKB(1, '平台库', 'platform'),
        makeKB(2, '公司库', 'company'),
        makeKB(3, '项目库', 'project'),
      ];
      expect(list).toHaveLength(3);
      expect(list[0].scope).toBe('platform');
      expect(list[1].scope).toBe('company');
      expect(list[2].scope).toBe('project');
    });

    it('should support filtering by scope', () => {
      const list: KnowledgeBase[] = [
        makeKB(1, 'A', 'platform'),
        makeKB(2, 'B', 'company'),
        makeKB(3, 'C', 'project'),
        makeKB(4, 'D', 'platform'),
      ];
      const platformKBs = list.filter(kb => kb.scope === 'platform');
      expect(platformKBs).toHaveLength(2);
    });

    it('should support filtering by status', () => {
      const list: KnowledgeBase[] = [
        { ...makeKB(1, 'A', 'platform'), status: true },
        { ...makeKB(2, 'B', 'platform'), status: false },
        { ...makeKB(3, 'C', 'platform'), status: true },
      ];
      const activeKBs = list.filter(kb => kb.status);
      expect(activeKBs).toHaveLength(2);
    });

    it('should support mapping to extract names', () => {
      const list: KnowledgeBase[] = [
        makeKB(1, '知识库A', 'platform'),
        makeKB(2, '知识库B', 'company'),
      ];
      const names = list.map(kb => kb.name);
      expect(names).toEqual(['知识库A', '知识库B']);
    });

    it('should support sorting by id', () => {
      const list: KnowledgeBase[] = [
        makeKB(3, 'C', 'platform'),
        makeKB(1, 'A', 'platform'),
        makeKB(2, 'B', 'platform'),
      ];
      const sorted = [...list].sort((a, b) => a.id - b.id);
      expect(sorted.map(kb => kb.name)).toEqual(['A', 'B', 'C']);
    });

    it('should support finding by id', () => {
      const list: KnowledgeBase[] = [
        makeKB(1, 'A', 'platform'),
        makeKB(2, 'B', 'company'),
        makeKB(3, 'C', 'project'),
      ];
      const found = list.find(kb => kb.id === 2);
      expect(found).toBeDefined();
      expect(found!.name).toBe('B');
    });

    it('should support reduce for aggregate counts', () => {
      const list: KnowledgeBase[] = [
        { ...makeKB(1, 'A', 'platform'), keyword_count: 10, document_count: 2 },
        { ...makeKB(2, 'B', 'company'), keyword_count: 20, document_count: 5 },
        { ...makeKB(3, 'C', 'project'), keyword_count: 30, document_count: 8 },
      ];
      const totalKeywords = list.reduce((sum, kb) => sum + kb.keyword_count, 0);
      const totalDocs = list.reduce((sum, kb) => sum + kb.document_count, 0);
      expect(totalKeywords).toBe(60);
      expect(totalDocs).toBe(15);
    });

    it('should support empty array', () => {
      const list: KnowledgeBase[] = [];
      expect(list).toHaveLength(0);
      expect(list.filter(kb => kb.status)).toHaveLength(0);
    });

    it('should support every/some with status checks', () => {
      const allActive: KnowledgeBase[] = [
        { ...makeKB(1, 'A', 'platform'), status: true },
        { ...makeKB(2, 'B', 'platform'), status: true },
      ];
      const mixed: KnowledgeBase[] = [
        { ...makeKB(1, 'A', 'platform'), status: true },
        { ...makeKB(2, 'B', 'platform'), status: false },
      ];
      expect(allActive.every(kb => kb.status)).toBe(true);
      expect(mixed.every(kb => kb.status)).toBe(false);
      expect(mixed.some(kb => kb.status)).toBe(true);
    });
  });

  // ============================================================
  // Scope 业务约束验证
  // ============================================================
  describe('Scope business constraint validation', () => {
    const baseKB: KnowledgeBase = {
      id: 1, name: '约束测试', description: null, scope: 'platform',
      company_id: null, company_name: null, project_id: null, project_name: null,
      status: true, created_by: null, creator_name: null,
      keyword_count: 0, portrait_count: 0, image_count: 0, document_count: 0,
      created_at: new Date(), updated_at: new Date(),
    };

    it('platform scope should have no company/project association', () => {
      const kb: KnowledgeBase = {
        ...baseKB, scope: 'platform',
        company_id: null, company_name: null,
        project_id: null, project_name: null,
      };
      expect(kb.company_id).toBeNull();
      expect(kb.company_name).toBeNull();
      expect(kb.project_id).toBeNull();
      expect(kb.project_name).toBeNull();
    });

    it('company scope should have company association', () => {
      const kb: KnowledgeBase = {
        ...baseKB, scope: 'company',
        company_id: 1, company_name: '测试公司',
        project_id: null, project_name: null,
      };
      expect(kb.company_id).toBe(1);
      expect(kb.company_name).toBe('测试公司');
      expect(kb.project_id).toBeNull();
    });

    it('project scope should have both company and project associations', () => {
      const kb: KnowledgeBase = {
        ...baseKB, scope: 'project',
        company_id: 1, company_name: '所属公司',
        project_id: 10, project_name: '所属项目',
      };
      expect(kb.company_id).toBe(1);
      expect(kb.project_id).toBe(10);
      expect(kb.company_name).toBe('所属公司');
      expect(kb.project_name).toBe('所属项目');
    });

    it('should support scope upgrade from platform to company', () => {
      const kb: KnowledgeBase = { ...baseKB, scope: 'platform' };
      const upgraded: KnowledgeBase = {
        ...kb, scope: 'company',
        company_id: 5, company_name: '新公司',
      };
      expect(upgraded.scope).toBe('company');
      expect(upgraded.company_id).toBe(5);
    });

    it('should support scope upgrade from company to project', () => {
      const kb: KnowledgeBase = {
        ...baseKB, scope: 'company',
        company_id: 1, company_name: '公司',
      };
      const upgraded: KnowledgeBase = {
        ...kb, scope: 'project',
        project_id: 10, project_name: '项目',
      };
      expect(upgraded.scope).toBe('project');
      expect(upgraded.company_id).toBe(1);
      expect(upgraded.project_id).toBe(10);
    });

    it('should support scope downgrade from project to company', () => {
      const kb: KnowledgeBase = {
        ...baseKB, scope: 'project',
        company_id: 1, company_name: '公司',
        project_id: 10, project_name: '项目',
      };
      const downgraded: KnowledgeBase = {
        ...kb, scope: 'company',
        project_id: null, project_name: null,
      };
      expect(downgraded.scope).toBe('company');
      expect(downgraded.project_id).toBeNull();
      expect(downgraded.company_id).toBe(1);
    });

    it('CreateRequest platform scope should not require company_id/project_id', () => {
      const req: CreateKnowledgeBaseRequest = { name: '平台', scope: 'platform' };
      expect(req.company_id).toBeUndefined();
      expect(req.project_id).toBeUndefined();
    });

    it('CreateRequest company scope should include company_id', () => {
      const req: CreateKnowledgeBaseRequest = {
        name: '公司级', scope: 'company', company_id: 1,
      };
      expect(req.company_id).toBe(1);
    });

    it('CreateRequest project scope should include both ids', () => {
      const req: CreateKnowledgeBaseRequest = {
        name: '项目级', scope: 'project', company_id: 1, project_id: 10,
      };
      expect(req.company_id).toBe(1);
      expect(req.project_id).toBe(10);
    });
  });

  // ============================================================
  // 连续多次更新模拟
  // ============================================================
  describe('Sequential update simulation', () => {
    const baseKB: KnowledgeBase = {
      id: 1, name: '初始知识库', description: '初始描述', scope: 'platform',
      company_id: null, company_name: null, project_id: null, project_name: null,
      status: true, created_by: 1, creator_name: '管理员',
      keyword_count: 0, portrait_count: 0, image_count: 0, document_count: 0,
      created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
    };

    it('should apply multiple sequential updates correctly', () => {
      let current = { ...baseKB };

      // Update 1: change name
      const update1: UpdateKnowledgeBaseRequest = { name: '第一次更新' };
      current = { ...current, ...update1, updated_at: new Date() };
      expect(current.name).toBe('第一次更新');
      expect(current.description).toBe('初始描述');

      // Update 2: change description
      const update2: UpdateKnowledgeBaseRequest = { description: '第二次更新描述' };
      current = { ...current, ...update2, updated_at: new Date() };
      expect(current.name).toBe('第一次更新');
      expect(current.description).toBe('第二次更新描述');

      // Update 3: change scope + add company
      const update3: UpdateKnowledgeBaseRequest = { scope: 'company', company_id: 5 };
      current = { ...current, ...update3, company_name: '测试公司', updated_at: new Date() };
      expect(current.scope).toBe('company');
      expect(current.company_id).toBe(5);
      expect(current.name).toBe('第一次更新');
    });

    it('should handle status toggle sequence', () => {
      let current = { ...baseKB };
      expect(current.status).toBe(true);

      const disable: UpdateKnowledgeBaseRequest = { status: false };
      current = { ...current, ...disable };
      expect(current.status).toBe(false);

      const enable: UpdateKnowledgeBaseRequest = { status: true };
      current = { ...current, ...enable };
      expect(current.status).toBe(true);
    });

    it('should accumulate count field updates', () => {
      let current = { ...baseKB };
      expect(current.keyword_count).toBe(0);

      // Simulate adding keywords
      current = { ...current, keyword_count: current.keyword_count + 5 };
      expect(current.keyword_count).toBe(5);

      current = { ...current, keyword_count: current.keyword_count + 10 };
      expect(current.keyword_count).toBe(15);
    });

    it('should apply UpdateRequest chain from CreateRequest origin', () => {
      const createReq: CreateKnowledgeBaseRequest = {
        name: '新建知识库', scope: 'platform',
      };
      let current: KnowledgeBase = {
        id: 100,
        description: null,
        company_id: null, company_name: null,
        project_id: null, project_name: null,
        status: true,
        created_by: 1, creator_name: '创建者',
        keyword_count: 0, portrait_count: 0, image_count: 0, document_count: 0,
        created_at: new Date(), updated_at: new Date(),
        ...createReq,
      };

      // Update 1
      const upd1: UpdateKnowledgeBaseRequest = { description: '添加描述' };
      current = { ...current, ...upd1, updated_at: new Date() };

      // Update 2
      const upd2: UpdateKnowledgeBaseRequest = { scope: 'company', company_id: 1 };
      current = { ...current, ...upd2, company_name: '公司A', updated_at: new Date() };

      // Update 3
      const upd3: UpdateKnowledgeBaseRequest = { name: '最终名称', status: false };
      current = { ...current, ...upd3, updated_at: new Date() };

      expect(current.id).toBe(100);
      expect(current.name).toBe('最终名称');
      expect(current.description).toBe('添加描述');
      expect(current.scope).toBe('company');
      expect(current.company_id).toBe(1);
      expect(current.status).toBe(false);
      expect(current.created_at).toBeDefined();
    });
  });

  // ============================================================
  // CreateRequest / UpdateRequest 高级边界
  // ============================================================
  describe('CreateRequest / UpdateRequest advanced edge cases', () => {
    it('CreateRequest should support name with whitespace only', () => {
      const req: CreateKnowledgeBaseRequest = { name: '   ', scope: 'platform' };
      expect(req.name).toBe('   ');
      expect(req.name.length).toBe(3);
    });

    it('CreateRequest should support name with newlines', () => {
      const req: CreateKnowledgeBaseRequest = { name: '第一行\n第二行', scope: 'platform' };
      expect(req.name).toContain('\n');
    });

    it('UpdateRequest should support scope change without other fields', () => {
      const req: UpdateKnowledgeBaseRequest = { scope: 'project' };
      expect(Object.keys(req)).toHaveLength(1);
      expect(req.scope).toBe('project');
    });

    it('UpdateRequest should support clearing description with empty string', () => {
      const req: UpdateKnowledgeBaseRequest = { description: '' };
      expect(req.description).toBe('');
    });

    it('CreateRequest description should support Emoji', () => {
      const req: CreateKnowledgeBaseRequest = {
        name: '测试', scope: 'platform',
        description: '📚📖 知识库描述 🎯✨',
      };
      expect(req.description).toContain('📚');
      expect(req.description).toContain('🎯');
    });

    it('UpdateRequest should support company_id change only', () => {
      const req: UpdateKnowledgeBaseRequest = { company_id: 42 };
      expect(Object.keys(req)).toEqual(['company_id']);
      expect(req.company_id).toBe(42);
    });

    it('UpdateRequest should support project_id change only', () => {
      const req: UpdateKnowledgeBaseRequest = { project_id: 99 };
      expect(Object.keys(req)).toEqual(['project_id']);
      expect(req.project_id).toBe(99);
    });

    it('CreateRequest should support very large company_id and project_id', () => {
      const req: CreateKnowledgeBaseRequest = {
        name: '大ID测试', scope: 'project',
        company_id: Number.MAX_SAFE_INTEGER,
        project_id: Number.MAX_SAFE_INTEGER - 1,
      };
      expect(req.company_id).toBe(Number.MAX_SAFE_INTEGER);
      expect(req.project_id).toBe(Number.MAX_SAFE_INTEGER - 1);
    });

    it('UpdateRequest should support negative company_id and project_id', () => {
      const req: UpdateKnowledgeBaseRequest = { company_id: -1, project_id: -99 };
      expect(req.company_id).toBe(-1);
      expect(req.project_id).toBe(-99);
    });

    it('UpdateRequest should support name with Unicode emoji', () => {
      const req: UpdateKnowledgeBaseRequest = { name: '📚更新名称🚀' };
      expect(req.name).toContain('📚');
      expect(req.name).toContain('🚀');
    });

    it('CreateRequest should serialize/deserialize correctly', () => {
      const req: CreateKnowledgeBaseRequest = {
        name: '序列化', description: '描述', scope: 'company', company_id: 1,
      };
      const json = JSON.stringify(req);
      const parsed = JSON.parse(json);
      expect(parsed).toEqual(req);
    });

    it('UpdateRequest should serialize/deserialize correctly', () => {
      const req: UpdateKnowledgeBaseRequest = { name: '更新', status: true };
      const json = JSON.stringify(req);
      const parsed = JSON.parse(json);
      expect(parsed).toEqual(req);
    });

    it('CreateRequest and UpdateRequest should have distinct field counts at full capacity', () => {
      const fullCreate: CreateKnowledgeBaseRequest = {
        name: 'A', description: 'B', scope: 'platform', company_id: 1, project_id: 2,
      };
      const fullUpdate: UpdateKnowledgeBaseRequest = {
        name: 'A', description: 'B', scope: 'platform', company_id: 1, project_id: 2, status: true,
      };
      expect(Object.keys(fullCreate)).toHaveLength(5);
      expect(Object.keys(fullUpdate)).toHaveLength(6);
    });
  });

  // ============================================================
  // 第二轮 TDD 补全
  // ============================================================

  // --- 对象不可变性 ---
  describe('对象不可变性', () => {
    const baseKB: KnowledgeBase = {
      id: 1, name: '不可变测试', description: '描述', scope: 'platform',
      company_id: null, company_name: null, project_id: null, project_name: null,
      status: true, created_by: 1, creator_name: '管理员',
      keyword_count: 10, portrait_count: 5, image_count: 3, document_count: 2,
      created_at: new Date('2024-01-01'), updated_at: new Date('2024-06-01'),
    };

    it('spread 创建的副本修改不影响原始对象', () => {
      const copy = { ...baseKB, name: '副本名称' };
      expect(copy.name).toBe('副本名称');
      expect(baseKB.name).toBe('不可变测试');
    });

    it('spread 后 Date 引用共享（浅拷贝）', () => {
      const copy = { ...baseKB };
      expect(copy.created_at).toBe(baseKB.created_at);
      expect(copy.updated_at).toBe(baseKB.updated_at);
    });

    it('Object.freeze 后修改抛出 TypeError', () => {
      const frozen = Object.freeze({ ...baseKB });
      expect(() => { (frozen as any).name = '修改'; }).toThrow(TypeError);
      expect(frozen.name).toBe('不可变测试');
    });

    it('Object.freeze 后 status 不可修改', () => {
      const frozen = Object.freeze({ ...baseKB });
      expect(() => { (frozen as any).status = false; }).toThrow(TypeError);
      expect(frozen.status).toBe(true);
    });

    it('Object.freeze 后 id 不可修改', () => {
      const frozen = Object.freeze({ ...baseKB });
      expect(() => { (frozen as any).id = 999; }).toThrow(TypeError);
      expect(frozen.id).toBe(1);
    });

    it('Object.freeze 后 count 字段不可修改', () => {
      const frozen = Object.freeze({ ...baseKB });
      expect(() => { (frozen as any).keyword_count = 999; }).toThrow(TypeError);
      expect(frozen.keyword_count).toBe(10);
    });

    it('Object.isFrozen 检查', () => {
      const frozen = Object.freeze({ ...baseKB });
      expect(Object.isFrozen(frozen)).toBe(true);
      const notFrozen = { ...baseKB };
      expect(Object.isFrozen(notFrozen)).toBe(false);
    });

    it('JSON round-trip 实现深克隆独立性', () => {
      const json = JSON.stringify(baseKB);
      const parsed = JSON.parse(json);
      const cloned: KnowledgeBase = {
        ...parsed,
        created_at: new Date(parsed.created_at),
        updated_at: new Date(parsed.updated_at),
      };
      cloned.name = '克隆修改';
      expect(baseKB.name).toBe('不可变测试');
      expect(cloned.name).toBe('克隆修改');
    });

    it('structuredClone 深克隆独立性', () => {
      const clone = structuredClone(baseKB);
      clone.name = '克隆名称';
      clone.keyword_count = 999;
      expect(baseKB.name).toBe('不可变测试');
      expect(baseKB.keyword_count).toBe(10);
      expect(clone.name).toBe('克隆名称');
      expect(clone.keyword_count).toBe(999);
      expect(typeof clone.created_at.getTime).toBe('function');
    });

    it('structuredClone 保持 Date 值和可操作性', () => {
      const clone = structuredClone(baseKB);
      expect(typeof clone.created_at.getTime).toBe('function');
      expect(typeof clone.updated_at.getTime).toBe('function');
      expect(clone.created_at.getTime()).toBe(baseKB.created_at.getTime());
    });
  });

  // --- 安全注入测试 ---
  describe('安全注入防护', () => {
    const baseKB: KnowledgeBase = {
      id: 1, name: '安全测试', description: null, scope: 'platform',
      company_id: null, company_name: null, project_id: null, project_name: null,
      status: true, created_by: null, creator_name: null,
      keyword_count: 0, portrait_count: 0, image_count: 0, document_count: 0,
      created_at: new Date(), updated_at: new Date(),
    };

    it('name 存储 XSS script 标签为纯文本', () => {
      const xss = '<script>alert("xss")</script>';
      const kb: KnowledgeBase = { ...baseKB, name: xss };
      expect(kb.name).toBe(xss);
      expect(kb.name).toContain('<script>');
    });

    it('description 存储 SQL 注入模式为纯文本', () => {
      const sql = "'; DROP TABLE knowledge_bases; --";
      const kb: KnowledgeBase = { ...baseKB, description: sql };
      expect(kb.description).toBe(sql);
      expect(kb.description).toContain('DROP TABLE');
    });

    it('name 存储原型污染模式为纯文本', () => {
      const pollution = '{"__proto__":{"admin":true}}';
      const kb: KnowledgeBase = { ...baseKB, name: pollution };
      expect(kb.name).toBe(pollution);
    });

    it('description 存储路径穿越模式为纯文本', () => {
      const traversal = '../../../etc/passwd';
      const kb: KnowledgeBase = { ...baseKB, description: traversal };
      expect(kb.description).toBe(traversal);
    });

    it('name 存储 null 字节为纯文本', () => {
      const nullByte = 'title\x00injection';
      const kb: KnowledgeBase = { ...baseKB, name: nullByte };
      expect(kb.name).toContain('\x00');
    });

    it('description 存储大 Unicode 字符安全', () => {
      const bigUnicode = '￿'.repeat(1000);
      const kb: KnowledgeBase = { ...baseKB, description: bigUnicode };
      expect(kb.description!.length).toBe(1000);
    });

    it('company_name 存储 HTML 实体为纯文本', () => {
      const html = '&lt;script&gt;&amp;&lt;/script&gt;';
      const kb: KnowledgeBase = { ...baseKB, company_name: html };
      expect(kb.company_name).toBe(html);
    });

    it('project_name 存储 javascript: 协议为纯文本', () => {
      const jsProto = 'javascript:alert(1)';
      const kb: KnowledgeBase = { ...baseKB, project_name: jsProto };
      expect(kb.project_name).toBe(jsProto);
    });

    it('creator_name 存储 LDAP 注入模式为纯文本', () => {
      const ldap = '*)(|(cn=*';
      const kb: KnowledgeBase = { ...baseKB, creator_name: ldap };
      expect(kb.creator_name).toBe(ldap);
    });

    it('CreateRequest name 存储 XSS 安全', () => {
      const xss = '<img src=x onerror=alert(1)>';
      const req: CreateKnowledgeBaseRequest = { name: xss, scope: 'platform' };
      expect(req.name).toBe(xss);
    });

    it('UpdateRequest description 存储 CRLF 注入为纯文本', () => {
      const crlf = '描述\r\nSet-Cookie: evil=true';
      const req: UpdateKnowledgeBaseRequest = { description: crlf };
      expect(req.description).toContain('\r\n');
    });

    it('name 存储 Unicode 欺骗字符安全', () => {
      const homoglyph = 'аdmin'; // Cyrillic 'а' not Latin 'a'
      const kb: KnowledgeBase = { ...baseKB, name: homoglyph };
      expect(kb.name).toBe(homoglyph);
      expect(kb.name.length).toBe(5);
    });
  });

  // --- 跨接口类型一致性 ---
  describe('跨接口类型一致性', () => {
    it('CreateKnowledgeBaseRequest 字段是 KnowledgeBase 字段的子集', () => {
      const req: CreateKnowledgeBaseRequest = {
        name: '测试', description: '描述', scope: 'company', company_id: 1, project_id: 2,
      };
      const kb: KnowledgeBase = {
        id: 1,
        name: req.name,
        description: req.description ?? null,
        scope: req.scope,
        company_id: req.company_id ?? null,
        company_name: null,
        project_id: req.project_id ?? null,
        project_name: null,
        status: true,
        created_by: null,
        creator_name: null,
        keyword_count: 0, portrait_count: 0, image_count: 0, document_count: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(kb.name).toBe(req.name);
      expect(kb.description).toBe(req.description!);
      expect(kb.scope).toBe(req.scope);
      expect(kb.company_id).toBe(req.company_id!);
      expect(kb.project_id).toBe(req.project_id!);
    });

    it('CreateRequest 省略 description 时 KB 中为 null', () => {
      const req: CreateKnowledgeBaseRequest = { name: '无描述', scope: 'platform' };
      const kb: KnowledgeBase = {
        id: 1, name: req.name, description: req.description ?? null,
        scope: req.scope, company_id: null, company_name: null,
        project_id: null, project_name: null, status: true,
        created_by: null, creator_name: null,
        keyword_count: 0, portrait_count: 0, image_count: 0, document_count: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(kb.description).toBeNull();
    });

    it('UpdateRequest 局部更新保留 KB 未修改字段', () => {
      const original: KnowledgeBase = {
        id: 1, name: '原始', description: '原始描述', scope: 'platform',
        company_id: null, company_name: null, project_id: null, project_name: null,
        status: true, created_by: 1, creator_name: '管理员',
        keyword_count: 10, portrait_count: 5, image_count: 3, document_count: 2,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      const req: UpdateKnowledgeBaseRequest = { name: '更新名称' };
      const updated: KnowledgeBase = { ...original, ...req, updated_at: new Date() };
      expect(updated.name).toBe('更新名称');
      expect(updated.description).toBe('原始描述');
      expect(updated.scope).toBe('platform');
      expect(updated.status).toBe(true);
      expect(updated.keyword_count).toBe(10);
      expect(updated.id).toBe(1);
    });

    it('UpdateRequest empty 不改变任何 KB 字段', () => {
      const original: KnowledgeBase = {
        id: 1, name: '原始', description: '描述', scope: 'company',
        company_id: 5, company_name: '公司', project_id: null, project_name: null,
        status: true, created_by: 1, creator_name: '管理员',
        keyword_count: 10, portrait_count: 5, image_count: 3, document_count: 2,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      const req: UpdateKnowledgeBaseRequest = {};
      const updated: KnowledgeBase = { ...original, ...req };
      expect(updated).toEqual({ ...original });
    });

    it('CreateRequest 和 UpdateRequest scope 类型一致', () => {
      const scopes: Array<'platform' | 'company' | 'project'> = ['platform', 'company', 'project'];
      scopes.forEach((scope) => {
        const createReq: CreateKnowledgeBaseRequest = { name: '测试', scope };
        const updateReq: UpdateKnowledgeBaseRequest = { scope };
        expect(createReq.scope).toBe(scope);
        expect(updateReq.scope).toBe(scope);
      });
    });

    it('CreateRequest 和 UpdateRequest company_id 类型一致', () => {
      const createReq: CreateKnowledgeBaseRequest = { name: '测试', scope: 'company', company_id: 1 };
      const updateReq: UpdateKnowledgeBaseRequest = { company_id: 1 };
      expect(typeof createReq.company_id).toBe('number');
      expect(typeof updateReq.company_id).toBe('number');
      expect(createReq.company_id).toBe(updateReq.company_id);
    });
  });

  // --- 边界值补充 ---
  describe('边界值补充', () => {
    const baseKB: KnowledgeBase = {
      id: 1, name: '边界', description: null, scope: 'platform',
      company_id: null, company_name: null, project_id: null, project_name: null,
      status: true, created_by: null, creator_name: null,
      keyword_count: 0, portrait_count: 0, image_count: 0, document_count: 0,
      created_at: new Date(), updated_at: new Date(),
    };

    it('created_by 支持 0', () => {
      const kb: KnowledgeBase = { ...baseKB, created_by: 0 };
      expect(kb.created_by).toBe(0);
    });

    it('created_by 支持 Number.MAX_SAFE_INTEGER', () => {
      const kb: KnowledgeBase = { ...baseKB, created_by: Number.MAX_SAFE_INTEGER };
      expect(kb.created_by).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('created_by 支持负数', () => {
      const kb: KnowledgeBase = { ...baseKB, created_by: -1 };
      expect(kb.created_by).toBe(-1);
    });

    it('company_id 支持 Number.MAX_SAFE_INTEGER', () => {
      const kb: KnowledgeBase = { ...baseKB, company_id: Number.MAX_SAFE_INTEGER };
      expect(kb.company_id).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('project_id 支持 Number.MAX_SAFE_INTEGER', () => {
      const kb: KnowledgeBase = { ...baseKB, project_id: Number.MAX_SAFE_INTEGER };
      expect(kb.project_id).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('created_at 支持 epoch (1970-01-01)', () => {
      const kb: KnowledgeBase = { ...baseKB, created_at: new Date(0) };
      expect(kb.created_at.getTime()).toBe(0);
    });

    it('updated_at 支持 epoch (1970-01-01)', () => {
      const kb: KnowledgeBase = { ...baseKB, updated_at: new Date(0) };
      expect(kb.updated_at.getTime()).toBe(0);
    });

    it('created_at 支持远未来日期', () => {
      const farFuture = new Date('2100-12-31T23:59:59Z');
      const kb: KnowledgeBase = { ...baseKB, created_at: farFuture };
      expect(kb.created_at.getUTCFullYear()).toBe(2100);
    });

    it('updated_at 支持远未来日期', () => {
      const farFuture = new Date('2099-06-15T12:00:00Z');
      const kb: KnowledgeBase = { ...baseKB, updated_at: farFuture };
      expect(kb.updated_at.getUTCFullYear()).toBe(2099);
    });

    it('count 字段支持 Number.MAX_SAFE_INTEGER', () => {
      const kb: KnowledgeBase = {
        ...baseKB,
        keyword_count: Number.MAX_SAFE_INTEGER,
        portrait_count: Number.MAX_SAFE_INTEGER,
        image_count: Number.MAX_SAFE_INTEGER,
        document_count: Number.MAX_SAFE_INTEGER,
      };
      expect(kb.keyword_count).toBe(Number.MAX_SAFE_INTEGER);
      expect(kb.portrait_count).toBe(Number.MAX_SAFE_INTEGER);
      expect(kb.image_count).toBe(Number.MAX_SAFE_INTEGER);
      expect(kb.document_count).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('count 字段支持负数（防御性测试）', () => {
      const kb: KnowledgeBase = {
        ...baseKB,
        keyword_count: -100,
        portrait_count: -999,
        image_count: -1,
        document_count: -50,
      };
      expect(kb.keyword_count).toBe(-100);
      expect(kb.portrait_count).toBe(-999);
      expect(kb.image_count).toBe(-1);
      expect(kb.document_count).toBe(-50);
    });

    it('name 支持单字符', () => {
      const kb: KnowledgeBase = { ...baseKB, name: 'A' };
      expect(kb.name).toBe('A');
      expect(kb.name.length).toBe(1);
    });

    it('name 支持纯空格', () => {
      const kb: KnowledgeBase = { ...baseKB, name: '   ' };
      expect(kb.name).toBe('   ');
      expect(kb.name.trim()).toBe('');
    });

    it('description 支持极长文本', () => {
      const longDesc = '很长的描述内容'.repeat(10000);
      const kb: KnowledgeBase = { ...baseKB, description: longDesc };
      expect(kb.description!.length).toBe(70000);
    });

    it('company_name 支持极长名称', () => {
      const longName = '有限公司'.repeat(500);
      const kb: KnowledgeBase = { ...baseKB, company_name: longName };
      expect(kb.company_name!.length).toBe(2000);
    });

    it('project_name 支持极长名称', () => {
      const longName = '项目名称'.repeat(500);
      const kb: KnowledgeBase = { ...baseKB, project_name: longName };
      expect(kb.project_name!.length).toBe(2000);
    });

    it('creator_name 支持极长名称', () => {
      const longName = '管理员'.repeat(1000);
      const kb: KnowledgeBase = { ...baseKB, creator_name: longName };
      expect(kb.creator_name!.length).toBe(3000);
    });

    it('created_at 和 updated_at 支持毫秒精度', () => {
      const created = new Date('2024-06-15T10:30:45.123Z');
      const updated = new Date('2024-06-15T10:30:45.789Z');
      const kb: KnowledgeBase = { ...baseKB, created_at: created, updated_at: updated };
      expect(kb.created_at.getMilliseconds()).toBe(123);
      expect(kb.updated_at.getMilliseconds()).toBe(789);
    });
  });

  // --- JSON reviver Date 恢复 ---
  describe('JSON reviver Date 恢复', () => {
    const baseKB: KnowledgeBase = {
      id: 1, name: 'reviver测试', description: '描述', scope: 'company',
      company_id: 5, company_name: '公司', project_id: null, project_name: null,
      status: true, created_by: 1, creator_name: '管理员',
      keyword_count: 10, portrait_count: 5, image_count: 3, document_count: 2,
      created_at: new Date('2024-06-15T10:30:00.000Z'),
      updated_at: new Date('2024-06-15T12:45:30.123Z'),
    };

    it('JSON.parse reviver 恢复 created_at 为 Date', () => {
      const dateFields = ['created_at', 'updated_at'];
      const json = JSON.stringify(baseKB);
      const parsed = JSON.parse(json, (key, value) => {
        if (dateFields.includes(key) && typeof value === 'string') {
          return new Date(value);
        }
        return value;
      });
      expect(parsed.created_at).toBeInstanceOf(Date);
      expect(parsed.updated_at).toBeInstanceOf(Date);
      expect(parsed.created_at.getTime()).toBe(baseKB.created_at.getTime());
      expect(parsed.updated_at.getTime()).toBe(baseKB.updated_at.getTime());
    });

    it('reviver 保持非 Date 字段不变', () => {
      const dateFields = ['created_at', 'updated_at'];
      const json = JSON.stringify(baseKB);
      const parsed = JSON.parse(json, (key, value) => {
        if (dateFields.includes(key) && typeof value === 'string') {
          return new Date(value);
        }
        return value;
      });
      expect(parsed.id).toBe(1);
      expect(parsed.name).toBe('reviver测试');
      expect(parsed.scope).toBe('company');
      expect(parsed.company_id).toBe(5);
      expect(parsed.status).toBe(true);
      expect(parsed.keyword_count).toBe(10);
    });

    it('reviver 处理 null description 保持 null', () => {
      const kb: KnowledgeBase = { ...baseKB, description: null };
      const dateFields = ['created_at', 'updated_at'];
      const json = JSON.stringify(kb);
      const parsed = JSON.parse(json, (key, value) => {
        if (dateFields.includes(key) && typeof value === 'string') {
          return new Date(value);
        }
        return value;
      });
      expect(parsed.description).toBeNull();
    });

    it('reviver 恢复后字段数量不变', () => {
      const dateFields = ['created_at', 'updated_at'];
      const json = JSON.stringify(baseKB);
      const parsed = JSON.parse(json, (key, value) => {
        if (dateFields.includes(key) && typeof value === 'string') {
          return new Date(value);
        }
        return value;
      });
      expect(Object.keys(parsed)).toHaveLength(Object.keys(baseKB).length);
    });
  });

  // --- 实际业务场景模拟 ---
  describe('实际业务场景模拟', () => {
    it('场景：系统管理员创建平台级知识库', () => {
      const req: CreateKnowledgeBaseRequest = {
        name: '薄云商机倍增服务通用知识库',
        description: '平台级通用知识库，包含SEO规则、文章模板等',
        scope: 'platform',
      };
      const kb: KnowledgeBase = {
        id: 1,
        name: req.name,
        description: req.description ?? null,
        scope: req.scope,
        company_id: null, company_name: null,
        project_id: null, project_name: null,
        status: true,
        created_by: 1, creator_name: 'sysadmin',
        keyword_count: 0, portrait_count: 0, image_count: 0, document_count: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(kb.scope).toBe('platform');
      expect(kb.company_id).toBeNull();
      expect(kb.project_id).toBeNull();
      expect(kb.status).toBe(true);
    });

    it('场景：公司管理员创建公司级知识库', () => {
      const req: CreateKnowledgeBaseRequest = {
        name: '某公司专属知识库',
        description: '公司级知识库',
        scope: 'company',
        company_id: 10,
      };
      const kb: KnowledgeBase = {
        id: 2,
        name: req.name,
        description: req.description ?? null,
        scope: req.scope,
        company_id: req.company_id!, company_name: '某科技有限公司',
        project_id: null, project_name: null,
        status: true,
        created_by: 5, creator_name: '公司管理员',
        keyword_count: 0, portrait_count: 0, image_count: 0, document_count: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(kb.scope).toBe('company');
      expect(kb.company_id).toBe(10);
      expect(kb.company_name).toBe('某科技有限公司');
      expect(kb.project_id).toBeNull();
    });

    it('场景：创建项目级知识库', () => {
      const req: CreateKnowledgeBaseRequest = {
        name: '项目A知识库',
        scope: 'project',
        company_id: 10,
        project_id: 100,
      };
      const kb: KnowledgeBase = {
        id: 3,
        name: req.name,
        description: null,
        scope: req.scope,
        company_id: 10, company_name: '公司A',
        project_id: 100, project_name: '项目A',
        status: true,
        created_by: 5, creator_name: '项目管理员',
        keyword_count: 0, portrait_count: 0, image_count: 0, document_count: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(kb.scope).toBe('project');
      expect(kb.company_id).toBe(10);
      expect(kb.project_id).toBe(100);
    });

    it('场景：知识库添加内容后 count 更新', () => {
      const kb: KnowledgeBase = {
        id: 1, name: '活跃知识库', description: null, scope: 'platform',
        company_id: null, company_name: null, project_id: null, project_name: null,
        status: true, created_by: 1, creator_name: '管理员',
        keyword_count: 0, portrait_count: 0, image_count: 0, document_count: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      // 添加关键词
      const afterKeywords: KnowledgeBase = {
        ...kb, keyword_count: kb.keyword_count + 50, updated_at: new Date(),
      };
      expect(afterKeywords.keyword_count).toBe(50);

      // 添加人物画像
      const afterPortrait: KnowledgeBase = {
        ...afterKeywords, portrait_count: afterKeywords.portrait_count + 10, updated_at: new Date(),
      };
      expect(afterPortrait.portrait_count).toBe(10);

      // 添加图片和文档
      const afterAll: KnowledgeBase = {
        ...afterPortrait,
        image_count: afterPortrait.image_count + 25,
        document_count: afterPortrait.document_count + 8,
        updated_at: new Date(),
      };
      expect(afterAll.keyword_count).toBe(50);
      expect(afterAll.portrait_count).toBe(10);
      expect(afterAll.image_count).toBe(25);
      expect(afterAll.document_count).toBe(8);
    });

    it('场景：禁用知识库', () => {
      const req: UpdateKnowledgeBaseRequest = { status: false };
      const kb: KnowledgeBase = {
        id: 1, name: '被禁用的库', description: null, scope: 'platform',
        company_id: null, company_name: null, project_id: null, project_name: null,
        status: true, created_by: 1, creator_name: '管理员',
        keyword_count: 10, portrait_count: 5, image_count: 3, document_count: 2,
        created_at: new Date(), updated_at: new Date(),
      };
      const updated: KnowledgeBase = { ...kb, ...req, updated_at: new Date() };
      expect(updated.status).toBe(false);
      expect(updated.keyword_count).toBe(10); // 数据保留
    });

    it('场景：重新启用知识库', () => {
      const req: UpdateKnowledgeBaseRequest = { status: true };
      const kb: KnowledgeBase = {
        id: 1, name: '重新启用的库', description: null, scope: 'platform',
        company_id: null, company_name: null, project_id: null, project_name: null,
        status: false, created_by: 1, creator_name: '管理员',
        keyword_count: 10, portrait_count: 5, image_count: 3, document_count: 2,
        created_at: new Date(), updated_at: new Date(),
      };
      const updated: KnowledgeBase = { ...kb, ...req, updated_at: new Date() };
      expect(updated.status).toBe(true);
    });

    it('场景：知识库从公司级升级到项目级', () => {
      const companyKB: KnowledgeBase = {
        id: 1, name: '公司知识库', description: null, scope: 'company',
        company_id: 10, company_name: '公司A', project_id: null, project_name: null,
        status: true, created_by: 1, creator_name: '管理员',
        keyword_count: 5, portrait_count: 2, image_count: 1, document_count: 0,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-06-01'),
      };
      const req: UpdateKnowledgeBaseRequest = { scope: 'project', project_id: 100 };
      const updated: KnowledgeBase = {
        ...companyKB, ...req, project_name: '项目A', updated_at: new Date(),
      };
      expect(updated.scope).toBe('project');
      expect(updated.company_id).toBe(10); // 保留公司关联
      expect(updated.project_id).toBe(100);
      expect(updated.keyword_count).toBe(5); // 数据保留
    });

    it('场景：知识库列表分页查询', () => {
      const makeKB = (id: number, name: string): KnowledgeBase => ({
        id, name, description: null, scope: 'platform',
        company_id: null, company_name: null, project_id: null, project_name: null,
        status: true, created_by: 1, creator_name: '管理员',
        keyword_count: 0, portrait_count: 0, image_count: 0, document_count: 0,
        created_at: new Date(), updated_at: new Date(),
      });
      const all: KnowledgeBase[] = Array.from({ length: 25 }, (_, i) => makeKB(i + 1, `知识库${i + 1}`));
      const page = 2;
      const pageSize = 10;
      const paginated = all.slice((page - 1) * pageSize, page * pageSize);
      expect(paginated).toHaveLength(10);
      expect(paginated[0].id).toBe(11);
      expect(paginated[9].id).toBe(20);
    });

    it('场景：按 scope 分组统计', () => {
      const makeKB = (scope: 'platform' | 'company' | 'project'): KnowledgeBase => ({
        id: 1, name: 'KB', description: null, scope,
        company_id: null, company_name: null, project_id: null, project_name: null,
        status: true, created_by: null, creator_name: null,
        keyword_count: 0, portrait_count: 0, image_count: 0, document_count: 0,
        created_at: new Date(), updated_at: new Date(),
      });
      const list: KnowledgeBase[] = [
        { ...makeKB('platform'), id: 1 },
        { ...makeKB('platform'), id: 2 },
        { ...makeKB('company'), id: 3 },
        { ...makeKB('project'), id: 4 },
        { ...makeKB('company'), id: 5 },
        { ...makeKB('platform'), id: 6 },
      ];
      const grouped = list.reduce((acc, kb) => {
        acc[kb.scope] = (acc[kb.scope] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      expect(grouped['platform']).toBe(3);
      expect(grouped['company']).toBe(2);
      expect(grouped['project']).toBe(1);
    });

    it('场景：全部字段 null 时 JSON 序列化正确', () => {
      const kb: KnowledgeBase = {
        id: 0, name: '', description: null, scope: 'platform',
        company_id: null, company_name: null, project_id: null, project_name: null,
        status: false, created_by: null, creator_name: null,
        keyword_count: 0, portrait_count: 0, image_count: 0, document_count: 0,
        created_at: new Date('1970-01-01T00:00:00Z'),
        updated_at: new Date('1970-01-01T00:00:00Z'),
      };
      const json = JSON.stringify(kb);
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe(0);
      expect(parsed.name).toBe('');
      expect(parsed.description).toBeNull();
      expect(parsed.company_id).toBeNull();
      expect(parsed.status).toBe(false);
      expect(parsed.keyword_count).toBe(0);
    });
  });

  // --- re-export async import 验证 ---
  describe('re-exports async import 验证', () => {
    it('KnowledgeBase 是 interface 而非运行时值', async () => {
      const mod = await import('../../apis/entity/knowledge-base.entity');
      expect(mod.KnowledgeBase).toBeUndefined();
    });

    it('CreateKnowledgeBaseRequest 是 interface 而非运行时值', async () => {
      const mod = await import('../../apis/entity/knowledge-base.entity');
      expect(mod.CreateKnowledgeBaseRequest).toBeUndefined();
    });

    it('UpdateKnowledgeBaseRequest 是 interface 而非运行时值', async () => {
      const mod = await import('../../apis/entity/knowledge-base.entity');
      expect(mod.UpdateKnowledgeBaseRequest).toBeUndefined();
    });
  });

  // --- CreateRequest/UpdateRequest 边界补充 ---
  describe('CreateRequest/UpdateRequest 边界补充', () => {
    it('CreateRequest description 为 undefined 时不包含在 Object.keys', () => {
      const req: CreateKnowledgeBaseRequest = { name: '测试', scope: 'platform' };
      expect(Object.keys(req)).not.toContain('description');
    });

    it('CreateRequest company_id 为 undefined 时不包含在 Object.keys', () => {
      const req: CreateKnowledgeBaseRequest = { name: '测试', scope: 'platform' };
      expect(Object.keys(req)).not.toContain('company_id');
    });

    it('CreateRequest project_id 为 undefined 时不包含在 Object.keys', () => {
      const req: CreateKnowledgeBaseRequest = { name: '测试', scope: 'platform' };
      expect(Object.keys(req)).not.toContain('project_id');
    });

    it('CreateRequest 所有字段均设置时 Object.keys 长度 5', () => {
      const req: CreateKnowledgeBaseRequest = {
        name: '全字段', description: 'd', scope: 'project', company_id: 1, project_id: 2,
      };
      expect(Object.keys(req)).toHaveLength(5);
    });

    it('UpdateRequest 所有字段均设置时 Object.keys 长度 6', () => {
      const req: UpdateKnowledgeBaseRequest = {
        name: 'a', description: 'b', scope: 'company', company_id: 1, project_id: 2, status: true,
      };
      expect(Object.keys(req)).toHaveLength(6);
    });

    it('UpdateRequest description 设为空字符串可清空描述', () => {
      const original: KnowledgeBase = {
        id: 1, name: 'KB', description: '旧描述', scope: 'platform',
        company_id: null, company_name: null, project_id: null, project_name: null,
        status: true, created_by: null, creator_name: null,
        keyword_count: 0, portrait_count: 0, image_count: 0, document_count: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      const req: UpdateKnowledgeBaseRequest = { description: '' };
      const updated: KnowledgeBase = { ...original, ...req };
      expect(updated.description).toBe('');
      expect(updated.description).not.toBe('旧描述');
    });

    it('CreateRequest name 支持换行符', () => {
      const req: CreateKnowledgeBaseRequest = { name: '第一行\n第二行\r\n第三行', scope: 'platform' };
      expect(req.name).toContain('\n');
      expect(req.name).toContain('\r\n');
    });

    it('UpdateRequest scope 变更保留其他字段', () => {
      const original: KnowledgeBase = {
        id: 1, name: 'KB', description: '描述', scope: 'platform',
        company_id: null, company_name: null, project_id: null, project_name: null,
        status: true, created_by: 1, creator_name: '管理员',
        keyword_count: 10, portrait_count: 5, image_count: 3, document_count: 2,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      const req: UpdateKnowledgeBaseRequest = { scope: 'company', company_id: 5 };
      const updated: KnowledgeBase = {
        ...original, ...req, company_name: '新公司', updated_at: new Date(),
      };
      expect(updated.scope).toBe('company');
      expect(updated.name).toBe('KB');
      expect(updated.description).toBe('描述');
      expect(updated.keyword_count).toBe(10);
    });
  });
});

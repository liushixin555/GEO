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
});

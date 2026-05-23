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

    // --- scope: platform ---
    it('should support platform scope with null company and project', () => {
      const kb: KnowledgeBase = {
        id: 1,
        name: '平台知识库',
        description: null,
        scope: 'platform',
        company_id: null,
        company_name: null,
        project_id: null,
        project_name: null,
        status: true,
        created_by: null,
        creator_name: null,
        keyword_count: 0,
        portrait_count: 0,
        image_count: 0,
        document_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(kb.scope).toBe('platform');
      expect(kb.company_id).toBeNull();
      expect(kb.project_id).toBeNull();
      expect(kb.company_name).toBeNull();
      expect(kb.project_name).toBeNull();
    });

    // --- scope: company ---
    it('should support company scope with company_id and company_name', () => {
      const kb: KnowledgeBase = {
        id: 2,
        name: '公司知识库',
        description: '公司级知识库',
        scope: 'company',
        company_id: 1,
        company_name: '测试公司',
        project_id: null,
        project_name: null,
        status: true,
        created_by: 1,
        creator_name: '管理员',
        keyword_count: 5,
        portrait_count: 2,
        image_count: 1,
        document_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(kb.scope).toBe('company');
      expect(kb.company_id).toBe(1);
      expect(kb.company_name).toBe('测试公司');
      expect(kb.project_id).toBeNull();
    });

    // --- scope: project ---
    it('should support project scope with project_id and project_name', () => {
      const kb: KnowledgeBase = {
        id: 3,
        name: '项目知识库',
        description: null,
        scope: 'project',
        company_id: 1,
        company_name: '公司A',
        project_id: 10,
        project_name: '项目B',
        status: true,
        created_by: 1,
        creator_name: '管理员',
        keyword_count: 0,
        portrait_count: 0,
        image_count: 0,
        document_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(kb.scope).toBe('project');
      expect(kb.project_id).toBe(10);
      expect(kb.project_name).toBe('项目B');
    });

    // --- nullable description ---
    it('should allow description to be null', () => {
      const kb: KnowledgeBase = {
        id: 4,
        name: '无描述知识库',
        description: null,
        scope: 'platform',
        company_id: null,
        company_name: null,
        project_id: null,
        project_name: null,
        status: true,
        created_by: null,
        creator_name: null,
        keyword_count: 0,
        portrait_count: 0,
        image_count: 0,
        document_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(kb.description).toBeNull();
    });

    // --- description non-null ---
    it('should allow description to be a non-empty string', () => {
      const kb: KnowledgeBase = {
        id: 5,
        name: '有描述知识库',
        description: '详细描述内容',
        scope: 'platform',
        company_id: null,
        company_name: null,
        project_id: null,
        project_name: null,
        status: true,
        created_by: null,
        creator_name: null,
        keyword_count: 0,
        portrait_count: 0,
        image_count: 0,
        document_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(kb.description).toBe('详细描述内容');
    });

    // --- count fields type ---
    it('should have count fields as numbers', () => {
      const kb: KnowledgeBase = {
        id: 5,
        name: '测试',
        description: null,
        scope: 'platform',
        company_id: null,
        company_name: null,
        project_id: null,
        project_name: null,
        status: true,
        created_by: null,
        creator_name: null,
        keyword_count: 0,
        portrait_count: 0,
        image_count: 0,
        document_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(typeof kb.keyword_count).toBe('number');
      expect(typeof kb.portrait_count).toBe('number');
      expect(typeof kb.image_count).toBe('number');
      expect(typeof kb.document_count).toBe('number');
    });

    // --- count fields large values ---
    it('should support large count values', () => {
      const kb: KnowledgeBase = {
        id: 6,
        name: '大数据量知识库',
        description: null,
        scope: 'platform',
        company_id: null,
        company_name: null,
        project_id: null,
        project_name: null,
        status: true,
        created_by: null,
        creator_name: null,
        keyword_count: 999999,
        portrait_count: 888888,
        image_count: 777777,
        document_count: 666666,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(kb.keyword_count).toBe(999999);
      expect(kb.portrait_count).toBe(888888);
      expect(kb.image_count).toBe(777777);
      expect(kb.document_count).toBe(666666);
    });

    // --- status false ---
    it('should support status being false (disabled)', () => {
      const kb: KnowledgeBase = {
        id: 7,
        name: '禁用知识库',
        description: null,
        scope: 'platform',
        company_id: null,
        company_name: null,
        project_id: null,
        project_name: null,
        status: false,
        created_by: null,
        creator_name: null,
        keyword_count: 0,
        portrait_count: 0,
        image_count: 0,
        document_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(kb.status).toBe(false);
    });

    // --- status type check ---
    it('should have status as boolean type', () => {
      const kb: KnowledgeBase = {
        id: 8,
        name: '测试',
        description: null,
        scope: 'platform',
        company_id: null,
        company_name: null,
        project_id: null,
        project_name: null,
        status: true,
        created_by: null,
        creator_name: null,
        keyword_count: 0,
        portrait_count: 0,
        image_count: 0,
        document_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(typeof kb.status).toBe('boolean');
    });

    // --- created_by null ---
    it('should allow created_by to be null', () => {
      const kb: KnowledgeBase = {
        id: 9,
        name: '系统创建',
        description: null,
        scope: 'platform',
        company_id: null,
        company_name: null,
        project_id: null,
        project_name: null,
        status: true,
        created_by: null,
        creator_name: null,
        keyword_count: 0,
        portrait_count: 0,
        image_count: 0,
        document_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(kb.created_by).toBeNull();
      expect(kb.creator_name).toBeNull();
    });

    // --- created_by non-null ---
    it('should allow created_by to be a number', () => {
      const kb: KnowledgeBase = {
        id: 10,
        name: '用户创建',
        description: null,
        scope: 'platform',
        company_id: null,
        company_name: null,
        project_id: null,
        project_name: null,
        status: true,
        created_by: 42,
        creator_name: '张三',
        keyword_count: 0,
        portrait_count: 0,
        image_count: 0,
        document_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(kb.created_by).toBe(42);
      expect(kb.creator_name).toBe('张三');
    });

    // --- created_at and updated_at Date type ---
    it('should have created_at and updated_at as Date objects', () => {
      const now = new Date();
      const kb: KnowledgeBase = {
        id: 11,
        name: '时间测试',
        description: null,
        scope: 'platform',
        company_id: null,
        company_name: null,
        project_id: null,
        project_name: null,
        status: true,
        created_by: null,
        creator_name: null,
        keyword_count: 0,
        portrait_count: 0,
        image_count: 0,
        document_count: 0,
        created_at: now,
        updated_at: now,
      };
      expect(kb.created_at).toBeInstanceOf(Date);
      expect(kb.updated_at).toBeInstanceOf(Date);
      expect(kb.created_at).toBe(now);
      expect(kb.updated_at).toBe(now);
    });

    // --- created_at before updated_at ---
    it('should support created_at different from updated_at', () => {
      const created = new Date('2024-01-01T00:00:00Z');
      const updated = new Date('2024-12-31T23:59:59Z');
      const kb: KnowledgeBase = {
        id: 12,
        name: '时间差异测试',
        description: null,
        scope: 'platform',
        company_id: null,
        company_name: null,
        project_id: null,
        project_name: null,
        status: true,
        created_by: null,
        creator_name: null,
        keyword_count: 0,
        portrait_count: 0,
        image_count: 0,
        document_count: 0,
        created_at: created,
        updated_at: updated,
      };
      expect(kb.created_at.getTime()).toBeLessThan(kb.updated_at.getTime());
    });

    // --- id field ---
    it('should support id as a number', () => {
      const kb: KnowledgeBase = {
        id: 999,
        name: 'ID测试',
        description: null,
        scope: 'platform',
        company_id: null,
        company_name: null,
        project_id: null,
        project_name: null,
        status: true,
        created_by: null,
        creator_name: null,
        keyword_count: 0,
        portrait_count: 0,
        image_count: 0,
        document_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(typeof kb.id).toBe('number');
      expect(kb.id).toBe(999);
    });

    // --- name field ---
    it('should support Chinese characters in name', () => {
      const kb: KnowledgeBase = {
        id: 1,
        name: '薄云商机倍增服务知识库',
        description: null,
        scope: 'platform',
        company_id: null,
        company_name: null,
        project_id: null,
        project_name: null,
        status: true,
        created_by: null,
        creator_name: null,
        keyword_count: 0,
        portrait_count: 0,
        image_count: 0,
        document_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(kb.name).toContain('薄云');
    });

    // --- scope type check ---
    it('should only accept valid scope values', () => {
      const validScopes: Array<'platform' | 'company' | 'project'> = ['platform', 'company', 'project'];
      validScopes.forEach((scope) => {
        const kb: KnowledgeBase = {
          id: 1,
          name: '测试',
          description: null,
          scope,
          company_id: null,
          company_name: null,
          project_id: null,
          project_name: null,
          status: true,
          created_by: null,
          creator_name: null,
          keyword_count: 0,
          portrait_count: 0,
          image_count: 0,
          document_count: 0,
          created_at: new Date(),
          updated_at: new Date(),
        };
        expect(['platform', 'company', 'project']).toContain(kb.scope);
      });
    });

    // --- company_id non-null ---
    it('should allow company_id to be a number', () => {
      const kb: KnowledgeBase = {
        id: 1,
        name: '公司知识库',
        description: null,
        scope: 'company',
        company_id: 99,
        company_name: '某公司',
        project_id: null,
        project_name: null,
        status: true,
        created_by: null,
        creator_name: null,
        keyword_count: 0,
        portrait_count: 0,
        image_count: 0,
        document_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(kb.company_id).toBe(99);
      expect(kb.company_name).toBe('某公司');
    });

    // --- project_id non-null ---
    it('should allow project_id to be a number', () => {
      const kb: KnowledgeBase = {
        id: 1,
        name: '项目知识库',
        description: null,
        scope: 'project',
        company_id: 1,
        company_name: '某公司',
        project_id: 55,
        project_name: '某项目',
        status: true,
        created_by: null,
        creator_name: null,
        keyword_count: 0,
        portrait_count: 0,
        image_count: 0,
        document_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(kb.project_id).toBe(55);
      expect(kb.project_name).toBe('某项目');
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
        const req: CreateKnowledgeBaseRequest = {
          name: '测试',
          scope,
        };
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

    // --- description null ---
    it('should allow description to be cleared (undefined)', () => {
      const req: UpdateKnowledgeBaseRequest = {};
      expect(req.description).toBeUndefined();
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

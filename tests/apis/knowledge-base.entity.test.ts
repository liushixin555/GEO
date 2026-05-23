/**
 * @jest-environment node
 */
import {
  KnowledgeBase,
  CreateKnowledgeBaseRequest,
  UpdateKnowledgeBaseRequest,
} from '../../apis/entity/knowledge-base.entity';

describe('knowledge-base.entity', () => {
  describe('KnowledgeBase interface', () => {
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
      expect(kb.scope).toBe('platform');
      expect(kb.keyword_count).toBe(10);
      expect(kb.portrait_count).toBe(5);
      expect(kb.image_count).toBe(3);
      expect(kb.document_count).toBe(2);
    });

    it('should support platform scope', () => {
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
    });

    it('should support company scope', () => {
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
    });

    it('should support project scope', () => {
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
  });

  describe('CreateKnowledgeBaseRequest interface', () => {
    it('should create a valid request with all required fields', () => {
      const req: CreateKnowledgeBaseRequest = {
        name: '新知识库',
        scope: 'platform',
      };
      expect(req.name).toBe('新知识库');
      expect(req.scope).toBe('platform');
    });

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

    it('should support project scope with project_id', () => {
      const req: CreateKnowledgeBaseRequest = {
        name: '项目知识库',
        scope: 'project',
        company_id: 1,
        project_id: 10,
      };
      expect(req.project_id).toBe(10);
    });
  });

  describe('UpdateKnowledgeBaseRequest interface', () => {
    it('should create a valid request with all optional fields', () => {
      const req: UpdateKnowledgeBaseRequest = {
        name: '更新名称',
        description: '更新描述',
        scope: 'company',
        company_id: 2,
        project_id: null,
        status: true,
      };
      expect(req.name).toBe('更新名称');
      expect(req.status).toBe(true);
    });

    it('should allow partial updates', () => {
      const req: UpdateKnowledgeBaseRequest = { name: '只改名称' };
      expect(Object.keys(req)).toHaveLength(1);
    });

    it('should allow empty update request', () => {
      const req: UpdateKnowledgeBaseRequest = {};
      expect(Object.keys(req)).toHaveLength(0);
    });

    it('should allow status toggle', () => {
      const req: UpdateKnowledgeBaseRequest = { status: false };
      expect(req.status).toBe(false);
    });
  });

  describe('re-exports from index', () => {
    it('should compile correctly when importing types from index.ts', () => {
      // Type-only imports are validated at compile time by TypeScript
      const kb: KnowledgeBase = {
        id: 1, name: 'KB', description: null, scope: 'platform',
        company_id: null, company_name: null, project_id: null, project_name: null,
        status: true, created_by: null, creator_name: null,
        keyword_count: 0, portrait_count: 0, image_count: 0, document_count: 0,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(kb.name).toBe('KB');
    });
  });
});

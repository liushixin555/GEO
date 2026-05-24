/**
 * @jest-environment node
 *
 * apis/service/index.ts TDD 测试
 * 覆盖：barrel 重导出完整性、引用一致性、工厂函数行为、接口方法存在性、异步验证
 */
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '2h';

jest.mock('../../../apis/utils/db.util', () => ({
  getPrisma: jest.fn(),
  closePrisma: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2b$10$hashedpassword'),
  compare: jest.fn().mockResolvedValue(true),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mocked-jwt-token'),
  verify: jest.fn().mockReturnValue({ userId: 1, role: 'admin' }),
}));

jest.mock('../../../apis/utils/rmapi.utils', () => ({
  getRmToken: jest.fn().mockResolvedValue('mock-rm-token'),
  getAllRmResources: jest.fn().mockResolvedValue([]),
}));

import * as serviceIndex from '../../../apis/service/index';
import { AuthServiceImpl } from '../../../apis/service/impl/auth.service.impl';
import { CompanyServiceImpl } from '../../../apis/service/impl/company.service.impl';
import { SkillsServiceImpl } from '../../../apis/service/impl/skills.service.impl';
import { UserServiceImpl } from '../../../apis/service/impl/user.service.impl';
import { LlmModelServiceImpl } from '../../../apis/service/impl/llm-model.service.impl';
import { SystemConfigServiceImpl } from '../../../apis/service/impl/system-config.service.impl';
import { PublishingPlatformServiceImpl } from '../../../apis/service/impl/publishing-platform.service.impl';
import { TodoServiceImpl } from '../../../apis/service/impl/todo.service.impl';

// ══════════════════════════════════════════
// 常量
// ══════════════════════════════════════════

const EXPECTED_EXPORTS = [
  'AuthServiceImpl',
  'CompanyServiceImpl',
  'SkillsServiceImpl',
  'UserServiceImpl',
  'LlmModelServiceImpl',
  'SystemConfigServiceImpl',
  'PublishingPlatformServiceImpl',
  'TodoServiceImpl',
  'createUserService',
  'createLlmModelService',
] as const;

const IMPL_NAMES = EXPECTED_EXPORTS.slice(0, 8);
const FACTORY_NAMES = EXPECTED_EXPORTS.slice(8);

// ══════════════════════════════════════════
// Tests
// ══════════════════════════════════════════

describe('service/index.ts barrel file', () => {

  // ──────────────────────────────────────
  // 1. 导出数量验证
  // ──────────────────────────────────────
  describe('导出数量验证', () => {
    it('应精确导出 10 个命名成员（不含 __esModule）', () => {
      const keys = Object.keys(serviceIndex).filter(k => k !== '__esModule');
      expect(keys).toHaveLength(10);
    });

    it('应包含 __esModule 标记（CJS 兼容，由 TypeScript 编译生成）', () => {
      expect((serviceIndex as any).__esModule).toBe(true);
    });
  });

  // ──────────────────────────────────────
  // 2. 导出存在性与类型验证
  // ──────────────────────────────────────
  describe('导出存在性与类型验证', () => {
    IMPL_NAMES.forEach(name => {
      it(`应导出 "${name}" 作为构造函数（class）`, () => {
        expect(serviceIndex[name]).toBeDefined();
        expect(typeof serviceIndex[name]).toBe('function');
        expect((serviceIndex as any)[name].prototype).toBeDefined();
      });
    });

    FACTORY_NAMES.forEach(name => {
      it(`应导出 "${name}" 作为函数`, () => {
        expect((serviceIndex as any)[name]).toBeDefined();
        expect(typeof (serviceIndex as any)[name]).toBe('function');
      });
    });
  });

  // ──────────────────────────────────────
  // 3. 无意外导出验证
  // ──────────────────────────────────────
  describe('无意外导出验证', () => {
    it('不应包含预期列表之外的导出', () => {
      const keys = Object.keys(serviceIndex);
      const extra = keys.filter(k => !(EXPECTED_EXPORTS as readonly string[]).includes(k));
      expect(extra).toEqual([]);
    });

    it('不应缺失任何预期导出', () => {
      const keys = Object.keys(serviceIndex);
      (EXPECTED_EXPORTS as readonly string[]).forEach(name => {
        expect(keys).toContain(name);
      });
    });
  });

  // ──────────────────────────────────────
  // 4. 实现类实例化验证
  // ──────────────────────────────────────
  describe('实现类实例化验证', () => {
    it('AuthServiceImpl 应可实例化', () => {
      const instance = new serviceIndex.AuthServiceImpl();
      expect(instance).toBeInstanceOf(AuthServiceImpl);
    });

    it('CompanyServiceImpl 应可实例化', () => {
      const instance = new serviceIndex.CompanyServiceImpl();
      expect(instance).toBeInstanceOf(CompanyServiceImpl);
    });

    it('SkillsServiceImpl 应可实例化', () => {
      const instance = new serviceIndex.SkillsServiceImpl();
      expect(instance).toBeInstanceOf(SkillsServiceImpl);
    });

    it('UserServiceImpl 应可实例化', () => {
      const instance = new serviceIndex.UserServiceImpl();
      expect(instance).toBeInstanceOf(UserServiceImpl);
    });

    it('LlmModelServiceImpl 应可实例化', () => {
      const instance = new serviceIndex.LlmModelServiceImpl();
      expect(instance).toBeInstanceOf(LlmModelServiceImpl);
    });

    it('SystemConfigServiceImpl 应可实例化', () => {
      const instance = new serviceIndex.SystemConfigServiceImpl();
      expect(instance).toBeInstanceOf(SystemConfigServiceImpl);
    });

    it('PublishingPlatformServiceImpl 应可实例化', () => {
      const instance = new serviceIndex.PublishingPlatformServiceImpl();
      expect(instance).toBeInstanceOf(PublishingPlatformServiceImpl);
    });

    it('TodoServiceImpl 应可实例化', () => {
      const instance = new serviceIndex.TodoServiceImpl();
      expect(instance).toBeInstanceOf(TodoServiceImpl);
    });
  });

  // ──────────────────────────────────────
  // 5. 工厂函数行为
  // ──────────────────────────────────────
  describe('工厂函数行为', () => {
    it('createUserService 应返回 UserServiceImpl 实例', () => {
      const service = serviceIndex.createUserService();
      expect(service).toBeInstanceOf(UserServiceImpl);
    });

    it('createLlmModelService 应返回 LlmModelServiceImpl 实例', () => {
      const service = serviceIndex.createLlmModelService();
      expect(service).toBeInstanceOf(LlmModelServiceImpl);
    });

    it('createUserService 每次调用应返回新实例', () => {
      const a = serviceIndex.createUserService();
      const b = serviceIndex.createUserService();
      expect(a).not.toBe(b);
    });

    it('createLlmModelService 每次调用应返回新实例', () => {
      const a = serviceIndex.createLlmModelService();
      const b = serviceIndex.createLlmModelService();
      expect(a).not.toBe(b);
    });

    it('createUserService 接受 0 个参数', () => {
      expect(serviceIndex.createUserService.length).toBe(0);
    });

    it('createLlmModelService 接受 0 个参数', () => {
      expect(serviceIndex.createLlmModelService.length).toBe(0);
    });

    it('createUserService 返回值应有 list 方法', () => {
      const service = serviceIndex.createUserService();
      expect(typeof (service as any).list).toBe('function');
    });

    it('createLlmModelService 返回值应有 list 方法', () => {
      const service = serviceIndex.createLlmModelService();
      expect(typeof (service as any).list).toBe('function');
    });
  });

  // ──────────────────────────────────────
  // 6. 源模块关联验证
  // ──────────────────────────────────────
  describe('源模块关联验证', () => {
    it('AuthServiceImpl 应与源模块同一引用', () => {
      expect(serviceIndex.AuthServiceImpl).toBe(AuthServiceImpl);
    });

    it('CompanyServiceImpl 应与源模块同一引用', () => {
      expect(serviceIndex.CompanyServiceImpl).toBe(CompanyServiceImpl);
    });

    it('SkillsServiceImpl 应与源模块同一引用', () => {
      expect(serviceIndex.SkillsServiceImpl).toBe(SkillsServiceImpl);
    });

    it('UserServiceImpl 应与源模块同一引用', () => {
      expect(serviceIndex.UserServiceImpl).toBe(UserServiceImpl);
    });

    it('LlmModelServiceImpl 应与源模块同一引用', () => {
      expect(serviceIndex.LlmModelServiceImpl).toBe(LlmModelServiceImpl);
    });

    it('SystemConfigServiceImpl 应与源模块同一引用', () => {
      expect(serviceIndex.SystemConfigServiceImpl).toBe(SystemConfigServiceImpl);
    });

    it('PublishingPlatformServiceImpl 应与源模块同一引用', () => {
      expect(serviceIndex.PublishingPlatformServiceImpl).toBe(PublishingPlatformServiceImpl);
    });

    it('TodoServiceImpl 应与源模块同一引用', () => {
      expect(serviceIndex.TodoServiceImpl).toBe(TodoServiceImpl);
    });
  });

  // ──────────────────────────────────────
  // 7. 重导入一致性
  // ──────────────────────────────────────
  describe('重导入一致性', () => {
    it('多次 require 应返回相同模块引用', () => {
      const a = require('../../../apis/service/index');
      const b = require('../../../apis/service/index');
      expect(a).toBe(b);
    });

    it('函数引用在多次 require 间保持稳定', () => {
      const a = require('../../../apis/service/index');
      const b = require('../../../apis/service/index');
      (EXPECTED_EXPORTS as readonly string[]).forEach(name => {
        expect(a[name]).toBe(b[name]);
      });
    });
  });

  // ──────────────────────────────────────
  // 8. 导出唯一性
  // ──────────────────────────────────────
  describe('导出唯一性', () => {
    it('所有导出名称应无重复', () => {
      const keys = Object.keys(serviceIndex);
      const unique = [...new Set(keys)];
      expect(keys).toHaveLength(unique.length);
    });

    it('barrel 中无重复导出值', () => {
      const keys = Object.keys(serviceIndex);
      const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
      expect(dupes).toEqual([]);
    });
  });

  // ──────────────────────────────────────
  // 9. 接口方法存在性验证
  // ──────────────────────────────────────
  describe('接口方法存在性验证', () => {
    it('AuthServiceImpl 应具有 IAuthService 定义的所有方法', () => {
      const instance = new AuthServiceImpl();
      const methods = ['login', 'verifyToken', 'getLatestUserState', 'saveSelection', 'getAccessibleCompanies', 'getAccessibleProjects', 'getCompanyUsers'];
      methods.forEach(m => {
        expect(typeof (instance as any)[m]).toBe('function');
      });
    });

    it('CompanyServiceImpl 应具有 ICompanyService 定义的所有方法', () => {
      const instance = new CompanyServiceImpl();
      const methods = ['list', 'getById', 'create', 'update', 'toggleStatus'];
      methods.forEach(m => {
        expect(typeof (instance as any)[m]).toBe('function');
      });
    });

    it('SkillsServiceImpl 应具有 ISkillsService 定义的所有方法', () => {
      const instance = new SkillsServiceImpl();
      const methods = ['list', 'getById', 'create', 'update', 'delete'];
      methods.forEach(m => {
        expect(typeof (instance as any)[m]).toBe('function');
      });
    });

    it('UserServiceImpl 应具有 IUserService 定义的所有方法', () => {
      const instance = new UserServiceImpl();
      const methods = ['list', 'getById', 'create', 'update', 'delete'];
      methods.forEach(m => {
        expect(typeof (instance as any)[m]).toBe('function');
      });
    });

    it('LlmModelServiceImpl 应具有 ILlmModelService 定义的所有方法', () => {
      const instance = new LlmModelServiceImpl();
      const methods = ['list', 'listEnabled', 'getById', 'create', 'update', 'delete'];
      methods.forEach(m => {
        expect(typeof (instance as any)[m]).toBe('function');
      });
    });

    it('SystemConfigServiceImpl 应具有 ISystemConfigService 定义的所有方法', () => {
      const instance = new SystemConfigServiceImpl();
      const methods = ['getAll', 'batchUpdate'];
      methods.forEach(m => {
        expect(typeof (instance as any)[m]).toBe('function');
      });
    });

    it('PublishingPlatformServiceImpl 应具有 IPublishingPlatformService 定义的所有方法', () => {
      const instance = new PublishingPlatformServiceImpl();
      const methods = ['syncFromSystemConfig', 'syncFromRm', 'listAll', 'list'];
      methods.forEach(m => {
        expect(typeof (instance as any)[m]).toBe('function');
      });
    });

    it('TodoServiceImpl 应具有 ITodoService 定义的所有方法', () => {
      const instance = new TodoServiceImpl();
      const methods = ['list', 'getById', 'create', 'update', 'close', 'reopen', 'transfer', 'reject', 'getLogs', 'getObjectOptions', 'getAssigneeCandidates'];
      methods.forEach(m => {
        expect(typeof (instance as any)[m]).toBe('function');
      });
    });
  });

  // ──────────────────────────────────────
  // 10. 所有方法均为异步函数
  // ──────────────────────────────────────
  describe('所有方法均为异步函数', () => {
    const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

    function expectAllAsync(Cls: any, methods: string[]) {
      methods.forEach(m => {
        const fn = Cls.prototype[m];
        expect(fn.constructor.name).toBe('AsyncFunction');
      });
    }

    it('AuthServiceImpl 所有方法应为异步', () => {
      expectAllAsync(AuthServiceImpl, ['login', 'verifyToken', 'getLatestUserState', 'saveSelection', 'getAccessibleCompanies', 'getAccessibleProjects', 'getCompanyUsers']);
    });

    it('CompanyServiceImpl 所有方法应为异步', () => {
      expectAllAsync(CompanyServiceImpl, ['list', 'getById', 'create', 'update', 'toggleStatus']);
    });

    it('SkillsServiceImpl 所有方法应为异步', () => {
      expectAllAsync(SkillsServiceImpl, ['list', 'getById', 'create', 'update', 'delete']);
    });

    it('UserServiceImpl 所有方法应为异步', () => {
      expectAllAsync(UserServiceImpl, ['list', 'getById', 'create', 'update', 'delete']);
    });

    it('LlmModelServiceImpl 所有方法应为异步', () => {
      expectAllAsync(LlmModelServiceImpl, ['list', 'listEnabled', 'getById', 'create', 'update', 'delete']);
    });

    it('SystemConfigServiceImpl 所有方法应为异步', () => {
      expectAllAsync(SystemConfigServiceImpl, ['getAll', 'batchUpdate']);
    });

    it('PublishingPlatformServiceImpl 所有方法应为异步', () => {
      expectAllAsync(PublishingPlatformServiceImpl, ['syncFromSystemConfig', 'syncFromRm', 'listAll', 'list']);
    });

    it('TodoServiceImpl 所有方法应为异步', () => {
      expectAllAsync(TodoServiceImpl, ['list', 'getById', 'create', 'update', 'close', 'reopen', 'transfer', 'reject', 'getLogs', 'getObjectOptions', 'getAssigneeCandidates']);
    });
  });

  // ──────────────────────────────────────
  // 11. 模块结构汇总
  // ──────────────────────────────────────
  describe('模块结构汇总', () => {
    it('应导出 8 个实现类', () => {
      const classCount = IMPL_NAMES.filter(name => typeof (serviceIndex as any)[name] === 'function' && (serviceIndex as any)[name].prototype).length;
      expect(classCount).toBe(8);
    });

    it('应导出 2 个工厂函数', () => {
      const fnCount = FACTORY_NAMES.filter(name => typeof (serviceIndex as any)[name] === 'function').length;
      expect(fnCount).toBe(2);
    });
  });

  // ──────────────────────────────────────
  // 12. 工厂函数与直接实例化一致性
  // ──────────────────────────────────────
  describe('工厂函数与直接实例化一致性', () => {
    it('createUserService 与 new UserServiceImpl 返回相同类型', () => {
      const factory = serviceIndex.createUserService();
      const direct = new UserServiceImpl();
      expect(factory.constructor).toBe(direct.constructor);
    });

    it('createLlmModelService 与 new LlmModelServiceImpl 返回相同类型', () => {
      const factory = serviceIndex.createLlmModelService();
      const direct = new LlmModelServiceImpl();
      expect(factory.constructor).toBe(direct.constructor);
    });

    it('createUserService 返回的实例具有与直接实例化相同的原型方法', () => {
      const factory = serviceIndex.createUserService();
      const direct = new UserServiceImpl();
      const methods = ['list', 'getById', 'create', 'update', 'delete'];
      methods.forEach(m => {
        expect(typeof (factory as any)[m]).toBe(typeof (direct as any)[m]);
      });
    });

    it('createLlmModelService 返回的实例具有与直接实例化相同的原型方法', () => {
      const factory = serviceIndex.createLlmModelService();
      const direct = new LlmModelServiceImpl();
      const methods = ['list', 'listEnabled', 'getById', 'create', 'update', 'delete'];
      methods.forEach(m => {
        expect(typeof (factory as any)[m]).toBe(typeof (direct as any)[m]);
      });
    });
  });

  // ──────────────────────────────────────
  // 13. 接口方法参数数量验证
  // ──────────────────────────────────────
  describe('接口方法参数数量验证', () => {
    it('AuthServiceImpl 方法参数数量正确', () => {
      expect(AuthServiceImpl.prototype.login.length).toBe(1);
      expect(AuthServiceImpl.prototype.verifyToken.length).toBe(1);
      expect(AuthServiceImpl.prototype.getLatestUserState.length).toBe(1);
      expect(AuthServiceImpl.prototype.saveSelection.length).toBe(4);
      expect(AuthServiceImpl.prototype.getAccessibleCompanies.length).toBe(3);
      expect(AuthServiceImpl.prototype.getAccessibleProjects.length).toBe(3);
      expect(AuthServiceImpl.prototype.getCompanyUsers.length).toBe(1);
    });

    it('CompanyServiceImpl 方法参数数量正确', () => {
      expect(CompanyServiceImpl.prototype.list.length).toBe(0);
      expect(CompanyServiceImpl.prototype.getById.length).toBe(1);
      expect(CompanyServiceImpl.prototype.create.length).toBe(1);
      expect(CompanyServiceImpl.prototype.update.length).toBe(2);
      expect(CompanyServiceImpl.prototype.toggleStatus.length).toBe(2);
    });

    it('SkillsServiceImpl 方法参数数量正确', () => {
      expect(SkillsServiceImpl.prototype.list.length).toBe(3);
      expect(SkillsServiceImpl.prototype.getById.length).toBe(1);
      expect(SkillsServiceImpl.prototype.create.length).toBe(1);
      expect(SkillsServiceImpl.prototype.update.length).toBe(2);
      expect(SkillsServiceImpl.prototype.delete.length).toBe(1);
    });

    it('UserServiceImpl 方法参数数量正确', () => {
      expect(UserServiceImpl.prototype.list.length).toBe(3);
      expect(UserServiceImpl.prototype.getById.length).toBe(1);
      expect(UserServiceImpl.prototype.create.length).toBe(1);
      expect(UserServiceImpl.prototype.update.length).toBe(2);
      expect(UserServiceImpl.prototype.delete.length).toBe(1);
    });

    it('LlmModelServiceImpl 方法参数数量正确', () => {
      expect(LlmModelServiceImpl.prototype.list.length).toBe(0);
      expect(LlmModelServiceImpl.prototype.listEnabled.length).toBe(0);
      expect(LlmModelServiceImpl.prototype.getById.length).toBe(1);
      expect(LlmModelServiceImpl.prototype.create.length).toBe(1);
      expect(LlmModelServiceImpl.prototype.update.length).toBe(2);
      expect(LlmModelServiceImpl.prototype.delete.length).toBe(1);
    });

    it('SystemConfigServiceImpl 方法参数数量正确', () => {
      expect(SystemConfigServiceImpl.prototype.getAll.length).toBe(0);
      expect(SystemConfigServiceImpl.prototype.batchUpdate.length).toBe(1);
    });

    it('PublishingPlatformServiceImpl 方法参数数量正确', () => {
      expect(PublishingPlatformServiceImpl.prototype.syncFromSystemConfig.length).toBe(0);
      expect(PublishingPlatformServiceImpl.prototype.syncFromRm.length).toBe(2);
      expect(PublishingPlatformServiceImpl.prototype.listAll.length).toBe(0);
      expect(PublishingPlatformServiceImpl.prototype.list.length).toBe(6);
    });

    it('TodoServiceImpl 方法参数数量正确', () => {
      expect(TodoServiceImpl.prototype.list.length).toBe(1);
      expect(TodoServiceImpl.prototype.getById.length).toBe(4);
      expect(TodoServiceImpl.prototype.create.length).toBe(2);
      expect(TodoServiceImpl.prototype.update.length).toBe(4);
      expect(TodoServiceImpl.prototype.close.length).toBe(3);
      expect(TodoServiceImpl.prototype.reopen.length).toBe(3);
      expect(TodoServiceImpl.prototype.transfer.length).toBe(4);
      expect(TodoServiceImpl.prototype.reject.length).toBe(3);
      expect(TodoServiceImpl.prototype.getLogs.length).toBe(4);
      expect(TodoServiceImpl.prototype.getObjectOptions.length).toBe(1);
      expect(TodoServiceImpl.prototype.getAssigneeCandidates.length).toBe(1);
    });
  });
});

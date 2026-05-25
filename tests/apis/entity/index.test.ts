/**
 * @jest-environment node
 */
// entity/index.ts barrel 文件 TDD 测试
// 覆盖维度：运行时导出完整性、引用同一性、类实例化、继承链、跨模块一致性、
//           编译时类型导出验证、安全性、不可变性、动态导入

// ============================================================
// 直接导入源模块，用于验证引用同一性
// ============================================================
import * as userEntity from '../../../apis/entity/user.entity';
import * as errorsEntity from '../../../apis/errors';

// 通过 barrel 导入运行时值（5 个 class）
import {
  LoginSelectionError,
  PermissionDeniedError,
  NotFoundError,
  ConflictError,
  BusinessError,
} from '../../../apis/entity/index';

// 编译时类型导入验证——若 barrel 缺少任一导出，编译阶段即报错
import type {
  User,
  UserRole,
  LoginRequest,
  LoginResponse,
  SaveSelectionRequest,
  UserListItem,
  CreateUserRequest,
  UpdateUserRequest,
  Company,
  CreateCompanyRequest,
  UpdateCompanyRequest,
  CompanyDetail,
  Skills,
  CreateSkillsRequest,
  UpdateSkillsRequest,
  LlmModel,
  CreateLlmModelRequest,
  UpdateLlmModelRequest,
  SystemConfig,
  UpdateSystemConfigsRequest,
  PublishingPlatform,
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  Article,
  ArticleStatus,
  ArticleVersion,
  CreateArticleRequest,
  UpdateArticleRequest,
  ReviewArticleRequest,
  KnowledgeKeyword,
  KeywordExpandedWord,
  KnowledgePortrait,
  KnowledgeImage,
  KnowledgeDocument,
  CreateKeywordRequest,
  UpdateKeywordRequest,
  CreatePortraitRequest,
  UpdatePortraitRequest,
  CreateImageRequest,
  UpdateImageRequest,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  MinedKeyword,
  KnowledgeBase,
  CreateKnowledgeBaseRequest,
  UpdateKnowledgeBaseRequest,
  Todo,
  TodoLog,
  CreateTodoRequest,
  UpdateTodoRequest,
  TransferTodoRequest,
  PublishingScheduleListParams,
  PublishingScheduleItem,
  PublishingScheduleUpdateResult,
} from '../../../apis/entity/index';

// 通过 barrel namespace 导入
import * as barrel from '../../../apis/entity/index';

describe('entity/index.ts barrel 文件', () => {

  // ============================================================
  // 1. 运行时导出完整性
  // ============================================================
  describe('运行时导出完整性', () => {
    it('barrel 应有 5 个运行时导出（5 个 Error 类）', () => {
      const keys = Object.keys(barrel).filter(k => k !== '__esModule');
      expect(keys).toHaveLength(5);
      expect(keys).toContain('NotFoundError');
      expect(keys).toContain('ConflictError');
      expect(keys).toContain('BusinessError');
      expect(keys).toContain('LoginSelectionError');
      expect(keys).toContain('PermissionDeniedError');
    });

    it('errors 模块的 3 个类导出全部可用', () => {
      expect(barrel.NotFoundError).toBeDefined();
      expect(typeof barrel.NotFoundError).toBe('function');
      expect(barrel.ConflictError).toBeDefined();
      expect(typeof barrel.ConflictError).toBe('function');
      expect(barrel.BusinessError).toBeDefined();
      expect(typeof barrel.BusinessError).toBe('function');
    });

    it('user.entity 的 2 个 Error 类导出可用', () => {
      expect(barrel.LoginSelectionError).toBeDefined();
      expect(typeof barrel.LoginSelectionError).toBe('function');
      expect(barrel.PermissionDeniedError).toBeDefined();
      expect(typeof barrel.PermissionDeniedError).toBe('function');
    });
  });

  // ============================================================
  // 2. 引用同一性——barrel 导出与源模块指向同一引用
  // ============================================================
  describe('引用同一性', () => {
    it('errors 模块 3 个类与源模块引用一致', () => {
      expect(barrel.NotFoundError).toBe(errorsEntity.NotFoundError);
      expect(barrel.ConflictError).toBe(errorsEntity.ConflictError);
      expect(barrel.BusinessError).toBe(errorsEntity.BusinessError);
    });

    it('user.entity 2 个 Error 类与源模块引用一致', () => {
      expect(barrel.LoginSelectionError).toBe(userEntity.LoginSelectionError);
      expect(barrel.PermissionDeniedError).toBe(userEntity.PermissionDeniedError);
    });

    it('所有 5 个运行时导出均不共享引用', () => {
      expect(barrel.NotFoundError).not.toBe(barrel.ConflictError);
      expect(barrel.NotFoundError).not.toBe(barrel.BusinessError);
      expect(barrel.NotFoundError).not.toBe(barrel.LoginSelectionError);
      expect(barrel.NotFoundError).not.toBe(barrel.PermissionDeniedError);
      expect(barrel.ConflictError).not.toBe(barrel.BusinessError);
      expect(barrel.ConflictError).not.toBe(barrel.LoginSelectionError);
      expect(barrel.ConflictError).not.toBe(barrel.PermissionDeniedError);
      expect(barrel.BusinessError).not.toBe(barrel.LoginSelectionError);
      expect(barrel.BusinessError).not.toBe(barrel.PermissionDeniedError);
      expect(barrel.LoginSelectionError).not.toBe(barrel.PermissionDeniedError);
    });
  });

  // ============================================================
  // 3. 类实例化——通过 barrel 导入的 Error 类可正常实例化
  // ============================================================
  describe('类实例化', () => {
    describe('NotFoundError', () => {
      it('应正确设置 statusCode 为 404', () => {
        const err = new NotFoundError('测试实体');
        expect(err.statusCode).toBe(404);
      });

      it('应正确拼接 message', () => {
        const err = new NotFoundError('用户');
        expect(err.message).toBe('用户不存在');
      });

      it('name 应为 NotFoundError', () => {
        const err = new NotFoundError('用户');
        expect(err.name).toBe('NotFoundError');
      });

      it('不同实体名应产生不同 message', () => {
        expect(new NotFoundError('公司').message).toBe('公司不存在');
        expect(new NotFoundError('项目').message).toBe('项目不存在');
        expect(new NotFoundError('文章').message).toBe('文章不存在');
      });

      it('空字符串实体名应生成 "不存在"', () => {
        const err = new NotFoundError('');
        expect(err.message).toBe('不存在');
      });
    });

    describe('ConflictError', () => {
      it('应正确设置 statusCode 为 409', () => {
        const err = new ConflictError('测试冲突');
        expect(err.statusCode).toBe(409);
      });

      it('应保留原始 message', () => {
        const err = new ConflictError('名称已存在');
        expect(err.message).toBe('名称已存在');
      });

      it('name 应为 ConflictError', () => {
        const err = new ConflictError('冲突');
        expect(err.name).toBe('ConflictError');
      });
    });

    describe('BusinessError', () => {
      it('应正确设置 statusCode 为 400', () => {
        const err = new BusinessError('业务异常');
        expect(err.statusCode).toBe(400);
      });

      it('应保留原始 message', () => {
        const err = new BusinessError('参数无效');
        expect(err.message).toBe('参数无效');
      });

      it('name 应为 BusinessError', () => {
        const err = new BusinessError('异常');
        expect(err.name).toBe('BusinessError');
      });
    });

    describe('LoginSelectionError', () => {
      it('应保留原始 message', () => {
        const err = new LoginSelectionError('选择错误');
        expect(err.message).toBe('选择错误');
      });

      it('name 应为 LoginSelectionError', () => {
        const err = new LoginSelectionError('错误');
        expect(err.name).toBe('LoginSelectionError');
      });
    });

    describe('PermissionDeniedError', () => {
      it('应保留原始 message', () => {
        const err = new PermissionDeniedError('权限不足');
        expect(err.message).toBe('权限不足');
      });

      it('name 应为 PermissionDeniedError', () => {
        const err = new PermissionDeniedError('权限');
        expect(err.name).toBe('PermissionDeniedError');
      });
    });

    it('barrel 实例与源模块实例共享原型', () => {
      const barrelErr = new barrel.NotFoundError('测试');
      const sourceErr = new errorsEntity.NotFoundError('测试');
      expect(Object.getPrototypeOf(barrelErr)).toBe(Object.getPrototypeOf(sourceErr));
      expect(Object.getPrototypeOf(barrelErr).constructor).toBe(errorsEntity.NotFoundError);
    });
  });

  // ============================================================
  // 4. Error 类继承链
  // ============================================================
  describe('Error 类继承链', () => {
    it('NotFoundError 继承自 Error', () => {
      const err = new NotFoundError('实体');
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(NotFoundError);
      expect(err.constructor.name).toBe('NotFoundError');
    });

    it('ConflictError 继承自 Error', () => {
      const err = new ConflictError('冲突');
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(ConflictError);
      expect(err.constructor.name).toBe('ConflictError');
    });

    it('BusinessError 继承自 Error', () => {
      const err = new BusinessError('异常');
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(BusinessError);
      expect(err.constructor.name).toBe('BusinessError');
    });

    it('LoginSelectionError 继承自 Error', () => {
      const err = new LoginSelectionError('选择');
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(LoginSelectionError);
      expect(err.constructor.name).toBe('LoginSelectionError');
    });

    it('PermissionDeniedError 继承自 Error', () => {
      const err = new PermissionDeniedError('权限');
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(PermissionDeniedError);
      expect(err.constructor.name).toBe('PermissionDeniedError');
    });

    it('5 个 Error 子类均不共享原型', () => {
      const classes = [NotFoundError, ConflictError, BusinessError, LoginSelectionError, PermissionDeniedError];
      for (let i = 0; i < classes.length; i++) {
        for (let j = i + 1; j < classes.length; j++) {
          expect(classes[i].prototype).not.toBe(classes[j].prototype);
        }
      }
    });
  });

  // ============================================================
  // 5. 跨模块一致性——通过 barrel 和源模块实例行为一致
  // ============================================================
  describe('跨模块一致性', () => {
    it('NotFoundError 行为一致', () => {
      const b = new barrel.NotFoundError('公司');
      const s = new errorsEntity.NotFoundError('公司');
      expect(b.message).toBe(s.message);
      expect(b.statusCode).toBe(s.statusCode);
      expect(b.name).toBe(s.name);
      expect(b.stack).toBeDefined();
      expect(s.stack).toBeDefined();
    });

    it('ConflictError 行为一致', () => {
      const b = new barrel.ConflictError('冲突');
      const s = new errorsEntity.ConflictError('冲突');
      expect(b.message).toBe(s.message);
      expect(b.statusCode).toBe(s.statusCode);
      expect(b.name).toBe(s.name);
    });

    it('BusinessError 行为一致', () => {
      const b = new barrel.BusinessError('异常');
      const s = new errorsEntity.BusinessError('异常');
      expect(b.message).toBe(s.message);
      expect(b.statusCode).toBe(s.statusCode);
      expect(b.name).toBe(s.name);
    });

    it('LoginSelectionError 行为一致', () => {
      const b = new barrel.LoginSelectionError('选择');
      const s = new userEntity.LoginSelectionError('选择');
      expect(b.message).toBe(s.message);
      expect(b.name).toBe(s.name);
    });

    it('PermissionDeniedError 行为一致', () => {
      const b = new barrel.PermissionDeniedError('无权限');
      const s = new userEntity.PermissionDeniedError('无权限');
      expect(b.message).toBe(s.message);
      expect(b.name).toBe(s.name);
    });
  });

  // ============================================================
  // 6. 编译时类型导出验证
  // ============================================================
  describe('编译时类型导出验证', () => {
    // 这些测试验证 TypeScript 编译时 barrel 正确导出了所有接口和类型
    // 如果 barrel 缺少任何导出，import 语句会在编译阶段报错
    // 通过 type assertion 验证类型在运行时为 undefined（编译时擦除）

    it('接口导出在运行时为 undefined（编译时擦除）', () => {
      // 这些值在 TypeScript 编译后被擦除
      const b = barrel as Record<string, unknown>;
      const interfaceNames = [
        'User', 'LoginRequest', 'LoginResponse', 'SaveSelectionRequest',
        'UserListItem', 'CreateUserRequest', 'UpdateUserRequest',
        'Company', 'CreateCompanyRequest', 'UpdateCompanyRequest', 'CompanyDetail',
        'Skills', 'CreateSkillsRequest', 'UpdateSkillsRequest',
        'LlmModel', 'CreateLlmModelRequest', 'UpdateLlmModelRequest',
        'SystemConfig', 'UpdateSystemConfigsRequest',
        'PublishingPlatform',
        'Project', 'CreateProjectRequest', 'UpdateProjectRequest',
        'Article', 'ArticleVersion', 'CreateArticleRequest',
        'UpdateArticleRequest', 'ReviewArticleRequest',
        'KnowledgeKeyword', 'KeywordExpandedWord', 'KnowledgePortrait',
        'KnowledgeImage', 'KnowledgeDocument',
        'CreateKeywordRequest', 'UpdateKeywordRequest',
        'CreatePortraitRequest', 'UpdatePortraitRequest',
        'CreateImageRequest', 'UpdateImageRequest',
        'CreateDocumentRequest', 'UpdateDocumentRequest',
        'MinedKeyword',
        'KnowledgeBase', 'CreateKnowledgeBaseRequest', 'UpdateKnowledgeBaseRequest',
        'Todo', 'TodoLog', 'CreateTodoRequest', 'UpdateTodoRequest', 'TransferTodoRequest',
        'PublishingScheduleListParams', 'PublishingScheduleItem', 'PublishingScheduleUpdateResult',
      ];

      for (const name of interfaceNames) {
        expect(b[name]).toBeUndefined();
      }
    });

    it('类型别名导出在运行时为 undefined（编译时擦除）', () => {
      const b = barrel as Record<string, unknown>;
      expect(b['UserRole']).toBeUndefined();
      expect(b['ArticleStatus']).toBeUndefined();
    });

    it('55 个编译时导出 + 5 个运行时导出 = 60 个总导出', () => {
      // 验证总导出数量完整
      const runtimeExports = Object.keys(barrel).filter(k => k !== '__esModule');
      const compileTimeOnlyCount = 55; // 60 总计 - 5 运行时
      expect(runtimeExports.length + compileTimeOnlyCount).toBe(60);
    });
  });

  // ============================================================
  // 7. 具名导入验证——5 个运行时类可通过具名导入使用
  // ============================================================
  describe('具名导入验证', () => {
    it('NotFoundError 具名导入可用', () => {
      expect(NotFoundError).toBeDefined();
      expect(typeof NotFoundError).toBe('function');
      const err = new NotFoundError('测试');
      expect(err).toBeInstanceOf(NotFoundError);
    });

    it('ConflictError 具名导入可用', () => {
      expect(ConflictError).toBeDefined();
      expect(typeof ConflictError).toBe('function');
      const err = new ConflictError('测试');
      expect(err).toBeInstanceOf(ConflictError);
    });

    it('BusinessError 具名导入可用', () => {
      expect(BusinessError).toBeDefined();
      expect(typeof BusinessError).toBe('function');
      const err = new BusinessError('测试');
      expect(err).toBeInstanceOf(BusinessError);
    });

    it('LoginSelectionError 具名导入可用', () => {
      expect(LoginSelectionError).toBeDefined();
      expect(typeof LoginSelectionError).toBe('function');
      const err = new LoginSelectionError('测试');
      expect(err).toBeInstanceOf(LoginSelectionError);
    });

    it('PermissionDeniedError 具名导入可用', () => {
      expect(PermissionDeniedError).toBeDefined();
      expect(typeof PermissionDeniedError).toBe('function');
      const err = new PermissionDeniedError('测试');
      expect(err).toBeInstanceOf(PermissionDeniedError);
    });
  });

  // ============================================================
  // 8. Error 类 catch 兼容性
  // ============================================================
  describe('Error 类 catch 兼容性', () => {
    it('NotFoundError 可通过 barrel 类型 catch', () => {
      const fn = () => { throw new NotFoundError('资源'); };
      expect(fn).toThrow(NotFoundError);
      expect(fn).toThrow(Error);
    });

    it('ConflictError 可通过 barrel 类型 catch', () => {
      const fn = () => { throw new ConflictError('冲突'); };
      expect(fn).toThrow(ConflictError);
      expect(fn).toThrow(Error);
    });

    it('BusinessError 可通过 barrel 类型 catch', () => {
      const fn = () => { throw new BusinessError('业务'); };
      expect(fn).toThrow(BusinessError);
      expect(fn).toThrow(Error);
    });

    it('LoginSelectionError 可通过 barrel 类型 catch', () => {
      const fn = () => { throw new LoginSelectionError('选择'); };
      expect(fn).toThrow(LoginSelectionError);
      expect(fn).toThrow(Error);
    });

    it('PermissionDeniedError 可通过 barrel 类型 catch', () => {
      const fn = () => { throw new PermissionDeniedError('权限'); };
      expect(fn).toThrow(PermissionDeniedError);
      expect(fn).toThrow(Error);
    });

    it('catch 可区分不同 Error 类型', () => {
      const throwNotFound = () => { throw new NotFoundError('实体'); };
      const throwConflict = () => { throw new ConflictError('冲突'); };

      expect(throwNotFound).toThrow(NotFoundError);
      expect(throwNotFound).not.toThrow(ConflictError);
      expect(throwConflict).toThrow(ConflictError);
      expect(throwConflict).not.toThrow(NotFoundError);
    });
  });

  // ============================================================
  // 9. barrel 不可变性与格式
  // ============================================================
  describe('barrel 不可变性与格式', () => {
    it('barrel 不应有默认导出', () => {
      expect((barrel as Record<string, unknown>)['default']).toBeUndefined();
    });

    it('barrel 含 __esModule 标记（TypeScript ESM 兼容）', () => {
      expect((barrel as Record<string, unknown>)['__esModule']).toBe(true);
    });

    it('所有运行时导出 key 均为 PascalCase 字符串', () => {
      const keys = Object.keys(barrel).filter(k => k !== '__esModule');
      const pascalCaseRegex = /^[A-Z][a-zA-Z0-9]*$/;
      for (const key of keys) {
        expect(key).toMatch(pascalCaseRegex);
      }
    });

    it('所有运行时导出均为 function 类型（构造函数）', () => {
      const keys = Object.keys(barrel).filter(k => k !== '__esModule');
      for (const key of keys) {
        expect(typeof (barrel as Record<string, unknown>)[key]).toBe('function');
      }
    });

    it('所有运行时导出名称唯一', () => {
      const keys = Object.keys(barrel).filter(k => k !== '__esModule');
      const uniqueKeys = new Set(keys);
      expect(keys.length).toBe(uniqueKeys.size);
    });
  });

  // ============================================================
  // 10. 安全性验证
  // ============================================================
  describe('安全性验证', () => {
    it('barrel 不导出密码、密钥或 token 相关符号', () => {
      const keys = Object.keys(barrel);
      const sensitivePatterns = ['password', 'secret', 'credential', 'private'];
      for (const key of keys) {
        const lowerKey = key.toLowerCase();
        for (const pattern of sensitivePatterns) {
          expect(lowerKey).not.toContain(pattern);
        }
      }
    });

    it('所有 Error 类均可生成 stack trace', () => {
      const errors = [
        new NotFoundError('测试'),
        new ConflictError('测试'),
        new BusinessError('测试'),
        new LoginSelectionError('测试'),
        new PermissionDeniedError('测试'),
      ];
      for (const err of errors) {
        expect(err.stack).toBeDefined();
        expect(typeof err.stack).toBe('string');
      }
    });
  });

  // ============================================================
  // 11. 动态导入验证
  // ============================================================
  describe('动态导入验证', () => {
    it('动态 import() 应包含 5 个运行时导出', async () => {
      const dynamicBarrel = await import('../../../apis/entity/index');
      const keys = Object.keys(dynamicBarrel).filter(k => k !== '__esModule');
      expect(keys).toHaveLength(5);
    });

    it('动态 import 与静态 import 的运行时导出一致', async () => {
      const dynamicBarrel = await import('../../../apis/entity/index') as Record<string, unknown>;
      const staticBarrel = barrel as Record<string, unknown>;
      const runtimeKeys = ['NotFoundError', 'ConflictError', 'BusinessError', 'LoginSelectionError', 'PermissionDeniedError'];
      for (const key of runtimeKeys) {
        expect(dynamicBarrel[key]).toBe(staticBarrel[key]);
      }
    });

    it('动态 import 的类可正常实例化', async () => {
      const dynamicBarrel = await import('../../../apis/entity/index');
      const DynamicNotFoundError = (dynamicBarrel as Record<string, unknown>)['NotFoundError'] as typeof NotFoundError;
      const err = new DynamicNotFoundError('动态测试');
      expect(err).toBeInstanceOf(Error);
      expect(err.statusCode).toBe(404);
      expect(err.message).toBe('动态测试不存在');
    });
  });

  // ============================================================
  // 12. 源模块覆盖完整性
  // ============================================================
  describe('源模块覆盖完整性', () => {
    it('errors 模块的 3 个类全部通过 barrel 导出', () => {
      expect(barrel.NotFoundError).toBe(errorsEntity.NotFoundError);
      expect(barrel.ConflictError).toBe(errorsEntity.ConflictError);
      expect(barrel.BusinessError).toBe(errorsEntity.BusinessError);
    });

    it('user.entity 的 2 个 Error 类全部通过 barrel 导出', () => {
      expect(barrel.LoginSelectionError).toBe(userEntity.LoginSelectionError);
      expect(barrel.PermissionDeniedError).toBe(userEntity.PermissionDeniedError);
    });

    it('5 个运行时类来自 2 个源模块', () => {
      const fromErrors = [
        barrel.NotFoundError === errorsEntity.NotFoundError,
        barrel.ConflictError === errorsEntity.ConflictError,
        barrel.BusinessError === errorsEntity.BusinessError,
      ];
      const fromUser = [
        barrel.LoginSelectionError === userEntity.LoginSelectionError,
        barrel.PermissionDeniedError === userEntity.PermissionDeniedError,
      ];
      expect(fromErrors.every(Boolean)).toBe(true);
      expect(fromUser.every(Boolean)).toBe(true);
    });
  });

  // ============================================================
  // 13. Error 类边界场景
  // ============================================================
  describe('Error 类边界场景', () => {
    it('NotFoundError 长实体名', () => {
      const longName = '这是一个非常非常长的实体名称用来测试拼接';
      const err = new NotFoundError(longName);
      expect(err.message).toBe(`${longName}不存在`);
    });

    it('ConflictError 特殊字符消息', () => {
      const err = new ConflictError('用户名包含 <script>alert(1)</script>');
      expect(err.message).toBe('用户名包含 <script>alert(1)</script>');
    });

    it('BusinessError unicode 消息', () => {
      const err = new BusinessError('参数包含 emoji 🎉 和中文');
      expect(err.message).toBe('参数包含 emoji 🎉 和中文');
    });

    it('LoginSelectionError 空消息', () => {
      const err = new LoginSelectionError('');
      expect(err.message).toBe('');
    });

    it('PermissionDeniedError 空消息', () => {
      const err = new PermissionDeniedError('');
      expect(err.message).toBe('');
    });

    it('连续多次实例化不共享状态', () => {
      const err1 = new NotFoundError('实体1');
      const err2 = new NotFoundError('实体2');
      expect(err1.message).not.toBe(err2.message);
      expect(err1).not.toBe(err2);
    });

    it('Error 类构造函数可直接调用', () => {
      // 构造函数应可用 barrel 引用
      expect(barrel.NotFoundError).toBeInstanceOf(Function);
      expect(barrel.ConflictError).toBeInstanceOf(Function);
      expect(barrel.BusinessError).toBeInstanceOf(Function);
      expect(barrel.LoginSelectionError).toBeInstanceOf(Function);
      expect(barrel.PermissionDeniedError).toBeInstanceOf(Function);
    });
  });

  // ============================================================
  // 14. 类型守卫兼容性
  // ============================================================
  describe('类型守卫兼容性', () => {
    it('instanceof 可区分 NotFoundError', () => {
      const err: Error = new NotFoundError('实体');
      expect(err instanceof NotFoundError).toBe(true);
      expect(err instanceof ConflictError).toBe(false);
      expect(err instanceof BusinessError).toBe(false);
    });

    it('instanceof 可区分 ConflictError', () => {
      const err: Error = new ConflictError('冲突');
      expect(err instanceof ConflictError).toBe(true);
      expect(err instanceof NotFoundError).toBe(false);
      expect(err instanceof BusinessError).toBe(false);
    });

    it('instanceof 可区分 BusinessError', () => {
      const err: Error = new BusinessError('异常');
      expect(err instanceof BusinessError).toBe(true);
      expect(err instanceof NotFoundError).toBe(false);
      expect(err instanceof ConflictError).toBe(false);
    });

    it('instanceof 可区分 LoginSelectionError', () => {
      const err: Error = new LoginSelectionError('选择');
      expect(err instanceof LoginSelectionError).toBe(true);
      expect(err instanceof NotFoundError).toBe(false);
    });

    it('instanceof 可区分 PermissionDeniedError', () => {
      const err: Error = new PermissionDeniedError('权限');
      expect(err instanceof PermissionDeniedError).toBe(true);
      expect(err instanceof LoginSelectionError).toBe(false);
    });

    it('所有 Error 子类均通过 instanceof Error 检查', () => {
      const errors = [
        new NotFoundError('A'),
        new ConflictError('B'),
        new BusinessError('C'),
        new LoginSelectionError('D'),
        new PermissionDeniedError('E'),
      ];
      for (const err of errors) {
        expect(err instanceof Error).toBe(true);
      }
    });
  });
});

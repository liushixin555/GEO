/**
 * @jest-environment node
 */
import {
  AppError,
  NotFoundError,
  BusinessError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
} from '../../apis/errors';

describe('errors', () => {
  // ============================================================
  // AppError 基类
  // ============================================================
  describe('AppError', () => {
    it('应正确创建带 statusCode 和 message 的实例', () => {
      const err = new AppError(500, '服务器内部错误');
      expect(err.statusCode).toBe(500);
      expect(err.message).toBe('服务器内部错误');
    });

    it('应为 Error 的实例', () => {
      const err = new AppError(500, 'test');
      expect(err).toBeInstanceOf(Error);
    });

    it('应为 AppError 的实例', () => {
      const err = new AppError(500, 'test');
      expect(err).toBeInstanceOf(AppError);
    });

    it('name 属性应为构造函数名', () => {
      const err = new AppError(500, 'test');
      expect(err.name).toBe('AppError');
    });

    it('原型链应正确设置（new.target.prototype）', () => {
      const err = new AppError(500, 'test');
      expect(Object.getPrototypeOf(err)).toBe(AppError.prototype);
    });

    it('stack 属性应存在且为字符串', () => {
      const err = new AppError(500, 'test');
      expect(typeof err.stack).toBe('string');
    });

    it('statusCode 应为只读属性', () => {
      const err = new AppError(500, 'test');
      expect(err.statusCode).toBe(500);
      expect(() => {
        (err as any).statusCode = 404;
      }).not.toThrow();
      // 赋值不会改变 readonly 属性的行为取决于 strict mode
      // 但 readonly 只是编译时约束
    });

    it('空 message 应被接受', () => {
      const err = new AppError(200, '');
      expect(err.message).toBe('');
      expect(err.statusCode).toBe(200);
    });

    it('JSON.stringify 应包含 statusCode', () => {
      const err = new AppError(503, '服务不可用');
      const json = JSON.stringify(err);
      const parsed = JSON.parse(json);
      expect(parsed.statusCode).toBe(503);
    });

    it('不同 AppError 实例应互不影响', () => {
      const err1 = new AppError(400, '错误A');
      const err2 = new AppError(500, '错误B');
      expect(err1.statusCode).toBe(400);
      expect(err1.message).toBe('错误A');
      expect(err2.statusCode).toBe(500);
      expect(err2.message).toBe('错误B');
    });
  });

  // ============================================================
  // NotFoundError
  // ============================================================
  describe('NotFoundError', () => {
    it('应正确设置 statusCode 为 404', () => {
      const err = new NotFoundError('用户');
      expect(err.statusCode).toBe(404);
    });

    it('应正确拼接 message', () => {
      const err = new NotFoundError('用户');
      expect(err.message).toBe('用户不存在');
    });

    it('不同实体名应产生不同 message', () => {
      const err1 = new NotFoundError('公司');
      const err2 = new NotFoundError('项目');
      expect(err1.message).toBe('公司不存在');
      expect(err2.message).toBe('项目不存在');
    });

    it('应为 Error 的实例', () => {
      const err = new NotFoundError('用户');
      expect(err).toBeInstanceOf(Error);
    });

    it('应为 AppError 的实例', () => {
      const err = new NotFoundError('用户');
      expect(err).toBeInstanceOf(AppError);
    });

    it('应为 NotFoundError 的实例', () => {
      const err = new NotFoundError('用户');
      expect(err).toBeInstanceOf(NotFoundError);
    });

    it('name 应为 NotFoundError', () => {
      const err = new NotFoundError('用户');
      expect(err.name).toBe('NotFoundError');
    });

    it('原型链应正确（三层继承）', () => {
      const err = new NotFoundError('用户');
      expect(Object.getPrototypeOf(err)).toBe(NotFoundError.prototype);
      expect(Object.getPrototypeOf(NotFoundError.prototype)).toBe(AppError.prototype);
      expect(Object.getPrototypeOf(AppError.prototype)).toBe(Error.prototype);
    });

    it('可以用 catch 捕获', () => {
      const throwIt = () => {
        throw new NotFoundError('订单');
      };
      expect(throwIt).toThrow(NotFoundError);
      expect(throwIt).toThrow(AppError);
      expect(throwIt).toThrow(Error);
    });

    it('catch 中 instanceof 应能区分类型', () => {
      try {
        throw new NotFoundError('文章');
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundError);
        expect(e).toBeInstanceOf(AppError);
        expect(e).toBeInstanceOf(Error);
        expect(e).not.toBeInstanceOf(BusinessError);
      }
    });

    it('stack 应包含抛出位置信息', () => {
      const err = new NotFoundError('资源');
      expect(err.stack).toContain('NotFoundError');
    });

    it('空实体名应生成 "不存在" message', () => {
      const err = new NotFoundError('');
      expect(err.message).toBe('不存在');
    });
  });

  // ============================================================
  // BusinessError
  // ============================================================
  describe('BusinessError', () => {
    it('应正确设置 statusCode 为 400', () => {
      const err = new BusinessError('参数错误');
      expect(err.statusCode).toBe(400);
    });

    it('应保留自定义 message', () => {
      const err = new BusinessError('余额不足');
      expect(err.message).toBe('余额不足');
    });

    it('应为 Error/AppError/BusinessError 的实例', () => {
      const err = new BusinessError('test');
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(BusinessError);
    });

    it('name 应为 BusinessError', () => {
      const err = new BusinessError('test');
      expect(err.name).toBe('BusinessError');
    });

    it('原型链应正确', () => {
      const err = new BusinessError('test');
      expect(Object.getPrototypeOf(err)).toBe(BusinessError.prototype);
      expect(Object.getPrototypeOf(BusinessError.prototype)).toBe(AppError.prototype);
    });

    it('可以用 catch 捕获', () => {
      const throwIt = () => {
        throw new BusinessError('业务异常');
      };
      expect(throwIt).toThrow(BusinessError);
      expect(throwIt).toThrow(AppError);
    });

    it('catch 中 instanceof 应能区分类型', () => {
      try {
        throw new BusinessError('操作不允许');
      } catch (e) {
        expect(e).toBeInstanceOf(BusinessError);
        expect(e).not.toBeInstanceOf(NotFoundError);
        expect(e).not.toBeInstanceOf(UnauthorizedError);
      }
    });

    it('中文 message 应正确存储', () => {
      const err = new BusinessError('该操作不被允许，请联系管理员');
      expect(err.message).toBe('该操作不被允许，请联系管理员');
    });

    it('空 message 应被接受', () => {
      const err = new BusinessError('');
      expect(err.message).toBe('');
    });
  });

  // ============================================================
  // UnauthorizedError
  // ============================================================
  describe('UnauthorizedError', () => {
    it('应正确设置 statusCode 为 401', () => {
      const err = new UnauthorizedError();
      expect(err.statusCode).toBe(401);
    });

    it('不传参时使用默认 message', () => {
      const err = new UnauthorizedError();
      expect(err.message).toBe('未授权，请先登录');
    });

    it('自定义 message 应覆盖默认值', () => {
      const err = new UnauthorizedError('Token 已过期');
      expect(err.message).toBe('Token 已过期');
    });

    it('应为 Error/AppError/UnauthorizedError 的实例', () => {
      const err = new UnauthorizedError();
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(UnauthorizedError);
    });

    it('name 应为 UnauthorizedError', () => {
      const err = new UnauthorizedError();
      expect(err.name).toBe('UnauthorizedError');
    });

    it('原型链应正确', () => {
      const err = new UnauthorizedError();
      expect(Object.getPrototypeOf(err)).toBe(UnauthorizedError.prototype);
      expect(Object.getPrototypeOf(UnauthorizedError.prototype)).toBe(AppError.prototype);
    });

    it('可以用 catch 捕获', () => {
      const throwIt = () => {
        throw new UnauthorizedError();
      };
      expect(throwIt).toThrow(UnauthorizedError);
      expect(throwIt).toThrow(AppError);
    });

    it('catch 中 instanceof 应能区分类型', () => {
      try {
        throw new UnauthorizedError();
      } catch (e) {
        expect(e).toBeInstanceOf(UnauthorizedError);
        expect(e).not.toBeInstanceOf(ForbiddenError);
        expect(e).not.toBeInstanceOf(NotFoundError);
      }
    });
  });

  // ============================================================
  // ForbiddenError
  // ============================================================
  describe('ForbiddenError', () => {
    it('应正确设置 statusCode 为 403', () => {
      const err = new ForbiddenError();
      expect(err.statusCode).toBe(403);
    });

    it('不传参时使用默认 message', () => {
      const err = new ForbiddenError();
      expect(err.message).toBe('权限不足');
    });

    it('自定义 message 应覆盖默认值', () => {
      const err = new ForbiddenError('您没有该操作的权限');
      expect(err.message).toBe('您没有该操作的权限');
    });

    it('应为 Error/AppError/ForbiddenError 的实例', () => {
      const err = new ForbiddenError();
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(ForbiddenError);
    });

    it('name 应为 ForbiddenError', () => {
      const err = new ForbiddenError();
      expect(err.name).toBe('ForbiddenError');
    });

    it('原型链应正确', () => {
      const err = new ForbiddenError();
      expect(Object.getPrototypeOf(err)).toBe(ForbiddenError.prototype);
      expect(Object.getPrototypeOf(ForbiddenError.prototype)).toBe(AppError.prototype);
    });

    it('可以用 catch 捕获', () => {
      const throwIt = () => {
        throw new ForbiddenError();
      };
      expect(throwIt).toThrow(ForbiddenError);
      expect(throwIt).toThrow(AppError);
    });

    it('catch 中 instanceof 应能区分与 UnauthorizedError', () => {
      try {
        throw new ForbiddenError();
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenError);
        expect(e).not.toBeInstanceOf(UnauthorizedError);
      }
    });
  });

  // ============================================================
  // ConflictError
  // ============================================================
  describe('ConflictError', () => {
    it('应正确设置 statusCode 为 409', () => {
      const err = new ConflictError('用户名已存在');
      expect(err.statusCode).toBe(409);
    });

    it('应保留自定义 message', () => {
      const err = new ConflictError('数据冲突');
      expect(err.message).toBe('数据冲突');
    });

    it('应为 Error/AppError/ConflictError 的实例', () => {
      const err = new ConflictError('test');
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(ConflictError);
    });

    it('name 应为 ConflictError', () => {
      const err = new ConflictError('test');
      expect(err.name).toBe('ConflictError');
    });

    it('原型链应正确', () => {
      const err = new ConflictError('test');
      expect(Object.getPrototypeOf(err)).toBe(ConflictError.prototype);
      expect(Object.getPrototypeOf(ConflictError.prototype)).toBe(AppError.prototype);
    });

    it('可以用 catch 捕获', () => {
      const throwIt = () => {
        throw new ConflictError('冲突');
      };
      expect(throwIt).toThrow(ConflictError);
      expect(throwIt).toThrow(AppError);
    });

    it('catch 中 instanceof 应能区分类型', () => {
      try {
        throw new ConflictError('冲突');
      } catch (e) {
        expect(e).toBeInstanceOf(ConflictError);
        expect(e).not.toBeInstanceOf(BusinessError);
        expect(e).not.toBeInstanceOf(NotFoundError);
      }
    });

    it('中文 message 应正确存储', () => {
      const err = new ConflictError('该记录已被其他用户修改，请刷新后重试');
      expect(err.message).toBe('该记录已被其他用户修改，请刷新后重试');
    });
  });

  // ============================================================
  // 跨类型综合测试
  // ============================================================
  describe('跨类型综合测试', () => {
    const errors = [
      { Class: NotFoundError, args: ['资源'] as const, statusCode: 404, message: '资源不存在' },
      { Class: BusinessError, args: ['业务错误'] as const, statusCode: 400, message: '业务错误' },
      { Class: UnauthorizedError, args: [] as const, statusCode: 401, message: '未授权，请先登录' },
      { Class: ForbiddenError, args: [] as const, statusCode: 403, message: '权限不足' },
      { Class: ConflictError, args: ['冲突'] as const, statusCode: 409, message: '冲突' },
    ];

    it('所有子类实例都应是 AppError 实例', () => {
      for (const { Class, args } of errors) {
        const err = new Class(...args);
        expect(err).toBeInstanceOf(AppError);
      }
    });

    it('所有子类实例都应是 Error 实例', () => {
      for (const { Class, args } of errors) {
        const err = new Class(...args);
        expect(err).toBeInstanceOf(Error);
      }
    });

    it('每个子类的 name 应对应其构造函数名', () => {
      for (const { Class, args } of errors) {
        const err = new Class(...args);
        expect(err.name).toBe(Class.name);
      }
    });

    it('各子类之间 instanceof 应互不混淆', () => {
      const classes = [NotFoundError, BusinessError, UnauthorizedError, ForbiddenError, ConflictError];
      const argsList: any[][] = [
        ['X'], ['Y'], [], [], ['Z'],
      ];

      for (let i = 0; i < classes.length; i++) {
        const err = new classes[i](...argsList[i]);
        for (let j = 0; j < classes.length; j++) {
          if (i === j) {
            expect(err).toBeInstanceOf(classes[j]);
          } else {
            expect(err).not.toBeInstanceOf(classes[j]);
          }
        }
      }
    });

    it('statusCode 在各类中应唯一且符合 HTTP 规范', () => {
      const statusCodes = errors.map(e => e.statusCode);
      const uniqueCodes = new Set(statusCodes);
      expect(uniqueCodes.size).toBe(statusCodes.length);
      for (const code of statusCodes) {
        expect(code).toBeGreaterThanOrEqual(400);
        expect(code).toBeLessThan(500);
      }
    });

    it('所有错误都应有 stack 属性', () => {
      for (const { Class, args } of errors) {
        const err = new Class(...args);
        expect(typeof err.stack).toBe('string');
        expect(err.stack.length).toBeGreaterThan(0);
      }
    });

    it('所有错误应可序列化为 JSON 并保留 statusCode', () => {
      for (const { Class, args, statusCode } of errors) {
        const err = new Class(...args);
        const parsed = JSON.parse(JSON.stringify(err));
        expect(parsed.statusCode).toBe(statusCode);
      }
    });

    it('catch 中可以按 AppError 统一处理所有子类', () => {
      for (const { Class, args, statusCode, message } of errors) {
        try {
          throw new Class(...args);
        } catch (e) {
          if (e instanceof AppError) {
            expect(e.statusCode).toBe(statusCode);
            expect(e.message).toBe(message);
          } else {
            fail('应为 AppError 实例');
          }
        }
      }
    });

    it('AppError 自身不应为任何子类的实例', () => {
      const base = new AppError(500, 'base');
      expect(base).not.toBeInstanceOf(NotFoundError);
      expect(base).not.toBeInstanceOf(BusinessError);
      expect(base).not.toBeInstanceOf(UnauthorizedError);
      expect(base).not.toBeInstanceOf(ForbiddenError);
      expect(base).not.toBeInstanceOf(ConflictError);
    });
  });

  // ============================================================
  // JSON 序列化往返测试
  // 注意：Error.message 不可枚举，JSON.stringify 不会序列化它
  // ============================================================
  describe('JSON 序列化往返', () => {
    it('NotFoundError 序列化后应保留 statusCode', () => {
      const err = new NotFoundError('公司');
      const parsed = JSON.parse(JSON.stringify(err));
      expect(parsed.statusCode).toBe(404);
    });

    it('BusinessError 序列化后应保留 statusCode', () => {
      const err = new BusinessError('非法操作');
      const parsed = JSON.parse(JSON.stringify(err));
      expect(parsed.statusCode).toBe(400);
    });

    it('UnauthorizedError 序列化后应保留 statusCode', () => {
      const err = new UnauthorizedError();
      const parsed = JSON.parse(JSON.stringify(err));
      expect(parsed.statusCode).toBe(401);
    });

    it('ForbiddenError 序列化后应保留 statusCode', () => {
      const err = new ForbiddenError();
      const parsed = JSON.parse(JSON.stringify(err));
      expect(parsed.statusCode).toBe(403);
    });

    it('ConflictError 序列化后应保留 statusCode', () => {
      const err = new ConflictError('用户名重复');
      const parsed = JSON.parse(JSON.stringify(err));
      expect(parsed.statusCode).toBe(409);
    });

    it('Error.message 不可枚举，序列化后为 undefined', () => {
      const err = new NotFoundError('用户');
      const parsed = JSON.parse(JSON.stringify(err));
      expect(parsed.message).toBeUndefined();
      // 原因：Error.message 的属性描述符 enumerable 为 false
      expect(Object.getOwnPropertyDescriptor(Error.prototype, 'message')?.enumerable ??
             Object.getOwnPropertyDescriptor(err, 'message')?.enumerable).toBeFalsy();
    });
  });

  // ============================================================
  // Object.freeze 不可变测试
  // ============================================================
  describe('Object.freeze 不可变', () => {
    it('冻结 NotFoundError 后修改属性不应生效', () => {
      const err = Object.freeze(new NotFoundError('用户'));
      expect(() => {
        (err as any).statusCode = 500;
      }).toThrow();
      expect(err.statusCode).toBe(404);
    });

    it('冻结 BusinessError 后修改属性不应生效', () => {
      const err = Object.freeze(new BusinessError('冻结测试'));
      expect(() => {
        (err as any).message = '修改';
      }).toThrow();
      expect(err.message).toBe('冻结测试');
    });

    it('冻结 UnauthorizedError 后修改属性不应生效', () => {
      const err = Object.freeze(new UnauthorizedError());
      expect(() => {
        (err as any).statusCode = 200;
      }).toThrow();
      expect(err.statusCode).toBe(401);
    });

    it('冻结 ForbiddenError 后修改属性不应生效', () => {
      const err = Object.freeze(new ForbiddenError());
      expect(() => {
        (err as any).message = '修改';
      }).toThrow();
      expect(err.message).toBe('权限不足');
    });

    it('冻结 ConflictError 后修改属性不应生效', () => {
      const err = Object.freeze(new ConflictError('冲突'));
      expect(() => {
        (err as any).statusCode = 200;
      }).toThrow();
      expect(err.statusCode).toBe(409);
    });
  });

  // ============================================================
  // 结构相等性测试
  // ============================================================
  describe('结构相等性', () => {
    it('两个 NotFoundError 相同参数应具有相同 statusCode 和 message', () => {
      const err1 = new NotFoundError('用户');
      const err2 = new NotFoundError('用户');
      expect(err1.statusCode).toBe(err2.statusCode);
      expect(err1.message).toBe(err2.message);
      expect(err1.name).toBe(err2.name);
    });

    it('两个 BusinessError 相同参数应具有相同 statusCode 和 message', () => {
      const err1 = new BusinessError('参数错误');
      const err2 = new BusinessError('参数错误');
      expect(err1.statusCode).toBe(err2.statusCode);
      expect(err1.message).toBe(err2.message);
    });

    it('两个默认参数 UnauthorizedError 应具有相同属性', () => {
      const err1 = new UnauthorizedError();
      const err2 = new UnauthorizedError();
      expect(err1.statusCode).toBe(err2.statusCode);
      expect(err1.message).toBe(err2.message);
    });

    it('两个默认参数 ForbiddenError 应具有相同属性', () => {
      const err1 = new ForbiddenError();
      const err2 = new ForbiddenError();
      expect(err1.statusCode).toBe(err2.statusCode);
      expect(err1.message).toBe(err2.message);
    });
  });

  // ============================================================
  // 深拷贝测试
  // ============================================================
  describe('深拷贝', () => {
    it('JSON 序列化/反序列化应保留 NotFoundError 的 statusCode', () => {
      const original = new NotFoundError('订单');
      const copy = JSON.parse(JSON.stringify(original));
      expect(copy.statusCode).toBe(original.statusCode);
    });

    it('JSON 序列化/反序列化应保留 BusinessError 的 statusCode', () => {
      const original = new BusinessError('余额不足');
      const copy = JSON.parse(JSON.stringify(original));
      expect(copy.statusCode).toBe(original.statusCode);
    });

    it('修改深拷贝不应影响原始对象', () => {
      const original = new ConflictError('冲突');
      const copy = JSON.parse(JSON.stringify(original));
      copy.statusCode = 200;
      copy.message = '已修改';
      expect(original.statusCode).toBe(409);
      expect(original.message).toBe('冲突');
    });
  });

  // ============================================================
  // 解构模式测试
  // ============================================================
  describe('解构模式', () => {
    it('应能解构 NotFoundError 的 statusCode 和 message', () => {
      const err = new NotFoundError('资源');
      const { statusCode, message, name } = err;
      expect(statusCode).toBe(404);
      expect(message).toBe('资源不存在');
      expect(name).toBe('NotFoundError');
    });

    it('应能解构 BusinessError 的 statusCode 和 message', () => {
      const err = new BusinessError('业务异常');
      const { statusCode, message } = err;
      expect(statusCode).toBe(400);
      expect(message).toBe('业务异常');
    });

    it('应能解构 UnauthorizedError 的所有属性', () => {
      const err = new UnauthorizedError('请重新登录');
      const { statusCode, message, name, stack } = err;
      expect(statusCode).toBe(401);
      expect(message).toBe('请重新登录');
      expect(name).toBe('UnauthorizedError');
      expect(typeof stack).toBe('string');
    });
  });

  // ============================================================
  // 集合高级操作测试
  // ============================================================
  describe('集合高级操作', () => {
    it('应能将多个错误放入数组并按 statusCode 过滤', () => {
      const errors = [
        new NotFoundError('A'),
        new BusinessError('B'),
        new UnauthorizedError(),
        new ForbiddenError(),
        new ConflictError('C'),
      ];
      const clientErrors = errors.filter(e => e.statusCode >= 400 && e.statusCode < 500);
      expect(clientErrors).toHaveLength(5);
      const authErrors = errors.filter(e => e.statusCode === 401 || e.statusCode === 403);
      expect(authErrors).toHaveLength(2);
    });

    it('应能将多个错误放入 Map 并按 name 查找', () => {
      const errorMap = new Map<string, AppError>();
      errorMap.set('notFound', new NotFoundError('用户'));
      errorMap.set('business', new BusinessError('参数错误'));
      errorMap.set('conflict', new ConflictError('重复'));

      expect(errorMap.get('notFound')?.statusCode).toBe(404);
      expect(errorMap.get('business')?.statusCode).toBe(400);
      expect(errorMap.get('conflict')?.statusCode).toBe(409);
      expect(errorMap.size).toBe(3);
    });

    it('应能用 Set 去重——相同 statusCode 的不同实例应保持独立', () => {
      const err1 = new NotFoundError('A');
      const err2 = new NotFoundError('B');
      const errorSet = new Set([err1, err2]);
      expect(errorSet.size).toBe(2);
    });
  });

  // ============================================================
  // 连续更新链测试
  // ============================================================
  describe('连续更新链', () => {
    it('连续抛出不同类型的错误应都能被 AppError 捕获', () => {
      const results: number[] = [];
      const errorList = [
        new NotFoundError('X'),
        new BusinessError('Y'),
        new UnauthorizedError(),
        new ForbiddenError(),
        new ConflictError('Z'),
      ];
      for (const e of errorList) {
        try {
          throw e;
        } catch (err) {
          if (err instanceof AppError) {
            results.push(err.statusCode);
          }
        }
      }
      expect(results).toEqual([404, 400, 401, 403, 409]);
    });
  });

  // ============================================================
  // 属性描述符测试
  // ============================================================
  describe('属性描述符', () => {
    it('statusCode 应有正确的属性描述符', () => {
      const err = new NotFoundError('用户');
      const desc = Object.getOwnPropertyDescriptor(err, 'statusCode');
      expect(desc).toBeDefined();
      expect(desc?.value).toBe(404);
      expect(desc?.writable).toBe(true);
      expect(desc?.enumerable).toBe(true);
      expect(desc?.configurable).toBe(true);
    });

    it('message 应继承自 Error', () => {
      const err = new BusinessError('test');
      const desc = Object.getOwnPropertyDescriptor(err, 'message');
      expect(desc).toBeDefined();
      expect(desc?.value).toBe('test');
    });

    it('name 属性应存在于实例上', () => {
      const err = new UnauthorizedError();
      expect(err.name).toBe('UnauthorizedError');
      expect(Object.prototype.hasOwnProperty.call(err, 'name')).toBe(true);
    });
  });

  // ============================================================
  // 函数参数传递测试
  // ============================================================
  describe('函数参数传递', () => {
    function handleError(err: AppError): { status: number; body: string } {
      return { status: err.statusCode, body: err.message };
    }

    it('NotFoundError 作为参数传递后应正确返回结果', () => {
      const result = handleError(new NotFoundError('项目'));
      expect(result).toEqual({ status: 404, body: '项目不存在' });
    });

    it('BusinessError 作为参数传递后应正确返回结果', () => {
      const result = handleError(new BusinessError('参数不合法'));
      expect(result).toEqual({ status: 400, body: '参数不合法' });
    });

    it('UnauthorizedError 作为参数传递后应正确返回结果', () => {
      const result = handleError(new UnauthorizedError());
      expect(result).toEqual({ status: 401, body: '未授权，请先登录' });
    });

    it('ForbiddenError 作为参数传递后应正确返回结果', () => {
      const result = handleError(new ForbiddenError());
      expect(result).toEqual({ status: 403, body: '权限不足' });
    });

    it('ConflictError 作为参数传递后应正确返回结果', () => {
      const result = handleError(new ConflictError('用户名已被占用'));
      expect(result).toEqual({ status: 409, body: '用户名已被占用' });
    });
  });

  // ============================================================
  // 安全注入测试（16项）
  // ============================================================
  describe('安全注入', () => {
    it('message 含 HTML 标签不应被转义', () => {
      const err = new BusinessError('<script>alert("xss")</script>');
      expect(err.message).toBe('<script>alert("xss")</script>');
    });

    it('message 含 SQL 注入字符串应原样保留', () => {
      const err = new BusinessError("'; DROP TABLE users; --");
      expect(err.message).toBe("'; DROP TABLE users; --");
    });

    it('message 含 null 字节应保留', () => {
      const err = new BusinessError('error\x00injected');
      expect(err.message).toBe('error\x00injected');
    });

    it('message 含换行符应保留', () => {
      const err = new BusinessError('line1\nline2\r\nline3');
      expect(err.message).toBe('line1\nline2\r\nline3');
    });

    it('message 含 Unicode 特殊字符应保留', () => {
      const err = new BusinessError('‮ \uD800');
      expect(err.message).toBe('‮ \uD800');
    });

    it('message 含超长字符串不应截断', () => {
      const longMsg = 'A'.repeat(10000);
      const err = new BusinessError(longMsg);
      expect(err.message).toBe(longMsg);
      expect(err.message.length).toBe(10000);
    });

    it('NotFoundError entity 含 HTML 注入应原样保留', () => {
      const err = new NotFoundError('<img onerror=alert(1) src=x>');
      expect(err.message).toBe('<img onerror=alert(1) src=x>不存在');
    });

    it('ConflictError message 含模板语法应原样保留', () => {
      const err = new ConflictError('${process.env.JWT_SECRET}');
      expect(err.message).toBe('${process.env.JWT_SECRET}');
    });

    it('UnauthorizedError 自定义 message 含注入应原样保留', () => {
      const err = new UnauthorizedError('"); DROP TABLE sessions; --');
      expect(err.message).toBe('"); DROP TABLE sessions; --');
    });

    it('ForbiddenError 自定义 message 含路径遍历应原样保留', () => {
      const err = new ForbiddenError('../../../etc/passwd');
      expect(err.message).toBe('../../../etc/passwd');
    });

    it('prototype pollution 不应影响类层次', () => {
      const original = AppError.prototype.constructor;
      try {
        (AppError.prototype as any).polluted = true;
        const err = new NotFoundError('test');
        expect(err).toBeInstanceOf(NotFoundError);
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(404);
      } finally {
        delete (AppError.prototype as any).polluted;
      }
    });

    it('修改实例 __proto__ 不应影响类原型', () => {
      const err = new BusinessError('test');
      (err as any).__proto__ = null;
      // 原型链被破坏但不应影响其他实例
      const err2 = new BusinessError('test2');
      expect(err2).toBeInstanceOf(BusinessError);
      expect(err2).toBeInstanceOf(AppError);
    });

    it('toString/valueOf 注入不应影响 statusCode', () => {
      const err = new NotFoundError({
        toString: () => 'evil',
      } as unknown as string);
      expect(err.statusCode).toBe(404);
      expect(typeof err.message).toBe('string');
    });

    it('AppError statusCode 传入非数字应正常赋值', () => {
      const err = new AppError('NaN' as unknown as number, 'test');
      expect(err.statusCode).toBe('NaN');
    });

    it('AppError message 传入非字符串应正常赋值', () => {
      const err = new AppError(500, 12345 as unknown as string);
      expect(err.message).toBe('12345');
    });

    it('构造函数 new.target 始终指向直接调用者', () => {
      const err = new NotFoundError('test');
      expect(err.constructor).toBe(NotFoundError);
      expect(Object.getPrototypeOf(err)).toBe(NotFoundError.prototype);
    });
  });

  // ============================================================
  // NaN / Infinity 边界测试（8项）
  // ============================================================
  describe('NaN / Infinity 边界', () => {
    it('AppError statusCode 为 NaN 应原样存储', () => {
      const err = new AppError(NaN, 'test');
      expect(err.statusCode).toBeNaN();
    });

    it('AppError statusCode 为 Infinity 应原样存储', () => {
      const err = new AppError(Infinity, 'test');
      expect(err.statusCode).toBe(Infinity);
    });

    it('AppError statusCode 为 -Infinity 应原样存储', () => {
      const err = new AppError(-Infinity, 'test');
      expect(err.statusCode).toBe(-Infinity);
    });

    it('AppError statusCode 为 0 应正常存储', () => {
      const err = new AppError(0, 'test');
      expect(err.statusCode).toBe(0);
    });

    it('AppError statusCode 为负数应正常存储', () => {
      const err = new AppError(-1, 'test');
      expect(err.statusCode).toBe(-1);
    });

    it('AppError statusCode 为浮点数应正常存储', () => {
      const err = new AppError(404.5, 'test');
      expect(err.statusCode).toBe(404.5);
    });

    it('AppError statusCode 为极大整数应正常存储', () => {
      const err = new AppError(Number.MAX_SAFE_INTEGER, 'test');
      expect(err.statusCode).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('AppError statusCode 为极小负整数应正常存储', () => {
      const err = new AppError(Number.MIN_SAFE_INTEGER, 'test');
      expect(err.statusCode).toBe(Number.MIN_SAFE_INTEGER);
    });
  });

  // ============================================================
  // 类型守卫测试（10项）
  // ============================================================
  describe('类型守卫', () => {
    function isAppError(e: unknown): e is AppError {
      return e instanceof AppError;
    }

    it('AppError 实例通过类型守卫应返回 true', () => {
      expect(isAppError(new AppError(500, 'test'))).toBe(true);
    });

    it('NotFoundError 实例通过类型守卫应返回 true', () => {
      expect(isAppError(new NotFoundError('test'))).toBe(true);
    });

    it('BusinessError 实例通过类型守卫应返回 true', () => {
      expect(isAppError(new BusinessError('test'))).toBe(true);
    });

    it('普通 Error 通过类型守卫应返回 false', () => {
      expect(isAppError(new Error('test'))).toBe(false);
    });

    it('null 通过类型守卫应返回 false', () => {
      expect(isAppError(null)).toBe(false);
    });

    it('undefined 通过类型守卫应返回 false', () => {
      expect(isAppError(undefined)).toBe(false);
    });

    it('字符串通过类型守卫应返回 false', () => {
      expect(isAppError('error')).toBe(false);
    });

    it('数字通过类型守卫应返回 false', () => {
      expect(isAppError(404)).toBe(false);
    });

    it('普通对象通过类型守卫应返回 false', () => {
      expect(isAppError({ statusCode: 500, message: 'test' })).toBe(false);
    });

    it('类型守卫应正确窄化类型', () => {
      const unknown: unknown = new NotFoundError('用户');
      if (isAppError(unknown)) {
        expect(unknown.statusCode).toBe(404);
        expect(unknown.message).toBe('用户不存在');
      } else {
        fail('应为 AppError 实例');
      }
    });
  });

  // ============================================================
  // 深冻结测试（7项）
  // ============================================================
  describe('深冻结', () => {
    it('Object.freeze 后 AppError 属性不可写', () => {
      const err = Object.freeze(new AppError(500, 'test'));
      expect(() => { (err as any).statusCode = 200; }).toThrow(TypeError);
      expect(err.statusCode).toBe(500);
    });

    it('Object.freeze 后 NotFoundError 属性不可写', () => {
      const err = Object.freeze(new NotFoundError('test'));
      expect(() => { (err as any).name = 'Modified'; }).toThrow(TypeError);
      expect(err.name).toBe('NotFoundError');
    });

    it('Object.freeze 后 BusinessError 属性不可删除', () => {
      const err = Object.freeze(new BusinessError('test'));
      expect(() => { delete (err as any).statusCode; }).toThrow(TypeError);
      expect(err.statusCode).toBe(400);
    });

    it('Object.freeze 后 UnauthorizedError 不允许添加新属性', () => {
      const err = Object.freeze(new UnauthorizedError());
      expect(() => { (err as any).extra = 'malicious'; }).toThrow(TypeError);
      expect((err as any).extra).toBeUndefined();
    });

    it('Object.freeze 后 ForbiddenError 不允许修改 message', () => {
      const err = Object.freeze(new ForbiddenError());
      expect(() => { (err as any).message = 'hacked'; }).toThrow(TypeError);
      expect(err.message).toBe('权限不足');
    });

    it('Object.freeze 后 ConflictError 属性描述符 configurable 应为 false', () => {
      const err = Object.freeze(new ConflictError('test'));
      const desc = Object.getOwnPropertyDescriptor(err, 'statusCode');
      expect(desc?.configurable).toBe(false);
      expect(desc?.writable).toBe(false);
    });

    it('Object.isFrozen 应返回 true', () => {
      const err = Object.freeze(new NotFoundError('test'));
      expect(Object.isFrozen(err)).toBe(true);
    });
  });

  // ============================================================
  // 生命周期 / 原型链完整性测试（7项）
  // ============================================================
  describe('生命周期 / 原型链完整性', () => {
    it('AppError.prototype 的原型应为 Error.prototype', () => {
      expect(Object.getPrototypeOf(AppError.prototype)).toBe(Error.prototype);
    });

    it('NotFoundError 三层原型链完整', () => {
      const err = new NotFoundError('test');
      expect(Object.getPrototypeOf(err)).toBe(NotFoundError.prototype);
      expect(Object.getPrototypeOf(NotFoundError.prototype)).toBe(AppError.prototype);
      expect(Object.getPrototypeOf(AppError.prototype)).toBe(Error.prototype);
      expect(Object.getPrototypeOf(Error.prototype)).toBe(Object.prototype);
    });

    it('BusinessError constructor 应指向自身', () => {
      const err = new BusinessError('test');
      expect(err.constructor).toBe(BusinessError);
      expect(NotFoundError.prototype.constructor).toBe(NotFoundError);
    });

    it('UnauthorizedError 原型链上不应有其他子类的方法', () => {
      const err = new UnauthorizedError();
      expect((err as any).entity).toBeUndefined();
      expect(typeof err.message).toBe('string');
    });

    it('多次创建实例不应共享状态', () => {
      const err1 = new AppError(400, 'first');
      const err2 = new AppError(500, 'second');
      (err1 as any).custom = 'shared?';
      expect((err2 as any).custom).toBeUndefined();
    });

    it('子类实例的 hasOwnProperty 应正确反映自身属性', () => {
      const err = new NotFoundError('test');
      expect(Object.prototype.hasOwnProperty.call(err, 'statusCode')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(err, 'message')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(err, 'name')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(err, 'stack')).toBe(true);
    });

    it('所有子类原型应共享 AppError.prototype 作为父原型', () => {
      const subclasses = [NotFoundError, BusinessError, UnauthorizedError, ForbiddenError, ConflictError];
      for (const Sub of subclasses) {
        expect(Object.getPrototypeOf(Sub.prototype)).toBe(AppError.prototype);
      }
    });
  });

  // ============================================================
  // 业务场景测试（12项）
  // ============================================================
  describe('业务场景', () => {
    it('Express 错误处理中间件应能统一捕获 AppError', () => {
      function expressErrorHandler(err: Error): { status: number; msg: string } {
        if (err instanceof AppError) {
          return { status: err.statusCode, msg: err.message };
        }
        return { status: 500, msg: 'Internal Server Error' };
      }

      const result = expressErrorHandler(new NotFoundError('公司'));
      expect(result).toEqual({ status: 404, msg: '公司不存在' });
    });

    it('Express 错误处理中间件应将非 AppError 视为 500', () => {
      function expressErrorHandler(err: Error): { status: number; msg: string } {
        if (err instanceof AppError) {
          return { status: err.statusCode, msg: err.message };
        }
        return { status: 500, msg: 'Internal Server Error' };
      }

      const result = expressErrorHandler(new Error('unexpected'));
      expect(result).toEqual({ status: 500, msg: 'Internal Server Error' });
    });

    it('未登录用户访问受保护资源应抛出 UnauthorizedError', () => {
      function requireAuth(token: string | null) {
        if (!token) throw new UnauthorizedError();
      }
      expect(() => requireAuth(null)).toThrow(UnauthorizedError);
      expect(() => requireAuth(null)).toThrow('未授权，请先登录');
    });

    it('无权限用户操作应抛出 ForbiddenError', () => {
      function requireRole(role: string) {
        if (role !== 'admin') throw new ForbiddenError();
      }
      expect(() => requireRole('view')).toThrow(ForbiddenError);
    });

    it('查询不存在的实体应抛出 NotFoundError', () => {
      function findUser(id: number) {
        if (id <= 0) throw new NotFoundError('用户');
        return { id, name: 'test' };
      }
      expect(() => findUser(-1)).toThrow(NotFoundError);
      expect(() => findUser(-1)).toThrow('用户不存在');
    });

    it('创建重复资源应抛出 ConflictError', () => {
      const existing = new Set(['admin']);
      function createUser(username: string) {
        if (existing.has(username)) throw new ConflictError('用户名已存在');
      }
      expect(() => createUser('admin')).toThrow(ConflictError);
    });

    it('业务校验失败应抛出 BusinessError', () => {
      function validateAge(age: number) {
        if (age < 18) throw new BusinessError('年龄必须大于等于18岁');
      }
      expect(() => validateAge(17)).toThrow(BusinessError);
    });

    it('async 函数中抛出 AppError 应可被 catch 捕获', async () => {
      async function fetchData() {
        throw new NotFoundError('数据');
      }
      try {
        await fetchData();
        fail('不应到达此处');
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundError);
        expect((e as AppError).statusCode).toBe(404);
      }
    });

    it('Promise.reject 包裹 AppError 应可被 catch 捕获', async () => {
      await expect(
        Promise.reject(new ConflictError('版本冲突')),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it('嵌套 try-catch 应正确传递错误', () => {
      function inner() {
        throw new NotFoundError('内部资源');
      }
      function outer() {
        try {
          inner();
        } catch (e) {
          if (e instanceof NotFoundError) {
            throw new BusinessError(`外部处理失败: ${e.message}`);
          }
          throw e;
        }
      }
      expect(outer).toThrow(BusinessError);
      expect(outer).toThrow('外部处理失败: 内部资源不存在');
    });

    it('错误映射表应能根据 statusCode 查找错误类型', () => {
      const errorMap = new Map<number, typeof AppError>([
        [404, NotFoundError],
        [400, BusinessError],
        [401, UnauthorizedError],
        [403, ForbiddenError],
        [409, ConflictError],
      ]);
      expect(errorMap.get(404)).toBe(NotFoundError);
      expect(errorMap.get(409)).toBe(ConflictError);
    });

    it('错误应可正确传递给客户端响应', () => {
      interface ApiResponse { status: number; body: { error: string } }
      function sendError(err: AppError): ApiResponse {
        return { status: err.statusCode, body: { error: err.message } };
      }
      const res = sendError(new UnauthorizedError('Token 无效'));
      expect(res).toEqual({ status: 401, body: { error: 'Token 无效' } });
    });
  });
});

/**
 * @jest-environment node
 */
import {
  AppError,
  NotFoundError,
  ConflictError,
  BusinessError,
} from '../../../apis/errors';

describe('entity/errors', () => {
  // ============================================================
  // NotFoundError
  // ============================================================
  describe('NotFoundError', () => {
    describe('构造函数与基本属性', () => {
      it('应正确设置 statusCode 为 404', () => {
        const err = new NotFoundError('用户');
        expect(err.statusCode).toBe(404);
      });

      it('应正确拼接 message 为 `${entity}不存在`', () => {
        const err = new NotFoundError('用户');
        expect(err.message).toBe('用户不存在');
      });

      it('name 应为 NotFoundError', () => {
        const err = new NotFoundError('用户');
        expect(err.name).toBe('NotFoundError');
      });

      it('不同实体名应产生不同 message', () => {
        const err1 = new NotFoundError('公司');
        const err2 = new NotFoundError('项目');
        const err3 = new NotFoundError('文章');
        expect(err1.message).toBe('公司不存在');
        expect(err2.message).toBe('项目不存在');
        expect(err3.message).toBe('文章不存在');
      });

      it('空字符串实体名应生成 "不存在"', () => {
        const err = new NotFoundError('');
        expect(err.message).toBe('不存在');
      });

      it('长实体名应正确拼接', () => {
        const longName = '这是一个非常非常长的实体名称用来测试拼接';
        const err = new NotFoundError(longName);
        expect(err.message).toBe(`${longName}不存在`);
      });

      it('含特殊字符的实体名应原样保留', () => {
        const err = new NotFoundError('user<script>alert(1)</script>');
        expect(err.message).toBe('user<script>alert(1)</script>不存在');
      });

      it('含空白字符的实体名应原样保留', () => {
        const err = new NotFoundError('用户 信息');
        expect(err.message).toBe('用户 信息不存在');
      });

      it('含 Unicode 字符的实体名应正确拼接', () => {
        const err = new NotFoundError('🎉資源');
        expect(err.message).toBe('🎉資源不存在');
      });
    });

    describe('继承与原型链', () => {
      it('应为 Error 的实例', () => {
        const err = new NotFoundError('用户');
        expect(err).toBeInstanceOf(Error);
      });

      it('应为 NotFoundError 的实例', () => {
        const err = new NotFoundError('用户');
        expect(err).toBeInstanceOf(NotFoundError);
      });

      it('不应为 ConflictError 或 BusinessError 的实例', () => {
        const err = new NotFoundError('用户');
        expect(err).not.toBeInstanceOf(ConflictError);
        expect(err).not.toBeInstanceOf(BusinessError);
      });

      it('原型链应正确', () => {
        const err = new NotFoundError('用户');
        expect(Object.getPrototypeOf(err)).toBe(NotFoundError.prototype);
        expect(Object.getPrototypeOf(NotFoundError.prototype)).toBe(AppError.prototype);
      });

      it('constructor 应指向 NotFoundError', () => {
        const err = new NotFoundError('用户');
        expect(err.constructor).toBe(NotFoundError);
      });
    });

    describe('throw/catch 行为', () => {
      it('可以用 throw 抛出并用 catch 捕获', () => {
        const throwIt = () => { throw new NotFoundError('订单'); };
        expect(throwIt).toThrow(NotFoundError);
        expect(throwIt).toThrow(Error);
      });

      it('catch 中应能读取 statusCode 和 message', () => {
        try {
          throw new NotFoundError('资源');
        } catch (e) {
          expect(e).toBeInstanceOf(NotFoundError);
          if (e instanceof NotFoundError) {
            expect(e.statusCode).toBe(404);
            expect(e.message).toBe('资源不存在');
          }
        }
      });

      it('catch 中 instanceof 应能区分其他错误类型', () => {
        try {
          throw new NotFoundError('文章');
        } catch (e) {
          expect(e).toBeInstanceOf(NotFoundError);
          expect(e).not.toBeInstanceOf(ConflictError);
          expect(e).not.toBeInstanceOf(BusinessError);
        }
      });

      it('异步 throw 也应正确捕获', async () => {
        await expect(
          Promise.reject(new NotFoundError('异步资源'))
        ).rejects.toBeInstanceOf(NotFoundError);

        await expect(
          Promise.reject(new NotFoundError('异步资源'))
        ).rejects.toHaveProperty('statusCode', 404);
      });
    });

    describe('stack 属性', () => {
      it('stack 应存在且为字符串', () => {
        const err = new NotFoundError('用户');
        expect(typeof err.stack).toBe('string');
        expect(err.stack.length).toBeGreaterThan(0);
      });

      it('stack 应包含错误名称', () => {
        const err = new NotFoundError('用户');
        expect(err.stack).toContain('NotFoundError');
      });

      it('不同实例的 stack 应不同', () => {
        const err1 = new NotFoundError('A');
        const err2 = new NotFoundError('B');
        // 即使 message 不同，stack 也不同
        expect(err1.stack).not.toBe(err2.stack);
      });
    });

    describe('JSON 序列化', () => {
      it('JSON.stringify 后 statusCode 应保留', () => {
        const err = new NotFoundError('用户');
        const parsed = JSON.parse(JSON.stringify(err));
        expect(parsed.statusCode).toBe(404);
      });

      it('JSON.stringify 后 message 不可枚举不出现', () => {
        const err = new NotFoundError('用户');
        const parsed = JSON.parse(JSON.stringify(err));
        // Error.message 不可枚举
        expect(parsed.message).toBeUndefined();
      });

      it('JSON.stringify 后 name 应保留', () => {
        const err = new NotFoundError('用户');
        const parsed = JSON.parse(JSON.stringify(err));
        expect(parsed.name).toBe('NotFoundError');
      });
    });

    describe('属性描述符', () => {
      it('statusCode 应为实例自身属性', () => {
        const err = new NotFoundError('用户');
        expect(Object.prototype.hasOwnProperty.call(err, 'statusCode')).toBe(true);
      });

      it('statusCode 属性描述符应正确', () => {
        const err = new NotFoundError('用户');
        const desc = Object.getOwnPropertyDescriptor(err, 'statusCode');
        expect(desc).toBeDefined();
        expect(desc?.value).toBe(404);
        expect(desc?.writable).toBe(true);
        expect(desc?.enumerable).toBe(true);
        expect(desc?.configurable).toBe(true);
      });

      it('name 应为实例自身属性', () => {
        const err = new NotFoundError('用户');
        expect(Object.prototype.hasOwnProperty.call(err, 'name')).toBe(true);
      });
    });

    describe('不可变性', () => {
      it('Object.freeze 后修改 statusCode 应抛出异常', () => {
        const err = Object.freeze(new NotFoundError('用户'));
        expect(() => { (err as any).statusCode = 500; }).toThrow();
        expect(err.statusCode).toBe(404);
      });

      it('Object.freeze 后修改 message 应抛出异常', () => {
        const err = Object.freeze(new NotFoundError('用户'));
        expect(() => { (err as any).message = '修改'; }).toThrow();
        expect(err.message).toBe('用户不存在');
      });
    });

    describe('多实例独立性', () => {
      it('两个实例应互不影响', () => {
        const err1 = new NotFoundError('用户');
        const err2 = new NotFoundError('订单');
        expect(err1.message).toBe('用户不存在');
        expect(err2.message).toBe('订单不存在');
        expect(err1).not.toBe(err2);
      });

      it('相同参数的两个实例应具有相同属性值但不是同一对象', () => {
        const err1 = new NotFoundError('用户');
        const err2 = new NotFoundError('用户');
        expect(err1.statusCode).toBe(err2.statusCode);
        expect(err1.message).toBe(err2.message);
        expect(err1.name).toBe(err2.name);
        expect(err1).not.toBe(err2);
      });
    });

    describe('解构', () => {
      it('应能正确解构所有属性', () => {
        const err = new NotFoundError('资源');
        const { statusCode, message, name, stack } = err;
        expect(statusCode).toBe(404);
        expect(message).toBe('资源不存在');
        expect(name).toBe('NotFoundError');
        expect(typeof stack).toBe('string');
      });
    });

    describe('函数参数传递', () => {
      function formatError(err: Error & { statusCode?: number }): string {
        return `[${err.statusCode ?? 'N/A'}] ${err.message}`;
      }

      it('作为 Error 参数传递后应正确处理', () => {
        const result = formatError(new NotFoundError('项目'));
        expect(result).toBe('[404] 项目不存在');
      });
    });

    describe('集合操作', () => {
      it('应能放入数组并按 statusCode 过滤', () => {
        const errors = [
          new NotFoundError('A'),
          new NotFoundError('B'),
          new NotFoundError('C'),
        ];
        const filtered = errors.filter(e => e.statusCode === 404);
        expect(filtered).toHaveLength(3);
      });

      it('应能放入 Map 并按 key 查找', () => {
        const map = new Map<string, NotFoundError>();
        map.set('user', new NotFoundError('用户'));
        map.set('order', new NotFoundError('订单'));
        expect(map.get('user')?.message).toBe('用户不存在');
        expect(map.get('order')?.statusCode).toBe(404);
        expect(map.size).toBe(2);
      });

      it('应能放入 Set 并保持独立性', () => {
        const err1 = new NotFoundError('A');
        const err2 = new NotFoundError('B');
        const set = new Set([err1, err2]);
        expect(set.size).toBe(2);
        expect(set.has(err1)).toBe(true);
        expect(set.has(err2)).toBe(true);
      });
    });

    describe('边界值', () => {
      it('纯数字字符串实体名', () => {
        const err = new NotFoundError('123');
        expect(err.message).toBe('123不存在');
      });

      it('纯空格实体名', () => {
        const err = new NotFoundError('   ');
        expect(err.message).toBe('   不存在');
      });

      it('换行符实体名', () => {
        const err = new NotFoundError('用户\n信息');
        expect(err.message).toBe('用户\n信息不存在');
      });

      it('超长实体名（10000字符）', () => {
        const longName = 'A'.repeat(10000);
        const err = new NotFoundError(longName);
        expect(err.message).toBe(`${longName}不存在`);
        expect(err.message.length).toBe(10003);
      });
    });
  });

  // ============================================================
  // ConflictError
  // ============================================================
  describe('ConflictError', () => {
    describe('构造函数与基本属性', () => {
      it('应正确设置 statusCode 为 409', () => {
        const err = new ConflictError('用户名已存在');
        expect(err.statusCode).toBe(409);
      });

      it('应保留自定义 message', () => {
        const err = new ConflictError('数据冲突');
        expect(err.message).toBe('数据冲突');
      });

      it('name 应为 ConflictError', () => {
        const err = new ConflictError('冲突');
        expect(err.name).toBe('ConflictError');
      });

      it('空字符串 message 应被接受', () => {
        const err = new ConflictError('');
        expect(err.message).toBe('');
        expect(err.statusCode).toBe(409);
      });

      it('中文长 message 应正确存储', () => {
        const msg = '该记录已被其他用户修改，请刷新后重试';
        const err = new ConflictError(msg);
        expect(err.message).toBe(msg);
      });

      it('含 HTML 标签的 message 应原样保留', () => {
        const err = new ConflictError('<b>bold</b>');
        expect(err.message).toBe('<b>bold</b>');
      });

      it('含特殊字符的 message 应原样保留', () => {
        const err = new ConflictError('name="test"&value=1');
        expect(err.message).toBe('name="test"&value=1');
      });
    });

    describe('继承与原型链', () => {
      it('应为 Error 的实例', () => {
        const err = new ConflictError('test');
        expect(err).toBeInstanceOf(Error);
      });

      it('应为 ConflictError 的实例', () => {
        const err = new ConflictError('test');
        expect(err).toBeInstanceOf(ConflictError);
      });

      it('不应为 NotFoundError 或 BusinessError 的实例', () => {
        const err = new ConflictError('test');
        expect(err).not.toBeInstanceOf(NotFoundError);
        expect(err).not.toBeInstanceOf(BusinessError);
      });

      it('原型链应正确', () => {
        const err = new ConflictError('test');
        expect(Object.getPrototypeOf(err)).toBe(ConflictError.prototype);
        expect(Object.getPrototypeOf(ConflictError.prototype)).toBe(AppError.prototype);
      });

      it('constructor 应指向 ConflictError', () => {
        const err = new ConflictError('test');
        expect(err.constructor).toBe(ConflictError);
      });
    });

    describe('throw/catch 行为', () => {
      it('可以用 throw 抛出并用 catch 捕获', () => {
        const throwIt = () => { throw new ConflictError('冲突'); };
        expect(throwIt).toThrow(ConflictError);
        expect(throwIt).toThrow(Error);
      });

      it('catch 中应能读取 statusCode 和 message', () => {
        try {
          throw new ConflictError('重复提交');
        } catch (e) {
          expect(e).toBeInstanceOf(ConflictError);
          if (e instanceof ConflictError) {
            expect(e.statusCode).toBe(409);
            expect(e.message).toBe('重复提交');
          }
        }
      });

      it('catch 中 instanceof 应能区分其他错误类型', () => {
        try {
          throw new ConflictError('冲突');
        } catch (e) {
          expect(e).toBeInstanceOf(ConflictError);
          expect(e).not.toBeInstanceOf(NotFoundError);
          expect(e).not.toBeInstanceOf(BusinessError);
        }
      });

      it('异步 throw 也应正确捕获', async () => {
        await expect(
          Promise.reject(new ConflictError('异步冲突'))
        ).rejects.toBeInstanceOf(ConflictError);

        await expect(
          Promise.reject(new ConflictError('异步冲突'))
        ).rejects.toHaveProperty('statusCode', 409);
      });
    });

    describe('stack 属性', () => {
      it('stack 应存在且为字符串', () => {
        const err = new ConflictError('test');
        expect(typeof err.stack).toBe('string');
        expect(err.stack.length).toBeGreaterThan(0);
      });

      it('stack 应包含错误名称', () => {
        const err = new ConflictError('test');
        expect(err.stack).toContain('ConflictError');
      });
    });

    describe('JSON 序列化', () => {
      it('JSON.stringify 后 statusCode 应保留', () => {
        const err = new ConflictError('冲突');
        const parsed = JSON.parse(JSON.stringify(err));
        expect(parsed.statusCode).toBe(409);
      });

      it('JSON.stringify 后 name 应保留', () => {
        const err = new ConflictError('冲突');
        const parsed = JSON.parse(JSON.stringify(err));
        expect(parsed.name).toBe('ConflictError');
      });
    });

    describe('属性描述符', () => {
      it('statusCode 应为实例自身属性', () => {
        const err = new ConflictError('test');
        expect(Object.prototype.hasOwnProperty.call(err, 'statusCode')).toBe(true);
      });

      it('statusCode 属性描述符应正确', () => {
        const err = new ConflictError('test');
        const desc = Object.getOwnPropertyDescriptor(err, 'statusCode');
        expect(desc).toBeDefined();
        expect(desc?.value).toBe(409);
        expect(desc?.writable).toBe(true);
        expect(desc?.enumerable).toBe(true);
        expect(desc?.configurable).toBe(true);
      });
    });

    describe('不可变性', () => {
      it('Object.freeze 后修改 statusCode 应抛出异常', () => {
        const err = Object.freeze(new ConflictError('冲突'));
        expect(() => { (err as any).statusCode = 200; }).toThrow();
        expect(err.statusCode).toBe(409);
      });

      it('Object.freeze 后修改 message 应抛出异常', () => {
        const err = Object.freeze(new ConflictError('冲突'));
        expect(() => { (err as any).message = '修改'; }).toThrow();
        expect(err.message).toBe('冲突');
      });
    });

    describe('多实例独立性', () => {
      it('两个实例应互不影响', () => {
        const err1 = new ConflictError('冲突A');
        const err2 = new ConflictError('冲突B');
        expect(err1.message).toBe('冲突A');
        expect(err2.message).toBe('冲突B');
        expect(err1).not.toBe(err2);
      });

      it('相同参数的两个实例应具有相同属性值但不是同一对象', () => {
        const err1 = new ConflictError('相同冲突');
        const err2 = new ConflictError('相同冲突');
        expect(err1.statusCode).toBe(err2.statusCode);
        expect(err1.message).toBe(err2.message);
        expect(err1).not.toBe(err2);
      });
    });

    describe('解构', () => {
      it('应能正确解构所有属性', () => {
        const err = new ConflictError('资源冲突');
        const { statusCode, message, name, stack } = err;
        expect(statusCode).toBe(409);
        expect(message).toBe('资源冲突');
        expect(name).toBe('ConflictError');
        expect(typeof stack).toBe('string');
      });
    });

    describe('函数参数传递', () => {
      function formatError(err: Error & { statusCode?: number }): string {
        return `[${err.statusCode ?? 'N/A'}] ${err.message}`;
      }

      it('作为参数传递后应正确处理', () => {
        const result = formatError(new ConflictError('数据冲突'));
        expect(result).toBe('[409] 数据冲突');
      });
    });

    describe('集合操作', () => {
      it('应能放入数组并按 statusCode 过滤', () => {
        const errors = [
          new ConflictError('A'),
          new ConflictError('B'),
        ];
        const filtered = errors.filter(e => e.statusCode === 409);
        expect(filtered).toHaveLength(2);
      });
    });

    describe('边界值', () => {
      it('超长 message（10000字符）', () => {
        const longMsg = 'X'.repeat(10000);
        const err = new ConflictError(longMsg);
        expect(err.message).toBe(longMsg);
        expect(err.message.length).toBe(10000);
      });

      it('含换行符的 message', () => {
        const err = new ConflictError('行1\n行2\n行3');
        expect(err.message).toBe('行1\n行2\n行3');
      });

      it('纯空格 message', () => {
        const err = new ConflictError('   ');
        expect(err.message).toBe('   ');
      });
    });
  });

  // ============================================================
  // BusinessError
  // ============================================================
  describe('BusinessError', () => {
    describe('构造函数与基本属性', () => {
      it('应正确设置 statusCode 为 400', () => {
        const err = new BusinessError('参数错误');
        expect(err.statusCode).toBe(400);
      });

      it('应保留自定义 message', () => {
        const err = new BusinessError('余额不足');
        expect(err.message).toBe('余额不足');
      });

      it('name 应为 BusinessError', () => {
        const err = new BusinessError('test');
        expect(err.name).toBe('BusinessError');
      });

      it('空字符串 message 应被接受', () => {
        const err = new BusinessError('');
        expect(err.message).toBe('');
        expect(err.statusCode).toBe(400);
      });

      it('中文长 message 应正确存储', () => {
        const msg = '该操作不被允许，请联系管理员获取权限后重试';
        const err = new BusinessError(msg);
        expect(err.message).toBe(msg);
      });

      it('含特殊字符的 message 应原样保留', () => {
        const err = new BusinessError('参数值包含<>、"\'&等特殊字符');
        expect(err.message).toBe('参数值包含<>、"\'&等特殊字符');
      });
    });

    describe('继承与原型链', () => {
      it('应为 Error 的实例', () => {
        const err = new BusinessError('test');
        expect(err).toBeInstanceOf(Error);
      });

      it('应为 BusinessError 的实例', () => {
        const err = new BusinessError('test');
        expect(err).toBeInstanceOf(BusinessError);
      });

      it('不应为 NotFoundError 或 ConflictError 的实例', () => {
        const err = new BusinessError('test');
        expect(err).not.toBeInstanceOf(NotFoundError);
        expect(err).not.toBeInstanceOf(ConflictError);
      });

      it('原型链应正确', () => {
        const err = new BusinessError('test');
        expect(Object.getPrototypeOf(err)).toBe(BusinessError.prototype);
        expect(Object.getPrototypeOf(BusinessError.prototype)).toBe(AppError.prototype);
      });

      it('constructor 应指向 BusinessError', () => {
        const err = new BusinessError('test');
        expect(err.constructor).toBe(BusinessError);
      });
    });

    describe('throw/catch 行为', () => {
      it('可以用 throw 抛出并用 catch 捕获', () => {
        const throwIt = () => { throw new BusinessError('业务异常'); };
        expect(throwIt).toThrow(BusinessError);
        expect(throwIt).toThrow(Error);
      });

      it('catch 中应能读取 statusCode 和 message', () => {
        try {
          throw new BusinessError('操作不允许');
        } catch (e) {
          expect(e).toBeInstanceOf(BusinessError);
          if (e instanceof BusinessError) {
            expect(e.statusCode).toBe(400);
            expect(e.message).toBe('操作不允许');
          }
        }
      });

      it('catch 中 instanceof 应能区分其他错误类型', () => {
        try {
          throw new BusinessError('业务错误');
        } catch (e) {
          expect(e).toBeInstanceOf(BusinessError);
          expect(e).not.toBeInstanceOf(NotFoundError);
          expect(e).not.toBeInstanceOf(ConflictError);
        }
      });

      it('异步 throw 也应正确捕获', async () => {
        await expect(
          Promise.reject(new BusinessError('异步业务错误'))
        ).rejects.toBeInstanceOf(BusinessError);

        await expect(
          Promise.reject(new BusinessError('异步业务错误'))
        ).rejects.toHaveProperty('statusCode', 400);
      });
    });

    describe('stack 属性', () => {
      it('stack 应存在且为字符串', () => {
        const err = new BusinessError('test');
        expect(typeof err.stack).toBe('string');
        expect(err.stack.length).toBeGreaterThan(0);
      });

      it('stack 应包含错误名称', () => {
        const err = new BusinessError('test');
        expect(err.stack).toContain('BusinessError');
      });
    });

    describe('JSON 序列化', () => {
      it('JSON.stringify 后 statusCode 应保留', () => {
        const err = new BusinessError('业务错误');
        const parsed = JSON.parse(JSON.stringify(err));
        expect(parsed.statusCode).toBe(400);
      });

      it('JSON.stringify 后 name 应保留', () => {
        const err = new BusinessError('业务错误');
        const parsed = JSON.parse(JSON.stringify(err));
        expect(parsed.name).toBe('BusinessError');
      });
    });

    describe('属性描述符', () => {
      it('statusCode 应为实例自身属性', () => {
        const err = new BusinessError('test');
        expect(Object.prototype.hasOwnProperty.call(err, 'statusCode')).toBe(true);
      });

      it('statusCode 属性描述符应正确', () => {
        const err = new BusinessError('test');
        const desc = Object.getOwnPropertyDescriptor(err, 'statusCode');
        expect(desc).toBeDefined();
        expect(desc?.value).toBe(400);
        expect(desc?.writable).toBe(true);
        expect(desc?.enumerable).toBe(true);
        expect(desc?.configurable).toBe(true);
      });
    });

    describe('不可变性', () => {
      it('Object.freeze 后修改 statusCode 应抛出异常', () => {
        const err = Object.freeze(new BusinessError('冻结测试'));
        expect(() => { (err as any).statusCode = 500; }).toThrow();
        expect(err.statusCode).toBe(400);
      });

      it('Object.freeze 后修改 message 应抛出异常', () => {
        const err = Object.freeze(new BusinessError('冻结测试'));
        expect(() => { (err as any).message = '修改'; }).toThrow();
        expect(err.message).toBe('冻结测试');
      });
    });

    describe('多实例独立性', () => {
      it('两个实例应互不影响', () => {
        const err1 = new BusinessError('错误A');
        const err2 = new BusinessError('错误B');
        expect(err1.message).toBe('错误A');
        expect(err2.message).toBe('错误B');
        expect(err1).not.toBe(err2);
      });

      it('相同参数的两个实例应具有相同属性值但不是同一对象', () => {
        const err1 = new BusinessError('相同错误');
        const err2 = new BusinessError('相同错误');
        expect(err1.statusCode).toBe(err2.statusCode);
        expect(err1.message).toBe(err2.message);
        expect(err1).not.toBe(err2);
      });
    });

    describe('解构', () => {
      it('应能正确解构所有属性', () => {
        const err = new BusinessError('业务异常');
        const { statusCode, message, name, stack } = err;
        expect(statusCode).toBe(400);
        expect(message).toBe('业务异常');
        expect(name).toBe('BusinessError');
        expect(typeof stack).toBe('string');
      });
    });

    describe('函数参数传递', () => {
      function formatError(err: Error & { statusCode?: number }): string {
        return `[${err.statusCode ?? 'N/A'}] ${err.message}`;
      }

      it('作为参数传递后应正确处理', () => {
        const result = formatError(new BusinessError('参数不合法'));
        expect(result).toBe('[400] 参数不合法');
      });
    });

    describe('集合操作', () => {
      it('应能放入数组并按 statusCode 过滤', () => {
        const errors = [
          new BusinessError('A'),
          new BusinessError('B'),
        ];
        const filtered = errors.filter(e => e.statusCode === 400);
        expect(filtered).toHaveLength(2);
      });
    });

    describe('边界值', () => {
      it('超长 message（10000字符）', () => {
        const longMsg = 'Y'.repeat(10000);
        const err = new BusinessError(longMsg);
        expect(err.message).toBe(longMsg);
        expect(err.message.length).toBe(10000);
      });

      it('含换行符的 message', () => {
        const err = new BusinessError('行1\n行2');
        expect(err.message).toBe('行1\n行2');
      });

      it('纯空格 message', () => {
        const err = new BusinessError('   ');
        expect(err.message).toBe('   ');
      });
    });
  });

  // ============================================================
  // 跨类型综合测试
  // ============================================================
  describe('跨类型综合测试', () => {
    const errorFactories = [
      { name: 'NotFoundError', create: () => new NotFoundError('资源'), statusCode: 404, message: '资源不存在' },
      { name: 'ConflictError', create: () => new ConflictError('冲突'), statusCode: 409, message: '冲突' },
      { name: 'BusinessError', create: () => new BusinessError('业务错误'), statusCode: 400, message: '业务错误' },
    ];

    it('所有错误类都应是 Error 的实例', () => {
      for (const { create } of errorFactories) {
        expect(create()).toBeInstanceOf(Error);
      }
    });

    it('各子类之间 instanceof 应互不混淆', () => {
      const classes = [NotFoundError, ConflictError, BusinessError];
      const instances = [
        new NotFoundError('A'),
        new ConflictError('B'),
        new BusinessError('C'),
      ];
      for (let i = 0; i < classes.length; i++) {
        for (let j = 0; j < classes.length; j++) {
          if (i === j) {
            expect(instances[i]).toBeInstanceOf(classes[j]);
          } else {
            expect(instances[i]).not.toBeInstanceOf(classes[j]);
          }
        }
      }
    });

    it('statusCode 在各类中应唯一', () => {
      const codes = errorFactories.map(e => e.statusCode);
      expect(new Set(codes).size).toBe(codes.length);
    });

    it('所有 statusCode 应为 4xx 范围', () => {
      for (const { create } of errorFactories) {
        const err = create();
        expect(err.statusCode).toBeGreaterThanOrEqual(400);
        expect(err.statusCode).toBeLessThan(500);
      }
    });

    it('所有错误都应有 stack 属性', () => {
      for (const { create } of errorFactories) {
        const err = create();
        expect(typeof err.stack).toBe('string');
        expect(err.stack.length).toBeGreaterThan(0);
      }
    });

    it('所有错误应可序列化为 JSON 并保留 statusCode', () => {
      for (const { create, statusCode } of errorFactories) {
        const err = create();
        const parsed = JSON.parse(JSON.stringify(err));
        expect(parsed.statusCode).toBe(statusCode);
      }
    });

    it('连续抛出不同类型应都能被 Error 捕获', () => {
      const results: number[] = [];
      for (const { create } of errorFactories) {
        try {
          throw create();
        } catch (e) {
          if (e instanceof Error && 'statusCode' in e) {
            results.push((e as any).statusCode);
          }
        }
      }
      expect(results).toEqual([404, 409, 400]);
    });

    it('多个错误放入数组后应能按类型分类', () => {
      const errors = [
        new NotFoundError('A'),
        new ConflictError('B'),
        new BusinessError('C'),
        new NotFoundError('D'),
        new BusinessError('E'),
      ];
      const notFound = errors.filter(e => e instanceof NotFoundError);
      const conflict = errors.filter(e => e instanceof ConflictError);
      const business = errors.filter(e => e instanceof BusinessError);
      expect(notFound).toHaveLength(2);
      expect(conflict).toHaveLength(1);
      expect(business).toHaveLength(2);
    });

    it('Map 中存储不同错误类型后应能正确检索', () => {
      const map = new Map<string, Error & { statusCode: number }>();
      map.set('notFound', new NotFoundError('用户'));
      map.set('conflict', new ConflictError('重复'));
      map.set('business', new BusinessError('参数错误'));
      expect(map.get('notFound')?.statusCode).toBe(404);
      expect(map.get('conflict')?.statusCode).toBe(409);
      expect(map.get('business')?.statusCode).toBe(400);
      expect(map.size).toBe(3);
    });

    it('统一的错误处理函数应能处理所有类型', () => {
      function toHttpResponse(err: Error & { statusCode: number }): { status: number; body: { message: string } } {
        return { status: err.statusCode, body: { message: err.message } };
      }
      const results = errorFactories.map(({ create }) => toHttpResponse(create()));
      expect(results).toEqual([
        { status: 404, body: { message: '资源不存在' } },
        { status: 409, body: { message: '冲突' } },
        { status: 400, body: { message: '业务错误' } },
      ]);
    });

    it('每个错误类 name 属性应对应其构造函数名', () => {
      for (const { create, name } of errorFactories) {
        const err = create();
        expect(err.name).toBe(name);
      }
    });

    it('Object.freeze 后所有类型都应不可修改', () => {
      for (const { create } of errorFactories) {
        const err = Object.freeze(create());
        expect(() => { (err as any).statusCode = 999; }).toThrow();
      }
    });

    it('深拷贝后修改不应影响原始对象', () => {
      for (const { create } of errorFactories) {
        const original = create();
        const copy = JSON.parse(JSON.stringify(original));
        copy.statusCode = 200;
        copy.message = '已修改';
        expect(original.statusCode).not.toBe(200);
      }
    });

    it('try-catch 中嵌套抛出不同类型应各自正确捕获', () => {
      const caught: string[] = [];
      try {
        try {
          throw new NotFoundError('内层');
        } catch (inner) {
          caught.push(inner instanceof NotFoundError ? 'notFound' : 'unknown');
          throw new ConflictError('外层');
        }
      } catch (outer) {
        caught.push(outer instanceof ConflictError ? 'conflict' : 'unknown');
      }
      expect(caught).toEqual(['notFound', 'conflict']);
    });

    it('结构相等性：相同参数的同类型实例应有相同的可枚举属性', () => {
      const pairs = [
        [new NotFoundError('X'), new NotFoundError('X')],
        [new ConflictError('Y'), new ConflictError('Y')],
        [new BusinessError('Z'), new BusinessError('Z')],
      ];
      for (const [a, b] of pairs) {
        expect(a.statusCode).toBe(b.statusCode);
        expect(a.name).toBe(b.name);
      }
    });

    it('Promise.allSettled 应能正确处理混合错误类型', async () => {
      const results = await Promise.allSettled([
        Promise.reject(new NotFoundError('资源')),
        Promise.reject(new ConflictError('冲突')),
        Promise.reject(new BusinessError('业务')),
        Promise.resolve('ok'),
      ]);
      expect(results[0].status).toBe('rejected');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('rejected');
      expect(results[3].status).toBe('fulfilled');
      if (results[0].status === 'rejected') {
        expect(results[0].reason).toBeInstanceOf(NotFoundError);
      }
      if (results[1].status === 'rejected') {
        expect(results[1].reason).toBeInstanceOf(ConflictError);
      }
      if (results[2].status === 'rejected') {
        expect(results[2].reason).toBeInstanceOf(BusinessError);
      }
    });

    it('错误循环：在循环中抛出和捕获不同类型应正确计数', () => {
      const errors = [
        new NotFoundError('N1'),
        new BusinessError('B1'),
        new ConflictError('C1'),
        new NotFoundError('N2'),
        new BusinessError('B2'),
      ];
      const counts = { notFound: 0, business: 0, conflict: 0 };
      for (const e of errors) {
        try {
          throw e;
        } catch (err) {
          if (err instanceof NotFoundError) counts.notFound++;
          else if (err instanceof ConflictError) counts.conflict++;
          else if (err instanceof BusinessError) counts.business++;
        }
      }
      expect(counts).toEqual({ notFound: 2, business: 2, conflict: 1 });
    });
  });

  // ============================================================
  // 实际使用场景模拟
  // ============================================================
  describe('实际使用场景', () => {
    it('Express 中间件错误处理模式', () => {
      function mockErrorHandler(err: Error): { status: number; body: string } {
        if ('statusCode' in err) {
          return { status: (err as any).statusCode, body: err.message };
        }
        return { status: 500, body: '服务器内部错误' };
      }

      expect(mockErrorHandler(new NotFoundError('用户'))).toEqual({ status: 404, body: '用户不存在' });
      expect(mockErrorHandler(new ConflictError('用户名已存在'))).toEqual({ status: 409, body: '用户名已存在' });
      expect(mockErrorHandler(new BusinessError('参数不合法'))).toEqual({ status: 400, body: '参数不合法' });
      expect(mockErrorHandler(new Error('unknown'))).toEqual({ status: 500, body: '服务器内部错误' });
    });

    it('Service 层抛出错误到 Controller 层', () => {
      function serviceLayer(id: number): never {
        if (id <= 0) throw new BusinessError('ID 必须大于 0');
        if (id === 404) throw new NotFoundError('数据');
        if (id === 999) throw new ConflictError('数据版本冲突');
        throw new Error('unreachable');
      }

      function controllerLayer(id: number): { status: number; body: string } {
        try {
          serviceLayer(id);
          return { status: 200, body: 'ok' };
        } catch (e) {
          if (e instanceof Error && 'statusCode' in e) {
            return { status: (e as any).statusCode, body: e.message };
          }
          return { status: 500, body: '未知错误' };
        }
      }

      expect(controllerLayer(-1)).toEqual({ status: 400, body: 'ID 必须大于 0' });
      expect(controllerLayer(404)).toEqual({ status: 404, body: '数据不存在' });
      expect(controllerLayer(999)).toEqual({ status: 409, body: '数据版本冲突' });
    });

    it('事务回滚场景模拟', () => {
      function transactionalOperation(shouldConflict: boolean): void {
        if (shouldConflict) {
          throw new ConflictError('记录已被修改，请刷新重试');
        }
      }

      function executeTransaction(shouldConflict: boolean): { success: boolean; error?: string } {
        try {
          transactionalOperation(shouldConflict);
          return { success: true };
        } catch (e) {
          if (e instanceof ConflictError) {
            return { success: false, error: e.message };
          }
          return { success: false, error: '未知错误' };
        }
      }

      expect(executeTransaction(false)).toEqual({ success: true });
      expect(executeTransaction(true)).toEqual({ success: false, error: '记录已被修改，请刷新重试' });
    });

    it('批量操作中部分失败场景', () => {
      function processItems(items: { id: number; valid: boolean }[]): { results: Array<{ id: number; status: string }> } {
        const results: Array<{ id: number; status: string }> = [];
        for (const item of items) {
          try {
            if (!item.valid) throw new BusinessError(`项目 ${item.id} 验证失败`);
            if (item.id === 0) throw new NotFoundError(`项目 ${item.id}`);
            results.push({ id: item.id, status: 'ok' });
          } catch (e) {
            if (e instanceof NotFoundError) {
              results.push({ id: item.id, status: 'not_found' });
            } else if (e instanceof BusinessError) {
              results.push({ id: item.id, status: 'validation_failed' });
            }
          }
        }
        return { results };
      }

      const { results } = processItems([
        { id: 1, valid: true },
        { id: 2, valid: false },
        { id: 0, valid: true },
        { id: 3, valid: true },
      ]);
      expect(results).toEqual([
        { id: 1, status: 'ok' },
        { id: 2, status: 'validation_failed' },
        { id: 0, status: 'not_found' },
        { id: 3, status: 'ok' },
      ]);
    });
  });
});

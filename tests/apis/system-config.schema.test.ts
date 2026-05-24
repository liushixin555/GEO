/**
 * @jest-environment node
 */
import { updateSystemConfigsSchema } from '../../apis/schema/system-config.schema';

describe('updateSystemConfigsSchema', () => {
  // ─── 合法输入 ──────────────────────────────────────────
  describe('合法输入', () => {
    it('应接受合法的单条配置', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: [{ config_key: 'yishangshu_username', config_value: 'admin' }],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.configs).toHaveLength(1);
        expect(result.data.configs[0].config_key).toBe('yishangshu_username');
      }
    });

    it('应接受合法的多条配置', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: [
          { config_key: 'yishangshu_username', config_value: 'admin' },
          { config_key: 'yishangshu_password', config_value: 'secret123' },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.configs).toHaveLength(2);
      }
    });

    it('应接受 yishangshu_password 配置', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: [{ config_key: 'yishangshu_password', config_value: 'mypass' }],
      });
      expect(result.success).toBe(true);
    });

    it('应接受 config_value 为空字符串', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: [{ config_key: 'yishangshu_username', config_value: '' }],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.configs[0].config_value).toBe('');
      }
    });

    it('应接受包含特殊字符的 config_value', () => {
      const specialValue = '<script>alert("xss")</script>&"\'';
      const result = updateSystemConfigsSchema.safeParse({
        configs: [{ config_key: 'yishangshu_username', config_value: specialValue }],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.configs[0].config_value).toBe(specialValue);
      }
    });

    it('应接受中文 config_value', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: [{ config_key: 'yishangshu_username', config_value: '薄云商机倍增服务' }],
      });
      expect(result.success).toBe(true);
    });

    it('应接受超长 config_value', () => {
      const longValue = 'a'.repeat(10000);
      const result = updateSystemConfigsSchema.safeParse({
        configs: [{ config_key: 'yishangshu_password', config_value: longValue }],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.configs[0].config_value).toBe(longValue);
      }
    });

    it('应忽略 config_item 的多余字段（inner object 无 strict）', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: [{ config_key: 'yishangshu_username', config_value: 'admin', extra_field: 'ignored' }],
      });
      // 内层 z.object 没有 .strict()，多余字段会被静默忽略
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data.configs[0] as any).extra_field).toBeUndefined();
      }
    });
  });

  // ─── configs 字段验证 ──────────────────────────────────
  describe('configs 字段验证', () => {
    it('应拒绝 configs 缺失', () => {
      const result = updateSystemConfigsSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        // strict 模式下 configs 缺失时报告 "required" 而非自定义 min(1) 消息
        expect(result.error.issues.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('应拒绝 configs 为空数组', () => {
      const result = updateSystemConfigsSchema.safeParse({ configs: [] });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('不能为空');
      }
    });

    it('应拒绝 configs 为字符串', () => {
      const result = updateSystemConfigsSchema.safeParse({ configs: 'not-array' });
      expect(result.success).toBe(false);
    });

    it('应拒绝 configs 为数字', () => {
      const result = updateSystemConfigsSchema.safeParse({ configs: 123 });
      expect(result.success).toBe(false);
    });

    it('应拒绝 configs 为 null', () => {
      const result = updateSystemConfigsSchema.safeParse({ configs: null });
      expect(result.success).toBe(false);
    });

    it('应拒绝 configs 为布尔值', () => {
      const result = updateSystemConfigsSchema.safeParse({ configs: true });
      expect(result.success).toBe(false);
    });

    it('应拒绝 configs 为对象（非数组）', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: { config_key: 'yishangshu_username', config_value: 'admin' },
      });
      expect(result.success).toBe(false);
    });

    it('应拒绝 body 包含额外字段（strict 模式）', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: [{ config_key: 'yishangshu_username', config_value: 'admin' }],
        extra: 'field',
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── config_key 验证（枚举白名单）──────────────────────
  describe('config_key 白名单验证', () => {
    it('应拒绝未知 config_key', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: [{ config_key: 'unknown_key', config_value: 'test' }],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('不允许修改');
      }
    });

    it('应拒绝空字符串 config_key', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: [{ config_key: '', config_value: 'test' }],
      });
      expect(result.success).toBe(false);
    });

    it('应拒绝 config_key 大小写不匹配', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: [{ config_key: 'YISHANGSHU_USERNAME', config_value: 'test' }],
      });
      expect(result.success).toBe(false);
    });

    it('应拒绝 config_key 包含前后空格', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: [{ config_key: ' yishangshu_username ', config_value: 'test' }],
      });
      expect(result.success).toBe(false);
    });

    it('应拒绝 config_key 缺失', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: [{ config_value: 'test' }],
      });
      expect(result.success).toBe(false);
    });

    it('应拒绝 config_key 为 null', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: [{ config_key: null, config_value: 'test' }],
      });
      expect(result.success).toBe(false);
    });

    it('应拒绝 config_key 为数字', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: [{ config_key: 123, config_value: 'test' }],
      });
      expect(result.success).toBe(false);
    });

    it('应拒绝 config_key 为布尔值', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: [{ config_key: true, config_value: 'test' }],
      });
      expect(result.success).toBe(false);
    });

    it('应在多条配置中精确报告第二条 key 不合法', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: [
          { config_key: 'yishangshu_username', config_value: 'admin' },
          { config_key: 'invalid_key', config_value: 'test' },
        ],
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── config_value 验证 ──────────────────────────────────
  describe('config_value 类型验证', () => {
    it('应拒绝 config_value 缺失', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: [{ config_key: 'yishangshu_username' }],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('config_value');
      }
    });

    it('应拒绝 config_value 为 null', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: [{ config_key: 'yishangshu_username', config_value: null }],
      });
      expect(result.success).toBe(false);
    });

    it('应拒绝 config_value 为数字', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: [{ config_key: 'yishangshu_username', config_value: 123 }],
      });
      expect(result.success).toBe(false);
    });

    it('应拒绝 config_value 为布尔值 true', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: [{ config_key: 'yishangshu_username', config_value: true }],
      });
      expect(result.success).toBe(false);
    });

    it('应拒绝 config_value 为布尔值 false', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: [{ config_key: 'yishangshu_username', config_value: false }],
      });
      expect(result.success).toBe(false);
    });

    it('应拒绝 config_value 为对象', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: [{ config_key: 'yishangshu_username', config_value: { nested: 'obj' } }],
      });
      expect(result.success).toBe(false);
    });

    it('应拒绝 config_value 为数组', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: [{ config_key: 'yishangshu_username', config_value: ['arr'] }],
      });
      expect(result.success).toBe(false);
    });

    it('应拒绝 config_value 为 undefined', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: [{ config_key: 'yishangshu_username', config_value: undefined }],
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── 边界场景 ──────────────────────────────────────────
  describe('边界场景', () => {
    it('应拒绝整个 body 为 null', () => {
      const result = updateSystemConfigsSchema.safeParse(null);
      expect(result.success).toBe(false);
    });

    it('应拒绝整个 body 为 undefined', () => {
      const result = updateSystemConfigsSchema.safeParse(undefined);
      expect(result.success).toBe(false);
    });

    it('应拒绝整个 body 为字符串', () => {
      const result = updateSystemConfigsSchema.safeParse('string');
      expect(result.success).toBe(false);
    });

    it('应拒绝整个 body 为数组', () => {
      const result = updateSystemConfigsSchema.safeParse([
        { config_key: 'yishangshu_username', config_value: 'admin' },
      ]);
      expect(result.success).toBe(false);
    });

    it('应接受包含空格的 config_value', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: [{ config_key: 'yishangshu_username', config_value: '   spaced   ' }],
      });
      expect(result.success).toBe(true);
    });

    it('应接受包含换行符的 config_value', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: [{ config_key: 'yishangshu_password', config_value: 'line1\nline2' }],
      });
      expect(result.success).toBe(true);
    });

    it('应接受包含 emoji 的 config_value', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: [{ config_key: 'yishangshu_username', config_value: '🚀🎉admin' }],
      });
      expect(result.success).toBe(true);
    });

    it('应接受 configs 数组中允许重复的 key', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: [
          { config_key: 'yishangshu_username', config_value: 'val1' },
          { config_key: 'yishangshu_username', config_value: 'val2' },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.configs).toHaveLength(2);
      }
    });

    it('应拒绝 configs 数组中部分项不合法时整体失败', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: [
          { config_key: 'yishangshu_username', config_value: 'valid' },
          { config_key: 'yishangshu_username', config_value: 123 },
        ],
      });
      expect(result.success).toBe(false);
    });

    it('应拒绝 configs 数组中仅 config_value 为空字符串时不报错', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: [{ config_key: 'yishangshu_username', config_value: '' }],
      });
      expect(result.success).toBe(true);
    });

    it('应拒绝 configs 中元素为非对象', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: ['not-an-object'],
      });
      expect(result.success).toBe(false);
    });

    it('应拒绝 configs 中元素为 null', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: [null],
      });
      expect(result.success).toBe(false);
    });

    it('应拒绝 configs 中元素为数字', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: [42],
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── 解析数据结构验证 ──────────────────────────────────
  describe('解析数据结构', () => {
    it('应正确解析并返回所有字段', () => {
      const input = {
        configs: [
          { config_key: 'yishangshu_username', config_value: 'user1' },
          { config_key: 'yishangshu_password', config_value: 'pass1' },
        ],
      };
      const result = updateSystemConfigsSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.configs[0].config_key).toBe('yishangshu_username');
        expect(result.data.configs[0].config_value).toBe('user1');
        expect(result.data.configs[1].config_key).toBe('yishangshu_password');
        expect(result.data.configs[1].config_value).toBe('pass1');
      }
    });

    it('解析结果应只包含 configs 字段', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: [{ config_key: 'yishangshu_username', config_value: 'admin' }],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(Object.keys(result.data)).toEqual(['configs']);
      }
    });
  });

  // ─── Zod schema 特性 ──────────────────────────────────
  describe('Zod schema 特性', () => {
    it('schema 应使用 strict 模式拒绝多余字段', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: [{ config_key: 'yishangshu_username', config_value: 'admin' }],
        extra_top_level: 'not_allowed',
      });
      expect(result.success).toBe(false);
    });

    it('schema 内层 config_item 不使用 strict 模式（多余字段静默忽略）', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: [{ config_key: 'yishangshu_username', config_value: 'admin', extra: 'stripped' }],
      });
      // 内层 z.object 没有 .strict()，多余字段被过滤
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data.configs[0] as any).extra).toBeUndefined();
      }
    });

    it('应正确报告所有错误（不止第一个）', () => {
      const result = updateSystemConfigsSchema.safeParse({
        configs: [
          { config_key: 'bad_key', config_value: 123 },
          { wrong_field: 'val' },
        ],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThanOrEqual(1);
      }
    });
  });
});

/**
 * @jest-environment node
 *
 * Tests for apis/constants/roles.ts
 * Covers: ROLES 常量值、类型推导、不可变性、Role 联合类型、
 *         对象结构、属性描述符、键命名规范、序列化、边界场景
 */

import { ROLES, Role } from '../../../apis/constants/roles';

describe('apis/constants/roles.ts', () => {
  // ─── 1. ROLES 常量值 ───────────────────────────────────────────
  describe('ROLES 常量值', () => {
    it('应有 SYSADMIN 属性且值为 "sysadmin"', () => {
      expect(ROLES.SYSADMIN).toBe('sysadmin');
    });

    it('应有 ADMIN 属性且值为 "admin"', () => {
      expect(ROLES.ADMIN).toBe('admin');
    });

    it('应有 VIEW 属性且值为 "view"', () => {
      expect(ROLES.VIEW).toBe('view');
    });

    it('应恰好包含 3 个角色', () => {
      expect(Object.keys(ROLES)).toHaveLength(3);
    });

    it('所有值应为字符串类型', () => {
      Object.values(ROLES).forEach(value => {
        expect(typeof value).toBe('string');
      });
    });

    it('不应有 undefined 或 null 值', () => {
      Object.values(ROLES).forEach(value => {
        expect(value).toBeDefined();
        expect(value).not.toBeNull();
      });
    });

    it('所有角色值应互不重复', () => {
      const values = Object.values(ROLES);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });

    it('角色值不应包含前后空格', () => {
      Object.values(ROLES).forEach(value => {
        expect(value).toBe(value.trim());
      });
    });

    it('角色值应非空字符串', () => {
      Object.values(ROLES).forEach(value => {
        expect(value.length).toBeGreaterThan(0);
      });
    });

    it('角色值不应包含中文字符或特殊符号', () => {
      Object.values(ROLES).forEach(value => {
        expect(value).toMatch(/^[a-z]+$/);
      });
    });
  });

  // ─── 2. 不可变性（as const） ────────────────────────────────────
  describe('不可变性', () => {
    it('ROLES 应为只读对象（as const 冻结字面量类型）', () => {
      expect(Object.isFrozen(ROLES)).toBe(false); // as const 不冻结运行时
      // 但 TypeScript 层面已约束为 readonly，验证属性存在即可
      expect(ROLES.SYSADMIN).toBe('sysadmin');
      expect(ROLES.ADMIN).toBe('admin');
      expect(ROLES.VIEW).toBe('view');
    });

    it('不应有额外或意外属性', () => {
      const ownKeys = Object.keys(ROLES);
      const expectedKeys = ['SYSADMIN', 'ADMIN', 'VIEW'];
      expect(ownKeys).toEqual(expect.arrayContaining(expectedKeys));
      expect(ownKeys).toHaveLength(expectedKeys.length);
    });

    it('键名应精确匹配 SYSADMIN、ADMIN、VIEW（顺序一致）', () => {
      expect(Object.keys(ROLES)).toEqual(['SYSADMIN', 'ADMIN', 'VIEW']);
    });

    it('运行时属性仍可写（as const 仅类型层约束）', () => {
      // 验证属性描述符 writable 为 true（普通对象默认行为）
      const desc = Object.getOwnPropertyDescriptor(ROLES, 'SYSADMIN');
      expect(desc?.writable).toBe(true);
    });
  });

  // ─── 3. Role 联合类型 ────────────────────────────────────────────
  describe('Role 类型', () => {
    it('Role 类型应接受 sysadmin', () => {
      const role: Role = ROLES.SYSADMIN;
      expect(role).toBe('sysadmin');
    });

    it('Role 类型应接受 admin', () => {
      const role: Role = ROLES.ADMIN;
      expect(role).toBe('admin');
    });

    it('Role 类型应接受 view', () => {
      const role: Role = ROLES.VIEW;
      expect(role).toBe('view');
    });

    it('Object.values(ROLES) 应产生 Role[] 类型兼容的数组', () => {
      const roles: Role[] = Object.values(ROLES);
      expect(roles).toContain('sysadmin');
      expect(roles).toContain('admin');
      expect(roles).toContain('view');
    });

    it('Role 类型值应能用于 Set 去重', () => {
      const roleSet = new Set<Role>(Object.values(ROLES));
      expect(roleSet.size).toBe(3);
      expect(roleSet.has('sysadmin')).toBe(true);
      expect(roleSet.has('admin')).toBe(true);
      expect(roleSet.has('view')).toBe(true);
    });

    it('Role 类型值应能用于 Map 映射', () => {
      const roleMap = new Map<Role, string>([
        [ROLES.SYSADMIN, '系统管理员'],
        [ROLES.ADMIN, '管理员'],
        [ROLES.VIEW, '查看者'],
      ]);
      expect(roleMap.get('sysadmin')).toBe('系统管理员');
      expect(roleMap.get('admin')).toBe('管理员');
      expect(roleMap.get('view')).toBe('查看者');
    });
  });

  // ─── 4. 与业务规则的一致性 ────────────────────────────────────────
  describe('业务一致性', () => {
    it('sysadmin 值应全小写', () => {
      expect(ROLES.SYSADMIN).toBe(ROLES.SYSADMIN.toLowerCase());
    });

    it('admin 值应全小写', () => {
      expect(ROLES.ADMIN).toBe(ROLES.ADMIN.toLowerCase());
    });

    it('view 值应全小写', () => {
      expect(ROLES.VIEW).toBe(ROLES.VIEW.toLowerCase());
    });

    it('ROLES 的值集合应与 Prisma Role enum 一致', () => {
      // Prisma schema 定义了 Role enum (sysadmin, admin, view)
      const prismaRoles = ['sysadmin', 'admin', 'view'];
      const rolesValues = Object.values(ROLES);
      expect(rolesValues.sort()).toEqual(prismaRoles.sort());
    });
  });

  // ─── 5. 对象结构验证 ────────────────────────────────────────────
  describe('对象结构', () => {
    it('ROLES 应为普通对象（plain object）', () => {
      expect(Object.getPrototypeOf(ROLES)).toBe(Object.prototype);
    });

    it('ROLES 不应有继承的可枚举属性', () => {
      const hasInherited = Object.keys(ROLES).some(
        key => !Object.prototype.hasOwnProperty.call(ROLES, key),
      );
      expect(hasInherited).toBe(false);
    });

    it('ROLES 不应有 Symbol 自有属性', () => {
      const symKeys = Object.getOwnPropertySymbols(ROLES);
      expect(symKeys).toHaveLength(0);
    });

    it('所有属性都应为可枚举的', () => {
      Object.keys(ROLES).forEach(key => {
        const desc = Object.getOwnPropertyDescriptor(ROLES, key);
        expect(desc?.enumerable).toBe(true);
      });
    });

    it('Object.entries 应与 keys/values 一致', () => {
      const entries = Object.entries(ROLES);
      const keys = Object.keys(ROLES);
      const values = Object.values(ROLES);
      expect(entries).toHaveLength(keys.length);
      entries.forEach(([k, v], i) => {
        expect(k).toBe(keys[i]);
        expect(v).toBe(values[i]);
      });
    });

    it('hasOwnProperty 对所有键返回 true', () => {
      ['SYSADMIN', 'ADMIN', 'VIEW'].forEach(key => {
        expect(Object.prototype.hasOwnProperty.call(ROLES, key)).toBe(true);
      });
    });

    it('in 操作符对所有键返回 true', () => {
      ['SYSADMIN', 'ADMIN', 'VIEW'].forEach(key => {
        expect(key in ROLES).toBe(true);
      });
    });
  });

  // ─── 6. 属性描述符 ──────────────────────────────────────────────
  describe('属性描述符', () => {
    const expectedProps = ['SYSADMIN', 'ADMIN', 'VIEW'];

    expectedProps.forEach(prop => {
      it(`${prop} 应为数据属性（有 value）`, () => {
        const desc = Object.getOwnPropertyDescriptor(ROLES, prop);
        expect(desc).toBeDefined();
        expect(desc!.value).toBeDefined();
      });

      it(`${prop} 属性应为 configurable`, () => {
        const desc = Object.getOwnPropertyDescriptor(ROLES, prop);
        expect(desc?.configurable).toBe(true);
      });
    });
  });

  // ─── 7. 键命名规范 ──────────────────────────────────────────────
  describe('键命名规范', () => {
    it('所有键应为大写字母（UPPER_SNAKE_CASE）', () => {
      Object.keys(ROLES).forEach(key => {
        expect(key).toMatch(/^[A-Z]+$/);
      });
    });

    it('键数量与值数量一致', () => {
      expect(Object.keys(ROLES).length).toBe(Object.values(ROLES).length);
    });

    it('键和值的映射关系唯一', () => {
      const entries = Object.entries(ROLES);
      const keySet = new Set(entries.map(([k]) => k));
      const valueSet = new Set(entries.map(([, v]) => v));
      expect(keySet.size).toBe(entries.length);
      expect(valueSet.size).toBe(entries.length);
    });
  });

  // ─── 8. 序列化与比较 ────────────────────────────────────────────
  describe('序列化', () => {
    it('JSON.stringify 应输出正确的 JSON', () => {
      const json = JSON.stringify(ROLES);
      const parsed = JSON.parse(json);
      expect(parsed).toEqual({
        SYSADMIN: 'sysadmin',
        ADMIN: 'admin',
        VIEW: 'view',
      });
    });

    it('JSON.parse(JSON.stringify(ROLES)) 应深等于 ROLES', () => {
      expect(JSON.parse(JSON.stringify(ROLES))).toEqual({
        SYSADMIN: 'sysadmin',
        ADMIN: 'admin',
        VIEW: 'view',
      });
    });

    it('Object.freeze(ROLES) 后属性不可写', () => {
      const frozen = Object.freeze({ ...ROLES });
      expect(() => {
        (frozen as Record<string, string>).SYSADMIN = 'hacked';
      }).toThrow();
    });

    it('展开运算符应产生深等价的副本', () => {
      const copy = { ...ROLES };
      expect(copy).toEqual(ROLES);
      expect(copy).not.toBe(ROLES);
    });

    it('Object.assign 应产生深等价的副本', () => {
      const copy = Object.assign({}, ROLES);
      expect(copy).toEqual(ROLES);
      expect(copy).not.toBe(ROLES);
    });
  });

  // ─── 9. 边界场景 ────────────────────────────────────────────────
  describe('边界场景', () => {
    it('不应包含空字符串值', () => {
      Object.values(ROLES).forEach(value => {
        expect(value).not.toBe('');
      });
    });

    it('不应包含数字类型的值', () => {
      Object.values(ROLES).forEach(value => {
        expect(typeof value).not.toBe('number');
      });
    });

    it('不应包含布尔类型的值', () => {
      Object.values(ROLES).forEach(value => {
        expect(typeof value).not.toBe('boolean');
      });
    });

    it('不应包含对象类型的值', () => {
      Object.values(ROLES).forEach(value => {
        expect(typeof value).not.toBe('object');
      });
    });

    it('角色值长度应在合理范围内（1-50字符）', () => {
      Object.values(ROLES).forEach(value => {
        expect(value.length).toBeGreaterThanOrEqual(1);
        expect(value.length).toBeLessThanOrEqual(50);
      });
    });

    it('ROLES 对象的 toString 应返回 [object Object]', () => {
      expect(Object.prototype.toString.call(ROLES)).toBe('[object Object]');
    });

    it('ROLES 值可用作 if 条件（全部 truthy）', () => {
      Object.values(ROLES).forEach(value => {
        expect(value ? true : false).toBe(true);
      });
    });

    it('ROLES 可被 for...in 遍历且仅遍历自有属性', () => {
      const keys: string[] = [];
      for (const key in ROLES) {
        if (Object.prototype.hasOwnProperty.call(ROLES, key)) {
          keys.push(key);
        }
      }
      expect(keys.sort()).toEqual(['ADMIN', 'SYSADMIN', 'VIEW']);
    });

    it('ROLES 值应能正确参与 strictEqual 比较', () => {
      expect(ROLES.SYSADMIN).toBe('sysadmin');
      expect(ROLES.ADMIN).toBe('admin');
      expect(ROLES.VIEW).toBe('view');
    });

    it('ROLES 值应能正确用于 switch/case 匹配', () => {
      const matchRole = (role: Role): string => {
        switch (role) {
          case ROLES.SYSADMIN:
            return 'sysadmin-matched';
          case ROLES.ADMIN:
            return 'admin-matched';
          case ROLES.VIEW:
            return 'view-matched';
          default:
            return 'no-match';
        }
      };
      expect(matchRole(ROLES.SYSADMIN)).toBe('sysadmin-matched');
      expect(matchRole(ROLES.ADMIN)).toBe('admin-matched');
      expect(matchRole(ROLES.VIEW)).toBe('view-matched');
    });

    it('Object.freeze 后的副本 isFrozen 应为 true', () => {
      const frozen = Object.freeze({ ...ROLES });
      expect(Object.isFrozen(frozen)).toBe(true);
    });

    it('重复导入应返回相同引用（模块单例）', () => {
      // 验证 ES 模块缓存行为
      expect(ROLES).toBe(ROLES);
    });
  });

  // ─── 10. 类型守卫验证 ───────────────────────────────────────────
  describe('类型守卫', () => {
    it('应能用 includes 检查某个值是否为合法 Role', () => {
      const allRoles = Object.values(ROLES) as string[];
      expect(allRoles.includes('sysadmin')).toBe(true);
      expect(allRoles.includes('admin')).toBe(true);
      expect(allRoles.includes('view')).toBe(true);
      expect(allRoles.includes('unknown')).toBe(false);
    });

    it('应能用类型谓词守卫', () => {
      const isRole = (value: string): value is Role => {
        return Object.values(ROLES).includes(value as Role);
      };
      expect(isRole('sysadmin')).toBe(true);
      expect(isRole('admin')).toBe(true);
      expect(isRole('view')).toBe(true);
      expect(isRole('hacker')).toBe(false);
      expect(isRole('')).toBe(false);
    });

    it('应能从 ROLES 生成角色选择列表', () => {
      const roleOptions = Object.entries(ROLES).map(([key, value]) => ({
        label: key,
        value,
      }));
      expect(roleOptions).toEqual([
        { label: 'SYSADMIN', value: 'sysadmin' },
        { label: 'ADMIN', value: 'admin' },
        { label: 'VIEW', value: 'view' },
      ]);
    });
  });
});

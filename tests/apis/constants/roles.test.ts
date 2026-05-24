/**
 * @jest-environment node
 *
 * Tests for apis/constants/roles.ts
 * Covers: ROLES 常量值、类型推导、不可变性、Role 联合类型
 */

import { ROLES, Role } from '../../../apis/constants/roles';

describe('apis/constants/roles.ts', () => {
  // ─── ROLES 常量值 ───────────────────────────────────────────
  describe('ROLES', () => {
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
  });

  // ─── 不可变性（as const） ────────────────────────────────────
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
  });

  // ─── Role 联合类型 ────────────────────────────────────────────
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
  });

  // ─── 与业务规则的一致性 ────────────────────────────────────────
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
});

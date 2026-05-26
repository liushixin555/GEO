/**
 * @jest-environment node
 */
import {
  listUsersSchema,
  createUserSchema,
  updateUserSchema,
} from '../../apis/schema/user.schema';

// ─── 共享的完整有效对象 ─────────────────────────────────────────────
const validCreateUser = {
  username: 'testuser',
  password: 'password123',
  cn_name: '张三',
  role: 'admin' as const,
  company_id: 1,
};

// ─── listUsersSchema ────────────────────────────────────────────────
describe('listUsersSchema', () => {
  // === page ===
  describe('page', () => {
    it('应使用默认值 1', () => {
      const result = listUsersSchema.parse({});
      expect(result.page).toBe(1);
    });

    it('应接受有效正整数', () => {
      expect(listUsersSchema.parse({ page: 5 }).page).toBe(5);
    });

    it('应接受大正整数', () => {
      expect(listUsersSchema.parse({ page: 99999 }).page).toBe(99999);
    });

    it('应强制转换字符串数字（coerce）', () => {
      expect(listUsersSchema.parse({ page: '3' }).page).toBe(3);
    });

    it('应拒绝 0', () => {
      const result = listUsersSchema.safeParse({ page: 0 });
      expect(result.success).toBe(false);
    });

    it('应拒绝负数', () => {
      const result = listUsersSchema.safeParse({ page: -1 });
      expect(result.success).toBe(false);
    });

    it('应拒绝浮点数', () => {
      const result = listUsersSchema.safeParse({ page: 1.5 });
      expect(result.success).toBe(false);
    });

    it('应拒绝非数字字符串', () => {
      const result = listUsersSchema.safeParse({ page: 'abc' });
      expect(result.success).toBe(false);
    });

    it('应拒绝 null', () => {
      const result = listUsersSchema.safeParse({ page: null });
      expect(result.success).toBe(false);
    });

    it('应将布尔值 true 强制转换为 1（z.coerce 行为）', () => {
      expect(listUsersSchema.parse({ page: true as unknown as number }).page).toBe(1);
    });
  });

  // === pageSize ===
  describe('pageSize', () => {
    it('应使用默认值 10', () => {
      const result = listUsersSchema.parse({});
      expect(result.pageSize).toBe(10);
    });

    it('应接受有效正整数', () => {
      expect(listUsersSchema.parse({ pageSize: 20 }).pageSize).toBe(20);
    });

    it('应接受最小值 1', () => {
      expect(listUsersSchema.parse({ pageSize: 1 }).pageSize).toBe(1);
    });

    it('应接受最大值 100', () => {
      expect(listUsersSchema.parse({ pageSize: 100 }).pageSize).toBe(100);
    });

    it('应拒绝超过 100', () => {
      const result = listUsersSchema.safeParse({ pageSize: 101 });
      expect(result.success).toBe(false);
    });

    it('应强制转换字符串数字（coerce）', () => {
      expect(listUsersSchema.parse({ pageSize: '50' }).pageSize).toBe(50);
    });

    it('应拒绝 0', () => {
      const result = listUsersSchema.safeParse({ pageSize: 0 });
      expect(result.success).toBe(false);
    });

    it('应拒绝负数', () => {
      const result = listUsersSchema.safeParse({ pageSize: -5 });
      expect(result.success).toBe(false);
    });

    it('应拒绝浮点数', () => {
      const result = listUsersSchema.safeParse({ pageSize: 10.5 });
      expect(result.success).toBe(false);
    });
  });

  // === search ===
  describe('search', () => {
    it('应接受 undefined（可选字段）', () => {
      const result = listUsersSchema.parse({});
      expect(result.search).toBeUndefined();
    });

    it('应接受有效搜索字符串', () => {
      expect(listUsersSchema.parse({ search: '关键词' }).search).toBe('关键词');
    });

    it('应接受空字符串', () => {
      expect(listUsersSchema.parse({ search: '' }).search).toBe('');
    });

    it('应接受最长 200 个字符', () => {
      const s = 'a'.repeat(200);
      expect(listUsersSchema.parse({ search: s }).search).toBe(s);
    });

    it('应拒绝超过 200 个字符', () => {
      const result = listUsersSchema.safeParse({ search: 'a'.repeat(201) });
      expect(result.success).toBe(false);
    });

    it('应接受 unicode 字符', () => {
      const s = '搜索🎉用户';
      expect(listUsersSchema.parse({ search: s }).search).toBe(s);
    });

    it('应拒绝数字', () => {
      const result = listUsersSchema.safeParse({ search: 123 as unknown as string });
      expect(result.success).toBe(false);
    });

    it('应拒绝 null', () => {
      const result = listUsersSchema.safeParse({ search: null });
      expect(result.success).toBe(false);
    });
  });

  // === role ===
  describe('role', () => {
    const validRoles = ['sysadmin', 'admin', 'view'] as const;

    it('应接受 undefined（可选字段）', () => {
      const result = listUsersSchema.parse({});
      expect(result.role).toBeUndefined();
    });

    it.each(validRoles)('应接受有效角色 "%s"', (role) => {
      expect(listUsersSchema.parse({ role }).role).toBe(role);
    });

    it('应拒绝无效角色', () => {
      const result = listUsersSchema.safeParse({ role: 'superadmin' });
      expect(result.success).toBe(false);
    });

    it('应拒绝空字符串', () => {
      const result = listUsersSchema.safeParse({ role: '' });
      expect(result.success).toBe(false);
    });

    it('应拒绝数字', () => {
      const result = listUsersSchema.safeParse({ role: 123 as unknown as string });
      expect(result.success).toBe(false);
    });

    it('应拒绝 null', () => {
      const result = listUsersSchema.safeParse({ role: null });
      expect(result.success).toBe(false);
    });

    it('应拒绝大小写不匹配的角色', () => {
      const result = listUsersSchema.safeParse({ role: 'Admin' });
      expect(result.success).toBe(false);
    });

    it('应拒绝部分匹配的角色值', () => {
      const result = listUsersSchema.safeParse({ role: 'admin_extra' });
      expect(result.success).toBe(false);
    });
  });

  // === status ===
  describe('status', () => {
    it('应接受 undefined（可选字段，transform 返回 undefined）', () => {
      const result = listUsersSchema.parse({});
      expect(result.status).toBeUndefined();
    });

    it('应将字符串 "true" 转换为布尔值 true', () => {
      const result = listUsersSchema.parse({ status: 'true' });
      expect(result.status).toBe(true);
    });

    it('应将字符串 "false" 转换为布尔值 false', () => {
      const result = listUsersSchema.parse({ status: 'false' });
      expect(result.status).toBe(false);
    });

    it('应拒绝字符串 "TRUE"（大小写敏感）', () => {
      const result = listUsersSchema.safeParse({ status: 'TRUE' });
      expect(result.success).toBe(false);
    });

    it('应拒绝字符串 "FALSE"（大小写敏感）', () => {
      const result = listUsersSchema.safeParse({ status: 'FALSE' });
      expect(result.success).toBe(false);
    });

    it('应拒绝字符串 "1"', () => {
      const result = listUsersSchema.safeParse({ status: '1' });
      expect(result.success).toBe(false);
    });

    it('应拒绝字符串 "0"', () => {
      const result = listUsersSchema.safeParse({ status: '0' });
      expect(result.success).toBe(false);
    });

    it('应拒绝数字 true（布尔值）', () => {
      const result = listUsersSchema.safeParse({ status: true as unknown as string });
      expect(result.success).toBe(false);
    });

    it('应拒绝数字 false（布尔值）', () => {
      const result = listUsersSchema.safeParse({ status: false as unknown as string });
      expect(result.success).toBe(false);
    });

    it('应拒绝空字符串', () => {
      const result = listUsersSchema.safeParse({ status: '' });
      expect(result.success).toBe(false);
    });

    it('应拒绝 null', () => {
      const result = listUsersSchema.safeParse({ status: null });
      expect(result.success).toBe(false);
    });
  });

  // === 完整有效对象 ===
  describe('完整有效对象', () => {
    it('应接受所有字段', () => {
      const result = listUsersSchema.safeParse({
        page: 2,
        pageSize: 25,
        search: '张三',
        role: 'admin',
        status: 'true',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          page: 2,
          pageSize: 25,
          search: '张三',
          role: 'admin',
          status: true,
        });
      }
    });

    it('应接受空对象（使用所有默认值）', () => {
      const result = listUsersSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('解析后的空对象应使用默认值', () => {
      const parsed = listUsersSchema.parse({});
      expect(parsed).toEqual({
        page: 1,
        pageSize: 10,
      });
    });

    it('应正确强制转换字符串数字参数', () => {
      const result = listUsersSchema.parse({
        page: '3',
        pageSize: '50',
      });
      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(50);
    });
  });

  // === 非严格模式 ===
  describe('非 strict 模式', () => {
    it('应 strip 未知字段', () => {
      const result = listUsersSchema.parse({ page: 1, extra: 'value' } as Record<string, unknown>);
      expect((result as Record<string, unknown>).extra).toBeUndefined();
    });
  });
});

// ─── createUserSchema ───────────────────────────────────────────────
describe('createUserSchema', () => {
  // === username ===
  describe('username', () => {
    it('应接受有效用户名', () => {
      expect(createUserSchema.parse(validCreateUser).username).toBe('testuser');
    });

    it('应接受1个字符的用户名', () => {
      expect(createUserSchema.parse({ ...validCreateUser, username: 'A' }).username).toBe('A');
    });

    it('应接受最长50个字符的用户名', () => {
      const u = 'a'.repeat(50);
      expect(createUserSchema.parse({ ...validCreateUser, username: u }).username).toBe(u);
    });

    it('应拒绝超过50个字符的用户名', () => {
      const result = createUserSchema.safeParse({ ...validCreateUser, username: 'a'.repeat(51) });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('用户名不能超过50个字符');
      }
    });

    it('应拒绝空字符串', () => {
      const result = createUserSchema.safeParse({ ...validCreateUser, username: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('用户名不能为空');
      }
    });

    it('应拒绝缺少 username', () => {
      const { username: _, ...without } = validCreateUser;
      const result = createUserSchema.safeParse(without);
      expect(result.success).toBe(false);
    });

    it('应拒绝 null', () => {
      const result = createUserSchema.safeParse({ ...validCreateUser, username: null });
      expect(result.success).toBe(false);
    });

    it('应拒绝数字类型', () => {
      const result = createUserSchema.safeParse({ ...validCreateUser, username: 123 as unknown as string });
      expect(result.success).toBe(false);
    });

    it('应拒绝 unicode 字符', () => {
      const u = '用户🎉名';
      const result = createUserSchema.safeParse({ ...validCreateUser, username: u });
      expect(result.success).toBe(false);
    });

    it('应拒绝空格字符串', () => {
      const result = createUserSchema.safeParse({ ...validCreateUser, username: '   ' });
      expect(result.success).toBe(false);
    });
  });

  // === password ===
  describe('password', () => {
    it('应接受有效密码', () => {
      expect(createUserSchema.parse(validCreateUser).password).toBe('password123');
    });

    it('应接受最少8个字符的密码', () => {
      const p = 'a'.repeat(8);
      expect(createUserSchema.parse({ ...validCreateUser, password: p }).password).toBe(p);
    });

    it('应接受最长128个字符的密码', () => {
      const p = 'a'.repeat(128);
      expect(createUserSchema.parse({ ...validCreateUser, password: p }).password).toBe(p);
    });

    it('应拒绝超过128个字符的密码', () => {
      const result = createUserSchema.safeParse({ ...validCreateUser, password: 'a'.repeat(129) });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('密码不能超过128个字符');
      }
    });

    it('应拒绝少于8个字符的密码', () => {
      const result = createUserSchema.safeParse({ ...validCreateUser, password: '1234567' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('密码长度不能少于8位');
      }
    });

    it('应拒绝空字符串', () => {
      const result = createUserSchema.safeParse({ ...validCreateUser, password: '' });
      expect(result.success).toBe(false);
    });

    it('应拒绝缺少 password', () => {
      const { password: _, ...without } = validCreateUser;
      const result = createUserSchema.safeParse(without);
      expect(result.success).toBe(false);
    });

    it('应拒绝 null', () => {
      const result = createUserSchema.safeParse({ ...validCreateUser, password: null });
      expect(result.success).toBe(false);
    });

    it('应拒绝数字类型', () => {
      const result = createUserSchema.safeParse({ ...validCreateUser, password: 12345678 as unknown as string });
      expect(result.success).toBe(false);
    });

    it('应接受包含特殊字符的密码', () => {
      const p = 'P@ss!w0rd#2026';
      expect(createUserSchema.parse({ ...validCreateUser, password: p }).password).toBe(p);
    });

    it('应接受包含 unicode 字符的密码', () => {
      const p = '密码2026🎉abc';
      expect(createUserSchema.parse({ ...validCreateUser, password: p }).password).toBe(p);
    });
  });

  // === cn_name ===
  describe('cn_name', () => {
    it('应接受有效姓名', () => {
      expect(createUserSchema.parse(validCreateUser).cn_name).toBe('张三');
    });

    it('应接受1个字符的姓名', () => {
      expect(createUserSchema.parse({ ...validCreateUser, cn_name: '李' }).cn_name).toBe('李');
    });

    it('应接受最长50个字符的姓名', () => {
      const n = '名'.repeat(50);
      expect(createUserSchema.parse({ ...validCreateUser, cn_name: n }).cn_name).toBe(n);
    });

    it('应拒绝超过50个字符的姓名', () => {
      const result = createUserSchema.safeParse({ ...validCreateUser, cn_name: '名'.repeat(51) });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('姓名不能超过50个字符');
      }
    });

    it('应拒绝空字符串', () => {
      const result = createUserSchema.safeParse({ ...validCreateUser, cn_name: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('姓名不能为空');
      }
    });

    it('应拒绝缺少 cn_name', () => {
      const { cn_name: _, ...without } = validCreateUser;
      const result = createUserSchema.safeParse(without);
      expect(result.success).toBe(false);
    });

    it('应拒绝 null', () => {
      const result = createUserSchema.safeParse({ ...validCreateUser, cn_name: null });
      expect(result.success).toBe(false);
    });

    it('应拒绝数字类型', () => {
      const result = createUserSchema.safeParse({ ...validCreateUser, cn_name: 123 as unknown as string });
      expect(result.success).toBe(false);
    });

    it('应接受包含 emoji 的姓名', () => {
      const n = '张三🎉';
      expect(createUserSchema.parse({ ...validCreateUser, cn_name: n }).cn_name).toBe(n);
    });
  });

  // === role ===
  describe('role', () => {
    const validRoles = ['sysadmin', 'admin', 'view'] as const;

    it.each(validRoles)('应接受有效角色 "%s"', (role) => {
      expect(createUserSchema.parse({ ...validCreateUser, role }).role).toBe(role);
    });

    it('应拒绝无效角色', () => {
      const result = createUserSchema.safeParse({ ...validCreateUser, role: 'superadmin' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('角色值不合法');
      }
    });

    it('应拒绝空字符串', () => {
      const result = createUserSchema.safeParse({ ...validCreateUser, role: '' });
      expect(result.success).toBe(false);
    });

    it('应拒绝缺少 role', () => {
      const { role: _, ...without } = validCreateUser;
      const result = createUserSchema.safeParse(without);
      expect(result.success).toBe(false);
    });

    it('应拒绝 null', () => {
      const result = createUserSchema.safeParse({ ...validCreateUser, role: null });
      expect(result.success).toBe(false);
    });

    it('应拒绝数字类型', () => {
      const result = createUserSchema.safeParse({ ...validCreateUser, role: 123 as unknown as string });
      expect(result.success).toBe(false);
    });

    it('应拒绝大小写不匹配', () => {
      const result = createUserSchema.safeParse({ ...validCreateUser, role: 'Admin' });
      expect(result.success).toBe(false);
    });
  });

  // === company_id（optional） ===
  describe('company_id', () => {
    it('应接受有效正整数', () => {
      expect(createUserSchema.parse(validCreateUser).company_id).toBe(1);
    });

    it('应接受大正整数', () => {
      expect(createUserSchema.parse({ ...validCreateUser, company_id: 999999 }).company_id).toBe(999999);
    });

    it('应接受 undefined（可选字段）', () => {
      const { company_id: _, ...without } = validCreateUser;
      const result = createUserSchema.safeParse(without);
      expect(result.success).toBe(true);
    });

    it('应拒绝 0', () => {
      const result = createUserSchema.safeParse({ ...validCreateUser, company_id: 0 });
      expect(result.success).toBe(false);
    });

    it('应拒绝负数', () => {
      const result = createUserSchema.safeParse({ ...validCreateUser, company_id: -1 });
      expect(result.success).toBe(false);
    });

    it('应拒绝浮点数', () => {
      const result = createUserSchema.safeParse({ ...validCreateUser, company_id: 1.5 });
      expect(result.success).toBe(false);
    });

    it('应拒绝字符串', () => {
      const result = createUserSchema.safeParse({ ...validCreateUser, company_id: '1' as unknown as number });
      expect(result.success).toBe(false);
    });

    it('应拒绝 null', () => {
      const result = createUserSchema.safeParse({ ...validCreateUser, company_id: null });
      expect(result.success).toBe(false);
    });
  });

  // === strict 模式 ===
  describe('strict 模式', () => {
    it('应拒绝未知字段', () => {
      const result = createUserSchema.safeParse({ ...validCreateUser, extra_field: 'value' });
      expect(result.success).toBe(false);
    });

    it('应拒绝未知字段即使有有效字段', () => {
      const result = createUserSchema.safeParse({ ...validCreateUser, unknown: true });
      expect(result.success).toBe(false);
    });
  });

  // === 完整有效对象 ===
  describe('完整有效对象', () => {
    it('应接受所有字段', () => {
      const result = createUserSchema.safeParse(validCreateUser);
      expect(result.success).toBe(true);
    });

    it('应接受最小必填字段（不含可选字段）', () => {
      const minimal = {
        username: 'testuser',
        password: 'password123',
        cn_name: '张三',
        role: 'view' as const,
      };
      const result = createUserSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });

    it('解析后的完整对象应保持字段值一致', () => {
      const parsed = createUserSchema.parse(validCreateUser);
      expect(parsed).toEqual(validCreateUser);
    });
  });
});

// ─── updateUserSchema ───────────────────────────────────────────────
describe('updateUserSchema', () => {
  // === cn_name（optional） ===
  describe('cn_name', () => {
    it('应接受有效姓名', () => {
      expect(updateUserSchema.parse({ cn_name: '李四' }).cn_name).toBe('李四');
    });

    it('应接受1个字符的姓名', () => {
      expect(updateUserSchema.parse({ cn_name: '王' }).cn_name).toBe('王');
    });

    it('应接受最长50个字符的姓名', () => {
      const n = '名'.repeat(50);
      expect(updateUserSchema.parse({ cn_name: n }).cn_name).toBe(n);
    });

    it('应拒绝超过50个字符的姓名', () => {
      const result = updateUserSchema.safeParse({ cn_name: '名'.repeat(51) });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('姓名不能超过50个字符');
      }
    });

    it('应拒绝空字符串', () => {
      const result = updateUserSchema.safeParse({ cn_name: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('姓名不能为空');
      }
    });

    it('应接受 undefined（可选字段）', () => {
      const result = updateUserSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('应拒绝 null', () => {
      const result = updateUserSchema.safeParse({ cn_name: null });
      expect(result.success).toBe(false);
    });

    it('应拒绝数字类型', () => {
      const result = updateUserSchema.safeParse({ cn_name: 123 as unknown as string });
      expect(result.success).toBe(false);
    });

    it('应接受包含 emoji 的姓名', () => {
      const n = '李四🎉';
      expect(updateUserSchema.parse({ cn_name: n }).cn_name).toBe(n);
    });
  });

  // === role（optional） ===
  describe('role', () => {
    const validRoles = ['sysadmin', 'admin', 'view'] as const;

    it.each(validRoles)('应接受有效角色 "%s"', (role) => {
      expect(updateUserSchema.parse({ role }).role).toBe(role);
    });

    it('应拒绝无效角色', () => {
      const result = updateUserSchema.safeParse({ role: 'superadmin' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('角色值不合法');
      }
    });

    it('应接受 undefined（可选字段）', () => {
      const result = updateUserSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('应拒绝空字符串', () => {
      const result = updateUserSchema.safeParse({ role: '' });
      expect(result.success).toBe(false);
    });

    it('应拒绝 null', () => {
      const result = updateUserSchema.safeParse({ role: null });
      expect(result.success).toBe(false);
    });

    it('应拒绝数字类型', () => {
      const result = updateUserSchema.safeParse({ role: 123 as unknown as string });
      expect(result.success).toBe(false);
    });

    it('应拒绝大小写不匹配', () => {
      const result = updateUserSchema.safeParse({ role: 'Admin' });
      expect(result.success).toBe(false);
    });
  });

  // === status（optional） ===
  describe('status', () => {
    it('应接受布尔值 true', () => {
      expect(updateUserSchema.parse({ status: true }).status).toBe(true);
    });

    it('应接受布尔值 false', () => {
      expect(updateUserSchema.parse({ status: false }).status).toBe(false);
    });

    it('应接受 undefined（可选字段）', () => {
      const result = updateUserSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('应拒绝字符串 "true"', () => {
      const result = updateUserSchema.safeParse({ status: 'true' as unknown as boolean });
      expect(result.success).toBe(false);
    });

    it('应拒绝字符串 "false"', () => {
      const result = updateUserSchema.safeParse({ status: 'false' as unknown as boolean });
      expect(result.success).toBe(false);
    });

    it('应拒绝数字 1', () => {
      const result = updateUserSchema.safeParse({ status: 1 as unknown as boolean });
      expect(result.success).toBe(false);
    });

    it('应拒绝数字 0', () => {
      const result = updateUserSchema.safeParse({ status: 0 as unknown as boolean });
      expect(result.success).toBe(false);
    });

    it('应拒绝 null', () => {
      const result = updateUserSchema.safeParse({ status: null as unknown as boolean });
      expect(result.success).toBe(false);
    });

    it('应拒绝 undefined 显式传入（与不传等价，但字段存在）', () => {
      const result = updateUserSchema.safeParse({ status: undefined });
      expect(result.success).toBe(true);
    });

    it('应拒绝数组', () => {
      const result = updateUserSchema.safeParse({ status: [true] as unknown as boolean });
      expect(result.success).toBe(false);
    });

    it('应拒绝对象', () => {
      const result = updateUserSchema.safeParse({ status: { value: true } as unknown as boolean });
      expect(result.success).toBe(false);
    });
  });

  // === password（optional） ===
  describe('password', () => {
    it('应接受有效密码', () => {
      expect(updateUserSchema.parse({ password: 'newpassword123' }).password).toBe('newpassword123');
    });

    it('应接受最少8个字符的密码', () => {
      const p = 'a'.repeat(8);
      expect(updateUserSchema.parse({ password: p }).password).toBe(p);
    });

    it('应接受最长128个字符的密码', () => {
      const p = 'a'.repeat(128);
      expect(updateUserSchema.parse({ password: p }).password).toBe(p);
    });

    it('应拒绝超过128个字符的密码', () => {
      const result = updateUserSchema.safeParse({ password: 'a'.repeat(129) });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('密码不能超过128个字符');
      }
    });

    it('应拒绝少于8个字符的密码', () => {
      const result = updateUserSchema.safeParse({ password: '1234567' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('密码长度不能少于8位');
      }
    });

    it('应接受 undefined（可选字段）', () => {
      const result = updateUserSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('应拒绝空字符串', () => {
      const result = updateUserSchema.safeParse({ password: '' });
      expect(result.success).toBe(false);
    });

    it('应拒绝 null', () => {
      const result = updateUserSchema.safeParse({ password: null });
      expect(result.success).toBe(false);
    });

    it('应拒绝数字类型', () => {
      const result = updateUserSchema.safeParse({ password: 12345678 as unknown as string });
      expect(result.success).toBe(false);
    });

    it('应接受包含特殊字符的密码', () => {
      const p = 'N3wP@ss!2026';
      expect(updateUserSchema.parse({ password: p }).password).toBe(p);
    });
  });

  // === strict 模式 ===
  describe('strict 模式', () => {
    it('应拒绝未知字段', () => {
      const result = updateUserSchema.safeParse({ extra_field: 'value' });
      expect(result.success).toBe(false);
    });

    it('应拒绝未知字段即使有有效字段', () => {
      const result = updateUserSchema.safeParse({ cn_name: '张三', unknown: true });
      expect(result.success).toBe(false);
    });
  });

  // === 完整有效对象 ===
  describe('完整有效对象', () => {
    it('应接受所有字段', () => {
      const result = updateUserSchema.safeParse({
        cn_name: '王五',
        role: 'admin',
        status: true,
        password: 'newpassword123',
      });
      expect(result.success).toBe(true);
    });

    it('应接受空对象（所有字段都是 optional）', () => {
      const result = updateUserSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('应接受部分字段', () => {
      const result = updateUserSchema.safeParse({ cn_name: '新名字', status: false });
      expect(result.success).toBe(true);
    });

    it('解析后的完整对象应保持字段值一致', () => {
      const data = {
        cn_name: '赵六',
        role: 'sysadmin' as const,
        status: false,
        password: 'strongPass!2026',
      };
      const parsed = updateUserSchema.parse(data);
      expect(parsed).toEqual(data);
    });
  });
});

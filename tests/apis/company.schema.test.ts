/**
 * @jest-environment node
 */
import {
  createCompanySchema,
  updateCompanySchema,
  toggleCompanyStatusSchema,
} from '../../apis/schema/company.schema';

// ─── 共享的完整有效对象 ─────────────────────────────────────────────
const validCompany = {
  short_name: '测试公司',
  full_name: '测试公司全称有限公司',
  address: '北京市朝阳区测试路1号',
  contact_person: '张三',
  contact_phone: '13800138000',
  operator_ids: [1, 2, 3],
  viewer_ids: [4, 5],
};

// ─── createCompanySchema ────────────────────────────────────────────
describe('createCompanySchema', () => {
  // === short_name ===
  describe('short_name', () => {
    it('应接受有效公司简称', () => {
      expect(createCompanySchema.parse(validCompany).short_name).toBe('测试公司');
    });

    it('应接受1个字符的简称', () => {
      expect(createCompanySchema.parse({ ...validCompany, short_name: 'A' }).short_name).toBe('A');
    });

    it('应接受最长50个字符的简称', () => {
      const name = 'a'.repeat(50);
      expect(createCompanySchema.parse({ ...validCompany, short_name: name }).short_name).toBe(name);
    });

    it('应拒绝超过50个字符的简称', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, short_name: 'a'.repeat(51) });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('公司简称不能超过50个字符');
      }
    });

    it('应拒绝空字符串', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, short_name: '' });
      expect(result.success).toBe(false);
    });

    it('应接受仅空格的字符串（trim 在 min 之后，空格长度 >=1 通过 min 校验后 trim 为空串）', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, short_name: '   ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.short_name).toBe('');
      }
    });

    it('应 trim 前后空格', () => {
      expect(createCompanySchema.parse({ ...validCompany, short_name: '  公司  ' }).short_name).toBe('公司');
    });

    it('应拒绝缺少 short_name', () => {
      const { short_name: _, ...without } = validCompany;
      const result = createCompanySchema.safeParse(without);
      expect(result.success).toBe(false);
    });

    it('应拒绝 null', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, short_name: null });
      expect(result.success).toBe(false);
    });

    it('应拒绝 undefined', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, short_name: undefined });
      expect(result.success).toBe(false);
    });

    it('应拒绝数字类型', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, short_name: 123 as unknown as string });
      expect(result.success).toBe(false);
    });

    it('应接受 unicode 字符', () => {
      const name = '公司🎉emoji';
      expect(createCompanySchema.parse({ ...validCompany, short_name: name }).short_name).toBe(name);
    });
  });

  // === full_name ===
  describe('full_name', () => {
    it('应接受有效公司全称', () => {
      expect(createCompanySchema.parse(validCompany).full_name).toBe('测试公司全称有限公司');
    });

    it('应接受1个字符的全称', () => {
      expect(createCompanySchema.parse({ ...validCompany, full_name: 'X' }).full_name).toBe('X');
    });

    it('应接受最长200个字符的全称', () => {
      const name = 'b'.repeat(200);
      expect(createCompanySchema.parse({ ...validCompany, full_name: name }).full_name).toBe(name);
    });

    it('应拒绝超过200个字符的全称', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, full_name: 'b'.repeat(201) });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('公司全称不能超过200个字符');
      }
    });

    it('应拒绝空字符串', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, full_name: '' });
      expect(result.success).toBe(false);
    });

    it('应接受仅空格的字符串（trim 在 min 之后）', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, full_name: '   ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.full_name).toBe('');
      }
    });

    it('应 trim 前后空格', () => {
      expect(createCompanySchema.parse({ ...validCompany, full_name: '  全称  ' }).full_name).toBe('全称');
    });

    it('应拒绝缺少 full_name', () => {
      const { full_name: _, ...without } = validCompany;
      const result = createCompanySchema.safeParse(without);
      expect(result.success).toBe(false);
    });

    it('应拒绝 null', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, full_name: null });
      expect(result.success).toBe(false);
    });

    it('应拒绝数字类型', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, full_name: 456 as unknown as string });
      expect(result.success).toBe(false);
    });
  });

  // === address（nullable + optional） ===
  describe('address', () => {
    it('应接受有效地址', () => {
      expect(createCompanySchema.parse(validCompany).address).toBe('北京市朝阳区测试路1号');
    });

    it('应接受 undefined（可选字段）', () => {
      const { address: _, ...without } = validCompany;
      const result = createCompanySchema.safeParse(without);
      expect(result.success).toBe(true);
    });

    it('应接受 null（nullable 字段）', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, address: null });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.address).toBeNull();
      }
    });

    it('应接受最长500个字符的地址', () => {
      const addr = 'c'.repeat(500);
      expect(createCompanySchema.parse({ ...validCompany, address: addr }).address).toBe(addr);
    });

    it('应拒绝超过500个字符的地址', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, address: 'c'.repeat(501) });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('地址不能超过500个字符');
      }
    });

    it('应接受空字符串（optional 且无 min 约束）', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, address: '' });
      expect(result.success).toBe(true);
    });

    it('应 trim 前后空格', () => {
      expect(createCompanySchema.parse({ ...validCompany, address: '  地址  ' }).address).toBe('地址');
    });

    it('应拒绝数字类型', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, address: 789 as unknown as string });
      expect(result.success).toBe(false);
    });

    it('应接受 unicode 地址', () => {
      const addr = '日本東京都渋谷区🎉';
      expect(createCompanySchema.parse({ ...validCompany, address: addr }).address).toBe(addr);
    });
  });

  // === contact_person ===
  describe('contact_person', () => {
    it('应接受有效联系人', () => {
      expect(createCompanySchema.parse(validCompany).contact_person).toBe('张三');
    });

    it('应接受1个字符的联系人', () => {
      expect(createCompanySchema.parse({ ...validCompany, contact_person: '李' }).contact_person).toBe('李');
    });

    it('应接受最长100个字符的联系人', () => {
      const person = 'd'.repeat(100);
      expect(createCompanySchema.parse({ ...validCompany, contact_person: person }).contact_person).toBe(person);
    });

    it('应拒绝超过100个字符的联系人', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, contact_person: 'd'.repeat(101) });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('联系人不能超过100个字符');
      }
    });

    it('应拒绝空字符串', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, contact_person: '' });
      expect(result.success).toBe(false);
    });

    it('应接受仅空格的字符串（trim 在 min 之后）', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, contact_person: '   ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.contact_person).toBe('');
      }
    });

    it('应 trim 前后空格', () => {
      expect(createCompanySchema.parse({ ...validCompany, contact_person: '  王五  ' }).contact_person).toBe('王五');
    });

    it('应拒绝缺少 contact_person', () => {
      const { contact_person: _, ...without } = validCompany;
      const result = createCompanySchema.safeParse(without);
      expect(result.success).toBe(false);
    });

    it('应拒绝 null', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, contact_person: null });
      expect(result.success).toBe(false);
    });

    it('应拒绝数字类型', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, contact_person: 100 as unknown as string });
      expect(result.success).toBe(false);
    });
  });

  // === contact_phone ===
  describe('contact_phone', () => {
    it('应接受有效手机号', () => {
      expect(createCompanySchema.parse(validCompany).contact_phone).toBe('13800138000');
    });

    it('应接受带区号的座机号', () => {
      expect(createCompanySchema.parse({ ...validCompany, contact_phone: '010-12345678' }).contact_phone).toBe('010-12345678');
    });

    it('应接受带+的国际号码', () => {
      expect(createCompanySchema.parse({ ...validCompany, contact_phone: '+86-13800138000' }).contact_phone).toBe('+86-13800138000');
    });

    it('应接受带括号的号码', () => {
      expect(createCompanySchema.parse({ ...validCompany, contact_phone: '(010)12345678' }).contact_phone).toBe('(010)12345678');
    });

    it('应接受带#分机号的号码', () => {
      expect(createCompanySchema.parse({ ...validCompany, contact_phone: '010-12345678#123' }).contact_phone).toBe('010-12345678#123');
    });

    it('应接受带空格的号码', () => {
      expect(createCompanySchema.parse({ ...validCompany, contact_phone: '138 0013 8000' }).contact_phone).toBe('138 0013 8000');
    });

    it('应接受最长20个字符的电话', () => {
      const phone = '1'.repeat(20);
      expect(createCompanySchema.parse({ ...validCompany, contact_phone: phone }).contact_phone).toBe(phone);
    });

    it('应拒绝超过20个字符的电话', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, contact_phone: '1'.repeat(21) });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('联系电话不能超过20个字符');
      }
    });

    it('应拒绝空字符串', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, contact_phone: '' });
      expect(result.success).toBe(false);
    });

    it('应拒绝仅空格的字符串', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, contact_phone: '   ' });
      expect(result.success).toBe(false);
    });

    it('应拒绝包含字母的电话', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, contact_phone: '138abc8000' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('电话格式无效，仅允许数字、+、-、()、#');
      }
    });

    it('应拒绝包含特殊字符的电话', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, contact_phone: '138@00138000' });
      expect(result.success).toBe(false);
    });

    it('应拒绝缺少 contact_phone', () => {
      const { contact_phone: _, ...without } = validCompany;
      const result = createCompanySchema.safeParse(without);
      expect(result.success).toBe(false);
    });

    it('应拒绝 null', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, contact_phone: null });
      expect(result.success).toBe(false);
    });

    it('应拒绝数字类型', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, contact_phone: 13800138000 as unknown as string });
      expect(result.success).toBe(false);
    });

    it('应 trim 前后空格', () => {
      expect(createCompanySchema.parse({ ...validCompany, contact_phone: '  13800138000  ' }).contact_phone).toBe('13800138000');
    });
  });

  // === operator_ids ===
  describe('operator_ids', () => {
    it('应接受有效的运营者ID数组', () => {
      expect(createCompanySchema.parse(validCompany).operator_ids).toEqual([1, 2, 3]);
    });

    it('应接受单个运营者ID', () => {
      expect(createCompanySchema.parse({ ...validCompany, operator_ids: [1] }).operator_ids).toEqual([1]);
    });

    it('应接受最多100个运营者ID', () => {
      const ids = Array.from({ length: 100 }, (_, i) => i + 101);
      expect(createCompanySchema.parse({ ...validCompany, operator_ids: ids }).operator_ids).toHaveLength(100);
    });

    it('应拒绝超过100个运营者ID', () => {
      const ids = Array.from({ length: 101 }, (_, i) => i + 1);
      const result = createCompanySchema.safeParse({ ...validCompany, operator_ids: ids });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('运营者不能超过100个');
      }
    });

    it('应拒绝空数组', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, operator_ids: [] });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('运营者不能为空');
      }
    });

    it('应拒绝缺少 operator_ids', () => {
      const { operator_ids: _, ...without } = validCompany;
      const result = createCompanySchema.safeParse(without);
      expect(result.success).toBe(false);
    });

    it('应拒绝 null', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, operator_ids: null });
      expect(result.success).toBe(false);
    });

    it('应拒绝非数组', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, operator_ids: '1,2,3' as unknown as number[] });
      expect(result.success).toBe(false);
    });

    it('应拒绝负数ID', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, operator_ids: [-1] });
      expect(result.success).toBe(false);
    });

    it('应拒绝零作为ID', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, operator_ids: [0] });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('ID必须为正数');
      }
    });

    it('应拒绝浮点数ID', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, operator_ids: [1.5] });
      expect(result.success).toBe(false);
    });

    it('应拒绝字符串ID', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, operator_ids: ['1'] as unknown as number[] });
      expect(result.success).toBe(false);
    });

    it('应接受大整数ID', () => {
      expect(createCompanySchema.parse({ ...validCompany, operator_ids: [999999] }).operator_ids).toEqual([999999]);
    });
  });

  // === viewer_ids（optional） ===
  describe('viewer_ids', () => {
    it('应接受有效的查看者ID数组', () => {
      expect(createCompanySchema.parse(validCompany).viewer_ids).toEqual([4, 5]);
    });

    it('应接受 undefined（可选字段）', () => {
      const { viewer_ids: _, ...without } = validCompany;
      const result = createCompanySchema.safeParse(without);
      expect(result.success).toBe(true);
    });

    it('应接受空数组', () => {
      expect(createCompanySchema.parse({ ...validCompany, viewer_ids: [] }).viewer_ids).toEqual([]);
    });

    it('应接受最多100个查看者ID', () => {
      const ids = Array.from({ length: 100 }, (_, i) => i + 101);
      expect(createCompanySchema.parse({ ...validCompany, viewer_ids: ids }).viewer_ids).toHaveLength(100);
    });

    it('应拒绝超过100个查看者ID', () => {
      const ids = Array.from({ length: 101 }, (_, i) => i + 1);
      const result = createCompanySchema.safeParse({ ...validCompany, viewer_ids: ids });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('查看者不能超过100个');
      }
    });

    it('应拒绝 null', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, viewer_ids: null });
      expect(result.success).toBe(false);
    });

    it('应拒绝负数ID', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, viewer_ids: [-1] });
      expect(result.success).toBe(false);
    });

    it('应拒绝零作为ID', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, viewer_ids: [0] });
      expect(result.success).toBe(false);
    });

    it('应拒绝浮点数ID', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, viewer_ids: [2.5] });
      expect(result.success).toBe(false);
    });

    it('应拒绝字符串ID', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, viewer_ids: ['2'] as unknown as number[] });
      expect(result.success).toBe(false);
    });

    it('应拒绝非数组', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, viewer_ids: '4,5' as unknown as number[] });
      expect(result.success).toBe(false);
    });
  });

  // === operator_ids / viewer_ids 互斥校验 ===
  describe('operator_ids / viewer_ids 互斥校验', () => {
    it('应拒绝运营者和查看者存在重叠ID', () => {
      const result = createCompanySchema.safeParse({
        ...validCompany,
        operator_ids: [1, 2],
        viewer_ids: [2, 3],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('同一用户不能同时出现在运营者和查看者列表中');
        expect(result.error.issues[0].path).toEqual(['viewer_ids']);
      }
    });

    it('应接受不重叠的运营者和查看者ID', () => {
      const result = createCompanySchema.safeParse({
        ...validCompany,
        operator_ids: [1, 2],
        viewer_ids: [3, 4],
      });
      expect(result.success).toBe(true);
    });

    it('应接受 viewer_ids 为空数组时不论 operator_ids 如何', () => {
      const result = createCompanySchema.safeParse({
        ...validCompany,
        operator_ids: [1, 2, 3],
        viewer_ids: [],
      });
      expect(result.success).toBe(true);
    });

    it('应接受 viewer_ids 为 undefined 时不论 operator_ids 如何', () => {
      const { viewer_ids: _, ...without } = validCompany;
      const result = createCompanySchema.safeParse(without);
      expect(result.success).toBe(true);
    });

    it('应拒绝完全相同的 operator_ids 和 viewer_ids', () => {
      const result = createCompanySchema.safeParse({
        ...validCompany,
        operator_ids: [1, 2, 3],
        viewer_ids: [1, 2, 3],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('同一用户不能同时出现在运营者和查看者列表中');
      }
    });
  });

  // === 非严格模式（默认 passthrough） ===
  describe('非 strict 模式', () => {
    it('应允许未知字段（schema 未调用 .strict()）', () => {
      const result = createCompanySchema.safeParse({ ...validCompany, unknown_field: 'value' });
      expect(result.success).toBe(true);
    });

    it('应 strip 未知字段（Zod 默认行为：不报错但移除）', () => {
      const result = createCompanySchema.parse({ ...validCompany, extra: true });
      expect((result as Record<string, unknown>).extra).toBeUndefined();
    });
  });

  // === 完整有效对象 ===
  describe('完整有效对象', () => {
    it('应接受所有字段', () => {
      const result = createCompanySchema.safeParse(validCompany);
      expect(result.success).toBe(true);
    });

    it('应接受不含可选字段的对象', () => {
      const minimal = {
        short_name: '公司',
        full_name: '公司全称',
        contact_person: '张三',
        contact_phone: '13800138000',
        operator_ids: [1],
      };
      const result = createCompanySchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });

    it('解析后的对象应保持字段值一致', () => {
      const parsed = createCompanySchema.parse(validCompany);
      expect(parsed).toEqual(validCompany);
    });
  });
});

// ─── updateCompanySchema ────────────────────────────────────────────
describe('updateCompanySchema', () => {
  // === 部分更新：所有字段可选 ===
  describe('部分更新（所有字段可选）', () => {
    it('应接受空对象（无任何字段的部分更新）', () => {
      const result = updateCompanySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('应接受仅包含 short_name 的更新', () => {
      const result = updateCompanySchema.safeParse({ short_name: '新公司' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.short_name).toBe('新公司');
      }
    });

    it('应接受仅包含 full_name 的更新', () => {
      const result = updateCompanySchema.safeParse({ full_name: '新公司全称' });
      expect(result.success).toBe(true);
    });

    it('应接受仅包含 address 的更新', () => {
      const result = updateCompanySchema.safeParse({ address: '新地址' });
      expect(result.success).toBe(true);
    });

    it('应接受仅包含 contact_person 的更新', () => {
      const result = updateCompanySchema.safeParse({ contact_person: '李四' });
      expect(result.success).toBe(true);
    });

    it('应接受仅包含 contact_phone 的更新', () => {
      const result = updateCompanySchema.safeParse({ contact_phone: '13900139000' });
      expect(result.success).toBe(true);
    });

    it('应接受仅包含 operator_ids 的部分更新', () => {
      const result = updateCompanySchema.safeParse({ operator_ids: [1, 2] });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.operator_ids).toEqual([1, 2]);
      }
    });

    it('应接受仅包含 viewer_ids 的部分更新', () => {
      const result = updateCompanySchema.safeParse({ viewer_ids: [3, 4] });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.viewer_ids).toEqual([3, 4]);
      }
    });
  });

  // === 继承字段约束 ===
  describe('继承字段约束', () => {
    it('应接受有效简称', () => {
      expect(updateCompanySchema.parse({ ...validCompany }).short_name).toBe('测试公司');
    });

    it('应拒绝超过50个字符的简称', () => {
      const result = updateCompanySchema.safeParse({ ...validCompany, short_name: 'a'.repeat(51) });
      expect(result.success).toBe(false);
    });

    it('应拒绝超过200个字符的全称', () => {
      const result = updateCompanySchema.safeParse({ ...validCompany, full_name: 'b'.repeat(201) });
      expect(result.success).toBe(false);
    });

    it('应拒绝超过500个字符的地址', () => {
      const result = updateCompanySchema.safeParse({ ...validCompany, address: 'c'.repeat(501) });
      expect(result.success).toBe(false);
    });

    it('应拒绝超过100个字符的联系人', () => {
      const result = updateCompanySchema.safeParse({ ...validCompany, contact_person: 'd'.repeat(101) });
      expect(result.success).toBe(false);
    });

    it('应拒绝超过20个字符的电话', () => {
      const result = updateCompanySchema.safeParse({ ...validCompany, contact_phone: '1'.repeat(21) });
      expect(result.success).toBe(false);
    });

    it('应拒绝包含字母的电话', () => {
      const result = updateCompanySchema.safeParse({ ...validCompany, contact_phone: '138abc8000' });
      expect(result.success).toBe(false);
    });
  });

  // === address（nullable + optional） ===
  describe('address', () => {
    it('应接受 null（nullable 字段）', () => {
      const result = updateCompanySchema.safeParse({ ...validCompany, address: null });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.address).toBeNull();
      }
    });

    it('应接受 undefined（可选字段）', () => {
      const { address: _, ...without } = validCompany;
      const result = updateCompanySchema.safeParse(without);
      expect(result.success).toBe(true);
    });
  });

  // === operator_ids（部分更新：无 min(1) 约束） ===
  describe('operator_ids', () => {
    it('应接受有效的运营者ID数组', () => {
      expect(updateCompanySchema.parse(validCompany).operator_ids).toEqual([1, 2, 3]);
    });

    it('应接受空数组（部分更新无 min(1) 约束）', () => {
      const result = updateCompanySchema.safeParse({ ...validCompany, operator_ids: [] });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.operator_ids).toEqual([]);
      }
    });

    it('应接受 undefined（可选字段）', () => {
      const { operator_ids: _, ...without } = validCompany;
      const result = updateCompanySchema.safeParse(without);
      expect(result.success).toBe(true);
    });

    it('应拒绝超过100个运营者ID', () => {
      const ids = Array.from({ length: 101 }, (_, i) => i + 1);
      const result = updateCompanySchema.safeParse({ ...validCompany, operator_ids: ids });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('运营者不能超过100个');
      }
    });

    it('应拒绝负数ID', () => {
      const result = updateCompanySchema.safeParse({ ...validCompany, operator_ids: [-1] });
      expect(result.success).toBe(false);
    });

    it('应拒绝零作为ID', () => {
      const result = updateCompanySchema.safeParse({ ...validCompany, operator_ids: [0] });
      expect(result.success).toBe(false);
    });

    it('应拒绝浮点数ID', () => {
      const result = updateCompanySchema.safeParse({ ...validCompany, operator_ids: [1.5] });
      expect(result.success).toBe(false);
    });

    it('应拒绝字符串ID', () => {
      const result = updateCompanySchema.safeParse({ ...validCompany, operator_ids: ['1'] as unknown as number[] });
      expect(result.success).toBe(false);
    });
  });

  // === viewer_ids ===
  describe('viewer_ids', () => {
    it('应接受有效的查看者ID数组', () => {
      expect(updateCompanySchema.parse(validCompany).viewer_ids).toEqual([4, 5]);
    });

    it('应接受空数组', () => {
      expect(updateCompanySchema.parse({ ...validCompany, viewer_ids: [] }).viewer_ids).toEqual([]);
    });

    it('应接受 undefined（可选字段）', () => {
      const { viewer_ids: _, ...without } = validCompany;
      const result = updateCompanySchema.safeParse(without);
      expect(result.success).toBe(true);
    });

    it('应拒绝超过100个查看者ID', () => {
      const ids = Array.from({ length: 101 }, (_, i) => i + 1);
      const result = updateCompanySchema.safeParse({ ...validCompany, viewer_ids: ids });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('查看者不能超过100个');
      }
    });

    it('应拒绝负数ID', () => {
      const result = updateCompanySchema.safeParse({ ...validCompany, viewer_ids: [-1] });
      expect(result.success).toBe(false);
    });

    it('应拒绝零作为ID', () => {
      const result = updateCompanySchema.safeParse({ ...validCompany, viewer_ids: [0] });
      expect(result.success).toBe(false);
    });
  });

  // === operator_ids / viewer_ids 互斥校验 ===
  describe('operator_ids / viewer_ids 互斥校验', () => {
    it('应拒绝运营者和查看者存在重叠ID', () => {
      const result = updateCompanySchema.safeParse({
        ...validCompany,
        operator_ids: [1, 2],
        viewer_ids: [2, 3],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('同一用户不能同时出现在运营者和查看者列表中');
        expect(result.error.issues[0].path).toEqual(['viewer_ids']);
      }
    });

    it('应接受不重叠的运营者和查看者ID', () => {
      const result = updateCompanySchema.safeParse({
        ...validCompany,
        operator_ids: [1, 2],
        viewer_ids: [3, 4],
      });
      expect(result.success).toBe(true);
    });

    it('应接受仅提供 operator_ids 无 viewer_ids', () => {
      const result = updateCompanySchema.safeParse({ operator_ids: [1, 2] });
      expect(result.success).toBe(true);
    });

    it('应接受仅提供 viewer_ids 无 operator_ids', () => {
      const result = updateCompanySchema.safeParse({ viewer_ids: [3, 4] });
      expect(result.success).toBe(true);
    });

    it('应接受 operator_ids 为空数组且 viewer_ids 为空数组', () => {
      const result = updateCompanySchema.safeParse({
        operator_ids: [],
        viewer_ids: [],
      });
      expect(result.success).toBe(true);
    });

    it('应拒绝完全相同的 operator_ids 和 viewer_ids', () => {
      const result = updateCompanySchema.safeParse({
        operator_ids: [1, 2, 3],
        viewer_ids: [1, 2, 3],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('同一用户不能同时出现在运营者和查看者列表中');
      }
    });
  });

  // === 非严格模式 ===
  describe('非 strict 模式', () => {
    it('应允许未知字段（schema 未调用 .strict()）', () => {
      const result = updateCompanySchema.safeParse({ ...validCompany, extra: true });
      expect(result.success).toBe(true);
    });
  });

  // === 完整有效对象 ===
  describe('完整有效对象', () => {
    it('应接受所有字段', () => {
      const result = updateCompanySchema.safeParse(validCompany);
      expect(result.success).toBe(true);
    });

    it('解析后的对象应保持字段值一致', () => {
      const parsed = updateCompanySchema.parse(validCompany);
      expect(parsed).toEqual(validCompany);
    });
  });
});

// ─── toggleCompanyStatusSchema ──────────────────────────────────────
describe('toggleCompanyStatusSchema', () => {
  it('应接受 status: true', () => {
    expect(toggleCompanyStatusSchema.parse({ status: true }).status).toBe(true);
  });

  it('应接受 status: false', () => {
    expect(toggleCompanyStatusSchema.parse({ status: false }).status).toBe(false);
  });

  it('应拒绝缺少 status 字段', () => {
    const result = toggleCompanyStatusSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('应拒绝字符串 "true"', () => {
    const result = toggleCompanyStatusSchema.safeParse({ status: 'true' as unknown as boolean });
    expect(result.success).toBe(false);
  });

  it('应拒绝字符串 "false"', () => {
    const result = toggleCompanyStatusSchema.safeParse({ status: 'false' as unknown as boolean });
    expect(result.success).toBe(false);
  });

  it('应拒绝数字 1', () => {
    const result = toggleCompanyStatusSchema.safeParse({ status: 1 as unknown as boolean });
    expect(result.success).toBe(false);
  });

  it('应拒绝数字 0', () => {
    const result = toggleCompanyStatusSchema.safeParse({ status: 0 as unknown as boolean });
    expect(result.success).toBe(false);
  });

  it('应拒绝 null', () => {
    const result = toggleCompanyStatusSchema.safeParse({ status: null as unknown as boolean });
    expect(result.success).toBe(false);
  });

  it('应拒绝 undefined', () => {
    const result = toggleCompanyStatusSchema.safeParse({ status: undefined as unknown as boolean });
    expect(result.success).toBe(false);
  });

  it('应拒绝数组', () => {
    const result = toggleCompanyStatusSchema.safeParse({ status: [true] as unknown as boolean });
    expect(result.success).toBe(false);
  });

  it('应拒绝对象', () => {
    const result = toggleCompanyStatusSchema.safeParse({ status: { value: true } as unknown as boolean });
    expect(result.success).toBe(false);
  });

  it('应允许未知字段（schema 未调用 .strict()）', () => {
    const result = toggleCompanyStatusSchema.safeParse({ status: true, extra: 'value' });
    expect(result.success).toBe(true);
  });

  it('应拒绝空对象', () => {
    const result = toggleCompanyStatusSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('status参数无效');
    }
  });
});

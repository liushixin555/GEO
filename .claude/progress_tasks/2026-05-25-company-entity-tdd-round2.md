# company.entity 第二轮 TDD 补全

**日期**: 2026-05-25
**文件**: `apis/entity/company.entity.ts`
**测试**: `tests/apis/company.entity.test.ts`
**用例**: 180（新增 104）
**结果**: 100% 通过
**build/lint**: 通过

## 新增测试维度

JSON 序列化与反序列化(13) + 对象不可变性(11) + 跨接口一致性增强(10) + 安全注入防护(14) + 边界值增强(14) + 状态生命周期(8) + 实际使用场景(11) + 响应结构验证(10) + 类型推断与编译时安全(4) + 数组操作与遍历(8)

## 接口覆盖

- Company: 全字段验证 + 边界值 + 不可变性 + JSON
- CreateCompanyRequest: 全字段 + 可选字段 + 空数组 + 安全注入
- UpdateCompanyRequest: 继承一致性 + 全量替换 + 边界值
- CompanyDetail: 继承 Company + operators/viewers 结构 + 嵌套序列化

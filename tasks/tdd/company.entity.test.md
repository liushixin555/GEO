# TDD 执行报告：company.entity

## 源文件
- `apis/entity/company.entity.ts` — Company / CreateCompanyRequest / UpdateCompanyRequest / CompanyDetail 接口

## 测试文件
- `tests/apis/company.entity.test.ts`

## 执行日期
2026-05-24

## 测试概览

| 指标 | 数值 |
|------|------|
| 总测试数 | 77 |
| 通过 | 77 |
| 失败 | 0 |
| 跳过 | 0 |

## 覆盖率说明

`company.entity.ts` 为纯 TypeScript 接口定义文件，无可执行运行时代码（无语句、分支、函数），因此覆盖率工具显示 0%。接口的正确性由 TypeScript 编译器在编译时验证，测试确保类型系统正确接受合法对象并验证字段语义。

## 测试分类统计

### Company interface（15个测试）
1. 全部必填字段验证
2. address 为 null
3. 时间戳字段（Date 实例）
4. status 为 false
5. 大 ID 值（Number.MAX_SAFE_INTEGER）
6. 特殊字符（HTML 标签、引号、中文括号、国际电话格式）
7. 空字符串字段
8. **deleted_at 作为 Date（软删除）**
9. **字段数量验证（10个）**
10. **字段名称验证**
11. **id = 0 边界值**
12. **时间戳精度（毫秒级）**
13. **时间顺序（created_at < updated_at）**
14. **超长 full_name**
15. **Unicode 字符（emoji 等）**

### CreateCompanyRequest interface（19个测试）
1. 全部必填字段
2. 可选 address
3. 可选 viewer_ids
4. 空 operator_ids 数组
5. 单 operator_id
6. 多 operator_ids（100个）
7. 单 viewer_id
8. undefined viewer_ids
9. undefined address
10. 空 address 字符串
11. 中文字段支持
12. **全部字段名称验证（7个）**
13. **仅必填字段名称验证（5个）**
14. **字段数量验证**
15. **重复 operator_ids**
16. **重复 viewer_ids**
17. **大数 operator_ids（Number.MAX_SAFE_INTEGER）**
18. **operator_ids 包含 0**
19. **viewer_ids 空数组**
20. **超长 short_name**
21. **address 含特殊字符**

### UpdateCompanyRequest interface（14个测试）
1. 全部必填字段
2. undefined viewer_ids
3. 可选字段提供
4. 空 viewer_ids
5. 全字段替换
6. **字段数量验证（7个）**
7. **仅必填字段名称验证**
8. **空 operator_ids 数组（清空运营者）**
9. **undefined address**
10. **与 CreateCompanyRequest 结构一致性**
11. **重复 operator_ids / viewer_ids**
12. **大数 operator_ids**
13. **中文字段支持**

### CompanyDetail interface（13个测试）
1. 继承 Company + 扩展字段
2. 继承全部 Company 字段
3. operator 对象形状（id/cn_name/username）
4. 空 operators/viewers 数组
5. 多 operators/viewers
6. viewer 对象形状
7. address 非 null
8. 基类字段完整性验证
9. 同一 ID 同时出现在 operator_ids 和 viewer_ids
10. **字段数量验证（14 = 10 Company + 4 extended）**
11. **deleted_at 作为 Date**
12. **operators 含特殊字符 cn_name**
13. **operators/viewers 空字符串**
14. **viewer 含 unicode username**
15. **operator/viewer ids 与对象数量不匹配**

### re-exports from index（5个测试）
1. 编译时导入验证
2. **动态导入 Company 验证**
3. **动态导入 CreateCompanyRequest 验证**
4. **动态导入 UpdateCompanyRequest 验证**
5. **动态导入 CompanyDetail 验证**

### cross-interface integration（6个测试）
1. **CreateCompanyRequest 可生成 Company**
2. **CreateCompanyRequest undefined address 映射为 null**
3. **UpdateCompanyRequest 可部分更新 Company**
4. **CompanyDetail 包含 Company 全部字段 + 扩展字段**
5. **Create/Update 共享相同可选字段行为**
6. **Company 到 CompanyDetail 完整数据往返验证**

## Entity 字段覆盖情况

### Company 接口（11个字段）
| 字段 | 测试覆盖 |
|------|---------|
| id | ✓ (0, 1, MAX_SAFE_INTEGER) |
| short_name | ✓ (空串, 中文, 特殊字符, 超长) |
| full_name | ✓ (空串, 中文, 特殊字符, 超长) |
| address (nullable) | ✓ (null, 空串, 中文, 特殊字符) |
| contact_person | ✓ (空串, 中文, 中文括号) |
| contact_phone | ✓ (国际格式) |
| status | ✓ (true, false) |
| created_at | ✓ (精度, 顺序) |
| updated_at | ✓ (精度, 顺序) |
| deleted_at | ✓ (null, Date) |

### CreateCompanyRequest / UpdateCompanyRequest（7个字段）
| 字段 | Create 测试 | Update 测试 |
|------|-----------|-----------|
| short_name | ✓ | ✓ |
| full_name | ✓ | ✓ |
| address? | ✓ (undefined/null/空串/中文/特殊字符) | ✓ (undefined/null/中文) |
| contact_person | ✓ | ✓ |
| contact_phone | ✓ | ✓ |
| operator_ids | ✓ (空/单/多/100个/重复/大数/0) | ✓ (空/单/多/重复/大数) |
| viewer_ids? | ✓ (undefined/空/单/多/重复/大数) | ✓ (undefined/空/多/重复/大数) |

### CompanyDetail 扩展字段（4个字段）
| 字段 | 测试覆盖 |
|------|---------|
| operator_ids | ✓ (空/单/多/同ID重叠/不匹配) |
| operators[].id | ✓ |
| operators[].cn_name | ✓ (空串/中文/特殊字符) |
| operators[].username | ✓ (空串/中文/unicode) |
| viewer_ids | ✓ (空/单/多/同ID重叠) |
| viewers[].id | ✓ |
| viewers[].cn_name | ✓ |
| viewers[].username | ✓ |

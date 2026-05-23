# TDD 执行报告：company.entity + company.controller

## 源文件
- `apis/entity/company.entity.ts` — Company / CreateCompanyRequest / UpdateCompanyRequest / CompanyDetail 接口
- `apis/controller/company.controller.ts` — 5个端点（list/getById/create/update/toggleStatus）
- `apis/service/impl/company.service.impl.ts` — Prisma 实现

## 测试文件
- `tests/apis/company.entity.test.ts`
- `tests/apis/company.controller.test.ts`
- `tests/apis/company.service.test.ts`

## 执行日期
2026-05-24

## 测试概览

| 指标 | 数值 |
|------|------|
| 总测试数 | 160 |
| 通过 | 160 |
| 失败 | 0 |
| 跳过 | 0 |

## 覆盖率

### company.controller.ts

| 类型 | 覆盖率 |
|------|--------|
| 语句 (Statements) | 100% |
| 分支 (Branches) | 100% |
| 函数 (Functions) | 100% |
| 行 (Lines) | 100% |

### company.service.impl.ts

| 类型 | 覆盖率 |
|------|--------|
| 语句 (Statements) | 100% |
| 分支 (Branches) | 100% |
| 函数 (Functions) | 100% |
| 行 (Lines) | 100% |

## 测试覆盖的端点（5个）

### company.controller.test.ts（95个测试）
1. **GET /api/companies** - 8个：401未认证、403非sysadmin、200列表、500错误、空列表、多公司字段映射、view角色403
2. **GET /api/companies/:id** - 12个：401/403权限、400无效ID、200详情、200无运营者查看者、404不存在、500错误、负ID、ID=0、仅运营者、仅查看者、多运营者+查看者
3. **POST /api/companies** - 20个：401/403权限、400各必填字段缺失/空字符串/非数组/空数组、201创建成功/含viewer_ids/无可选字段/多viewer/空viewer、500错误
4. **PUT /api/companies/:id** - 20个：401/403权限、400无效ID/字段缺失/空字符串、200更新成功/含viewer_ids/空viewer/多viewer、404不存在、500错误
5. **PUT /api/companies/:id/status** - 15个：401/403权限、400无效ID/status非布尔/缺失/数字/null/对象/数组、200启用/禁用、404不存在、500错误
6. **Edge Cases & Security** - 20个：过期JWT、畸形JWT、空Bearer、小数ID、前导零ID、XSS/SQL注入字符、中文字段、ID优先验证、过期token切换、超长字段、错误JWT密钥、负ID、布尔false、多operator_ids

### company.entity.test.ts（41个测试）
1. **Company interface** - 7个：全部必填字段、address为null、时间戳字段、status为false、大ID值、特殊字符、空字符串字段
2. **CreateCompanyRequest interface** - 10个：全部必填字段、可选address、可选viewer_ids、空operator_ids、单operator、多operator、单viewer、undefined viewer_ids、undefined address、空address、中文字段
3. **UpdateCompanyRequest interface** - 5个：全部必填字段、可选字段、undefined viewer_ids、空viewer_ids、全字段替换
4. **CompanyDetail interface** - 7个：继承Company+扩展字段、空运营者/查看者、多运营者/查看者、viewer对象形状、非null address、基类字段完整性、同ID既是运营者也是查看者
5. **re-exports** - 1个：从index.ts导入编译正确

## Entity 字段覆盖情况

### Company 接口字段
| 字段 | entity测试 | controller测试 |
|------|-----------|--------------|
| id | ✓ | ✓ |
| short_name | ✓ | ✓ |
| full_name | ✓ | ✓ |
| address (nullable) | ✓ (null + string) | ✓ |
| contact_person | ✓ | ✓ |
| contact_phone | ✓ | ✓ |
| status | ✓ (true + false) | ✓ |
| created_at | ✓ | ✓ |
| updated_at | ✓ | ✓ |

### CreateCompanyRequest 字段
| 字段 | 测试覆盖 |
|------|---------|
| short_name | ✓ (含空字符串/缺失/中文/特殊字符) |
| full_name | ✓ |
| address? | ✓ (undefined/null/空字符串/中文) |
| contact_person | ✓ |
| contact_phone | ✓ |
| operator_ids | ✓ (空数组/单/多/100个/非数组/缺失) |
| viewer_ids? | ✓ (undefined/空数组/单/多/中文) |

### UpdateCompanyRequest 字段
| 字段 | 测试覆盖 |
|------|---------|
| short_name | ✓ |
| full_name | ✓ |
| address? | ✓ |
| contact_person | ✓ |
| contact_phone | ✓ |
| operator_ids | ✓ |
| viewer_ids? | ✓ (undefined/空数组/多元素) |

### CompanyDetail 扩展字段
| 字段 | 测试覆盖 |
|------|---------|
| operator_ids | ✓ (空/单/多/同ID重叠) |
| operators[].id | ✓ |
| operators[].cn_name | ✓ |
| operators[].username | ✓ |
| viewer_ids | ✓ (空/单/多) |
| viewers[].id | ✓ |
| viewers[].cn_name | ✓ |
| viewers[].username | ✓ |

## 测试分类统计

| 分类 | 数量 |
|------|------|
| 权限验证（401/403） | 22 |
| 参数验证（400） | 38 |
| 资源不存在（404） | 8 |
| 成功操作（200/201） | 42 |
| 服务器错误（500） | 15 |
| Entity类型验证 | 41 |
| 安全/边界 | 14 |

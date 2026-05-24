# auth.service.test.ts — TDD 第2轮补全执行报告

**文件**: `apis/service/impl/auth.service.impl.ts`
**接口**: `apis/service/auth.service.ts`
**测试文件**: `tests/apis/auth.service.test.ts`
**日期**: 2026-05-24

## 测试概况

| 指标 | 值 |
|------|------|
| 测试用例总数 | 68（原56 + 新增12） |
| 通过 | 68 |
| 失败 | 0 |
| auth.service.impl.ts 语句覆盖率 | 100% |
| auth.service.impl.ts 分支覆盖率 | 100% |
| auth.service.impl.ts 函数覆盖率 | 100% |
| auth.service.impl.ts 行覆盖率 | 100% |

## 第2轮新增用例

### getLatestUserState（4个 — 原为0个，完全缺失的方法）
| 测试用例 | 说明 |
|----------|------|
| 应返回包含 selectedCompany 和 selectedProject 的完整用户状态 | 验证所有字段映射（id/username/cn_name/role/company_id/selected_company/selected_project） |
| selectedCompany 和 selectedProject 为 null 时应返回 null | 空选择的边界场景 |
| 用户不存在时应抛出"用户不存在" | userId 无效时的异常处理 |
| companyId 为 null 时 company_id 应为 null | sysadmin 无公司关联的字段映射 |

### verifyToken 补充（2个）
| 测试用例 | 说明 |
|----------|------|
| token 有效但用户已被删除时应返回 { valid: false } | 用户删除后 token 仍有效但查不到用户的场景 |
| 用户 selectedCompany/selectedProject 为 null 时应返回 null | 空选择的字段映射验证 |

### login 补充（3个）
| 测试用例 | 说明 |
|----------|------|
| admin companyId 为 undefined 时应抛出 LoginSelectionError | companyId 为 undefined 的边界场景（等价于无公司） |
| view companyId 为 null 时应抛出 LoginSelectionError | view 角色无公司关联时无法登录 |
| sysadmin 无任何公司时应抛出 LoginSelectionError | sysadmin 在所有公司被禁用/无公司时的边界 |

### getAccessibleProjects 补充（1个）
| 测试用例 | 说明 |
|----------|------|
| companyId 为 0（falsy）时应返回空数组 | falsy companyId 边界检查 |

### getAccessibleCompanies 补充（1个）
| 测试用例 | 说明 |
|----------|------|
| sysadmin 无启用公司时应返回空数组 | sysadmin 在数据库无启用公司时的边界 |

### 接口合规性（1个）
| 测试用例 | 说明 |
|----------|------|
| AuthServiceImpl 应实现 IAuthService 的所有方法 | 验证所有7个接口方法均存在且为函数 |

## 补全前后对比

| 指标 | 第1轮 | 第2轮 |
|------|-------|-------|
| 总测试数 | 56 | 68 |
| login 测试 | 16 | 19 |
| verifyToken 测试 | 4 | 6 |
| getLatestUserState 测试 | 0 | 4 |
| saveSelection 测试 | 8 | 8 |
| getAccessibleCompanies 测试 | 9 | 10 |
| getAccessibleProjects 测试 | 13 | 14 |
| getCompanyUsers 测试 | 6 | 6 |
| 接口合规性 | 0 | 1 |
| 覆盖率 | 100% | 100% |

## 主要发现

1. **getLatestUserState 方法完全未测试** — 这是最大的缺口，7个接口方法中有1个零覆盖
2. **verifyToken 缺少用户删除场景** — token 有效但用户已被删除时应返回 valid:false
3. **login 缺少 companyId 为 undefined/null 的边界** — 非 sysadmin 角色无公司关联时的行为
4. **falsy companyId 边界** — companyId=0 时应视为无公司

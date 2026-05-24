# auth.service.test.ts — TDD 第3轮补全执行报告

**文件**: `apis/service/impl/auth.service.impl.ts`
**接口**: `apis/service/auth.service.ts`
**测试文件**: `tests/apis/auth.service.test.ts`
**日期**: 2026-05-25

## 测试概况

| 指标 | 值 |
|------|------|
| 测试用例总数 | 78（第2轮68 + 第3轮新增10） |
| 通过 | 78 |
| 失败 | 0 |
| auth.service.impl.ts 语句覆盖率 | 100% |
| auth.service.impl.ts 分支覆盖率 | 100% |
| auth.service.impl.ts 函数覆盖率 | 100% |
| auth.service.impl.ts 行覆盖率 | 100% |

## 第3轮新增用例（10个）

### login 第3轮补充（3个）
| 测试用例 | 说明 |
|----------|------|
| selectedCompany 存在且在列表中但 selectedProject 为 null 时应自动选择第一个项目 | 验证 selectedProject 为 null 时项目降级选择逻辑 |
| sysadmin 无项目时 selectedProject 应为 null 且不报错 | 验证代码注释行59：sysadmin/admin with no projects: selectedProject stays null |
| login 持久化时无项目应写入 selectedProjectId 为 null | 验证 prisma.user.update 写入 selectedProjectId: null |

### saveSelection 第3轮补充（2个）
| 测试用例 | 说明 |
|----------|------|
| project_id 为 0（falsy）时应跳过项目权限校验并直接更新 | 验证 `if (request.project_id)` 对 falsy 值 0 的处理 |
| admin 成功保存公司选择（无项目） | admin 角色仅保存公司、不选项目的成功路径 |

### verifyToken 第3轮补充（1个）
| 测试用例 | 说明 |
|----------|------|
| 有效 token 应返回完整的用户字段映射 | 验证所有字段映射（id/username/cn_name/role/company_id/selected_company/selected_project） |

### getAccessibleCompanies 第3轮补充（2个）
| 测试用例 | 说明 |
|----------|------|
| companyId 为 0（falsy）时非 sysadmin 应返回空数组 | falsy companyId=0 边界检查 |
| sysadmin 调用时 companyId 参数应被忽略 | sysadmin 不依赖 companyId 参数，始终查全部启用公司 |

### getAccessibleProjects 第3轮补充（1个）
| 测试用例 | 说明 |
|----------|------|
| sysadmin 项目查询应包含 company.status=true 条件 | 验证 prisma project.findMany 的 where 条件完整性 |

### getCompanyUsers 第3轮补充（1个）
| 测试用例 | 说明 |
|----------|------|
| 查询应指定 select 字段（id/role/cnName/username） | 验证 prisma user.findMany 的 select 参数正确性 |

## 三轮对比

| 指标 | 第1轮 | 第2轮 | 第3轮 |
|------|-------|-------|-------|
| 总测试数 | 56 | 68 | 78 |
| login 测试 | 16 | 19 | 22 |
| verifyToken 测试 | 4 | 6 | 7 |
| getLatestUserState 测试 | 0 | 4 | 4 |
| saveSelection 测试 | 8 | 8 | 10 |
| getAccessibleCompanies 测试 | 9 | 10 | 12 |
| getAccessibleProjects 测试 | 13 | 14 | 15 |
| getCompanyUsers 测试 | 6 | 6 | 7 |
| 接口合规性 | 0 | 1 | 1 |
| 覆盖率 | 100% | 100% | 100% |

## 主要发现

1. **falsy project_id=0 边界** — `if (request.project_id)` 对 0 视为 falsy 跳过校验，但 `?? null` 不处理 0（nullish coalescing 只对 null/undefined 生效），导致 selectedProjectId 被设为 0
2. **selectedProject=null 降级选择** — 当 selectedCompany 有效但 selectedProject 为 null 时，应正确降级到 projects[0]
3. **sysadmin 无项目持久化** — 无项目时 update 写入 selectedProjectId: null，确认行为正确
4. **sysadmin companyId 参数被忽略** — getAccessibleCompanies 中 sysadmin 分支不使用 companyId 参数
5. **getCompanyUsers select 字段验证** — 确认查询只返回必要字段（id/role/cnName/username）

# auth.service.test.ts — TDD 执行报告

**文件**: `apis/service/impl/auth.service.impl.ts`
**接口**: `apis/service/auth.service.ts`
**测试文件**: `tests/apis/auth.service.test.ts`
**日期**: 2026-05-24

## 测试概况（最新：第2轮）

| 指标 | 值 |
|------|------|
| 测试用例总数 | 68（第1轮56 + 第2轮新增12） |
| 通过 | 68 |
| 失败 | 0 |
| 语句覆盖率 | 100% |
| 分支覆盖率 | 100% |
| 函数覆盖率 | 100% |
| 行覆盖率 | 100% |

> 第2轮补全报告：[auth.service.test.round2.md](auth.service.test.round2.md)

## 测试分布

### login (16 个测试)
| 测试用例 | 说明 |
|----------|------|
| 用户不存在时应抛出"用户名或密码错误" | 验证 findUnique 返回 null 时抛出错误 |
| 密码错误时应抛出"用户名或密码错误" | 验证 bcrypt.compare 返回 false 时抛出错误 |
| 没有任何可访问公司时应抛出 LoginSelectionError | 验证 getAccessibleCompanies 返回空数组时抛出 |
| view 角色没有任何可访问项目时应抛出 LoginSelectionError | 验证 view 角色无项目时抛出 |
| admin 无项目时 selected_project 为 null 且不报错 | admin/sysadmin 无项目时不报错 |
| sysadmin 成功登录并返回选择的公司和项目 | sysadmin 完整登录流程 |
| 保存的选择仍然有效时应使用保存的公司和项目 | selectedCompany/selectedProject 匹配可访问列表 |
| 保存的公司不在可访问列表时应自动选择第一个公司 | 自动降级选择 |
| 保存的项目不在可访问列表时应自动选择第一个项目 | 项目自动降级选择 |
| 应持久化解析后的选择到数据库 | 验证 prisma.user.update 调用 |
| JWT token 应包含正确的用户信息 | 验证 token 解码后包含 userId/username/role/companyId |
| admin 成功登录应通过 projectOperator 获取项目 | admin 角色通过 projectOperator 查询 |
| view 成功登录应通过 projectViewer 获取项目 | view 角色通过 projectViewer 查询 |
| admin 公司被禁用时登录应抛出 LoginSelectionError | admin 公司禁用导致无可用公司 |
| 登录返回的 user 对象应包含所有必要字段 | 验证 id/cn_name/username/role/company_id/token 字段 |
| view 保存的项目仍有效时应使用保存的项目 | view 角色保存的项目匹配 viewer 列表 |

### verifyToken (4 个测试)
| 测试用例 | 说明 |
|----------|------|
| 有效 token 应返回 { valid: true, userId } | 正常 JWT 验证 |
| 过期 token 应返回 { valid: false } | 过期处理 |
| 格式错误的 token 应返回 { valid: false } | 格式异常处理 |
| 使用错误密钥签发的 token 应返回 { valid: false } | 密钥不匹配处理 |

### saveSelection (8 个测试)
| 测试用例 | 说明 |
|----------|------|
| 应更新用户的 selectedCompanyId 和 selectedProjectId | 基本更新 |
| project_id 为 undefined 时应设为 null | 缺失 project_id 处理 |
| project_id 显式为 null 时应设为 null | null project_id 处理 |
| 无权选择该公司时应抛出错误 | 公司权限校验 |
| 无权选择该项目时应抛出错误 | 项目权限校验 |
| admin 只能选择自己的公司 | admin 角色公司限制 |
| view 成功选择自己的公司和项目 | view 角色通过 projectViewer 验证后保存 |
| admin 公司被禁用时应无法选择公司 | 公司禁用导致权限校验失败 |

### getAccessibleCompanies (9 个测试)
| 测试用例 | 说明 |
|----------|------|
| sysadmin 应返回所有启用的公司 | sysadmin 全量查询 |
| admin 有 companyId 时应返回自己的公司 | admin 单公司 |
| admin 的公司被禁用时应返回空数组 | 公司禁用处理 |
| admin 的公司不存在时应返回空数组 | 公司不存在处理 |
| companyId 为 null 且非 sysadmin 时应返回空数组 | 无公司关联 |
| view 有 companyId 时应返回自己的公司 | view 角色 |
| view 的公司被禁用时应返回空数组 | view 公司禁用 |
| view companyId 为 null 时应返回空数组 | view 无公司关联 |
| companyId 为 undefined 时非 sysadmin 应返回空数组 | undefined 边界处理 |

### getAccessibleProjects (13 个测试)
| 测试用例 | 说明 |
|----------|------|
| companyId 为 null 时应返回空数组 | 无公司 |
| sysadmin 应返回该公司所有启用项目 | sysadmin 全量 |
| sysadmin 跳过公司状态检查 | sysadmin 特权 |
| admin 的公司被禁用时应返回空数组 | 公司禁用 |
| admin 的公司不存在时应返回空数组 | 公司不存在 |
| admin 应返回其作为 operator 的项目 | admin 通过 projectOperator |
| view 的公司被禁用时应返回空数组 | 公司禁用 |
| view 的公司不存在时应返回空数组 | 公司不存在 |
| view 应返回其作为 viewer 的项目 | view 通过 projectViewer |
| companyId 为 undefined 时应返回空数组 | undefined 边界处理 |
| sysadmin 无匹配项目时应返回空数组 | sysadmin 无项目 |
| admin 无 operator 关联时应返回空数组 | admin 无项目关联 |
| view 无 viewer 关联时应返回空数组 | view 无项目关联 |

### getCompanyUsers (6 个测试)
| 测试用例 | 说明 |
|----------|------|
| 应按角色分组返回操作员和查看者 | 混合角色分组 |
| 没有用户时应返回空数组 | 空结果 |
| 只有操作员没有查看者时 | 纯操作员 |
| 只有查看者没有操作员时 | 纯查看者 |
| 不应包含 sysadmin 角色的用户 | 验证查询条件 role: { in: ['admin', 'view'] } |
| 不应包含被禁用的用户 | 验证查询条件 status: true |

## Mock 策略

- **getPrisma**: mock 所有 prisma 模型方法（user/company/project/projectOperator/projectViewer）
- **bcryptjs**: 使用 `hashSync` 生成真实 bcrypt hash，`compare` 使用真实对比
- **jsonwebtoken**: 使用真实 JWT 签发和验证（secret='test-secret'）
- **config**: mock 为固定 jwt 配置

## 与上次报告对比

| 变更项 | 旧值 | 新值 |
|--------|------|------|
| 总测试数 | 42 | 56 |
| login 测试 | 13 | 16 |
| saveSelection 测试 | 6 | 8 |
| getAccessibleCompanies 测试 | 6 | 9 |
| getAccessibleProjects 测试 | 9 | 13 |
| getCompanyUsers 测试 | 4 | 6 |
| 覆盖率 | 100% | 100% |

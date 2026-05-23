# auth.service.test.ts — TDD 执行报告

**文件**: `apis/service/impl/auth.service.impl.ts`
**接口**: `apis/service/auth.service.ts`
**测试文件**: `tests/apis/auth.service.test.ts`
**日期**: 2026-05-23

## 测试概况

| 指标 | 值 |
|------|------|
| 测试用例总数 | 39 |
| 通过 | 39 |
| 失败 | 0 |
| 语句覆盖率 | 100% |
| 分支覆盖率 | 100% |
| 函数覆盖率 | 100% |
| 行覆盖率 | 100% |

## 测试分布

### login (13 个测试)
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

### verifyToken (4 个测试)
| 测试用例 | 说明 |
|----------|------|
| 有效 token 应返回 { valid: true, userId } | 正常 JWT 验证 |
| 过期 token 应返回 { valid: false } | 过期处理 |
| 格式错误的 token 应返回 { valid: false } | 格式异常处理 |
| 使用错误密钥签发的 token 应返回 { valid: false } | 密钥不匹配处理 |

### saveSelection (3 个测试)
| 测试用例 | 说明 |
|----------|------|
| 应更新用户的 selectedCompanyId 和 selectedProjectId | 基本更新 |
| project_id 为 undefined 时应设为 null | 缺失 project_id 处理 |
| project_id 显式为 null 时应设为 null | null project_id 处理 |

### getAccessibleCompanies (6 个测试)
| 测试用例 | 说明 |
|----------|------|
| sysadmin 应返回所有启用的公司 | sysadmin 全量查询 |
| admin 有 companyId 时应返回自己的公司 | admin 单公司 |
| admin 的公司被禁用时应返回空数组 | 公司禁用处理 |
| admin 的公司不存在时应返回空数组 | 公司不存在处理 |
| companyId 为 null 且非 sysadmin 时应返回空数组 | 无公司关联 |
| view 有 companyId 时应返回自己的公司 | view 角色 |

### getAccessibleProjects (9 个测试)
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

### getCompanyUsers (4 个测试)
| 测试用例 | 说明 |
|----------|------|
| 应按角色分组返回操作员和查看者 | 混合角色分组 |
| 没有用户时应返回空数组 | 空结果 |
| 只有操作员没有查看者时 | 纯操作员 |
| 只有查看者没有操作员时 | 纯查看者 |

## Mock 策略

- **getPrisma**: mock 所有 prisma 模型方法（user/company/project/projectOperator/projectViewer）
- **bcryptjs**: 使用 `hashSync` 生成真实 bcrypt hash，`compare` 使用真实对比
- **jsonwebtoken**: 使用真实 JWT 签发和验证（secret='test-secret'）
- **config**: mock 为固定 jwt 配置

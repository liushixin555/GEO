# TDD 执行报告：publishing-schedule.service.impl.ts

## 源文件
`apis/service/impl/publishing-schedule.service.impl.ts`

## 测试文件
`tests/apis/publishing-schedule.service.test.ts`

## 测试概要

| 指标 | 值 |
|------|-----|
| 测试总数 | 47 |
| 通过 | 47 |
| 失败 | 0 |
| 跳过 | 0 |
| 测试套件 | 1 |

## 覆盖率

| 类型 | 覆盖率 |
|------|--------|
| 语句覆盖率 (Statements) | 100% |
| 分支覆盖率 (Branches) | 100% |
| 函数覆盖率 (Functions) | 100% |
| 行覆盖率 (Lines) | 100% |

## 测试分类

### list() 方法 — 28 个测试

| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | should return paginated list with default status filter | 默认状态过滤（publishing/published/publish_failed） |
| 2 | should calculate skip correctly for page 2 with pageSize 5 | 第2页分页计算 |
| 3 | should calculate skip correctly for page 3 with pageSize 20 | 第3页分页计算 |
| 4 | should filter by search on title and keywords | 搜索过滤（标题+关键词，insensitive模式） |
| 5 | should filter by status (override default status filter) | 状态过滤覆盖默认值 |
| 6 | should filter by projectId | 项目ID过滤 |
| 7 | should apply admin role permission filter | admin角色权限过滤（operators + company.status + project.status） |
| 8 | should apply view role permission filter | view角色权限过滤（viewers + company.status + project.status） |
| 9 | should not apply permission filter when role is not admin or view | 非admin/view角色（如sysadmin）无权限过滤 |
| 10 | should not apply permission filter when userId is missing | 缺少userId时无权限过滤 |
| 11 | should combine search, status, and projectId filters | 组合过滤条件（search + status + projectId） |
| 12 | should not add search filter when search is undefined | 搜索为undefined不添加OR过滤 |
| 13 | should not add projectId filter when projectId is undefined | projectId为undefined不添加过滤 |
| 14 | should map result items correctly | 结果映射完整性（所有字段snake_case转换） |
| 15 | should handle null scheduledPublishAt in mapping | scheduledPublishAt为null映射 |
| 16 | should handle null createdBy in mapping | createdBy为null映射 |
| 17 | should handle missing project/company/creator gracefully | 缺少project/company/creator容错（默认空字符串） |
| 18 | should handle project without company | project存在但company缺失 |
| 19 | should return empty list when no articles found | 空结果返回 |
| 20 | should run findMany and count in parallel | 并行执行验证（Promise.all） |
| 21 | should pass same where clause to findMany and count | where一致性验证 |
| 22 | should include project with company in findMany | include结构验证（project.company + creator） |
| 23 | should apply admin permission with other filters combined | admin权限+组合过滤 |
| 24 | should not add search filter when search is empty string | 空字符串搜索不添加OR过滤（falsy值） |
| 25 | should keep default status filter when status is empty string | 空字符串status保留默认的{ in: PUBLISH_STATUSES } |
| 26 | should not add projectId filter when projectId is 0 | projectId为0（falsy值）不添加过滤 |
| 27 | should apply view role with combined search and projectId | view角色+搜索+projectId组合过滤 |
| 28 | should map multiple articles with different statuses correctly | 多文章不同状态映射验证 |

### updateSchedule() 方法 — 19 个测试

| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | should update scheduledPublishAt successfully | 正常更新发布计划时间（包含findFirst参数和update参数验证） |
| 2 | should set scheduledPublishAt to null when null is passed | 设置计划时间为null（清除计划） |
| 3 | should throw error when article not found | 文章不存在抛错（"文章不存在"） |
| 4 | should throw error when article status is not publishing | 非publishing状态抛错（draft状态） |
| 5 | should throw error when article status is published | published状态不可编辑 |
| 6 | should throw error when article status is publish_failed | publish_failed状态不可编辑 |
| 7 | should map updated article correctly | 更新结果映射完整性（所有字段验证） |
| 8 | should handle missing project in updated result | 更新结果缺少project容错 |
| 9 | should handle project without company in updated result | 更新结果缺少company容错 |
| 10 | should not call update when article not found | 文章不存在时不调用update |
| 11 | should not call update when status is not publishing | 非publishing状态不调用update |
| 12 | should allow admin user with access to update | admin用户在operators列表中可更新 |
| 13 | should reject admin user without access | 水平越权防护（admin不在operators列表中拒绝） |
| 14 | should allow sysadmin to update any article regardless of operators | sysadmin绕过operators检查 |
| 15 | should treat empty string scheduledPublishAt as null | 空字符串scheduledPublishAt转为null |
| 16 | should reject non-sysadmin when article has null project | 文章project为null时非sysadmin用户被拒绝 |
| 17 | should allow update when role is undefined and userId is undefined | 无角色和用户ID时跳过权限检查 |
| 18 | should allow admin without userId to bypass permission check (current behavior) | admin角色但无userId时跳过权限检查（当前行为） |
| 19 | should reject view role user who is not in operators | view角色用户不在operators列表中被拒绝 |

## 本次新增测试用例（10个）

### list() 新增 5 个

| # | 测试用例 | 新增原因 |
|---|---------|------|
| 24 | should not add search filter when search is empty string | 边界值：空字符串是falsy，不应添加OR过滤 |
| 25 | should keep default status filter when status is empty string | 边界值：空字符串status不覆盖默认{ in: PUBLISH_STATUSES } |
| 26 | should not add projectId filter when projectId is 0 | 边界值：projectId=0是falsy，不应添加过滤 |
| 27 | should apply view role with combined search and projectId | 组合条件：view角色+搜索+projectId联合过滤 |
| 28 | should map multiple articles with different statuses correctly | 多结果映射：验证不同状态文章的批量映射 |

### updateSchedule() 新增 5 个

| # | 测试用例 | 新增原因 |
|---|---------|------|
| 15 | should treat empty string scheduledPublishAt as null | 边界值：空字符串应被视为null |
| 16 | should reject non-sysadmin when article has null project | 安全：project为null时的权限处理 |
| 17 | should allow update when role is undefined and userId is undefined | 边界条件：无认证信息时的行为 |
| 18 | should allow admin without userId to bypass permission check | 行为验证：admin角色+无userId的权限检查跳过 |
| 19 | should reject view role user who is not in operators | 权限：view角色用户在update中的权限检查 |

## 关键测试场景

1. **权限过滤（list）**：验证 admin（operators）和 view（viewers）两种角色的数据隔离
2. **权限检查（updateSchedule）**：admin需在operators中，sysadmin绕过检查，越权防护
3. **组合过滤**：search + status + projectId + 权限 的组合条件
4. **边界条件**：null 值、空字符串、0值、undefined 的处理
5. **错误处理**：文章不存在、状态不允许编辑（draft/published/publish_failed）
6. **数据映射**：所有字段 snake_case 转换和空值默认值
7. **并行执行**：findMany和count使用Promise.all并行执行
8. **安全边界**：project为null时的权限拒绝、view角色在update中的权限验证

## 发现的潜在问题

1. **admin角色+无userId可绕过权限**：当role='admin'但userId为undefined时，权限检查被跳过。建议控制器层确保userId始终传入。

## 执行时间
5.182s

## 执行日期
2026-05-24

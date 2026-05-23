# TDD 执行报告：publishing-schedule.service.impl.ts

## 源文件
`apis/service/impl/publishing-schedule.service.impl.ts`

## 测试文件
`tests/apis/publishing-schedule.service.test.ts`

## 测试概要

| 指标 | 值 |
|------|-----|
| 测试总数 | 34 |
| 通过 | 34 |
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

### list() 方法 — 23 个测试

| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | should return paginated list with default status filter | 默认状态过滤（publishing/published/publish_failed） |
| 2 | should calculate skip correctly for page 2 with pageSize 5 | 第2页分页计算 |
| 3 | should calculate skip correctly for page 3 with pageSize 20 | 第3页分页计算 |
| 4 | should filter by search on title and keywords | 搜索过滤（标题+关键词） |
| 5 | should filter by status (override default status filter) | 状态过滤覆盖默认值 |
| 6 | should filter by projectId | 项目ID过滤 |
| 7 | should apply admin role permission filter | admin角色权限过滤 |
| 8 | should apply view role permission filter | view角色权限过滤 |
| 9 | should not apply permission filter when role is not admin or view | 非admin/view角色无权限过滤 |
| 10 | should not apply permission filter when userId is missing | 缺少userId时无权限过滤 |
| 11 | should combine search, status, and projectId filters | 组合过滤条件 |
| 12 | should not add search filter when search is undefined | 搜索为空不添加过滤 |
| 13 | should not add projectId filter when projectId is undefined | projectId为空不添加过滤 |
| 14 | should map result items correctly | 结果映射完整性 |
| 15 | should handle null scheduledPublishAt in mapping | scheduledPublishAt为null映射 |
| 16 | should handle null createdBy in mapping | createdBy为null映射 |
| 17 | should handle missing project/company/creator gracefully | 缺少project/company/creator容错 |
| 18 | should handle project without company | project存在但company缺失 |
| 19 | should return empty list when no articles found | 空结果返回 |
| 20 | should run findMany and count in parallel | 并行执行验证 |
| 21 | should pass same where clause to findMany and count | where一致性验证 |
| 22 | should include project with company in findMany | include结构验证 |
| 23 | should apply admin permission with other filters combined | admin权限+组合过滤 |

### updateSchedule() 方法 — 11 个测试

| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | should update scheduledPublishAt successfully | 正常更新发布计划时间 |
| 2 | should set scheduledPublishAt to null when null is passed | 设置计划时间为null |
| 3 | should throw error when article not found | 文章不存在抛错 |
| 4 | should throw error when article status is not publishing | 非publishing状态抛错（draft） |
| 5 | should throw error when article status is published | published状态抛错 |
| 6 | should throw error when article status is publish_failed | publish_failed状态抛错 |
| 7 | should map updated article correctly | 更新结果映射完整性 |
| 8 | should handle missing project in updated result | 更新结果缺少project容错 |
| 9 | should handle project without company in updated result | 更新结果缺少company容错 |
| 10 | should not call update when article not found | 文章不存在时不调用update |
| 11 | should not call update when status is not publishing | 非publishing状态不调用update |

## 关键测试场景

1. **权限过滤**：验证 admin（operators）和 view（viewers）两种角色的数据隔离
2. **组合过滤**：search + status + projectId + 权限 的组合条件
3. **边界条件**：null 值处理、空结果、缺失关联数据
4. **错误处理**：文章不存在、状态不允许编辑
5. **数据映射**：所有字段 snake_case 转换和空值默认值

## 执行时间
8.299s

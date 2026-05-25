# TDD 执行报告 — knowledge-base.controller.ts 第二轮

## 文件信息
- **源文件**: `apis/controller/knowledge-base.controller.ts`
- **测试文件**: `tests/apis/knowledge-base.controller.test.ts`
- **执行时间**: 2026-05-25（第七轮补全 — Service 层全覆盖 + 边界场景增强）
- **历史执行**: 2026-05-23（初始48个）、2026-05-24（第二轮88个）、2026-05-24（第三轮93个）、2026-05-24（第四轮103个）、2026-05-24（第五轮113个）、2026-05-25（第六轮130个）

## 测试结果

| 指标 | 结果 |
|------|------|
| 测试用例总数 | 165 |
| 通过 | 165 |
| 失败 | 0 |
| 跳过 | 0 |
| 测试套件 | 1 passed |

## 覆盖率

| 指标 | 覆盖率 |
|------|--------|
| 语句覆盖率 (Statements) | Controller **100%** / Service **100%** |
| 分支覆盖率 (Branches) | Controller **100%** / Service **99.12%** |
| 函数覆盖率 (Functions) | **100%** |
| 行覆盖率 (Lines) | **100%** |

### Service 唯一未覆盖分支
- Line 169: `request.project_id ?? null` 的 null 回退分支。当 `scope='project'` 且 `project_id=undefined` 时，line 146 已抛出 BusinessError（`项目私有知识库必须选择项目`），因此此 null 回退为**不可达代码（dead code）**，实际覆盖率已达实用极限。

## 本轮新增测试（35 个）

### Service 层边界补全 (35 个测试)

1. **mapKnowledgeBase 处理 _count 为 null** — 覆盖 service lines 32-36 的 null 回退
2. **mapKnowledgeBase 处理 _count 字段缺失** — 覆盖 _count?. 子字段全部缺失
3. **mapKnowledgeBase 处理 creator 为 null** — 覆盖 creator?.cnName 的 null 回退
4. **get: project 知识库 projectId 为 null** — 覆盖 service line 125 `!item.projectId` 分支
5. **create: platform scope 清除 company_id 和 project_id** — 覆盖 service line 168
6. **create: company scope 时 project_id 被忽略** — 覆盖 service line 169 非 project 分支
7. **update: 无 scope 变更直接设置 company_id 和 project_id** — 覆盖 service lines 239-240
8. **update: 无 scope 变更仅设置 project_id** — 覆盖 service line 240 单独赋值
9. **list: sysadmin 角色不做权限过滤** — 验证 where.AND 为 undefined
10. **list: 多参数组合查询 search + scope + status** — 覆盖 where 多条件组合
11. **get: sysadmin 获取 project 知识库无权限检查** — 验证 sysadmin 绕过权限校验
12. **create: description 为 undefined 时转为 null** — 覆盖 service line 174 `|| null` 分支
13. **update: name 为空字符串返回 400** — 直接函数测试
14. **update: name 为非字符串类型返回 400** — 直接函数测试
15. **validateInteger: undefined 值返回 undefined** — 覆盖 line 12
16. **validateInteger: null 值返回 undefined** — 覆盖 line 12 null 分支
17. **create: name 为数字返回 400** — 覆盖 controller line 68 typeof 检查
18. **update: status 为 number 类型被忽略** — 覆盖 controller line 131 typeof boolean 检查
19. **update: description=null 清除描述** — 覆盖 service line 216 `|| null`
20. **update: 仅更新 name** — 覆盖 service line 215 name 赋值，其余字段 undefined
21. **create: service 抛出 NotFoundError 返回 404** — AppError 统一处理
22. **delete: service 抛出 ForbiddenError 返回 403** — AppError 统一处理
23. **create: name 为空字符串返回 400** — 直接函数测试
24. **list: page 为非数字字符串默认为 1** — 覆盖 controller line 21 parseInt 回退
25. **list: pageSize 为非数字字符串默认为 10** — 覆盖 controller line 22 parseInt 回退
26. **update: company_id 为负数被 validateInteger 拒绝** — 直接函数测试
27. **update: project_id 为浮点数被 validateInteger 拒绝** — 直接函数测试
28. **delete: service 抛出 BusinessError 返回 400** — AppError 统一处理
29. **delete: 无 message Error 返回 500** — 兜底错误处理
30. **create: service 抛出 ForbiddenError 返回 403** — AppError 统一处理
31. **update: service 抛出 BusinessError 返回 400** — AppError 统一处理
32. **update: service 抛出 ForbiddenError 返回 403** — AppError 统一处理
33. **update: description 为空字符串时转为 null** — 覆盖 service line 216 falsy 分支
34. **update: project_id 为正整数正确传递** — 覆盖 validateInteger 返回正整数路径
35. **create: project_id 为0被 validateInteger 拒绝** — 覆盖 validateInteger line 13 value < 1

### 覆盖率变化

| 指标 | 第六轮 | 第七轮 | 变化 |
|------|--------|--------|------|
| Controller 语句覆盖率 | 100% | **100%** | — |
| Service 语句覆盖率 | 98.4% | **100%** | +1.6% |
| Service 分支覆盖率 | 92.98% | **99.12%** | +6.14% |
| 函数覆盖率 | 100% | **100%** | — |
| 行覆盖率 | 100% | **100%** | — |
| 测试数量 | 130 | **165** | +35 |

## 测试维度分布

| 维度 | 测试数 |
|------|--------|
| Auth & Role Guards | 6 |
| GET /api/knowledge-bases (list) | 19 |
| GET /api/knowledge-bases/:id (get) | 10 |
| POST /api/knowledge-bases (create) | 18 |
| PUT /api/knowledge-bases/:id (update) | 19 |
| DELETE /api/knowledge-bases/:id (delete) | 9 |
| 边界安全测试 | 16 |
| Controller !user 防御性分支 | 5 |
| Controller 防御性验证（绕过 Zod） | 14 |
| Service 未覆盖分支补全 | 13 |
| Service 层边界补全 | 35 |
| getAccessibleBaseIds | 3 |
| **总计** | **165** |

## 结论

测试全部通过（165/165）。Controller 四维覆盖率保持 **100%**，Service 语句/函数/行覆盖率均达 **100%**，分支覆盖率达 **99.12%**（唯一未覆盖为不可达代码）。本轮新增 35 个测试全面覆盖了 mapKnowledgeBase null 回退、validateInteger 边界值、AppError 统一处理、scope 映射边界等场景。

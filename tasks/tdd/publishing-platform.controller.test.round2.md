# publishing-platform.controller.test.md — TDD 执行报告（含 Round 2）

## 测试文件
`tests/apis/publishing-platform.controller.test.ts`

## 被测文件
`apis/controller/publishing-platform.controller.ts`

## 测试结果
- **测试数量**: 100 个（Round 1: 55 + Round 2: 45）
- **通过**: 100 个
- **失败**: 0 个
- **执行时间**: ~10s

## 覆盖率

| 文件 | Statements | Branch | Functions | Lines |
|------|-----------|--------|-----------|-------|
| publishing-platform.controller.ts | **100%** | **100%** | **100%** | **100%** |

## Round 2 新增测试用例清单（45 个）

### Token 异常 — 6 个测试
1. 过期 JWT token 被 sync 端点拒绝（401）
2. 过期 JWT token 被 list 端点拒绝（401）
3. 畸形 JWT token 被 sync 端点拒绝（401）
4. 畸形 JWT token 被 list 端点拒绝（401）
5. 空 Authorization header 返回 401
6. Bearer 后无 token 返回 401

### sync 审计日志完整性 — 5 个测试
7. 日志记录 operator userId
8. 日志记录 operator ip
9. 成功日志包含 count 和 operator（userId, username）
10. 非 Error 对象抛出时日志使用 String(err) 序列化
11. Error 对象抛出时日志使用 err.message

### sync 异常类型多样性 — 6 个测试
12. TypeError 抛出时返回 500
13. RangeError 抛出时返回 500
14. null 抛出时返回 500
15. undefined 抛出时返回 500
16. number 抛出时返回 500
17. 错误消息含'请先配置'子串返回 400（非精确匹配）

### sync 响应结构验证 — 2 个测试
18. 成功响应精确结构验证（code=0, message, data.count）
19. 超大 count 值（999999）正常处理

### list 响应结构深度验证 — 5 个测试
20. listAll 响应包含所有实体字段（id, rm_resource_id, name, taxonomy, price, remark, include_rate, publish_rate）
21. remark=null 时正确返回 null
22. 小数 price（0.01）正确返回
23. 零值 rate（include_rate=0, publish_rate=0, price=0）正确返回
24. 分页响应完整结构验证（list, total, page, pageSize）

### list 特殊字符与搜索测试 — 6 个测试
25. Unicode 字符搜索
26. SQL 注入模式安全传递（`' OR 1=1--`）
27. XSS 模式安全传递（`<script>alert(1)</script>`）
28. 特殊字符 taxonomy 过滤（含 `/` 和 `&`）
29. URL 编码搜索参数（`%E6%96%B0%E6%B5%AA` → `新浪`）
30. 100 个 Unicode 字符的最大长度搜索

### list 排序组合测试 — 6 个测试
31. 仅 sortBy 无 sortOrder 传递 undefined
32. 仅 sortOrder 无 sortBy 传递 undefined
33. sortBy=include_rate 含下划线通过
34. sortBy=publish_rate 含下划线通过
35. sortBy 大写变体（Name）返回 400
36. sortOrder 大写变体（ASC）返回 400

### list 异常类型多样性 — 4 个测试
37. TypeError 从 listAll 抛出返回 500
38. null 从 listAll 抛出返回 500
39. undefined 从分页 list 抛出返回 500
40. number 从分页 list 抛出返回 500

### list 混合参数组合测试 — 2 个测试
41. admin token 分页列表访问
42. 不同 taxonomy 多平台返回验证

### list 验证顺序测试 — 3 个测试
43. search 长度校验优先于 sortBy 校验
44. sortBy 无效时不调用 service
45. sortOrder 无效时不调用 service

## Round 1 原有测试用例（55 个）

### POST /api/publishing-platforms/sync — 12 个测试
1. 无 token 返回 401
2. admin 角色返回 403
3. view 角色返回 403
4. 凭证未配置返回 400
5. 同步成功返回 count（42）
6. 一般错误返回 500 + 默认消息
7. 错误无消息返回 500 + 默认消息
8. 非 Error 对象返回 500 + 默认消息
9. count=0 正常成功
10. 审计日志记录同步开始和成功
11. 错误时记录日志
12. 配置错误时记录日志

### GET /api/publishing-platforms — 43 个测试
13-55. 覆盖认证、角色、分页、搜索、排序、错误处理等

## 覆盖的分支路径

### syncPublishingPlatforms
- ✅ 无认证 → 401
- ✅ 过期 token → 401
- ✅ 畸形 token → 401
- ✅ 非 sysadmin 角色 → 403（admin/view）
- ✅ err.message.includes('请先配置') → 400 + err.message（含子串匹配）
- ✅ 正常同步 → 200 + count + 成功消息
- ✅ 一般 Error（不含'请先配置'）→ 500
- ✅ TypeError / RangeError → 500
- ✅ null / undefined / number / string 抛出 → 500
- ✅ 审计日志完整性（userId, username, ip, count, err）

### listPublishingPlatforms
- ✅ 无认证 → 401
- ✅ 过期/畸形 token → 401
- ✅ view 角色 → 403
- ✅ 无分页参数 → listAll（deprecated）
- ✅ 有 page/search/taxonomy → paginated list
- ✅ 参数校验：search 长度、sortBy 白名单、sortOrder 白名单
- ✅ 边界值：page/pageSize 负数/零/小数/超大值
- ✅ 特殊字符：Unicode、SQL 注入、XSS、URL 编码
- ✅ 错误处理：TypeError/null/undefined/number 抛出
- ✅ 验证顺序：search > sortBy > service 调用
- ✅ 响应结构：listAll 完整字段、分页完整结构

## Mock 策略
- 使用 `jest.mock` 模拟 `PublishingPlatformServiceImpl` 和 `SystemConfigServiceImpl`
- Mock 方法：`syncFromSystemConfig`、`syncFromRm`、`listAll`、`list`
- 通过 `jest.clearAllMocks()` 保证测试隔离
- Mock `logger.util` 验证审计日志完整性
- Mock `db.util`（getPrisma/closePrisma）避免数据库连接
- RATE_LIMIT_MAX 设为 500 避免测试触发限流

## 边界值覆盖总结

| 参数 | 边界值 | 预期行为 | 测试状态 |
|------|--------|----------|---------|
| page | NaN/负数/0/小数/超大值 | 默认为 1 或原值 | ✅ |
| pageSize | NaN/负数/0/小数/1/100/101+ | 默认 10 或截断至 100 | ✅ |
| search | 空/Unicode/100字符/101字符/SQL/XSS | 通过/通过/400/安全传递 | ✅ |
| taxonomy | 特殊字符/URL编码 | 正确传递 | ✅ |
| sortBy | 合法5种/大写/非法 | 200/400/400 | ✅ |
| sortOrder | asc/desc/大写/非法 | 200/400/400 | ✅ |
| sync count | 0/42/123/999999 | 200 + 正确消息 | ✅ |
| token | 有效/过期/畸形/空 | 200/401/401/401 | ✅ |
| 异常类型 | Error/TypeError/RangeError/null/undefined/number/string/object | 正确处理 | ✅ |

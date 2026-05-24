# publishing-platform.controller.test.md — TDD 执行报告

## 测试文件
`tests/apis/publishing-platform.controller.test.ts`

## 被测文件
`apis/controller/publishing-platform.controller.ts`

## 测试结果
- **测试数量**: 52 个
- **通过**: 52 个
- **失败**: 0 个
- **执行时间**: ~16.6s

## 覆盖率

| 文件 | Statements | Branch | Functions | Lines |
|------|-----------|--------|-----------|-------|
| publishing-platform.controller.ts | **100%** | **100%** | **100%** | **100%** |

## 测试用例清单

### POST /api/publishing-platforms/sync (syncPublishingPlatforms) — 9 个测试
1. 无 token 返回 401
2. admin 角色返回 403
3. view 角色返回 403
4. 凭证未配置返回 400（请先配置软盟账号和密码）
5. 同步成功返回 count（42 个平台）
6. 同步服务抛出一般错误返回 500 + 默认消息
7. 同步错误无消息时返回 500 + 默认消息
8. 非 Error 对象抛出时返回 500 + 默认消息
9. 同步返回 count=0 时正常成功

### GET /api/publishing-platforms (listPublishingPlatforms) — 43 个测试
10. 无 token 返回 401
11. view 角色返回 403
12. 无分页参数时返回全量列表（deprecated backward-compat）
13. admin 角色可获取列表
14. 有 page 参数时返回分页列表
15. search 参数传递到 list 服务
16. taxonomy 参数传递到 list 服务
17. sortBy 和 sortOrder 参数传递到 list 服务
18. 所有查询参数同时传递
19. 仅 search 时使用默认分页参数（page=1, pageSize=10）
20. 仅 taxonomy 时触发分页查询
21. listAll 服务错误返回 500
22. listAll 错误无消息时返回默认消息 500
23. 分页 list 服务错误返回 500
24. 分页 list 错误无消息时返回默认消息 500
25. 仅提供 pageSize 触发分页路径
26. 仅提供 page 触发分页路径
27. listAll 返回空数组
28. 分页返回空结果
29. listAll 非 Error 对象抛出返回默认消息
30. 多条记录从 listAll 返回
31. 非数字 page/pageSize 参数使用默认值
32. pageSize 超过 100 时截断为 MAX_PAGE_SIZE
33. search 超过 100 字符返回 400
34. search 恰好 100 字符通过校验
35. 无效 sortBy 返回 400
36. 无效 sortOrder 返回 400
37. 所有合法 sort 字段逐一通过（name/taxonomy/price/include_rate/publish_rate）
38. asc 和 desc 排序方向都通过
39. 负数 page 默认为 1
40. pageSize=0 默认为 10
41. **[新增]** 负数 pageSize 默认为 10
42. **[新增]** page=0 默认为 1
43. **[新增]** 小数 page 通过 parseInt 截断（2.7 → 2）
44. **[新增]** 小数 pageSize 通过 parseInt 截断（5.9 → 5）
45. **[新增]** pageSize=100 恰好等于 MAX_PAGE_SIZE 通过
46. **[新增]** pageSize=1 最小有效值通过
47. **[新增]** 空字符串 search 不触发长度校验错误
48. **[新增]** 分页 list 非 Error 对象抛出返回 500 + 默认消息
49. **[新增]** 分页列表返回多条记录验证
50. **[新增]** search + taxonomy 无 page/pageSize 时使用默认分页
51. **[新增]** search + 无效 sortBy 即使无 page 也返回 400
52. **[新增]** taxonomy + 无效 sortOrder 即使无 page 也返回 400

## 覆盖的分支路径

### syncPublishingPlatforms
- ✅ 无认证 → 401
- ✅ 非sysadmin角色 → 403（admin/view）
- ✅ err.message.includes('请先配置') → 400 + err.message
- ✅ 正常同步 → 200 + count + 成功消息
- ✅ 一般 Error（不含'请先配置'）→ 500 + '同步发布平台失败'
- ✅ Error 无 message → 500 + '同步发布平台失败'
- ✅ 非 Error 对象 → 500 + '同步发布平台失败'
- ✅ count=0 → 200 + '同步成功，共 0 个发布平台'

### listPublishingPlatforms
- ✅ 无认证 → 401
- ✅ view角色 → 403
- ✅ 无分页参数 + 无search + 无taxonomy → listAll（deprecated）
- ✅ 有page参数 → paginated list
- ✅ 有search → paginated list（带search参数）
- ✅ 有taxonomy → paginated list（带taxonomy参数）
- ✅ sortBy + sortOrder → 传递排序参数
- ✅ 全参数组合 → 全部传递
- ✅ 仅 pageSize → 分页路径
- ✅ 仅 page → 分页路径
- ✅ search 超长 → 400
- ✅ search 边界（100字符）→ 通过
- ✅ search 空字符串 → 通过
- ✅ 无效 sortBy → 400
- ✅ 无效 sortOrder → 400
- ✅ 所有合法 sort 字段逐一验证
- ✅ asc/desc 排序方向验证
- ✅ page/pageSize 边界值（负数、零、小数、超大值）
- ✅ listAll返回空数组 → 200 + []
- ✅ listAll返回多条 → 200 + 多条数据
- ✅ listAll错误 → 500
- ✅ listAll错误（无message）→ 500 + 默认消息
- ✅ listAll错误（非Error对象）→ 500 + 默认消息
- ✅ list错误 → 500
- ✅ list错误（无message）→ 500 + 默认消息
- ✅ list错误（非Error对象）→ 500 + 默认消息
- ✅ list返回空结果 → 200 + 空列表
- ✅ list返回多条 → 200 + 多条数据
- ✅ search+taxonomy无分页参数 → 默认 page=1, pageSize=10

## Mock 策略
- 使用 `jest.mock` 模拟 `PublishingPlatformServiceImpl` 和 `SystemConfigServiceImpl`
- Mock 方法：`syncFromSystemConfig`、`syncFromRm`、`listAll`、`list`
- 通过 `jest.clearAllMocks()` 保证测试隔离
- Mock `db.util`（getPrisma/closePrisma）避免数据库连接

## 边界值覆盖总结

| 参数 | 边界值 | 预期行为 | 测试状态 |
|------|--------|----------|---------|
| page | NaN/负数/0/小数 | 默认为 1 | ✅ |
| pageSize | NaN/负数/0/小数/1/100/101+ | 默认 10 或截断至 100 | ✅ |
| search | 空/100字符/101字符 | 通过/通过/400 | ✅ |
| sortBy | 合法5种/非法 | 200/400 | ✅ |
| sortOrder | asc/desc/非法 | 200/400 | ✅ |
| sync count | 0/42 | 200 + 正确消息 | ✅ |

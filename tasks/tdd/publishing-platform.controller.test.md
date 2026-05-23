# publishing-platform.controller.test.md — TDD 执行报告

## 测试文件
`tests/apis/publishing-platform.controller.test.ts`

## 被测文件
`apis/controller/publishing-platform.controller.ts`

## 测试结果
- **测试数量**: 37 个
- **通过**: 37 个
- **失败**: 0 个
- **执行时间**: ~12.5s

## 覆盖率

| 文件 | Statements | Branch | Functions | Lines |
|------|-----------|--------|-----------|-------|
| publishing-platform.controller.ts | **100%** | **100%** | **100%** | **100%** |

## 测试用例清单

### POST /api/publishing-platforms/sync (syncPublishingPlatforms) — 15 个测试
1. 无 token 返回 401
2. admin 角色返回 403（仅 sysadmin 可同步）
3. view 角色返回 403
4. ruanmeng_username 未配置返回 400
5. ruanmeng_password 未配置返回 400
6. 用户名和密码为空字符串返回 400
7. 配置列表为空返回 400
8. 同步成功返回 count（42 个平台）
9. 同步服务抛出错误返回 500
10. 同步错误无消息时返回默认消息 500
11. 配置服务抛出错误返回 500
12. 非 Error 对象抛出时返回默认消息 500
13. 同步返回 count=0 时正常成功
14. 配置中混入无关键值仍正常工作
15. 空格用户名原样传递给服务层

### GET /api/publishing-platforms (listPublishingPlatforms) — 22 个测试
16. 无 token 返回 401
17. view 角色返回 403
18. 无分页参数时返回全量列表
19. admin 角色可获取列表
20. 有 page 参数时返回分页列表
21. search 参数传递到 list 服务
22. taxonomy 参数传递到 list 服务
23. sortBy 和 sortOrder 参数传递到 list 服务
24. 所有查询参数同时传递
25. 仅 search 时使用默认分页参数
26. 仅 taxonomy 时触发分页查询
27. listAll 服务错误返回 500
28. listAll 错误无消息时返回默认消息 500
29. 分页 list 服务错误返回 500
30. 分页 list 错误无消息时返回默认消息 500
31. 仅提供 pageSize 触发分页路径
32. 仅提供 page 触发分页路径
33. listAll 返回空数组
34. 分页返回空结果
35. listAll 非 Error 对象抛出返回默认消息
36. 多条记录从 listAll 返回
37. 非数字 page/pageSize 参数使用默认值

## 覆盖的分支路径

### syncPublishingPlatforms
- ✅ 无认证 → 401
- ✅ 非sysadmin角色 → 403（admin/view）
- ✅ username缺失 → 400
- ✅ password缺失 → 400
- ✅ username和password都为空 → 400
- ✅ configs为空列表 → 400
- ✅ 正常同步 → 200 + count
- ✅ syncFromRm错误（有message）→ 500
- ✅ syncFromRm错误（无message）→ 500 + 默认消息
- ✅ syncFromRm错误（非Error对象）→ 500 + 默认消息
- ✅ getAll错误 → 500
- ✅ 同步 count=0 → 200
- ✅ 混入无关配置项 → 正常提取 credentials
- ✅ 空格 username → 原样传递给 syncFromRm

### listPublishingPlatforms
- ✅ 无认证 → 401
- ✅ view角色 → 403
- ✅ 无分页参数 + 无search + 无taxonomy → listAll
- ✅ 有page参数 → paginated list
- ✅ 有search → paginated list（带search参数）
- ✅ 有taxonomy → paginated list（带taxonomy参数）
- ✅ sortBy + sortOrder → 传递排序参数
- ✅ 全参数组合 → 全部传递
- ✅ 仅 pageSize → 分页路径
- ✅ 仅 page → 分页路径
- ✅ listAll返回空数组 → 200 + []
- ✅ listAll返回多条 → 200 + 多条数据
- ✅ listAll错误 → 500
- ✅ listAll错误（无message）→ 500 + 默认消息
- ✅ listAll错误（非Error对象）→ 500 + 默认消息
- ✅ list错误 → 500
- ✅ list错误（无message）→ 500 + 默认消息
- ✅ list返回空结果 → 200 + 空列表
- ✅ 非数字 page/pageSize → 默认 page=1, pageSize=10

## Mock 策略
- 使用 `jest.mock` 模拟 `PublishingPlatformServiceImpl` 和 `SystemConfigServiceImpl`
- Mock 方法：`syncFromRm`、`listAll`、`list`、`getAll`
- 通过 `jest.clearAllMocks()` 保证测试隔离

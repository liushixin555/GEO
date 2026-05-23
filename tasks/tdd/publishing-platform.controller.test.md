# publishing-platform.controller.test.md — TDD 执行报告

## 测试文件
`tests/apis/publishing-platform.controller.test.ts`

## 被测文件
`apis/controller/publishing-platform.controller.ts`

## 测试结果
- **测试数量**: 26 个
- **通过**: 26 个
- **失败**: 0 个
- **执行时间**: ~8.6s

## 覆盖率

| 文件 | Statements | Branch | Functions | Lines |
|------|-----------|--------|-----------|-------|
| publishing-platform.controller.ts | **100%** | **100%** | **100%** | **100%** |

## 测试用例清单

### POST /api/publishing-platforms/sync (syncPublishingPlatforms) — 11 个测试
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

### GET /api/publishing-platforms (listPublishingPlatforms) — 15 个测试
12. 无 token 返回 401
13. view 角色返回 403
14. 无分页参数时返回全量列表
15. admin 角色可获取列表
16. 有 page 参数时返回分页列表
17. search 参数传递到 list 服务
18. taxonomy 参数传递到 list 服务
19. sortBy 和 sortOrder 参数传递到 list 服务
20. 所有查询参数同时传递
21. 仅 search 时使用默认分页参数
22. 仅 taxonomy 时触发分页查询
23. listAll 服务错误返回 500
24. listAll 错误无消息时返回默认消息 500
25. 分页 list 服务错误返回 500
26. 分页 list 错误无消息时返回默认消息 500

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
- ✅ getAll错误 → 500

### listPublishingPlatforms
- ✅ 无认证 → 401
- ✅ view角色 → 403
- ✅ 无分页参数 + 无search + 无taxonomy → listAll
- ✅ 有page参数 → paginated list
- ✅ 有search → paginated list（带search参数）
- ✅ 有taxonomy → paginated list（带taxonomy参数）
- ✅ sortBy + sortOrder → 传递排序参数
- ✅ 全参数组合 → 全部传递
- ✅ listAll错误 → 500
- ✅ listAll错误（无message）→ 500 + 默认消息
- ✅ list错误 → 500
- ✅ list错误（无message）→ 500 + 默认消息

## Mock 策略
- 使用 `jest.mock` 模拟 `PublishingPlatformServiceImpl` 和 `SystemConfigServiceImpl`
- Mock 方法：`syncFromRm`、`listAll`、`list`、`getAll`
- 通过 `jest.clearAllMocks()` 保证测试隔离

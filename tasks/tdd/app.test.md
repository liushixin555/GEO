# TDD 执行报告 — apis/app.ts

**测试文件**: `tests/apis/app.test.ts`
**目标文件**: `apis/app.ts`
**执行日期**: 2026-05-24（第二次更新）

---

## 测试结果

| 指标 | 值 |
|------|------|
| 测试套件 | 1 passed |
| 测试用例 | 156 passed |
| 失败 | 0 |
| 执行时间 | ~10s |

## 覆盖率

| 指标 | 百分比 |
|------|--------|
| 语句覆盖率 (Statements) | 98% |
| 分支覆盖率 (Branches) | 71.42% |
| 函数覆盖率 (Functions) | 83.33% |
| 行覆盖率 (Lines) | 98.65% |

### 未覆盖行

- **第 91-92 行**: Swagger UI 路由注册（`config.swagger.enabled` 为 `false` 时跳过），条件分支 — 测试环境禁用 Swagger

### 覆盖率说明

- **分支覆盖率 71.42%**: app.ts 中仅 `if (config.swagger.enabled && process.env.NODE_ENV !== 'production')` 一个条件分支未被覆盖（测试环境 SWAGGER_ENABLED=false）
- **函数覆盖率 83.33%**: Swagger 条件分支内的两个回调函数未执行，其余全部覆盖

## 测试分类

### 1. 中间件链测试 (9 cases)

| 测试 | 说明 |
|------|------|
| block without User-Agent | 反爬虫中间件拦截无 UA 请求 |
| block short User-Agent | UA 长度 < 10 被拦截 |
| allow health check without anti-crawl | 健康检查绕过反爬虫 |
| 401 no token | 未提供 JWT |
| 401 expired token | 过期 JWT |
| 401 invalid token | 无效 JWT |
| deny view → sysadmin route | view 角色访问 sysadmin 路由 |
| deny view → admin route | view 角色访问 admin 路由 |
| admin pass role check | admin 角色通过角色检查 |

### 2. 健康检查 (1 case)

| 测试 | 说明 |
|------|------|
| GET /api/health | 返回 ok 状态 |

### 3. 公开路由 (2 cases)

| 测试 | 说明 |
|------|------|
| login missing username | 返回 400 |
| login missing password | 返回 400 |

### 4. 认证路由保护 (6 cases)

逐一验证 `verify`、`context`、`companies`、`projects`、`logout`、`selection` 在无 token 时返回 401。

### 5. 公司路由 — sysadmin only (5 cases)

验证 admin 角色对 5 个公司路由全部返回 403。

### 6. 用户路由 — sysadmin only (5 cases)

验证 admin 角色对 5 个用户路由全部返回 403。

### 7. 技能路由 — sysadmin + admin (5 cases)

验证 view 角色对 5 个技能路由全部返回 403。

### 8. LLM 模型路由 — sysadmin only (6 cases)

验证 admin 和 view 角色对 LLM 路由全部返回 403。

### 9. 系统配置路由 — sysadmin only (2 cases)

验证 admin 角色对 GET/PUT 系统配置全部返回 403。

### 10. 发布平台路由 (2 cases)

验证 admin 不能同步、view 不能查看。

### 11. 项目路由 — sysadmin + admin (5 cases)

验证 view 角色对 list/get/create/update/delete 被拒绝。

### 12. 文章路由 — sysadmin + admin (10 cases)

验证 view 角色对全部文章路由（list/get/create/update/delete/review/regenerate/content/submit-review/versions）被拒绝。

### 13. 知识路由 — sysadmin + admin (4 cases)

验证 view 角色对 keywords/portraits/images/documents 全部被拒绝。

### 14. 上传路由 — sysadmin + admin (2 cases)

验证 view 角色被拒绝。

### 15. 发布排期路由 (2 cases)

- view 角色可通过 GET 查看排期
- view 角色不可 PUT 修改排期

### 16. 知识库路由 — sysadmin + admin (5 cases)

验证 view 角色对 list/get/create/update/delete 被拒绝。

### 17. 知识条目路由 — sysadmin + admin (8 cases)

验证 view 角色对 keywords/portraits/images/documents/mine/expand 等全部被拒绝。

### 18. 知识清单路由 (1 case)

验证 view 角色被拒绝。

### 19. Todo 路由 — sysadmin + admin (11 cases) ✨ 新增

验证 view 角色对全部 11 个 Todo 路由被拒绝：
- GET /api/todos, /api/todos/object-options, /api/todos/assignee-candidates, /api/todos/:id
- POST /api/todos, /api/todos/:id/close, /api/todos/:id/reopen, /api/todos/:id/transfer, /api/todos/:id/reject
- PUT /api/todos/:id
- GET /api/todos/:id/logs

### 20. 知识库关键词额外路由 (6 cases) ✨ 新增

验证 view 角色对 keywords/:id, keywords/batch, mined-keywords 等路由被拒绝。

### 21. 知识库画像完整路由 (4 cases) ✨ 新增

验证 view 角色对 portraits CRUD 全部路由被拒绝。

### 22. 知识库图片完整路由 (4 cases) ✨ 新增

验证 view 角色对 images CRUD 全部路由被拒绝。

### 23. 知识库文档完整路由 (4 cases) ✨ 新增

验证 view 角色对 documents CRUD 全部路由被拒绝。

### 24. CORS 配置测试 (3 cases) ✨ 新增

| 测试 | 说明 |
|------|------|
| allow whitelisted origin | localhost:5173 通过 CORS |
| block non-whitelisted origin | evil.example.com 被阻止 |
| allow no origin | 服务端请求无 origin 允许通过 |

### 25. Helmet 安全头测试 (4 cases) ✨ 新增

| 测试 | 说明 |
|------|------|
| X-Content-Type-Options | 值为 nosniff |
| Referrer-Policy | 值为 strict-origin-when-cross-origin |
| Cross-Origin-Resource-Policy | 值为 cross-origin |
| X-DNS-Prefetch-Control | 头存在 |

### 26. JSON Body 解析测试 (2 cases) ✨ 新增

| 测试 | 说明 |
|------|------|
| parse JSON correctly | 正常 JSON 被正确解析 |
| reject oversized body | > 10mb 负载被全局错误处理器捕获返回 500 |

### 27. Trust Proxy 测试 (1 case) ✨ 新增

验证 `app.get('trust proxy')` 返回 1。

### 28. 静态文件中间件测试 (1 case) ✨ 新增

验证 `/uploads` 路径设置 Cross-Origin-Resource-Policy 头。

### 29. 全局错误处理器测试 (1 case) ✨ 新增

验证畸形 JSON 触发全局错误处理器返回 400 或 500。

### 30. Swagger 路由测试 (2 cases) ✨ 新增

验证 Swagger 禁用时不提供 UI 和 JSON 端点。

### 31. HTTP 方法限制测试 (2 cases) ✨ 新增

验证 DELETE /api/auth/login 和 PATCH /api/health 返回 404。

### 32. 未知路由 (2 cases)

验证 404 返回 JSON `{ code: 404, message: '接口不存在' }`。

### 33. Auth Companies Detail 路由 (1 case) ✨ 第二次新增

验证 `GET /api/auth/companies/:id` 在无 token 时返回 401。

### 34. CORS Preflight 预检测试 (4 cases) ✨ 第二次新增

| 测试 | 说明 |
|------|------|
| OPTIONS whitelisted origin | 预检请求返回 CORS 头 |
| allowed methods | 验证 GET/POST/PUT/DELETE |
| allowed headers | 验证 Content-Type/Authorization |
| OPTIONS non-whitelisted origin | 非 whitelist 来源被拒绝 |

### 35. Token 格式边界测试 (5 cases) ✨ 第二次新增

| 测试 | 说明 |
|------|------|
| empty Bearer token | 空 token 返回 401 |
| missing Bearer prefix | 无 Bearer 前缀返回 401 |
| Basic auth header | Basic 认证头返回 401 |
| wrong signature | 错误密钥签名返回 401 |
| partial payload | 部分 payload 通过验证（中间件仅验证签名） |

### 36. 正向角色检查测试 (8 cases) ✨ 第二次新增

验证 admin/sysadmin 角色通过对应路由的角色检查（不返回 403）。

### 37. 速率限制测试 (2 cases) ✨ 第二次新增

| 测试 | 说明 |
|------|------|
| rate limit headers | 受保护路由包含 RateLimit 头 |
| within limit | 多次请求不超限 |

### 38. Login 路由边界测试 (3 cases) ✨ 第二次新增

| 测试 | 说明 |
|------|------|
| empty username/password | 返回 400 |
| empty body | 返回 400 |
| valid credentials | 不返回 400 |

### 39. 404 HTTP 方法测试 (4 cases) ✨ 第二次新增

验证 POST/PUT/DELETE/GET 在不存在路由均返回 404。

### 40. 静态文件边界测试 (1 case) ✨ 第二次新增

验证 `/uploads/` 目录路径也设置 CORP 头。

### 41. Swagger 启用场景 (1 case) ✨ 第二次新增

验证测试环境 SWAGGER_ENABLED=false。

## 测试统计

### 第一次新增统计

| 类别 | 新增数量 |
|------|---------|
| Todo 路由权限 | 11 |
| 知识库完整 CRUD 路由 | 18 |
| 文章额外路由 | 7 |
| 项目额外路由 | 2 |
| 技能额外路由 | 1 |
| LLM 模型额外路由 | 2 |
| 知识库额外路由 | 2 |
| CORS 配置 | 3 |
| Helmet 安全头 | 4 |
| JSON Body 解析 | 2 |
| Trust Proxy | 1 |
| 静态文件 | 1 |
| 全局错误处理 | 1 |
| Swagger 路由 | 2 |
| HTTP 方法限制 | 2 |
| 未知路由增强 | 1 |
| **合计新增** | **60** |

### 第二次新增统计

| 类别 | 新增数量 |
|------|---------|
| Auth Companies Detail 路由 | 1 |
| CORS Preflight 预检 | 4 |
| Token 格式边界 | 5 |
| 正向角色检查 (admin/sysadmin) | 8 |
| 速率限制 | 2 |
| Login 路由边界 | 3 |
| 404 HTTP 方法 | 4 |
| 静态文件边界 | 1 |
| Swagger 启用场景 | 1 |
| **第二次合计新增** | **29** |

## 总结

- 从 67 → 127 → 156 个测试，两次共新增 89 个测试用例
- 第二次新增 29 个测试：CORS preflight、Token 格式边界、正向角色检查、速率限制、Login 边界、404 多方法
- 语句覆盖率 98%、行覆盖率 98.65%（保持）
- 分支覆盖率 71.42%（Swagger 条件分支未覆盖）
- 函数覆盖率 83.33%（Swagger 条件内回调未覆盖）
- 新增了 CORS、Helmet 安全头、JSON 解析、静态文件、错误处理等中间件层测试
- 补全了所有路由的权限测试覆盖，包括完全缺失的 Todo 路由
- 未覆盖的仅是 Swagger 条件分支（测试环境禁用）

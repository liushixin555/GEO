# TDD 执行报告 — apis/app.ts

**测试文件**: `tests/apis/app.test.ts`
**目标文件**: `apis/app.ts`
**执行日期**: 2026-05-24（第三次更新）

---

## 测试结果

| 指标 | 值 |
|------|------|
| 测试套件 | 1 passed |
| 测试用例 | 184 passed |
| 失败 | 0 |
| 执行时间 | ~12s |

## 覆盖率

| 指标 | 百分比 |
|------|--------|
| 语句覆盖率 (Statements) | 88.73% |
| 分支覆盖率 (Branches) | 61.53% |
| 函数覆盖率 (Functions) | 87.5% |
| 行覆盖率 (Lines) | 90% |

### 未覆盖行

- **第 83-106 行**: Swagger UI 路由注册（`config.swagger.enabled` 为 `false` 时跳过）— 测试环境禁用 Swagger
- **第 133-134 行**: 空行和注释行（被 Istanbul 计入但无法执行）

### 覆盖率说明

- **分支覆盖率 61.53%**: Swagger 条件分支 `if (config.swagger.enabled && process.env.NODE_ENV !== 'production')` 及 CORS 白名单回调中的 `callback(null, false)` 分支未完全覆盖
- **语句覆盖率 88.73%**: Swagger 设置块（swaggerJSDoc、swaggerUI.serve/setup）和部分路由注册行未执行
- **行覆盖率 90%**: 与语句覆盖率一致，主要缺口在 Swagger 条件块

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

验证 view 角色对全部文章路由被拒绝。

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

### 19. Todo 路由 — sysadmin + admin (11 cases)

验证 view 角色对全部 11 个 Todo 路由被拒绝。

### 20. 知识库关键词额外路由 (6 cases)

验证 view 角色对 keywords/:id, keywords/batch, mined-keywords 等路由被拒绝。

### 21. 知识库画像完整路由 (4 cases)

验证 view 角色对 portraits CRUD 全部路由被拒绝。

### 22. 知识库图片完整路由 (4 cases)

验证 view 角色对 images CRUD 全部路由被拒绝。

### 23. 知识库文档完整路由 (4 cases)

验证 view 角色对 documents CRUD 全部路由被拒绝。

### 24. CORS 配置测试 (3 cases)

验证白名单源、非白名单源、无 origin 请求。

### 25. Helmet 安全头测试 (4 cases)

验证 X-Content-Type-Options、Referrer-Policy、Cross-Origin-Resource-Policy、X-DNS-Prefetch-Control 头。

### 26. JSON Body 解析测试 (2 cases)

验证正常 JSON 解析和超大 body 拒绝。

### 27. Trust Proxy 测试 (1 case)

验证 `app.get('trust proxy')` 返回 1。

### 28. 静态文件中间件测试 (2 cases)

验证 `/uploads` 路径设置 CORP 头（含目录和不存在文件）。

### 29. 全局错误处理器测试 (1 case)

验证畸形 JSON 触发全局错误处理器。

### 30. Swagger 路由测试 (3 cases)

验证 Swagger 禁用时不提供 UI 和 JSON 端点，以及 SWAGGER_ENABLED 环境变量检查。

### 31. HTTP 方法限制测试 (2 cases)

验证 DELETE /api/auth/login 和 PATCH /api/health 返回 404。

### 32. 未知路由 (2 cases)

验证 404 返回 JSON `{ code: 404, message: '接口不存在' }`。

### 33. Auth Companies Detail 路由 (1 case)

验证 `GET /api/auth/companies/:id` 在无 token 时返回 401。

### 34. CORS Preflight 预检测试 (4 cases)

验证 OPTIONS 请求的 CORS 头、允许方法、允许头部和非白名单拒绝。

### 35. Token 格式边界测试 (5 cases)

验证空 Bearer token、缺少 Bearer 前缀、Basic auth、错误签名、部分 payload。

### 36. 正向角色检查测试 (8 cases)

验证 admin/sysadmin 角色通过对应路由的角色检查（不返回 403）。

### 37. 速率限制测试 (2 cases)

验证受保护路由包含 RateLimit 头和多次请求不超限。

### 38. Login 路由边界测试 (3 cases)

验证空用户名/密码、空 body、有效凭证。

### 39. 404 HTTP 方法测试 (4 cases)

验证 POST/PUT/DELETE/GET 在不存在路由均返回 404。

### 40. Swagger 启用场景 (1 case)

验证测试环境 SWAGGER_ENABLED=false。

---

### 41. 审计日志中间件测试 (10 cases) ✨ 第三次新增

| 测试 | 说明 |
|------|------|
| log [API] for 401 responses | 401 响应触发 console.warn |
| log [API] for 403 responses | 403 响应触发 console.warn |
| log [API] for 404 responses | 404 响应触发 console.warn |
| NOT log for 200 responses | 200 响应不触发 console.warn |
| include userId for authenticated requests | 认证请求日志包含 userId |
| log "anonymous" for unauthenticated | 未认证请求日志显示 anonymous |
| include timing info | 日志包含 "Xms" 格式耗时 |
| include request method | 日志包含 HTTP 方法 |
| include request URL | 日志包含请求路径 |
| include IP address | 日志包含客户端 IP |

### 42. Login Body 类型验证测试 (4 cases) ✨ 第三次新增

| 测试 | 说明 |
|------|------|
| username is not a string | 返回 400 + 用户名和密码格式不正确 |
| password is not a string | 返回 400 + 用户名和密码格式不正确 |
| username exceeds 100 chars | 返回 400 + 输入长度超出限制 |
| password exceeds 200 chars | 返回 400 + 输入长度超出限制 |

### 43. Auth Verify 正向测试 (2 cases) ✨ 第三次新增

| 测试 | 说明 |
|------|------|
| sysadmin token returns 200 + valid | 有效 sysadmin token 验证通过 |
| admin token returns 200 + valid | 有效 admin token 验证通过 |

### 44. CORS 边界测试 (2 cases) ✨ 第三次新增

| 测试 | 说明 |
|------|------|
| allow requests with no origin | 无 origin 请求正常通过 |
| Content-Type for JSON | JSON 响应包含 application/json |

### 45. 全局错误处理器深度测试 (2 cases) ✨ 第三次新增

| 测试 | 说明 |
|------|------|
| log unhandled errors with structured JSON | 未处理错误记录结构化日志 |
| consistent 500 error response format | 500 错误返回统一 `{ code: 500, message: '服务器内部错误' }` |

### 46. 健康检查隔离测试 (3 cases) ✨ 第三次新增

| 测试 | 说明 |
|------|------|
| health check without User-Agent | 不需要 UA |
| health check without auth | 不需要认证 |
| health check responds quickly | 响应时间 < 100ms |

### 47. Auth 路由方法覆盖 (3 cases) ✨ 第三次新增

| 测试 | 说明 |
|------|------|
| companies/:id admin pass auth | admin 通过认证 |
| PUT selection 401 | 无 token 返回 401 |
| GET companies/:id 401 | 无 token 返回 401 |

### 48. 中间件执行顺序测试 (2 cases) ✨ 第三次新增

| 测试 | 说明 |
|------|------|
| health check bypasses anti-crawl | 并发请求全部成功 |
| login route through anti-crawl | 无 UA 请求在 login 前被拦截 |

## 测试统计

### 第三次新增统计

| 类别 | 新增数量 |
|------|---------|
| 审计日志中间件 | 10 |
| Login Body 类型验证 | 4 |
| Auth Verify 正向测试 | 2 |
| CORS 边界测试 | 2 |
| 全局错误处理器深度 | 2 |
| 健康检查隔离 | 3 |
| Auth 路由方法覆盖 | 3 |
| 中间件执行顺序 | 2 |
| **第三次合计新增** | **28** |

### 历史统计

| 轮次 | 新增数量 | 累计总数 |
|------|---------|---------|
| 第一次 | 60 | 127 |
| 第二次 | 29 | 156 |
| 第三次 | 28 | 184 |

## 总结

- 从 156 → 184 个测试，第三次新增 28 个测试用例
- **核心新增**: 审计日志中间件（10 cases）— 覆盖了 app.ts 第 69-80 行此前完全未测试的代码
- **覆盖提升**: 语句 88.73%、行 90%、函数 87.5%
- **分支覆盖率 61.53%**: 主要因 Swagger 条件分支（enabled/disabled × production/development）无法在单环境测试中完全覆盖
- 新增了 Login Body 类型验证、Auth Verify 正向测试、全局错误处理器深度验证、中间件执行顺序等
- 未覆盖的仅是 Swagger 条件块（测试环境禁用）和少量路由注册行

# 权限系统完整规范

> **本文档为铁律级别，Claude 必须严格遵守所有权限规则，不得违反。**
> **铁律：view 角色只有被授权后查看每日检测报告的权限（每日检测功能待开发），除此之外 view 角色没有任何权限。**
> 最后更新：2026-05-24

---

## 一、角色定义

| 角色 | 英文标识 | 权限范围 |
|------|----------|----------|
| 系统管理员 | `sysadmin` | 全系统无限制访问，包括系统管理和公司管理 |
| 运营者 | `admin` | 管理被授权的项目 |
| 查看者 | `view` | 仅在被授权后查看每日检测报告（每日检测功能待开发），无其他任何权限 |

角色枚举定义位置：`prisma/schema.prisma` → `enum Role { sysadmin, admin, view }`
TypeScript 类型定义位置：`apis/entity/user.entity.ts` → `type UserRole = 'sysadmin' | 'admin' | 'view'`

---

## 二、后端 API 权限矩阵

### 2.1 公开接口（无需认证）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 用户登录 |

### 2.2 认证接口（所有已登录角色）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/auth/verify` | 验证令牌有效性 |
| POST | `/api/auth/logout` | 用户登出 |
| PUT | `/api/auth/selection` | 保存公司/项目选择 |
| GET | `/api/auth/companies` | 获取有权限的公司列表 |
| GET | `/api/auth/projects` | 获取有权限的项目列表 |
| GET | `/api/auth/context` | 获取自己的当前上下文 |

### 2.3 公司管理（仅 sysadmin）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/companies` | 获取公司列表 |
| GET | `/api/companies/:id` | 获取公司详情 |
| POST | `/api/companies` | 创建公司 |
| PUT | `/api/companies/:id` | 更新公司 |

- /api/companies的所有API都仅用在公司管理页面，其他页面如果需要查公司必须使用/api/auth/companies

### 2.4 用户管理（只有sysadmin角色有权限）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/users` | 获取用户列表 |
| GET | `/api/users/:id` | 获取用户详情 |
| POST | `/api/users` | 创建用户 |
| PUT | `/api/users/:id` | 更新用户 |
| DELETE | `/api/users/:id` | 删除用户 |

**注意**：
- 用户管理中所有用户都可能有多家公司多个项目的对应他角色的权限

### 2.5 项目管理（sysadmin + admin）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/projects` | 获取项目列表 |
| GET | `/api/projects/:id` | 获取项目详情 |
| POST | `/api/projects` | 创建项目 |
| PUT | `/api/projects/:id` | 更新项目 |
| DELETE | `/api/projects/:id` | 删除项目 |

**注意**：
- 只能查看/操作有权限的项目
- 不能将项目转移到其他公司
- 创建项目时运营者/查看者必须属于本公司
- 跨公司操作返回 403 "无权操作其他公司的项目"

### 2.6 技能管理（sysadmin + admin）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/skills` | 获取技能列表 |
| GET | `/api/skills/:id` | 获取技能详情 |
| POST | `/api/skills` | 创建技能 |
| PUT | `/api/skills/:id` | 更新技能 |
| DELETE | `/api/skills/:id` | 删除技能 |

**注意**：
- 技能不属于任何公司和项目
- sysadmin有权限增删改查所有技能
- admin他有可以看到所有技能，可以创建技能，但是他只能修改和删除他自己创建的技能

### 2.7 LLM 模型管理（仅 sysadmin）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/llm-models` | 获取模型列表 |
| GET | `/api/llm-models/:id` | 获取模型详情 |
| POST | `/api/llm-models` | 创建模型 |
| PUT | `/api/llm-models/:id` | 更新模型 |
| DELETE | `/api/llm-models/:id` | 删除模型 |

### 2.8 系统配置（仅 sysadmin）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/system-configs` | 获取系统配置 |
| PUT | `/api/system-configs` | 更新系统配置 |

---

## 三、前端菜单权限

侧边栏菜单根据角色动态过滤（`pages/components/Sidebar.tsx`）。

| 菜单 | 路由 | sysadmin | admin | view |
|------|------|:--------:|:-----:|:----:|
| AI知识库 | `/knowledge` | ✅ | ✅ | ❌ |
| 文章管理 | `/article` | ✅ | ✅ | ❌ |
| 发布管理 | `/publish` | ✅ | ✅ | ❌ |
| 每日检测 | `/daily-check` | ✅ | ✅ | ✅（仅被授权后） |
| 常用工具 | `/tools` | ✅ | ✅ | ❌ |
| 项目管理 | `/project` | ✅ | ✅ | ❌ |
| 用户管理 | `/users` | ✅ | ❌ | ❌ |
| 公司管理 | `/company` | ✅ | ❌ | ❌ |
| 系统管理 | `/sysadmin` | ✅ | ❌ | ❌ |

前端过滤逻辑：`menuItems.filter(item => item.roles.includes(userRole))`

---

## 四、多层权限架构

权限校验分为四层，每层必须严格执行：

```
请求 → 第1层：反爬虫/限流 → 第2层：JWT 认证 → 第3层：角色校验 → 第4层：业务逻辑隔离
```

### 第1层：反爬虫 + 限流（所有 API）
- **反爬虫中间件** (`apis/middleware/anti-crawl.middleware.ts`)
  - User-Agent 必须 ≥ 10 字符，否则 403
  - 可疑活动检测：200+ 请求/分钟自动封禁 IP 10 分钟
- **限流中间件** (`apis/middleware/rate-limit.middleware.ts`)
  - 超限返回 429 "请求过于频繁，请稍后再试"

### 第2层：JWT 认证（authMiddleware）
- **文件**：`apis/middleware/auth.middleware.ts`
- **校验**：`Authorization: Bearer <token>` 头
- **解析后设置**：`req.user = { userId, username, role, companyId }`
- **失败响应**：401 "未登录，请先登录" 或 "登录已过期，请重新登录"
- **唯一例外**：`POST /api/auth/login`

### 第3层：角色校验（roleMiddleware）
- **文件**：`apis/middleware/auth.middleware.ts`
- **工厂函数**：`roleMiddleware('sysadmin', 'admin')` 接受允许的角色列表
- **校验**：`req.user.role` 是否在允许列表中
- **失败响应**：403 "无权限访问"
- **路由注册示例**：`router.get('/', authMiddleware, roleMiddleware('sysadmin'), controller.list)`

### 第4层：业务逻辑数据隔离
- **Controller 层隔离**：Controller 层强制注入 `companyId = req.user.companyId`、`projectId = req.user.projectId`、`userId = req.user.userId`
- **view 项目隔离**：Service 层只返回被分配为 viewer 的项目
- **sysadmin 保护**：用户 Service 禁止修改/删除 sysadmin 用户

---

## 五、数据隔离规则

### 5.1 公司+项目维度隔离
| 操作 | sysadmin | admin | view |
|------|----------|-------|------|
| 查看所有公司和所有项目 | ✅ | ❌ | ❌ |
| 管理自己有权限的项目| ✅ | ❌ | ❌ |
| 访问自己有权限的项目的数据 | ✅ | ✅ | ❌（仅每日检测报告） |

- sysadmin：访问所有公司数据，无限制
- admin/view：只能访问自己有权限的项目的数据

### 5.2 用户维度隔离
| 操作 | sysadmin | admin |
|------|----------|-------|
| 增删改查用户 | ✅ | ❌ |

- sysadmin 用户不可被修改角色或删除（硬保护）

---

## 六、认证流程

```
1. POST /api/auth/login（公开）
   → 返回 JWT + 用户信息（含 selected_company + selected_project）

2. 前端存储 token 和用户信息到 localStorage

3. Layout.tsx 鉴权守卫
   → 检查 localStorage 中 token
   → 调用 GET /api/auth/verify 验证
   → 失败则重定向到 /login（保存 redirect URL）

4. 受保护请求
   → 携带 Authorization: Bearer <token>
   → authMiddleware 验证 → roleMiddleware 校验角色 → Controller 校验数据隔离

5. 令牌过期
   → 2 小时后过期（可配置）
   → 前端跳转到登录页
```

---

## 七、新增 API/页面时的权限检查清单

每次新增 API 接口或前端页面时，必须逐项确认：

1. **API 是否需要认证？** — 除 login 外所有接口必须加 `authMiddleware`
2. **允许哪些角色？** — 必须加 `roleMiddleware('sysadmin')` 或 `roleMiddleware('sysadmin', 'admin')` 等
3. 权限控制是按角色，还是按项目+角色
4. **前端菜单是否需要角色过滤？** — Sidebar 的 `menuItems` 必须设置正确的 `roles` 数组
5. **是否涉及跨公司或跨数据？** — admin和view 不能访问其他公司数据
6. **是否影响 sysadmin 用户？** — 禁止修改/删除 sysadmin 角色和用户
7. **测试是否覆盖所有角色场景？** — 必须为每个角色编写权限测试用例

---

## 八、关键源文件索引

| 文件 | 职责 |
|------|------|
| `apis/middleware/auth.middleware.ts` | JWT 认证 + 角色校验中间件 |
| `apis/middleware/anti-crawl.middleware.ts` | 反爬虫中间件 |
| `apis/middleware/rate-limit.middleware.ts` | 限流中间件 |
| `apis/app.ts` | 路由注册（指定每个路由的角色权限） |
| `apis/controller/user.controller.ts` | 用户 Controller（admin 公司隔离） |
| `apis/controller/project.controller.ts` | 项目 Controller（admin 公司隔离） |
| `apis/service/impl/auth.service.impl.ts` | 认证服务（角色-公司-项目访问逻辑） |
| `apis/service/impl/user.service.impl.ts` | 用户服务（sysadmin 保护） |
| `apis/service/impl/project.service.impl.ts` | 项目服务（运营者/查看者验证） |
| `apis/entity/user.entity.ts` | UserRole 类型定义 |
| `prisma/schema.prisma` | Role 枚举定义 |
| `pages/components/Sidebar.tsx` | 前端菜单角色过滤 |
| `pages/components/Layout.tsx` | 前端鉴权守卫 |

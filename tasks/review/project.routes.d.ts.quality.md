# project.routes.d.ts 质量评审报告

**文件**: `dist/apis/apis/routes/project.routes.d.ts`（源文件: `apis/routes/project.routes.ts`）
**评审维度**: 软件质量（Quality）
**评审日期**: 2026-05-26
**评审基线**: dev 分支 HEAD

---

## 综合评分: 8.2/10 APPROVE

路由文件职责单一、中间件链清晰、Zod 校验到位、角色常量化，测试覆盖率达 90%+。存在通配符导入、缺少 `:id` 参数校验中间件、`listProjects` 手动解析 query 等质量问题。

---

## 问题清单

### HIGH (H)

#### H-1: 通配符导入 `import * as ctrl` 增加耦合
- **位置**: `apis/routes/project.routes.ts` L6
- **问题**: `import * as ctrl from '../controller/project.controller'` 将 controller 的全部导出（含内部辅助函数）引入路由模块。当前 controller 导出 5 个处理函数 + 2 个内部辅助函数（`getErrorMessage`、`handleServiceError`），路由实际只使用 5 个。
- **影响**: 内部函数签名变更会触发路由文件重编译；IDE 自动补全会污染命名空间；违反最小导入原则。
- **修复**: 改为具名导入：
  ```ts
  import { listProjects, getProject, createProject, updateProject, deleteProject } from '../controller/project.controller';
  ```

#### H-2: `:id` 路径参数缺少路由级校验
- **位置**: L11-12, L14-15
- **问题**: `GET /:id`、`PUT /:id`、`DELETE /:id` 三个路由的 `:id` 参数未在路由层校验（如正则约束 `/:id(\\d+)`），校验逻辑散落在每个 controller 函数内部（`parseInt` + `isNaN` 检查）。
- **影响**: 非数字 ID 请求通过路由层直达 controller，增加不必要的函数调用栈；与 `POST /` 和 `PUT /` 的 Zod 校验形成不一致的防御风格。
- **修复**: 在路由层使用参数校验中间件或 Express 路由正则约束：
  ```ts
  router.get('/:id(\\d+)', ctrl.getProject);
  ```
  或创建 `idParamSchema` 通过 `validate('params')` 统一校验。

### MEDIUM (M)

#### M-1: `listProjects` 手动解析 query 参数未复用 Zod
- **位置**: `apis/controller/project.controller.ts` L28-48
- **问题**: `listProjects` 在 controller 内手动 `parseInt` 解析 `page`、`pageSize`、`company_id`，手动校验 `status`、`search` 长度。而 `createProject` 和 `updateProject` 通过 Zod schema + `validate` 中间件校验。同一模块两种校验模式增加认知负担。
- **影响**: 校验逻辑与业务逻辑混合在 controller 中；`page=0`、`pageSize=0` 等边界行为依赖 `||` 运算符的 falsy 语义而非显式规则。
- **修复**: 创建 `listProjectSchema`（类似 `createProjectSchema`），在路由层 `validate(listProjectSchema)` 统一校验：
  ```ts
  router.get('/', validate(listProjectSchema), ctrl.listProjects);
  ```

#### M-2: `listProjects` 的 `page` 解析使用 falsy fallback
- **位置**: `apis/controller/project.controller.ts` L28-29
- **问题**: `const page = parseInt(req.query.page as string, 10) || 1` — 当 `page=0` 时 `parseInt` 返回 `0`（falsy），fallback 到 `1`。虽然 `page=0` 在业务上无意义，但依赖 falsy 语义不如显式判断。
- **影响**: 隐式行为，代码审查时需要思考 falsy 边界。
- **修复**: 使用显式判断：`const page = Math.max(1, parseInt(...) || 1)` 或 Zod schema `z.coerce.number().int().min(1).default(1)`。

#### M-3: 服务实例在模块顶层创建
- **位置**: `apis/controller/project.controller.ts` L7
- **问题**: `const projectService: IProjectService = createProjectService()` 在模块顶层执行，Prisma 实例在 import 时创建。虽然项目约定单例模式，但测试中需 `jest.mock` 整个 `db.util` 模块来控制实例化时机。
- **影响**: 测试耦合度高——测试文件必须先 mock `db.util` 再 import `app`（L15-38 的 mock 顺序依赖）；如果未来需要不同配置的服务实例，模块级单例会阻碍扩展。
- **修复**: 可接受当前模式（项目约定），但建议在 controller 工厂函数或 DI 容器中延迟创建。

#### M-4: 路由文件缺少模块级 JSDoc
- **位置**: `apis/routes/project.routes.ts` 全文
- **问题**: 路由文件无模块文档，新开发者无法快速了解：路径前缀（需查看 `app.ts` L124）、允许的角色、依赖的 schema 和 controller。
- **影响**: 跨文件追溯成本高。
- **修复**: 添加模块头注释：
  ```ts
  /**
   * 项目 CRUD 路由 — 挂载于 /api/v1/projects
   * 权限: sysadmin, admin (view 被 roleMiddleware 拦截)
   */
  ```

### LOW (L)

#### L-1: `delete` 路由缺少 view 角色防御深度检查的一致性
- **位置**: `apis/controller/project.controller.ts` L141-161
- **问题**: `deleteProject` 使用 `if (role !== 'sysadmin' && role !== 'admin')` 检查角色，而 `getProject` 和 `updateProject` 使用 `if (role === 'view')`。虽然功能等效（三种角色下行为一致），但代码风格不统一。
- **影响**: 增加阅读时的认知切换。
- **修复**: 统一使用 `if (role === 'view')` 模式或统一使用 ROLES 常量。

#### L-2: `.d.ts` 文件信息密度极低
- **位置**: `dist/apis/apis/routes/project.routes.d.ts` 全文（4行）
- **问题**: 编译产物 `.d.ts` 仅声明 `router: Router`，丢失了路由注册信息（路径、HTTP 方法、中间件链、controller 绑定）。这是 TypeScript 默认行为，但对 API 消费者（如前端开发者）缺乏自文档化能力。
- **影响**: 前端开发者无法通过类型定义了解可用端点。
- **修复**: 可考虑使用 tsoa 或类似工具生成带路由信息的类型定义；当前阶段可接受。

#### L-3: `listProjects` 中 `search` 长度校验位置不当
- **位置**: `apis/controller/project.controller.ts` L31-34
- **问题**: `search` 长度校验在 controller 中硬编码，而非在 schema 中声明。若未来其他接口也支持 `search`，校验规则会重复。
- **影响**: 校验规则分散，维护成本略高。
- **修复**: 迁移到 Zod schema（与 M-1 一起修复）。

---

## 优点

1. **中间件链规范**: `authMiddleware` + `roleMiddleware` 在路由级 `router.use` 统一挂载，所有端点自动受保护，无遗漏风险。
2. **角色常量化**: 使用 `ROLES.SYSADMIN` / `ROLES.ADMIN` 而非硬编码字符串，消除拼写错误风险。
3. **Zod + strict schema**: `createProjectSchema` 和 `updateProjectSchema` 使用 `.strict()` 拒绝未知字段，防止参数注入。
4. **分层清晰**: Routes → Controller → Service → Prisma 四层分离，职责边界明确。
5. **测试充分**: 控制器测试 80+ 用例，覆盖认证、授权、输入校验、错误处理、边界值、角色隔离等维度，包括 defense-in-depth 测试。
6. **软删除**: `delete` 操作使用 `deletedAt` 而非物理删除，支持数据恢复。
7. **事务保护**: `update` 和 `delete` 使用 `$transaction` 防止 TOCTOU 竞态。

---

## 评分明细

| 维度 | 得分 | 说明 |
|------|------|------|
| 职责单一 (SRP) | 9/10 | 路由层仅负责注册，逻辑在 controller/service |
| 输入校验 | 7/10 | 写操作有 Zod，读操作手动解析不一致 |
| 错误处理 | 8/10 | 统一 `handleServiceError` + `AppError` 映射 |
| 代码风格一致性 | 7/10 | 通配符导入 + delete 角色检查风格不统一 |
| 可维护性 | 8/10 | 分层清晰，但缺少模块文档 |
| 测试覆盖 | 9/10 | 80+ 测试用例，覆盖率高 |
| **综合** | **8.2/10** | **APPROVE** |

---

## 修复优先级

| 优先级 | 编号 | 预估工时 |
|--------|------|----------|
| HIGH | H-1 | 5min |
| HIGH | H-2 | 30min |
| MEDIUM | M-1 | 20min |
| MEDIUM | M-2 | 5min（随 M-1 一起） |
| MEDIUM | M-3 | 可接受现状 |
| MEDIUM | M-4 | 5min |
| LOW | L-1 | 5min |
| LOW | L-2 | 可接受现状 |
| LOW | L-3 | 随 M-1 一起 |

修复后预期评分: **9.0/10**

# apis/controller/skills.controller.ts — 软件架构专家评审报告

**评审日期**: 2026-05-24
**评审角色**: 软件架构专家（分层架构 + 依赖管理 + 职责边界 + 可扩展性 + 一致性）
**文件路径**: `apis/controller/skills.controller.ts`
**代码行数**: 229 行（6 个导出函数 + 1 个辅助函数 + 模块级 multer 配置）
**依赖图**:

```
app.ts (路由注册 + 中间件编排)
  └─ skills.controller.ts (HTTP 请求/响应处理 + 文件系统 I/O)
       ├─ SkillsServiceImpl (业务逻辑, 模块级单例)
       │    ├─ Prisma Client (数据访问)
       │    └─ mapSkills (字段映射: camelCase → snake_case)
       ├─ response.util.ts (响应工具函数)
       ├─ multer (文件上传中间件)
       ├─ adm-zip (zip 解压)
       └─ fs/path (文件系统操作 — 直接在 Controller 层)
```

**关联接口**: `apis/service/skills.service.ts`（`ISkillsService`）
**关联实体**: `apis/entity/skills.entity.ts`（`Skills`, `CreateSkillsRequest`, `UpdateSkillsRequest`）
**关联路由**:
- `GET /api/skills` — 技能列表查询（sysadmin + admin）
- `GET /api/skills/:id` — 技能详情（sysadmin + admin）
- `POST /api/skills` — zip 上传创建技能（sysadmin + admin）
- `PUT /api/skills/:id` — 更新技能元数据（sysadmin + admin）
- `DELETE /api/skills/:id` — 删除技能 + 目录（sysadmin + admin）

**严重级别**: ARCH-CRITICAL(2) / ARCH-MAJOR(3) / ARCH-MINOR(3) / OBSERVATION(3)

---

## 一、架构评价总览

Skills 控制器是项目中**唯一涉及文件系统操作**的控制器，这使得它在架构上与其他 CRUD 控制器有本质区别。除常规的 HTTP 协议适配和数据调度外，它还承担了 zip 文件解压、SKILL.md 解析、目录冲突检测、Zip Slip 路径穿越防护、临时文件清理等大量职责。

从架构视角审视，该文件的核心问题在于 **Controller 层越权承担了 Service 层的文件管理职责**，导致分层边界模糊、职责过重、双写一致性缺失。同时，在输入验证、错误传播、响应契约等方面也存在与其他控制器一致的项目级架构短板。

| 架构维度 | 评分 | 说明 |
|----------|------|------|
| 分层职责 | 3/10 | Controller 直接操作文件系统，包含 SKILL.md 解析等业务逻辑，严重越权 |
| 依赖管理 | 5/10 | 模块级硬编码单例，Controller 依赖具体实现类，与项目统一 |
| 关注点分离 | 3/10 | HTTP 适配、文件 I/O、数据解析、安全校验全部混在 Controller |
| 异常架构 | 4/10 | 无统一异常体系，通过字符串匹配耦合 Service 层 |
| 数据契约 | 6/10 | 有 Entity/DTO 类型定义，但 Controller 未做字段白名单过滤 |
| 可测试性 | 3/10 | 模块级文件系统副作用 + multer 实例化 + 硬编码实例化，测试难度最高 |
| 一致性 | 5/10 | 与项目其他 Controller 部分一致，但文件操作部分完全偏离 |
| 可扩展性 | 4/10 | 新增文件类型支持需大改 Controller，验证逻辑无法复用 |

---

## 二、架构问题清单

### ARCH-CRITICAL-1: Controller 层越权承担文件管理职责 — 分层架构破坏

**位置**: 第 94-174 行（createSkills）、第 199-228 行（deleteSkills）

**问题描述**:

Controller 层直接执行了大量本属于 Service 层或独立文件管理层的操作：

```
当前职责分布（实际）:

Controller (skills.controller.ts, 229行):
  ├─ HTTP 协议适配 (参数解析、响应构造)        ← 合理
  ├─ multer 文件上传中间件                      ← 合理（HTTP 层关注点）
  ├─ zip 文件解压 (AdmZip.extractAllTo)         ← 越权：应在 Service 层
  ├─ SKILL.md frontmatter 解析                  ← 越权：业务逻辑
  ├─ 目录冲突检测 (fs.existsSync)               ← 越权：业务规则
  ├─ Zip Slip 路径穿越校验                      ← 越权：安全逻辑
  ├─ 文件大小验证 (MAX_ENTRY_SIZE)              ← 越权：验证逻辑
  ├─ 文件系统目录创建 (fs.mkdirSync)            ← 越权：基础设施操作
  ├─ 文件移动 (fs.renameSync)                   ← 越权：基础设施操作
  ├─ 目录删除 (fs.rmSync)                       ← 越权：基础设施操作
  └─ 临时文件清理 (fs.unlinkSync)               ← 合理（Controller 管自己的中间件产物）

Service (skills.service.impl.ts, 83行):
  ├─ 数据库 CRUD (Prisma)                      ← 合理
  ├─ 重名检测                                   ← 合理
  └─ 软删除 (deletedAt)                         ← 合理
```

**架构影响**:

```
期望分层架构:

  Controller 层 — HTTP 协议适配
    │  解析 req.file、req.params、req.body
    │  调用 Service
    │  构造 HTTP 响应
    │
  Service 层 — 业务编排
    │  调用 FileService 处理 zip 解压
    │  调用 FileService 解析 SKILL.md
    │  协调文件操作与数据库操作的原子性
    │  调用 Prisma 进行 CRUD
    │
  FileService 层 — 文件管理（新增）
    │  zip 安全解压 + Zip Slip 防护
    │  SKILL.md 解析
    │  目录管理
    │
  Repository 层 — 数据访问
       Prisma Client

当前架构（扁平化）:

  Controller 层 — HTTP + 文件 I/O + 业务逻辑 + 安全校验 + 数据库调用
  Service 层 — 仅数据库 CRUD
```

1. **职责膨胀**: Controller 229 行中约 80 行是文件系统操作，60 行是解析/校验逻辑，真正的 HTTP 适配仅约 30 行
2. **不可复用**: SKILL.md 解析、zip 安全解压逻辑被锁死在 Controller 内，其他模块无法复用
3. **不可替换**: 文件存储策略（本地文件系统 → OSS/S3）变更需改 Controller

**重构建议**: 将文件管理职责抽取到独立的 `SkillsFileService`：

```typescript
// apis/service/skills-file.service.ts
export interface ISkillsFileService {
  parseSkillMd(content: string): { name: string; description: string };
  extractSkillZip(
    zipBuffer: Buffer,
    targetDir: string
  ): Promise<{ topDir: string; skillMd: { name: string; description: string } }>;
  removeSkillDir(skillDir: string): void;
}

// Controller 简化为：
export async function createSkills(req: Request, res: Response): Promise<void> {
  if (!req.file) { fail(res, 400, '请选择技能 zip 包'); return; }
  try {
    const { topDir, skillMd } = await skillsFileService.extractSkillZip(
      req.file.buffer, SKILLS_DIR
    );
    const item = await skillsService.create({ ...skillMd, skill_dir: topDir, created_by: req.user!.userId });
    created(res, item, '技能创建成功');
  } catch (err: unknown) {
    // ...
  }
}
```

**优先级**: P1 — 文件管理职责下沉到 Service 层是本控制器最关键的架构改进

---

### ARCH-CRITICAL-2: 文件操作与数据库操作无事务边界 — 双写一致性问题

**位置**: 第 119-164 行（createSkills）、第 211-220 行（deleteSkills）

**问题描述**:

`createSkills` 执行了两类有副作用的操作（文件系统写入 + 数据库插入），但它们之间没有事务边界：

```typescript
// createSkills 的操作序列:

Step 1: zip.extractAllTo(SKILLS_DIR, true)    ← 文件系统写入（不可回滚）
Step 2: skillsService.create({...})            ← 数据库插入（可回滚）
```

**失败场景分析**:

```
场景 A: Step 1 成功, Step 2 失败
  → 文件已写入, 数据库无记录
  → 目录残留 + 同名技能无法重建（目录冲突检测拦截）
  → 当前代码: 无回滚 ❌

场景 B: Step 1 失败
  → 文件未写入, 数据库无记录
  → tmp 文件在 finally 中清理 ✓

场景 C: Step 2 成功, 但 extractAllTo 部分写入（磁盘满等）
  → 不适用（当前先 extract 再 create）
```

`deleteSkills` 也存在类似问题：

```typescript
// deleteSkills 的操作序列:

Step 1: fs.rmSync(skillDir, ...)              ← 文件系统删除（不可回滚）
Step 2: skillsService.delete(id)              ← 数据库软删除（可回滚）
```

```
场景 D: Step 1 成功, Step 2 失败
  → 文件已删除, 数据库记录仍在
  → 技能记录指向不存在的目录
  → 当前代码: 无恢复机制 ❌
```

**架构模式**: 这是经典的 **Saga 模式 / 补偿事务** 问题。由于文件系统不支持分布式事务，需要设计补偿操作：

```typescript
// createSkills — 补偿事务模式
export async function createSkills(req: Request, res: Response): Promise<void> {
  let skillDir: string | null = null;
  try {
    // Step 1: 文件操作
    skillDir = extractAndValidateZip(req.file);
    // Step 2: 数据库操作
    const item = await skillsService.create({...});
    created(res, item, '技能创建成功');
  } catch (err: unknown) {
    // 补偿: 回滚文件操作
    if (skillDir && fs.existsSync(skillDir)) {
      fs.rmSync(skillDir, { recursive: true, force: true });
    }
    handleSkillError(res, err, '创建技能失败');
  }
}

// deleteSkills — 调换执行顺序（先标记删除，后删文件）
export async function deleteSkills(req: Request, res: Response): Promise<void> {
  // Step 1: 数据库软删除（可回滚）
  await skillsService.delete(id);
  // Step 2: 文件删除（不可回滚，但数据库已标记删除）
  removeSkillDirSafely(existing.skill_dir);
  success(res, null, '删除技能成功');
}
```

**优先级**: P1 — 双写不一致是生产环境最大的运维风险

---

### ARCH-MAJOR-1: 模块级硬编码单例 — 依赖反转缺失

**位置**: 第 9 行

```typescript
const skillsService = new SkillsServiceImpl();
```

**架构影响分析**:

```
当前依赖方向:
  Controller ──(具体类依赖)──> SkillsServiceImpl ──(具体类依赖)──> Prisma Client

期望依赖方向（依赖反转原则 DIP）:
  Controller ──(接口依赖)──> ISkillsService <──(实现)── SkillsServiceImpl
```

SkillsServiceImpl 构造函数无参数，Controller 直接导入并实例化。虽然项目已定义 `ISkillsService` 接口且 Entity/DTO 层完备，但 Controller 仍未通过接口引用。

**项目模式对比**:

| Controller | Service 实例化方式 | 有 Entity/DTO | 有 Map 层 |
|------------|-------------------|-------------|----------|
| skills.controller | `new SkillsServiceImpl()` | ✓ Skills/CreateSkillsRequest/UpdateSkillsRequest | ✓ mapSkills |
| article.controller | `new ArticleServiceImpl()` | ✓ | ✓ |
| company.controller | `new CompanyServiceImpl()` | ✓ | ✓ |
| publishing-schedule.controller | `new PublishingScheduleServiceImpl()` | ✗ | ✗ |

Skills 模块在 Entity/Map 层建设上比 publishing-schedule 更完善，但依赖注入方式与全项目一致。

**优先级**: P3 — 项目级技术债务，建议统一规划

---

### ARCH-MAJOR-2: 无统一异常体系 — Controller 与 Service 通过字符串形成隐式契约

**位置**: 第 86-91 行、第 192-196 行、第 221-227 行

```typescript
// Controller — 字符串精确匹配
} catch (err: any) {
  if (err.message === '技能不存在') {   // 隐式契约
    fail(res, 404, err.message);
  } else {
    fail(res, 500, err.message || '...');
  }
}

// Service — 抛出字符串消息
throw new Error('技能不存在');           // impl.ts:33, impl.ts:60, impl.ts:79
throw new Error(`已存在同名技能「${name}」`);  // impl.ts:42 — Controller 未处理
```

**架构影响**:

```
Service 层异常传播路径:

  Service.throw Error('技能不存在')
    → Controller.catch (err: any)
      → 字符串匹配 err.message === '技能不存在'
        → 匹配成功 → 404
        → 匹配失败 → 500

遗漏的异常:
  Service.throw Error('已存在同名技能「xxx」')  ← Controller 无匹配
    → 所有 Controller 的 catch 块
      → 无匹配 → 500（应该是 409 Conflict）
```

**Skills 模块特有问题**: Service 的 `create` 方法抛出 `已存在同名技能` 异常，但 Controller 的 `createSkills` 没有对该异常做专门处理——它被 catch-all 直接返回 500。正确的 HTTP 状态码应为 409（Conflict）。

```typescript
// createSkills 当前异常处理（第 165-167 行）:
} catch (err: any) {
  fail(res, 500, err.message || '创建技能失败');  // 409 异常被吞成 500
}
```

**重构建议**: 引入分层异常体系：

```typescript
// apis/entity/errors.ts
export class NotFoundError extends Error {
  readonly statusCode = 404;
  constructor(entity: string) { super(`${entity}不存在`); this.name = 'NotFoundError'; }
}

export class ConflictError extends Error {
  readonly statusCode = 409;
  constructor(message: string) { super(message); this.name = 'ConflictError'; }
}

export class BusinessError extends Error {
  readonly statusCode = 400;
  constructor(message: string) { super(message); this.name = 'BusinessError'; }
}

// Service 层
throw new NotFoundError('技能');
throw new ConflictError(`已存在同名技能「${name}」`);

// Controller — 统一异常处理
function handleSkillError(res: Response, err: unknown, contextMsg: string): void {
  if (err instanceof NotFoundError) fail(res, 404, err.message);
  else if (err instanceof ConflictError) fail(res, 409, err.message);
  else if (err instanceof BusinessError) fail(res, 400, err.message);
  else fail(res, 500, contextMsg);
}
```

**优先级**: P2 — Skills 模块存在 409 异常被 500 吞噬的问题

---

### ARCH-MAJOR-3: updateSkills 无字段白名单 — Controller ↔ Service 数据契约失控

**位置**: 第 188 行

```typescript
const item = await skillsService.update(id, req.body);  // req.body 直接传入
```

**架构影响**:

```
当前数据流:

  HTTP req.body (any) → Controller (无过滤) → Service.update(id, any)

Service 层实现:
  const data: any = {};
  if (request.name !== undefined) data.name = request.name;
  if (request.description !== undefined) data.description = request.description;
  if (request.skill_dir !== undefined) data.skillDir = request.skill_dir;  // ← 危险字段
```

**安全隐患链**:

```
攻击路径:
  1. PUT /api/skills/1  { "skill_dir": "../../etc" }
  2. Service 将 skill_dir 写入数据库
  3. DELETE /api/skills/1
  4. Controller: path.join(SKILLS_DIR, "../../etc") → 系统目录
  5. fs.rmSync(resolved, { recursive: true, force: true }) → 灾难性删除
```

`UpdateSkillsRequest` 接口包含 `skill_dir` 字段（`apis/entity/skills.entity.ts:21`），Service 层直接将其映射到 Prisma 的 `skillDir`。`skill_dir` 是一个特殊字段——它控制文件系统目录路径，不应通过普通 update 接口修改。

**对比项目其他模块**:

| Controller | update 字段过滤方式 | 安全性 |
|------------|-------------------|--------|
| article.controller | `pickAllowedFields()` 白名单 | ✓ 安全 |
| company.controller | 解构 `{ name, description, ... }` | ✓ 安全 |
| knowledge-base.controller | 解构 `{ name, type, ... }` | ✓ 安全 |
| skills.controller | **无过滤，直接传 req.body** | ✗ 不安全 |

**重构建议**:

```typescript
// 方案 A: Controller 层白名单（最小改动）
const { name, description } = req.body;
const item = await skillsService.update(id, { name, description });

// 方案 B: 从 UpdateSkillsRequest 中移除 skill_dir（根本解决）
export interface UpdateSkillsRequest {
  name?: string;
  description?: string;
  // skill_dir 不应出现在 update 接口中
}
```

**优先级**: P1 — `skill_dir` 可被篡改形成攻击链（ARCH-CRITICAL-2 的放大器）

---

### ARCH-MINOR-1: 模块级副作用 — 目录创建 + multer 实例化在 import 时触发

**位置**: 第 11-16 行、第 19-29 行

```typescript
// 模块加载时立即执行
const SKILLS_DIR = path.resolve(process.cwd(), 'skills');
const TMP_DIR = path.resolve(process.cwd(), 'tmp', 'uploads');

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
if (!fs.existsSync(SKILLS_DIR)) fs.mkdirSync(SKILLS_DIR, { recursive: true });

const upload = multer({...});
```

**架构影响**:

1. **测试困难**: `import * as skillsController` 即触发文件系统操作和 multer 实例化
2. **不可配置**: `SKILLS_DIR` 和 `TMP_DIR` 硬编码 `process.cwd()`，无法通过环境变量或配置文件管理
3. **启动耦合**: 即使不使用 skills 模块，应用启动也会创建这些目录

**对比**: 项目中 `apis/config/` 目录已有配置体系（`default.json`/`production.json`），文件路径应纳入配置管理。

**建议**: 延迟初始化 + 配置外置：

```typescript
let _upload: ReturnType<typeof multer> | null = null;
let _initialized = false;

function ensureInitialized(): void {
  if (_initialized) return;
  const skillsDir = config.get('skills.dir') || path.resolve(process.cwd(), 'skills');
  const tmpDir = config.get('skills.tmpDir') || path.resolve(process.cwd(), 'tmp', 'uploads');
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.mkdirSync(skillsDir, { recursive: true });
  _upload = multer({ dest: tmpDir, limits: {...}, fileFilter: {...} });
  _initialized = true;
}
```

---

### ARCH-MINOR-2: parseSkillMd 嵌入 Controller — 解析逻辑应独立

**位置**: 第 49-63 行

```typescript
function parseSkillMd(content: string): { name: string; description: string } {
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  // ... 正则解析 YAML frontmatter
}
```

**架构影响**:

`parseSkillMd` 是一个纯函数，无 HTTP 依赖、无文件系统依赖、无数据库依赖，但被锁定在 Controller 模块内部：

1. **不可复用**: 如果其他模块需要解析 SKILL.md 格式（如导入/同步功能），无法共享
2. **不可测试**: 函数未导出，单元测试需要通过 `createSkills` 间接覆盖
3. **职责错位**: YAML 解析是数据转换逻辑，不是 HTTP 适配逻辑

**建议**: 移至独立工具文件：

```typescript
// apis/utils/skill-md.util.ts
export function parseSkillMd(content: string): { name: string; description: string } { ... }
export function validateSkillMd(content: string): { valid: boolean; errors: string[] } { ... }
```

---

### ARCH-MINOR-3: createSkills 响应格式与其他端点不一致

**位置**: 第 164 行

```typescript
// createSkills — 手动构造响应
res.status(201).json({ code: 0, message: '技能创建成功', data: item });

// 其他 5 个端点 — 使用工具函数
success(res, item);     // getSkills
success(res, item, '更新技能成功');  // updateSkills
paginate(res, list, total, page, pageSize);  // listSkills
```

**对比 `response.util.ts`**:

```typescript
export function created<T>(res: Response, data: T, message = '创建成功') {
  return res.status(201).json({ code: 0, message, data });  // 与手动构造完全一致
}
```

虽然格式恰好一致，但使用 `created()` 工具函数可保证未来响应格式变更时自动跟随。这是项目内部的一致性问题。

---

### OBS-1: catch (err: any) 全文 6 处使用 any 类型

**位置**: 第 33、73、88、165、191、222 行

TypeScript 4.4+ 支持 `useUnknownInCatchVariables`。`any` 绕过类型安全检查，应使用 `unknown` + 安全窄化。项目级共性问题。

---

### OBS-2: 500 错误泄露 err.message

**位置**: 第 74、89、167、195、226 行

```typescript
fail(res, 500, err.message || '获取技能列表失败');  // 可能泄露 Prisma 内部错误信息
```

如果 Service 层抛出的异常包含 Prisma 内部细节（如连接串、表名），会通过 `err.message` 泄露给前端。500 错误应只返回固定消息。

---

### OBS-3: SKILLS_DIR / TMP_DIR 使用 process.cwd() 而非 __dirname

**位置**: 第 11-12 行

```typescript
const SKILLS_DIR = path.resolve(process.cwd(), 'skills');
const TMP_DIR = path.resolve(process.cwd(), 'tmp', 'uploads');
```

`process.cwd()` 依赖启动目录，在 Docker、pm2、systemd 等不同部署环境下可能不同。`__dirname` 或配置文件管理更可靠。

---

## 三、架构层级分析

### 3.1 分层职责矩阵

| 层级 | 期望职责 | 实际职责 | 评价 |
|------|---------|---------|------|
| 路由层 (app.ts) | 中间件编排 + 路由注册 | auth + role('sysadmin','admin') + 路由 | 合理 |
| Controller 层 | HTTP 协议适配 + 请求调度 | 协议适配 + **文件 I/O + 解析 + 安全校验** | **严重越权** |
| Service 接口层 | 业务逻辑抽象 | 纯接口定义（ISkillsService） | 合理 |
| Service 实现层 | 业务逻辑 + 数据访问编排 | 仅 Prisma CRUD + 字段映射 | **职责不足** |
| Entity 层 | 类型定义 | Skills + CreateSkillsRequest + UpdateSkillsRequest | 完整 |
| Map 层 | 数据格式转换 | mapSkills (camelCase → snake_case) | 完整 |
| File Service 层 | 文件管理（zip 解压/解析/目录） | **缺失**（逻辑在 Controller） | 需新建 |

### 3.2 数据流图

```
┌─────────────┐
│   HTTP 请求  │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ app.ts 中间件链                            │
│ helmet → cors → antiCrawl → rateLimit    │
│ → authMiddleware → roleMiddleware         │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ Controller (skills.controller.ts)         │
│                                           │
│ listSkills:                               │
│   1. 解析 req.query (page/pageSize/search)│
│   2. 调用 service.list(page,pageSize,search)│
│   3. paginate(res, list, total, page, pageSize) │
│                                           │
│ getSkills:                                │
│   1. 解析 req.params.id                   │
│   2. 调用 service.getById(id)             │
│   3. success(res, item)                   │
│                                           │
│ createSkills:    ← 最复杂的端点            │
│   1. 验证 req.file 存在                   │
│   2. AdmZip 读取 zip 文件                 │  ← 文件操作
│   3. 查找 SKILL.md 条目                   │  ← 文件操作
│   4. parseSkillMd 解析 frontmatter        │  ← 业务逻辑
│   5. 确定 topDir 目录名                    │  ← 业务逻辑
│   6. 检查目录冲突                          │  ← 业务逻辑
│   7. Zip Slip 路径穿越校验                 │  ← 安全逻辑
│   8. 文件大小校验                          │  ← 验证逻辑
│   9. extractAllTo 解压到 SKILLS_DIR       │  ← 文件操作
│  10. 验证 SKILL.md 存在（含回退逻辑）       │  ← 文件操作
│  11. service.create(name, desc, ...)      │  ← 数据库操作
│  12. res.status(201).json(...)            │  ← HTTP 响应
│                                           │
│ updateSkills:                             │
│   1. 解析 req.params.id                   │
│   2. service.getById → 权限校验           │
│   3. service.update(id, req.body)         │  ← 无字段白名单 ⚠
│   4. success(res, item)                   │
│                                           │
│ deleteSkills:                             │
│   1. 解析 req.params.id                   │
│   2. service.getById → 权限校验           │
│   3. fs.rmSync(skillDir, ...)             │  ← 文件操作
│   4. service.delete(id)                   │  ← 数据库操作
│   5. success(res, null)                   │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ Service Impl (skills.service.impl.ts)     │
│                                           │
│ list: Prisma findMany + count (并行)      │
│ getById: Prisma findFirst + 存在检查       │
│ create: 重名检查 + Prisma create           │
│ update: Prisma update                     │
│ delete: 软删除 (deletedAt)                │
└──────┬───────────────────────────────────┘
       │
       ▼
┌─────────────┐
│  Prisma/DB   │
│  (Skills)    │
└─────────────┘
```

### 3.3 依赖关系图

```
skills.controller.ts
  ├── import { SkillsServiceImpl } from '../service/impl/...'      ← 具体实现依赖
  ├── import { success, fail, paginate } from '../utils'           ← 工具函数
  ├── import { Request, Response } from 'express'                  ← 框架依赖
  ├── import multer from 'multer'                                  ← 文件上传依赖
  ├── import AdmZip from 'adm-zip'                                 ← zip 处理依赖
  ├── import fs from 'fs'                                          ← 文件系统依赖 ⚠
  └── import path from 'path'                                      ← 路径处理依赖

skills.service.impl.ts
  ├── import { getPrisma } from '../../utils'                      ← 全局 Prisma 实例
  ├── import { Skills, CreateSkillsRequest, UpdateSkillsRequest } from '../../entity'  ← 类型定义
  ├── import { mapSkills } from '../../map'                        ← 字段映射
  └── import { ISkillsService } from '../skills.service'           ← 接口定义
```

**问题**: Controller 直接依赖 `fs`、`adm-zip`、`multer` 三个文件处理库，Service 层仅依赖 Prisma。Controller 承担了过多基础设施职责。

---

## 四、正面架构发现

1. **Entity/DTO 层完备**: `Skills`、`CreateSkillsRequest`、`UpdateSkillsRequest` 三个类型定义齐全，且 Service 接口使用这些类型（而非 `any`），在项目中仅次于 company 模块。

2. **Map 层完备**: `mapSkills` 函数统一处理 camelCase → snake_case 字段映射，Service 层所有返回值都经过 map 处理。

3. **授权检查合理**: update/delete 端点检查 `created_by !== req.user?.userId` 且允许 `sysadmin` 绕过，权限模型清晰。

4. **临时文件清理**: `createSkills` 的 finally 块确保 tmp 文件总是被清理。

5. **Zip Slip 防护意识**: 虽然实现可改进（见质量评审 C-2），但路径穿越检查体现了安全架构意识。

6. **文件大小限制**: multer 50MB + 单条目 100MB 双重限制。

7. **list 端点并行查询**: Service 的 `list` 方法使用 `Promise.all([findMany, count])` 并行执行。

8. **Service 层纯数据职责**: Service 只关注数据库 CRUD，不含文件操作，职责纯粹。

---

## 五、与项目架构模式的一致性分析

### 5.1 项目通用模式对比

| 模式 | skills.controller | article.controller | company.controller | publishing-schedule.controller |
|------|-------------------|-------------------|-------------------|-------------------------------|
| 函数式导出 | ✓ 6 个导出函数 | ✓ | ✓ | ✓ 2 个导出函数 |
| 模块级单例 | `new SkillsServiceImpl()` | `new ArticleServiceImpl()` | `new CompanyServiceImpl()` | `new PublishingScheduleServiceImpl()` |
| success/fail/paginate | ✓（create 例外） | ✓ | ✓ | ✓ |
| 字段白名单 | ✗ 无过滤 | ✓ `pickAllowedFields()` | ✓ 解构 | ✓ 解构 |
| Entity 类型 | ✓ 完整 | ✓ | ✓ | ✗ 缺失 |
| Map 函数 | ✓ `mapSkills` | ✓ | ✓ | ✗ 内嵌 |
| 文件系统操作 | ✓ 唯一 | ✗ | ✗ | ✗ |
| Swagger 注释 | ✗ 无 | 部分有 | 部分有 | ✗ 无 |

### 5.2 架构独特性分析

Skills 控制器在以下方面是项目中**唯一的**：

1. **唯一涉及文件系统操作**: 引入 `fs`、`path`、`adm-zip` 三个文件相关依赖
2. **唯一使用 multer**: 文件上传中间件
3. **唯一包含解析逻辑**: `parseSkillMd` YAML frontmatter 解析
4. **唯一存在双写问题**: 文件系统 + 数据库的原子性保障
5. **唯一使用手动响应构造**: `createSkills` 的 `res.status(201).json()` 而非 `created()`
6. **唯一无字段白名单的 update 端点**: 直接传递 `req.body`

### 5.3 架构模式评分

| 模式 | 评分 | 说明 |
|------|------|------|
| Controller-Service-Repository 分层 | 3/10 | Controller 严重越权，Service 职责不足 |
| 接口抽象 | 7/10 | ISkillsService + Entity/DTO + Map 三层类型完备 |
| 依赖管理 | 5/10 | 模块级硬编码单例，无依赖注入 |
| 错误传播 | 4/10 | 字符串匹配，409 异常被 500 吞噬 |
| 数据契约 | 5/10 | Entity/DTO 存在但 Controller 未利用（update 传 raw body） |
| 文件管理架构 | 2/10 | 无独立文件管理层，逻辑散落在 Controller |

---

## 六、重构建议路线图

### 第一阶段：安全加固（1 天）

| 编号 | 问题 | 方案 | 收益 |
|------|------|------|------|
| MAJOR-3 | update 无字段白名单 | Controller 解构 `{ name, description }` | 消除 skill_dir 篡改攻击链 |
| CRITICAL-2 | 双写无回滚 | createSkills 增加 catch 清理 + deleteSkills 调换顺序 | 一致性保障 |
| MINOR-3 | 响应格式不一致 | 使用 `created()` 替代手动构造 | 一致性 |

### 第二阶段：分层重构（2-3 天）

| 编号 | 问题 | 方案 | 收益 |
|------|------|------|------|
| CRITICAL-1 | Controller 文件操作越权 | 抽取 `SkillsFileService` | 职责归位 + 可复用 |
| MINOR-2 | parseSkillMd 不可测试 | 移至 `utils/skill-md.util.ts` 并导出 | 可测试 + 可复用 |
| MINOR-1 | 模块级副作用 | 延迟初始化 + 配置外置 | 可测试 + 可配置 |
| MAJOR-2 | 字符串异常匹配 | 引入 NotFoundError/ConflictError | 类型安全 + 409 正确映射 |

### 第三阶段：项目级重构（中长期）

| 编号 | 问题 | 方案 | 收益 |
|------|------|------|------|
| MAJOR-1 | 硬编码单例 | 引入服务定位器/DI 容器 | 可测试性 + 可替换性 |

**注**: 第一阶段可独立完成，不依赖后续阶段。第二阶段是本控制器最关键的架构改进——将文件管理职责从 Controller 下沉到 Service 层。

---

## 七、评审结论

**判定: 有条件通过 — 架构短板集中在 Controller 层越权和双写一致性**

`skills.controller.ts` 以 229 行代码实现了 6 个导出函数，覆盖了技能的完整 CRUD + zip 上传创建流程。Entity/DTO/Map 层建设在项目中属于最完善的模块之一，Service 层职责纯粹（纯数据库 CRUD）。

但核心架构问题集中在三个方面：

1. **Controller 层越权（CRITICAL-1）**: 约 140 行文件操作/解析/校验逻辑不应在 Controller 层。这是项目中最"胖"的 Controller，也是职责最混乱的 Controller。抽取 `SkillsFileService` 是最关键的改进。

2. **双写一致性缺失（CRITICAL-2）**: 文件操作与数据库操作无事务边界，失败场景下文件残留或记录指向空目录。需引入补偿事务模式。

3. **数据契约失控（MAJOR-3）**: update 端点无字段白名单，`skill_dir` 可被篡改，与 delete 端点的 `fs.rmSync` 形成攻击链。这是最紧急的安全修复。

**建议**: 优先执行第一阶段安全加固（消除攻击链 + 增加回滚），然后执行第二阶段分层重构（抽取 FileService）。第二阶段完成后，Controller 代码量可从 229 行降至约 80 行，职责回归纯粹的 HTTP 适配。

---

*软件架构专家评审完成 — 2026-05-24*

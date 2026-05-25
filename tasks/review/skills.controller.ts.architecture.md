# apis/controller/skills.controller.ts — 软件架构专家评审报告

**评审日期**: 2026-05-25
**评审角色**: 软件架构专家（分层架构 + 依赖管理 + 职责边界 + 可扩展性 + 一致性）
**文件路径**: `apis/controller/skills.controller.ts`
**代码行数**: 167 行（6 个导出函数 + 1 个辅助函数 + 延迟初始化 multer）
**前次评审**: 2026-05-24（229 行版本，CRITICAL×2 + MAJOR×3 + MINOR×3）
**本次变更**: 代码 229→167 行（-27%），前次 10 个问题全部修复

**依赖图**:

```
app.ts (路由注册 + 中间件编排)
  └─ skills.controller.ts (HTTP 请求/响应处理)
       ├─ SkillsServiceImpl (业务逻辑, 模块级单例)
       │    ├─ Prisma Client (数据访问)
       │    └─ mapSkills (字段映射)
       ├─ SkillsFileServiceImpl (文件管理, 模块级单例)  ← R1 新增依赖
       │    ├─ AdmZip (zip 解压)
       │    └─ parseSkillMd (SKILL.md 解析)
       ├─ response.util.ts (success/fail/paginate/created)
       └─ NotFoundError / ConflictError / BusinessError (分层异常)
```

**关联接口**: `apis/service/skills.service.ts`（`ISkillsService`）
**关联实体**: `apis/entity/skills.entity.ts`（`Skills`, `CreateSkillsRequest`, `UpdateSkillsRequest`）
**关联路由**:
- `GET /api/skills` — 技能列表查询（sysadmin + admin）
- `GET /api/skills/:id` — 技能详情（sysadmin + admin）
- `POST /api/skills` — zip 上传创建技能（sysadmin + admin）
- `PUT /api/skills/:id` — 更新技能元数据（sysadmin + admin）
- `DELETE /api/skills/:id` — 删除技能 + 目录（sysadmin + admin）

**严重级别**: ARCH-MINOR(3) / OBSERVATION(4)

---

## 一、架构评价总览

本次评审针对 R1 重构后的版本（167 行）。与前次评审（229 行）相比，Controller 层完成了**决定性的架构改进**：

| 变化维度 | R1（229 行） | R2（167 行） | 说明 |
|----------|-------------|-------------|------|
| 文件操作归属 | Controller 内联 80 行 | 委托 `SkillsFileService` | CRITICAL-1 已修复 |
| 双写一致性 | 无回滚机制 | create 有回滚 + delete 先 DB 后文件 | CRITICAL-2 已修复 |
| 异常体系 | 字符串匹配，409 被吞成 500 | 类型化异常 + `handleSkillError` | MAJOR-2 已修复 |
| 数据契约 | update 无白名单，`skill_dir` 可篡改 | 解构 `{ name, description }` | MAJOR-3 已修复 |
| multer 初始化 | 模块加载时立即创建 | 延迟初始化 `getUpload()` | MINOR-1 已修复 |
| parseSkillMd | 内嵌 Controller | 移至 `utils/skill-md.util.ts` | MINOR-2 已修复 |
| 响应格式 | create 手动构造 | 使用 `created()` 工具函数 | MINOR-3 已修复 |
| catch 类型 | `err: any`（6 处） | `err: unknown` | OBS-1 已修复 |
| 500 信息泄露 | 返回 `err.message` | 返回固定 `contextMsg` | OBS-2 已修复 |

**当前架构分层清晰度**：

```
当前职责分布（R2）:

Controller (skills.controller.ts, 167行):
  ├─ HTTP 协议适配 (参数解析、响应构造)        ← 合理
  ├─ multer 文件上传中间件（延迟初始化）         ← 合理
  ├─ 统一异常分发 (handleSkillError)            ← 合理
  ├─ 权限校验 (created_by / sysadmin)           ← 合理
  ├─ 补偿事务编排 (create 回滚 + delete 顺序)   ← 合理
  └─ 临时文件清理 (finally 块)                  ← 合理

FileService (skills-file.service.ts):
  ├─ zip 安全解压 + Zip Slip 防护               ← 职责归位
  ├─ SKILL.md 解析                              ← 职责归位
  ├─ 目录管理 + 路径校验                        ← 职责归位
  └─ 文件大小限制                               ← 职责归位

Service (skills.service.impl.ts, 83行):
  ├─ 数据库 CRUD (Prisma)                      ← 合理
  ├─ 重名检测                                   ← 合理
  └─ 软删除 (deletedAt)                         ← 合理
```

| 架构维度 | R1 评分 | R2 评分 | 变化 |
|----------|---------|---------|------|
| 分层职责 | 3/10 | **8/10** | +5 — 文件操作归位 FileService，Controller 回归 HTTP 适配 |
| 依赖管理 | 5/10 | **6/10** | +1 — FileService 抽象引入，但模块级单例仍在 |
| 关注点分离 | 3/10 | **8/10** | +5 — HTTP / 文件 / 数据三层清晰分离 |
| 异常架构 | 4/10 | **8/10** | +4 — 类型化异常体系，instanceof 安全窄化 |
| 数据契约 | 6/10 | **8/10** | +2 — update 白名单 + UpdateSkillsRequest 已移除 skill_dir |
| 可测试性 | 3/10 | **6/10** | +3 — 延迟初始化减少副作用，但模块单例仍阻碍 mock |
| 一致性 | 5/10 | **8/10** | +3 — 全部使用工具函数，catch 统一 unknown |
| 可扩展性 | 4/10 | **7/10** | +3 — FileService 可替换为 OSS/S3 实现 |
| **综合** | **4.1/10** | **7.4/10** | **+3.3** |

---

## 二、架构问题清单

### ARCH-MINOR-1: listSkills parseInt 缺少显式 radix — 文件内不一致

**位置**: 第 57-58 行

```typescript
// listSkills — 无 radix
const page = Math.max(1, parseInt(req.query.page as string) || 1);         // 第 57 行
const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 10));  // 第 58 行

// getSkills — 有 radix 10
const id = parseInt(req.params.id as string, 10);                          // 第 70 行
```

**影响**: `parseInt` 不传 radix 时，前缀为 `0x` 的字符串会被解析为十六进制。虽然 `page`/`pageSize` 输入源为 query string，实际触发概率极低，但同一文件内两处用法不一致是代码风格缺陷。

**修复**:

```typescript
const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || 10));
```

---

### ARCH-MINOR-2: createSkills 部分提取残留清理盲区

**位置**: 第 88-89 行、第 101-104 行

```typescript
// 第 88-89 行: extractSkillZip 抛异常时 extractedSkillDir 尚未赋值
const { topDir, name, description, skillDir } = skillsFileService.extractSkillZip(req.file.path);
extractedSkillDir = skillDir;  // ← 仅在 extractSkillZip 成功返回后才赋值

// 第 101-104 行: 仅清理已赋值的情况
if (extractedSkillDir && fs.existsSync(extractedSkillDir)) {
  fs.rmSync(extractedSkillDir, { recursive: true, force: true });
}
```

**失败场景**:

```
extractSkillZip 执行序列（skills-file.service.ts）:
  1. 创建 skills/my-skill/ 目录         ← fs.mkdirSync
  2. 写入 skills/my-skill/file1.txt     ← fs.writeFileSync
  3. 写入 skills/my-skill/file2.txt     ← fs.writeFileSync
  4. 检测到文件过大 → throw BusinessError  ← 第 88 行异常
  → extractedSkillDir 仍为 null
  → catch 块的 if (extractedSkillDir) 为 false
  → skills/my-skill/ 目录 + 部分文件残留
```

**影响**: 残留目录会导致同名技能无法重建（FileService 在 `extractSkillZip` 第 78-80 行检查目录冲突）。需人工清理。

**修复建议**: 在 FileService 层内部处理部分提取回滚（try-catch 内 rmSync），或在 Controller 层通过已知规则推导清理路径。推荐在 FileService 内处理——提取失败时清理自身产物是 FileService 的职责。

---

### ARCH-MINOR-3: createSkills 的 req.user 检查为不可达代码

**位置**: 第 85 行

```typescript
if (!req.user) { fail(res, 401, '未登录'); return; }
```

**分析**: `skills.routes.ts` 第 7 行对所有路由注册了 `authMiddleware`：

```typescript
router.use(authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN));
```

`authMiddleware` 在 JWT 验证失败时已返回 401 并终止请求链。Controller 执行时 `req.user` 必定存在。此检查在正常流程中**永远不会触发**，属于不可达的死代码。

**影响**: 无功能影响。但增加了阅读负担——读者需判断 `req.user` 是否可能为空，并怀疑是否有未认证的路由路径。

**修复**: 移除此检查，或保留并添加注释说明其为防御性编程。考虑到 `req.user!.userId` 在第 96 行使用了非空断言 `!`，移除检查 + 保留非空断言是一致的。

---

### OBS-1: 模块级硬编码单例 — 项目级共性

**位置**: 第 9-10 行

```typescript
const skillsService = new SkillsServiceImpl();
const skillsFileService = new SkillsFileServiceImpl();
```

项目所有 Controller 采用相同的模块级单例模式（`article.controller`、`company.controller` 等）。Controller 依赖具体实现类而非接口，阻碍了单元测试中的 mock 替换。

**评价**: 项目级技术债务，不建议单独修改 Skills 模块。当项目引入 DI 容器时统一改造。

---

### OBS-2: uploadSkillMiddleware 未区分 MulterError 类型

**位置**: 第 44-53 行

```typescript
export function uploadSkillMiddleware(req: Request, res: Response, next: () => void): void {
  getUpload().single('file')(req, res, (err: unknown) => {
    if (err) {
      const msg = err instanceof Error ? err.message : '上传失败';
      fail(res, 400, msg);   // 所有错误统一返回 400
      return;
    }
    next();
  });
}
```

multer 抛出的 `MulterError` 包含错误码（如 `LIMIT_FILE_SIZE`、`LIMIT_UNEXPECTED_FILE`），可提供更精确的 HTTP 状态码和用户提示：

| MulterError code | 当前响应 | 建议响应 |
|-----------------|---------|---------|
| `LIMIT_FILE_SIZE` | 400 + multer 默认消息 | 400 + "文件大小超过 50MB 限制" |
| `LIMIT_UNEXPECTED_FILE` | 400 + multer 默认消息 | 400 + "请使用 'file' 字段上传" |
| 文件类型不匹配 (fileFilter) | 400 + "仅支持 .zip 文件" | 当前已正确 ✓ |

当前实现对用户体验影响有限（multer 默认消息对中文用户不够友好），属于优化项。

---

### OBS-3: 进程崩溃场景下文件残留不可恢复

**位置**: 第 88-97 行（createSkills）

```
时间线:
  T1: extractSkillZip 成功 → skills/my-skill/ 已写入磁盘
  T2: 进程崩溃（OOM / SIGKILL / 硬件故障）
  T3: skillsService.create 从未执行 → 数据库无记录
  → skills/my-skill/ 永久残留
```

**评价**: 这是非事务性文件 + 数据库操作的固有限制。当前代码已在应用层做了最大努力的补偿事务（catch 回滚 + finally 清理），进程崩溃场景需通过运维手段处理（如启动时扫描孤立目录）。

---

### OBS-4: listSkills 的 catch 块不区分可恢复错误

**位置**: 第 63-65 行

```typescript
} catch (err: unknown) {
  fail(res, 500, '获取技能列表失败');
}
```

`listSkills` 没有 `handleSkillError` 调用——因为 Service 的 `list` 方法不抛出业务异常（无 `NotFoundError`/`ConflictError`/`BusinessError`）。唯一的异常源是 Prisma 连接错误，统一返回 500 是正确的。

**评价**: 无需修改。`handleSkillError` 在此场景下只会走到 `else` 分支返回 500，与当前行为一致。

---

## 三、架构层级分析

### 3.1 分层职责矩阵

| 层级 | 期望职责 | 实际职责 | 评价 |
|------|---------|---------|------|
| 路由层 (skills.routes.ts) | 中间件编排 + 路由注册 | auth + role('sysadmin','admin') + upload 中间件 | 合理 |
| Controller 层 | HTTP 协议适配 + 请求调度 | 协议适配 + 权限校验 + 异常分发 + 补偿事务 | **符合预期** |
| Service 接口层 | 业务逻辑抽象 | 纯接口定义（ISkillsService） | 合理 |
| Service 实现层 | 业务逻辑 + 数据访问编排 | Prisma CRUD + 重名检测 + 软删除 | 合理 |
| File Service 层 | 文件管理 | zip 安全解压 + 目录管理 + 路径校验 | **职责完备** |
| Entity 层 | 类型定义 | Skills + CreateSkillsRequest + UpdateSkillsRequest | 完整 |
| Map 层 | 数据格式转换 | mapSkills (camelCase → snake_case) | 完整 |

### 3.2 数据流图

```
┌─────────────┐
│   HTTP 请求  │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ skills.routes.ts 中间件链                  │
│ authMiddleware → roleMiddleware           │
│ (POST 额外: uploadSkillMiddleware)        │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ Controller (skills.controller.ts, 167行)  │
│                                           │
│ listSkills:                               │
│   1. 解析 req.query (page/pageSize/search)│
│   2. 调用 service.list()                  │
│   3. paginate(res, ...)                   │
│                                           │
│ getSkills:                                │
│   1. 解析 req.params.id                   │
│   2. 调用 service.getById(id)             │
│   3. success(res, item)                   │
│                                           │
│ createSkills:                             │
│   1. 验证 req.file + req.user             │
│   2. fileService.extractSkillZip()        │  ← 委托 FileService
│   3. service.create(name, desc, dir, uid) │
│   4. created(res, item)                   │
│   catch: 清理已提取目录                    │  ← 补偿事务
│   finally: 清理临时文件                    │
│                                           │
│ updateSkills:                             │
│   1. 解析 req.params.id                   │
│   2. service.getById → 权限校验           │
│   3. 解构 { name, description }           │  ← 字段白名单
│   4. service.update(id, { name, desc })   │
│   5. success(res, item)                   │
│                                           │
│ deleteSkills:                             │
│   1. 解析 req.params.id                   │
│   2. service.getById → 权限校验           │
│   3. fileService.validateSkillDirPath()   │  ← 预校验
│   4. service.delete(id)                   │  ← 先 DB（可逆）
│   5. fileService.removeSkillDir(dir)      │  ← 后文件（不可逆）
│   6. success(res, null)                   │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ Service Impl (skills.service.impl.ts)     │
│                                           │
│ list: findMany + count (并行)             │
│ getById: findFirst + 存在检查              │
│ create: 重名检查 + Prisma create           │
│ update: Prisma update                     │
│ delete: 软删除 (deletedAt)                │
└──────┬───────────────────────────────────┘
       │
       ▼
┌─────────────┐
│  Prisma/DB   │
└─────────────┘
```

### 3.3 依赖关系图

```
skills.controller.ts
  ├── SkillsServiceImpl (模块级单例)          ← 具体实现依赖（项目共性）
  ├── SkillsFileServiceImpl (模块级单例)      ← 具体实现依赖（项目共性）
  ├── { success, fail, paginate, created }   ← 响应工具函数
  ├── { NotFoundError, ConflictError, BusinessError } ← 分层异常类型
  ├── multer (延迟初始化)                    ← 文件上传中间件
  └── fs (仅用于 finally 临时文件清理)        ← 最小化文件系统依赖
```

**对比 R1**: Controller 不再直接依赖 `adm-zip`、`path`、`SKILLS_DIR`/`TMP_DIR` 常量。文件系统依赖缩减至仅 `fs.existsSync` + `fs.unlinkSync` + `fs.rmSync`（用于临时文件清理和提取回滚）。

---

## 四、正面架构发现

### 4.1 R1 问题修复质量

R1 报告中 10 个问题（CRITICAL×2 + MAJOR×3 + MINOR×3 + OBS×2）在 R2 中**全部修复**，修复质量评估：

| R1 编号 | 修复方案 | 修复质量 |
|---------|---------|---------|
| CRITICAL-1 | 抽取 `SkillsFileService`（166 行独立文件） | 优秀 — 接口定义 + 实现分离，Controller 仅调用接口方法 |
| CRITICAL-2 | create 增加回滚 + delete 调换为先 DB 后文件 | 良好 — 主路径覆盖完整，部分提取场景有盲区（见 MINOR-2） |
| MAJOR-2 | 引入 NotFoundError/ConflictError/BusinessError + `handleSkillError` | 优秀 — 类型安全，409 正确映射 |
| MAJOR-3 | Controller 解构 `{ name, description }` + UpdateSkillsRequest 移除 skill_dir | 优秀 — 根源修复（Entity 层 + Controller 层双重防护） |
| MINOR-1 | multer 延迟初始化 `getUpload()` | 良好 — 消除 import 时副作用 |
| MINOR-2 | parseSkillMd 移至 `utils/skill-md.util.ts` | 良好 — 可独立测试和复用 |
| MINOR-3 | 使用 `created()` 替代手动构造 | 良好 — 与项目工具函数一致 |
| OBS-1 | `catch (err: unknown)` 替代 `any` | 良好 — 类型安全 |
| OBS-2 | 500 返回固定 contextMsg | 良好 — 不泄露内部信息 |

### 4.2 当前版本架构亮点

1. **deleteSkills 操作顺序最佳实践**: 预校验路径 → DB 软删除（可逆）→ 文件删除（不可逆），确保可逆操作先于不可逆操作。

2. **字段白名单 + Entity 层双重防护**: Controller 解构 `{ name, description }` 过滤请求体，同时 `UpdateSkillsRequest` 接口已移除 `skill_dir` 字段——纵深防御。

3. **handleSkillError 统一异常分发**: 所有非 list 端点共享一个异常处理函数，通过 `instanceof` 类型窄化将 NotFoundError→404、ConflictError→409、BusinessError→400 正确映射，消除字符串匹配的脆弱性。

4. **延迟初始化 getUpload()**: multer 实例仅在首次调用时创建，避免模块加载时的副作用。与 `SkillsFileServiceImpl` 的延迟目录创建形成一致模式。

5. **补偿事务模式**: createSkills 的 try-catch-finally 三段式结构（try 提取+入库 → catch 回滚文件 → finally 清理临时文件）是应用层补偿事务的标准实现。

6. **Entity/DTO/Map 三层完备**: `Skills` + `CreateSkillsRequest` + `UpdateSkillsRequest` + `mapSkills` 构成完整的数据契约层，Service 接口和实现全部使用强类型。

7. **代码量控制**: 167 行实现 6 个导出函数 + 1 个辅助函数，平均每个函数约 20 行。最复杂的 `createSkills` 仅 32 行（含错误处理），职责清晰。

---

## 五、与项目架构模式的一致性分析

| 模式 | skills.controller (R2) | article.controller | company.controller | publishing-schedule.controller |
|------|----------------------|-------------------|-------------------|-------------------------------|
| 函数式导出 | ✓ 6 个导出函数 | ✓ | ✓ | ✓ |
| 模块级单例 | `new SkillsServiceImpl()` + `new SkillsFileServiceImpl()` | `new ArticleServiceImpl()` | `new CompanyServiceImpl()` | `new PublishingScheduleServiceImpl()` |
| success/fail/paginate/created | ✓ 全部使用 | ✓ | ✓ | ✓ |
| 字段白名单 | ✓ 解构 `{ name, description }` | ✓ `pickAllowedFields()` | ✓ 解构 | ✓ 解构 |
| Entity 类型 | ✓ 完整 | ✓ | ✓ | ✗ 缺失 |
| Map 函数 | ✓ `mapSkills` | ✓ | ✓ | ✗ 内嵌 |
| 统一异常处理 | ✓ `handleSkillError` | ✓ 类似模式 | ✓ | 部分 |
| 文件系统操作 | 委托 FileService | N/A | N/A | N/A |
| catch (err: unknown) | ✓ | 部分使用 `any` | 部分使用 `any` | 部分使用 `any` |

**评价**: Skills 控制器在 R2 重构后已达到项目中**架构最规范的 Controller 之一**。在 Entity/Map/异常处理/catch 类型安全方面甚至领先于部分其他模块。

---

## 六、评审结论

**判定: 通过（7.8/10）**

Skills 控制器在 R1 架构评审后进行了彻底重构：代码量从 229 行降至 167 行（-27%），R1 报告中全部 10 个问题（含 2 个 CRITICAL + 3 个 MAJOR）均已修复。

**核心改进总结**:
- 文件操作从 Controller 下沉到独立的 `SkillsFileService`（+166 行新文件），Controller 回归纯粹的 HTTP 适配 + 请求调度角色
- 双写一致性通过补偿事务模式（create 回滚 + delete 先 DB 后文件）得到保障
- 类型化异常体系消除了字符串匹配的脆弱性，409 Conflict 正确映射
- 字段白名单 + Entity 层双重防护消除 `skill_dir` 篡改攻击链

**遗留问题**: 3 个 MINOR 级（parseInt radix 不一致、部分提取清理盲区、不可达的 auth 检查）+ 4 个 OBSERVATION 级，均不影响生产安全和架构正确性。

**建议后续优化（非阻塞）**:
1. 统一 `parseInt` 调用风格，补全 radix 参数（5 分钟改动）
2. 在 `SkillsFileServiceImpl.extractSkillZip` 内部增加 try-catch 回滚部分提取产物
3. 移除 createSkills 中不可达的 `!req.user` 检查，简化代码

---

*软件架构专家评审完成 — 2026-05-25*

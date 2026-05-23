# apis/controller/skills.controller.ts — 软件质量专家评审报告

**评审日期**: 2026-05-24
**评审角色**: 软件质量专家（代码质量 + 安全性 + 可靠性 + 可维护性 + 可测试性 + 性能）
**文件路径**: `apis/controller/skills.controller.ts`
**代码行数**: 229 行（6 个导出函数 + 1 个辅助函数 + 模块级 multer 配置）
**关联文件**: `apis/service/impl/skills.service.impl.ts`, `apis/utils/response.util.ts`, `apis/app.ts:115-119`

---

## 一、代码概览

### 1.1 功能描述

Skills 控制器管理"技能包"的 CRUD 操作，支持通过 zip 文件上传创建技能（含 SKILL.md frontmatter 解析、zip 解压、文件系统写入、目录冲突检测、Zip Slip 路径穿越防护）。

### 1.2 路由注册

在 `app.ts:115-119` 中注册了 5 条路由，均受 `authMiddleware` + `roleMiddleware('sysadmin', 'admin')` 保护：

| 方法 | 路径 | 函数 | 说明 |
|------|------|------|------|
| GET | `/api/skills` | `listSkills` | 分页列表 + 搜索 |
| GET | `/api/skills/:id` | `getSkills` | 根据 ID 获取详情 |
| POST | `/api/skills` | `createSkills`（前置 `uploadSkillMiddleware`） | zip 上传 + 解压 + 创建 |
| PUT | `/api/skills/:id` | `updateSkills` | 更新技能元数据 |
| DELETE | `/api/skills/:id` | `deleteSkills` | 删除技能 + 删除文件目录 |

### 1.3 架构分层

```
┌─────────────────────────────────────────────────┐
│  app.ts (路由注册 + 全局中间件)                     │
│  authMiddleware → roleMiddleware → controller    │
├─────────────────────────────────────────────────┤
│  controller (参数提取 + 文件处理 + 响应构造)        │
│  skills.controller.ts                            │
│  uploadSkillMiddleware → multer 文件上传中间件     │
├─────────────────────────────────────────────────┤
│  service interface (ISkillsService)              │
│  service impl (SkillsServiceImpl)                │
├─────────────────────────────────────────────────┤
│  Prisma ORM → PostgreSQL                        │
│  文件系统: skills/ + tmp/uploads/                 │
└─────────────────────────────────────────────────┘
```

---

## 二、问题清单

### CRITICAL 级别

#### C-1: createSkills 中 zip 解压后未清理失败目录（资源泄露 + 状态不一致）

**位置**: 第 141-174 行

**问题描述**: 当 `zip.extractAllTo(SKILLS_DIR, true)` 成功执行后（第 142 行），后续步骤如果失败（如 DB 创建失败、SKILL.md 验证失败），已解压的文件目录不会被清理。这导致：
1. **文件系统垃圾**: 失败的解压目录残留在 `skills/` 下
2. **状态不一致**: 目录已存在但 DB 无记录，下次创建同名技能时会被"目录已存在"拦截（第 120-123 行）
3. **不可恢复**: 用户无法通过重试解决此问题，需管理员手动清理

```typescript
// 第 141-174 行 — extract 成功后无回滚机制
zip.extractAllTo(SKILLS_DIR, true);  // ← 此步成功后
// ... 任何后续失败都留下了孤儿目录
const item = await skillsService.create({...});  // ← 若此步失败
```

**修复建议**: 在 catch 块中清理已解压目录

```typescript
export async function createSkills(req: Request, res: Response): Promise<void> {
  const tmpPath = req.file?.path;
  let extractedDir: string | null = null;
  try {
    // ... 解压逻辑 ...
    extractedDir = skillDir;
    // ... DB 创建 ...
  } catch (err: unknown) {
    // 清理解压目录
    if (extractedDir && fs.existsSync(extractedDir)) {
      fs.rmSync(extractedDir, { recursive: true, force: true });
    }
    fail(res, 500, getErrorMessage(err));
  } finally {
    if (tmpPath && fs.existsSync(tmpPath)) {
      fs.unlinkSync(tmpPath);
    }
  }
}
```

---

#### C-2: Zip Slip 路径穿越检查存在绕过风险

**位置**: 第 126-138 行

**问题描述**: 路径穿越检查逻辑存在两个缺陷：

1. **TOCTOU 竞态**: 检查的是 zip 条目的声明路径（`entry.entryName`），但实际写入路径由 `extractAllTo` 决定。如果 zip 文件包含符号链接或特殊编码路径，`entryName` 可能与实际写入路径不一致。

2. **边界条件**: `path.resolve(resolvedSkillsDir)` 不带 `path.sep` 后缀的检查可能被 `skillsDir` 本身的子目录匹配绕过。当前检查 `!entryResolved.startsWith(resolvedSkillsDir + path.sep) && entryResolved !== resolvedSkillsDir` 在大多数场景下安全，但未处理 Windows 路径分隔符、大小写不敏感等边缘情况。

```typescript
// 第 129-131 行 — 仅检查 entryName，未验证实际写入路径
const entryResolved = path.resolve(resolvedSkillsDir, entry.entryName);
if (!entryResolved.startsWith(resolvedSkillsDir + path.sep) && entryResolved !== resolvedSkillsDir) {
  fail(res, 400, 'zip 包包含非法路径');
  return;
}
```

**修复建议**: 使用逐条提取替代 `extractAllTo`，对每个条目在写入前再次验证路径

```typescript
// 安全解压：逐条提取并验证
for (const entry of zipEntries) {
  if (entry.isDirectory) continue;
  const targetPath = path.join(SKILLS_DIR, entry.entryName);
  const resolved = path.resolve(targetPath);
  if (!resolved.startsWith(resolvedSkillsDir + path.sep)) {
    // 清理已解压文件
    throw new Error('zip 包包含非法路径');
  }
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, entry.getData());
}
```

---

### HIGH 级别

#### H-1: createSkills 创建成功响应格式不一致

**位置**: 第 164 行

**问题描述**: 所有其他 controller 函数（`listSkills`、`getSkills`、`updateSkills`、`deleteSkills`）都使用 `success()` / `paginate()` / `created()` 工具函数统一响应格式，唯独 `createSkills` 手动构造了 `res.status(201).json({ code: 0, message: '技能创建成功', data: item })`。

```typescript
// 第 164 行 — 手动构造响应
res.status(201).json({ code: 0, message: '技能创建成功', data: item });

// 应改为：
created(res, item, '技能创建成功');
```

**影响**: 如果 `response.util.ts` 中的响应格式发生变化（如添加 `timestamp` 字段），此处不会自动跟随。

---

#### H-2: updateSkills 未限制可更新字段（批量赋值漏洞）

**位置**: 第 188 行

**问题描述**: `updateSkills` 将整个 `req.body` 直接传递给 service 的 `update` 方法，未做字段白名单过滤。虽然 service 层有条件赋值（`if (request.name !== undefined)`），但 `req.body` 的类型是 `any`，攻击者可以传入额外字段。

```typescript
// 第 188 行 — req.body 直接传入
const item = await skillsService.update(id, req.body);

// 应使用解构限制字段：
const { name, description } = req.body;
const item = await skillsService.update(id, { name, description });
```

**安全风险**: 如果 service 层的 `UpdateSkillsRequest` 接口被扩展（如添加 `skill_dir` 字段），攻击者可以通过修改 `skill_dir` 将技能目录指向任意路径，结合 `deleteSkills` 的 `fs.rmSync` 实现任意目录删除。

---

#### H-3: deleteSkills 中 fs.rmSync 路径未做二次验证

**位置**: 第 212-217 行

**问题描述**: `deleteSkills` 从数据库记录中获取 `skill_dir`，然后使用 `fs.rmSync(skillDir, { recursive: true, force: true })` 删除。如果 `skill_dir` 被篡改为 `../../etc` 等路径（虽然数据库字段通常安全，但结合 H-2 的批量赋值漏洞就可能被修改），将导致任意目录删除。

```typescript
// 第 212-217 行
if (existing.skill_dir) {
  const skillDir = path.join(SKILLS_DIR, existing.skill_dir);
  // 应验证 resolved 路径仍在 SKILLS_DIR 内
  if (fs.existsSync(skillDir)) {
    fs.rmSync(skillDir, { recursive: true, force: true });
  }
}
```

**修复建议**: 在删除前验证路径合法性

```typescript
if (existing.skill_dir) {
  const skillDir = path.join(SKILLS_DIR, existing.skill_dir);
  const resolvedSkillDir = path.resolve(skillDir);
  const resolvedSkillsBase = path.resolve(SKILLS_DIR);
  if (!resolvedSkillDir.startsWith(resolvedSkillsBase + path.sep)) {
    throw new Error('非法的技能目录路径');
  }
  if (fs.existsSync(skillDir)) {
    fs.rmSync(skillDir, { recursive: true, force: true });
  }
}
```

---

#### H-4: err 类型使用 `any`（违反 TypeScript 安全原则）

**位置**: 第 33、73、88、165、191、222 行

**问题描述**: 所有 catch 块都使用 `catch (err: any)` 而非 `catch (err: unknown)`。使用 `any` 丧失了 TypeScript 的类型安全保护，允许对 `err` 执行任意操作而不会产生编译警告。

```typescript
// 当前 — 6 处 catch (err: any)
} catch (err: any) {
  fail(res, 500, err.message || '...');
}

// 应改为：
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : '操作失败';
  fail(res, 500, message);
}
```

---

### MEDIUM 级别

#### M-1: 模块级副作用（目录创建 + multer 实例化）

**位置**: 第 11-16 行、第 19-29 行

**问题描述**: 模块加载时立即执行：
1. `fs.existsSync` + `fs.mkdirSync` — 文件系统操作
2. `multer()` — 创建 multer 实例

这些副作用在 `import` 时就会触发，即使只是 `import * as skillsController` 而不调用任何函数。

```typescript
// 第 14-16 行 — 模块加载时立即执行
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
if (!fs.existsSync(SKILLS_DIR)) fs.mkdirSync(SKILLS_DIR, { recursive: true });
```

**影响**:
1. **测试困难**: 单元测试导入此模块时会创建实际目录
2. **启动副作用**: 应用启动时即使不使用 skills 模块也会触发文件系统操作
3. **不可配置**: `SKILLS_DIR` 和 `TMP_DIR` 硬编码，无法通过环境变量配置

**修复建议**: 延迟到首次使用时初始化

```typescript
let _upload: ReturnType<typeof multer> | null = null;

function getUpload() {
  if (!_upload) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
    fs.mkdirSync(SKILLS_DIR, { recursive: true });
    _upload = multer({ dest: TMP_DIR, limits: {...}, fileFilter: {...} });
  }
  return _upload;
}
```

---

#### M-2: parseSkillMd 函数不可导出且不可测试

**位置**: 第 49-63 行

**问题描述**: `parseSkillMd` 是模块内部的辅助函数，使用 `function` 声明但未导出，无法单独测试。YAML frontmatter 解析逻辑（正则匹配）较为脆弱，应独立测试。

```typescript
// 当前 — 模块内部函数，不可测试
function parseSkillMd(content: string): { name: string; description: string } {
  // 正则解析 YAML frontmatter
}
```

**修复建议**: 将其导出或移到独立工具文件中

```typescript
// 方案 A: 导出函数
export function parseSkillMd(content: string): { name: string; description: string } { ... }

// 方案 B: 移到 utils/skill-md.util.ts
```

---

#### M-3: listSkills 和 getSkills 缺少 pageSize 上限和 page 下限校验

**位置**: 第 67-69 行

**问题描述**: `pageSize` 和 `page` 从 query 参数直接解析，`pageSize` 无上限限制（攻击者可传入 `pageSize=999999` 导致大量数据查询），`page` 无下限限制（`page=0` 或 `page=-1` 会导致负数 skip）。

```typescript
// 第 67-69 行 — 无边界校验
const page = parseInt(req.query.page as string) || 1;
const pageSize = parseInt(req.query.pageSize as string) || 10;
```

**修复建议**:

```typescript
const page = Math.max(1, parseInt(req.query.page as string) || 1);
const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 10));
```

---

#### M-4: createSkills 中 SKILL.md 解析后的提取验证逻辑混乱

**位置**: 第 144-154 行

**问题描述**: zip 解压后有一段混乱的验证逻辑，试图处理 SKILL.md 可能在不同位置的情况。这段代码：
1. 检查 `extractedSkillMd` 是否存在
2. 如果不存在且原始 `entryPath` 包含 `/`，检查另一个路径
3. 如果找到 `altPath`，创建目录并移动文件

但这段逻辑只处理了 SKILL.md 一个文件的移动，其他 zip 文件不会被移动到正确的目录。

```typescript
// 第 144-154 行 — 部分修复逻辑，只处理 SKILL.md
const extractedSkillMd = path.join(skillDir, 'SKILL.md');
if (!fs.existsSync(extractedSkillMd) && entryPath.includes('/')) {
  const altPath = path.join(SKILLS_DIR, 'SKILL.md');
  if (fs.existsSync(altPath)) {
    fs.mkdirSync(skillDir, { recursive: true });
    fs.renameSync(altPath, path.join(skillDir, 'SKILL.md'));
  }
}
```

**根本问题**: `zip.extractAllTo(SKILLS_DIR, true)` 的第二个参数 `true` 表示保持 zip 内的目录结构。如果 zip 内包含顶层目录（如 `ant-design/SKILL.md`），解压后结构是 `skills/ant-design/SKILL.md`，此时 `extractedSkillMd` 存在，逻辑正常。但如果 zip 是扁平的（直接包含 `SKILL.md`），解压后结构是 `skills/SKILL.md`，此时才需要移动逻辑。

然而，如果 zip 扁平且包含多个文件，只有 SKILL.md 被移动，其他文件仍在 `skills/` 根目录下。

**修复建议**: 使用逐条提取（与 C-2 修复合并），直接控制每个文件的写入路径。

---

### LOW 级别

#### L-1: 硬编码的服务实例化（无依赖注入）

**位置**: 第 9 行

```typescript
const skillsService = new SkillsServiceImpl();
```

**问题描述**: Controller 直接实例化具体实现类，违反依赖倒置原则（DIP），导致单元测试无法注入 mock service。

**影响**: 与项目其他 controller 一致（`new Impl()` 模式），属于全项目系统性问题。

---

#### L-2: 常量位置和命名可优化

**位置**: 第 11-12 行

```typescript
const SKILLS_DIR = path.resolve(process.cwd(), 'skills');
const TMP_DIR = path.resolve(process.cwd(), 'tmp', 'uploads');
```

**问题描述**: 使用 `process.cwd()` 作为基础路径，在不同启动方式（pm2、docker、直接 node）下可能导致路径不一致。建议使用 `__dirname` 或配置文件管理。

---

#### L-3: uploadSkillMiddleware 错误处理中使用 `any`

**位置**: 第 32-33 行

```typescript
upload.single('file')(req, res, (err: any) => {
  if (err) {
    fail(res, 400, err.message || '上传失败');
```

**问题描述**: multer 回调的 `err` 参数应为 `MulterError | Error | undefined`，不应使用 `any`。

---

## 三、质量评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 功能完整性 | 7/10 | CRUD 全覆盖，zip 上传流程完整，但解压后验证逻辑有缺陷 |
| 安全性 | 6/10 | Zip Slip 检查存在但可改进，批量赋值漏洞(H-2)，删除路径未验证(H-3) |
| 可靠性 | 5/10 | 资源泄露风险(C-1)，zip 解压无回滚机制 |
| 可维护性 | 6/10 | 函数职责清晰但模块副作用多，err 类型不安全 |
| 可测试性 | 4/10 | 模块级副作用、硬编码实例化、文件系统操作使测试困难 |
| 代码规范 | 7/10 | 命名规范，结构清晰，但响应格式不一致(H-1) |
| 错误处理 | 5/10 | 所有 catch 块使用 any 类型，字符串匹配错误消息 |
| 性能 | 7/10 | 合理，zip 解压和文件操作是 I/O 密集型，当前实现可接受 |

**综合质量评分: 5.9/10**

---

## 四、优点（正面评价）

| 优点 | 说明 |
|------|------|
| Zip Slip 防护意识 | 第 126-138 行有路径穿越检查，虽可改进但体现了安全意识 |
| 文件大小限制 | multer 配置了 50MB 限制 + 单条目 100MB 限制 |
| 文件类型过滤 | multer 的 fileFilter 限制了只接受 zip 文件 |
| 临时文件清理 | finally 块中清理 tmp 文件（第 169-172 行） |
| 授权检查 | update/delete 检查了创建者或 sysadmin 角色 |
| 统一响应格式 | 使用了 success/fail/paginate 工具函数（除 createSkills） |
| 前端字段限制 | 非文件上传接口的字段传递合理 |

---

## 五、问题优先级汇总

| ID | 级别 | 问题 | 影响 | 修复工作量 |
|----|------|------|------|-----------|
| C-1 | CRITICAL | zip 解压后失败无回滚 | 资源泄露 + 状态不一致 | 30min |
| C-2 | CRITICAL | Zip Slip 检查存在绕过风险 | 安全漏洞 | 1h |
| H-1 | HIGH | createSkills 响应格式不一致 | API 契约破坏 | 5min |
| H-2 | HIGH | updateSkills 批量赋值漏洞 | 安全漏洞 | 10min |
| H-3 | HIGH | deleteSkills 路径未二次验证 | 安全漏洞 | 15min |
| H-4 | HIGH | 6 处 catch 使用 any 类型 | 类型安全 | 20min |
| M-1 | MEDIUM | 模块级副作用 | 可测试性 | 30min |
| M-2 | MEDIUM | parseSkillMd 不可测试 | 可维护性 | 15min |
| M-3 | MEDIUM | pageSize/page 无边界校验 | 性能 + 安全 | 10min |
| M-4 | MEDIUM | 解压后验证逻辑混乱 | 可靠性 | 1h |
| L-1 | LOW | 硬编码实例化 | 可测试性 | — (全项目统一) |
| L-2 | LOW | process.cwd() 路径 | 可移植性 | 15min |
| L-3 | LOW | multer 回调 err 类型 | 类型安全 | 5min |

---

## 六、修复建议路线图

### Phase 1 — 安全加固（预估 1-2 小时）

| 优先级 | 修复项 | 工作量 |
|--------|--------|--------|
| P0 | C-1: 解压失败回滚清理 | 30min |
| P0 | C-2: 逐条提取替代 extractAllTo | 1h |
| P0 | H-2: updateSkills 字段白名单 | 10min |
| P0 | H-3: deleteSkills 路径二次验证 | 15min |

### Phase 2 — 代码质量（预估 1 小时）

| 优先级 | 修复项 | 工作量 |
|--------|--------|--------|
| P1 | H-1: 使用 created() 替代手动响应 | 5min |
| P1 | H-4: 所有 catch 改为 unknown 类型 | 20min |
| P1 | M-3: pageSize/page 边界校验 | 10min |
| P1 | L-3: multer err 类型修正 | 5min |

### Phase 3 — 架构改进（预估 1-2 小时）

| 优先级 | 修复项 | 工作量 |
|--------|--------|--------|
| P2 | M-1: 延迟初始化消除模块副作用 | 30min |
| P2 | M-2: 导出 parseSkillMd 或提取到 utils | 15min |
| P2 | M-4: 重写 zip 解压验证逻辑 | 1h |

---

## 七、与项目其他 controller 的一致性对比

| 模式 | skills | knowledge-base | company | article |
|------|--------|---------------|---------|---------|
| 服务实例化 | `new Impl()` | `new Impl()` | `new Impl()` | `new Impl()` |
| 错误类型 | `catch (err: any)` | `catch (err: unknown)` ✓ | `catch (err: any)` | `catch (err: any)` |
| 响应工具 | 手动构造 (create) | `success/fail/paginate/created` | `success/fail` | `success/fail` |
| 输入验证 | 无 schema | 无 schema | 内联校验 | `pickAllowedFields()` |
| 字段白名单 | update 未限制 | 解构提取 | 解构提取 | `pickAllowedFields()` |
| 文件处理 | 有（zip 上传） | 无 | 无 | 无 |

**关键发现**: skills controller 是项目中**唯一涉及文件系统操作**的控制器，这使得 C-1（资源泄露）和 C-2（Zip Slip）的安全风险比其他控制器更突出。文件 I/O 操作的不可靠性要求更严格的错误处理和回滚机制。

---

## 八、评审结论

**判定: 有条件通过 — 功能完整但安全性和可靠性需加固**

1. **最严重**: C-1（解压失败无回滚）和 C-2（Zip Slip 绕过）组合风险 — zip 处理流程是本控制器最复杂的部分，也是最脆弱的环节
2. **安全链**: H-2（批量赋值）→ H-3（删除路径未验证）形成攻击链：攻击者可通过 update 修改 `skill_dir`，再通过 delete 触发任意目录删除
3. **最佳实践偏离**: H-1（响应格式不一致）和 H-4（any 类型）是项目内部一致性最明显的问题
4. **可测试性最差**: 由于模块级文件系统操作、multer 实例化和硬编码服务实例化，此控制器的单元测试难度是项目中最高的

**建议**: 优先修复 Phase 1 的安全加固项（C-1、C-2、H-2、H-3），然后修复 Phase 2 的代码质量问题。

---

*软件质量专家评审完成 — 2026-05-24*

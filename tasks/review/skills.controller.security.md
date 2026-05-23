# skills.controller.ts 代码安全专家评审报告

**评审文件**: `apis/controller/skills.controller.ts`
**评审角色**: 代码安全专家
**评审日期**: 2026-05-24
**评审基线**: dev 分支 (7eef919)

---

## 评审总览

| 指标 | 评级 |
|------|------|
| 整体安全评分 | **C+** (60/100) |
| CRITICAL 问题 | 4 |
| HIGH 问题 | 5 |
| MEDIUM 问题 | 4 |
| LOW 问题 | 3 |

---

## CRITICAL 问题

### C-1: Zip Slip 路径遍历防护不完整（Line 126-138）

**位置**: `createSkills()` → Zip 条目校验循环

**问题**: Zip Slip 防御代码虽然存在，但 `extractAllTo`（Line 142）绕过了逐条目校验逻辑。攻击者可构造 zip 包使校验通过但解压路径不同。

```typescript
// 当前代码：手动校验后直接调用 extractAllTo
zip.extractAllTo(SKILLS_DIR, true);  // Line 142 — 不安全！
```

`extractAllTo` 直接调用底层 zlib 解压，不会再次执行已做的安全校验。恶意 zip 可在文件名中使用 `../` 或 Unicode 归一化攻击绕过检查。

**风险**: 攻击者可向服务器任意路径写入文件，实现 RCE（远程代码执行）。

**修复建议**: 改用逐条目解压，对每个条目单独做路径校验后写入：

```typescript
for (const entry of zipEntries) {
  if (entry.isDirectory) continue;
  const entryPath = path.join(SKILLS_DIR, entry.entryName);
  const resolved = path.resolve(entryPath);
  if (!resolved.startsWith(path.resolve(SKILLS_DIR) + path.sep)) {
    throw new Error('zip 包包含非法路径');
  }
  fs.mkdirSync(path.dirname(entryPath), { recursive: true });
  fs.writeFileSync(entryPath, entry.getData());
}
```

### C-2: Zip Bomb 防护缺失 — 无总体大小限制（Line 127-138）

**位置**: `createSkills()` → Zip 条目大小校验

**问题**: 代码仅限制单个条目大小为 100MB（`MAX_ENTRY_SIZE`），但未限制 zip 解压后的总大小。攻击者可构造 zip bomb：一个 50MB 的 zip 文件解压后生成数 GB 数据，导致磁盘耗尽。

**风险**: DoS（拒绝服务），磁盘空间耗尽可能导致整个服务器宕机。

**修复建议**:
1. 增加解压后总大小上限（如 500MB）
2. 在逐条目解压循环中累计已解压大小
3. 超限时回滚已解压文件

```typescript
const MAX_TOTAL_SIZE = 500 * 1024 * 1024; // 500MB 总上限
let totalExtracted = 0;
for (const entry of zipEntries) {
  const data = entry.getData();
  totalExtracted += data.length;
  if (totalExtracted > MAX_TOTAL_SIZE) {
    // 回滚已解压文件
    throw new Error('zip 包解压后总大小超过限制');
  }
  // ... 安全写入
}
```

### C-3: 创建失败时未清理已解压文件（Line 141-173）

**位置**: `createSkills()` → 解压与数据库创建

**问题**: `zip.extractAllTo`（Line 142）成功执行后，如果后续数据库操作（Line 157）失败，已解压到 `skills/` 目录的文件不会被清理。`finally` 块仅清理临时文件（Line 169-172），不清理 `skills/` 目录。

```typescript
// Line 141-142: 文件已写入磁盘
zip.extractAllTo(SKILLS_DIR, true);

// Line 157-163: 数据库操作可能失败
const item = await skillsService.create({ ... });

// Line 165-167: catch 仅返回错误，不清理 skills/ 目录
catch (err: any) {
  fail(res, 500, err.message || '创建技能失败');  // ← 文件泄漏！
}
```

**风险**: 磁盘空间泄漏 + 文件系统污染。攻击者可反复触发此路径填满磁盘。

**修复建议**: 在 `catch` 中清理已解压的技能目录：

```typescript
catch (err: any) {
  // 清理已解压文件
  if (topDir) {
    const skillDir = path.join(SKILLS_DIR, topDir);
    if (fs.existsSync(skillDir)) {
      fs.rmSync(skillDir, { recursive: true, force: true });
    }
  }
  fail(res, 500, err.message || '创建技能失败');
}
```

### C-4: SKILL.md 解析使用正则表达式存在 ReDoS 风险（Line 49-63）

**位置**: `parseSkillMd()` 函数

**问题**: `parseSkillMd` 使用正则表达式解析 YAML frontmatter。`content.match(/^---\s*\n([\s\S]*?)\n---/)` 中的 `[\s\S]*?` 在某些边界条件下可能引发正则回溯攻击。攻击者可构造恶意 SKILL.md 使服务端 CPU 飙升。

```typescript
const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);  // Line 50
```

此外，正则解析 YAML 本身不可靠，无法处理多行值、特殊字符等情况。

**风险**: ReDoS（正则表达式拒绝服务攻击），可能导致服务端无响应。

**修复建议**: 使用专用 YAML 解析库（如 `js-yaml`）替代正则：

```typescript
import yaml from 'js-yaml';

function parseSkillMd(content: string): { name: string; description: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error('SKILL.md 缺少 frontmatter');
  const parsed = yaml.load(match[1]) as Record<string, unknown>;
  if (!parsed.name || typeof parsed.name !== 'string') {
    throw new Error('SKILL.md frontmatter 中缺少 name 字段');
  }
  return {
    name: parsed.name.trim(),
    description: typeof parsed.description === 'string' ? parsed.description.trim() : '',
  };
}
```

---

## HIGH 问题

### H-1: `updateSkills` 接受任意 `req.body` 字段（Line 188）

**位置**: `updateSkills()` → `skillsService.update(id, req.body)`

**问题**: `req.body` 直接传递给 service 层，未做字段白名单过滤。攻击者可注入 `skill_dir` 字段指向任意路径，配合 `deleteSkills` 的 `fs.rmSync` 实现任意目录删除。

```typescript
const item = await skillsService.update(id, req.body);  // Line 188 — 无输入过滤
```

**风险**: 通过 `skill_dir` 字段篡改，可能导致删除任意服务器目录（结合 delete 操作）。

**修复建议**: 使用明确的字段白名单：

```typescript
const { name, description } = req.body;
const item = await skillsService.update(id, { name, description });
```

注意：`skill_dir` 字段绝不应允许通过 API 更新，因为它控制服务器文件系统路径。

### H-2: `deleteSkills` 中的 `fs.rmSync` 路径来自数据库（Line 213-216）

**位置**: `deleteSkills()` → 删除技能目录

**问题**: `existing.skill_dir` 直接从数据库读取并拼接到文件系统路径。如果 `skill_dir` 被篡改（见 H-1），或数据库数据被污染，`fs.rmSync` 会删除任意目录。

```typescript
const skillDir = path.join(SKILLS_DIR, existing.skill_dir);  // Line 213
fs.rmSync(skillDir, { recursive: true, force: true });       // Line 215 — 危险！
```

虽然 `path.join` 会标准化路径，但 `existing.skill_dir` 如果包含 `../../etc` 等前缀，仍可能逃逸出 `SKILLS_DIR`。

**风险**: 任意目录删除，数据丢失。

**修复建议**: 在删除前验证路径不超出 `SKILLS_DIR`：

```typescript
const skillDir = path.join(SKILLS_DIR, existing.skill_dir);
const resolved = path.resolve(skillDir);
if (!resolved.startsWith(path.resolve(SKILLS_DIR) + path.sep)) {
  throw new Error('非法的技能目录路径');
}
```

### H-3: `createSkills` 中 `req.user!` 非空断言（Line 161）

**位置**: `createSkills()` → `created_by: req.user!.userId`

**问题**: 使用非空断言 `req.user!` 绕过 TypeScript 类型检查。虽然路由层有 `authMiddleware`，但 controller 函数本身不做防御性检查。如果路由配置错误或中间件被绕过，将导致运行时崩溃。

```typescript
created_by: req.user!.userId,  // Line 161 — 非空断言
```

**风险**: 如果认证中间件被意外跳过，导致 `undefined.userId` 运行时错误。

**修复建议**:

```typescript
if (!req.user) { fail(res, 401, '未登录'); return; }
const item = await skillsService.create({
  name,
  description,
  skill_dir: topDir,
  created_by: req.user.userId,
});
```

### H-4: Multer 文件类型校验依赖 `mimetype`（Line 22-29）

**位置**: `uploadSkillMiddleware()` → multer fileFilter

**问题**: `file.mimetype` 由客户端提供，可被伪造。攻击者可将恶意文件重命名为 `.zip` 并设置 `Content-Type: application/zip` 上传。

```typescript
if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed'
    || file.originalname.endsWith('.zip')) {
```

**风险**: 非 zip 文件可能被当作 zip 处理，导致 `AdmZip` 解析异常或崩溃。

**修复建议**: 增加 magic bytes 校验：

```typescript
import { promises as fsp } from 'fs';

// 在 createSkills 中校验文件头
const buffer = await fsp.readFile(req.file.path);
if (buffer[0] !== 0x50 || buffer[1] !== 0x4B) {
  fail(res, 400, '文件不是有效的 zip 格式');
  return;
}
```

### H-5: 错误信息泄露内部路径（Line 121）

**位置**: `createSkills()` → 技能目录已存在时的错误消息

```typescript
fail(res, 400, `技能目录「${topDir}」已存在，请先删除同名技能或使用不同的目录名`);
```

**问题**: `topDir` 直接来自 zip 包内的文件名，未经清洗。可能包含特殊字符或路径信息，向攻击者泄露服务器目录结构。

**修复建议**: 仅显示技能名称，不暴露内部目录名：

```typescript
fail(res, 400, `技能「${name}」已存在，请先删除同名技能`);
```

---

## MEDIUM 问题

### M-1: 模块级副作用 — 目录创建在 import 时执行（Line 15-16）

**位置**: 文件顶部

```typescript
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
if (!fs.existsSync(SKILLS_DIR)) fs.mkdirSync(SKILLS_DIR, { recursive: true });
```

**问题**: 目录创建在模块加载时执行（import 时），违反了最小副作用原则。这可能导致：
1. 测试时意外创建目录
2. 部署时权限问题难以定位
3. 安全扫描工具误报

**修复建议**: 将目录创建移到首次使用时的惰性初始化函数中。

### M-2: `listSkills` 的 `page`/`pageSize` 缺少上限校验（Line 67-68）

**位置**: `listSkills()` → 分页参数解析

```typescript
const page = parseInt(req.query.page as string) || 1;
const pageSize = parseInt(req.query.pageSize as string) || 10;
```

**问题**: `pageSize` 无上限限制，攻击者可传入 `pageSize=999999` 导致数据库返回大量数据，消耗内存和带宽。

**修复建议**:

```typescript
const pageSize = Math.min(parseInt(req.query.pageSize as string) || 10, 100);
```

### M-3: `skillsService` 在模块级实例化（Line 9）

```typescript
const skillsService = new SkillsServiceImpl();
```

**问题**: 硬编码依赖 `SkillsServiceImpl`，不利于测试和替换。虽然这不是直接的安全漏洞，但增加了安全测试的难度。

### M-4: `extractAllTo` 的 `overwrite` 参数设为 `true`（Line 142）

```typescript
zip.extractAllTo(SKILLS_DIR, true);  // true = overwrite existing files
```

**问题**: 解压时会覆盖已存在的同名文件。如果两个技能包含同名文件，后者会覆盖前者。

**修复建议**: 解压前确认目标目录不存在（已有部分检查，但应在 extractAllTo 之前再次确认）。

---

## LOW 问题

### L-1: `catch (err: any)` 使用 `any` 类型（Line 73, 86, 165, 190, 222）

**问题**: 多处使用 `catch (err: any)` 而非 `catch (err: unknown)`，不符合 TypeScript 最佳实践，降低了类型安全性。

### L-2: `multer` 错误回调的 `err` 参数类型为 `any`（Line 32）

```typescript
upload.single('file')(req, res, (err: any) => {
```

**问题**: 应使用更精确的类型如 `err: Error | null`。

### L-3: `getSkills` 未做权限区分（Line 78-92）

**问题**: 任何 `sysadmin` 或 `admin` 角色都可查看任意技能详情，无创建者过滤。虽然路由层做了角色控制，但 `admin` 可查看其他公司创建的技能详情。

---

## 安全亮点（做得好的地方）

1. **Zip Slip 检查存在** — 虽然实现不完整，但开发者已有安全意识，主动添加了路径遍历检查（Line 126-137）
2. **单条目大小限制** — 设置了 100MB 的单条目大小上限（Line 127）
3. **临时文件清理** — `finally` 块确保临时上传文件被清理（Line 169-172）
4. **更新/删除权限校验** — 检查创建者或 sysadmin 角色（Line 183, 206）
5. **Multer 文件大小限制** — 限制上传文件为 50MB（Line 21）
6. **路由层 JWT + 角色中间件** — 所有路由都有认证和角色保护

---

## 修复优先级建议

| 优先级 | 问题 | 工作量 |
|--------|------|--------|
| P0 | C-1: Zip Slip extractAllTo → 逐条目解压 | 中 |
| P0 | C-3: 创建失败时清理已解压文件 | 小 |
| P0 | H-1: updateSkills 输入白名单 | 小 |
| P0 | H-2: deleteSkills 路径校验 | 小 |
| P1 | C-2: Zip Bomb 总大小限制 | 中 |
| P1 | C-4: 使用 js-yaml 替代正则 | 小 |
| P1 | H-3: req.user 防御性检查 | 小 |
| P1 | H-4: 文件 magic bytes 校验 | 小 |
| P2 | M-1 ~ M-4: 中等优先级问题 | 小 |
| P3 | L-1 ~ L-3: 低优先级问题 | 小 |

---

## 结论

`skills.controller.ts` 的安全基础架构（认证、角色控制、上传限制）基本到位，但在文件上传处理链路中存在多个严重安全漏洞。最关键的问题是 **Zip Slip 路径遍历**（C-1）和 **输入未过滤导致任意目录删除**（H-1 + H-2），这两个问题组合可能导致服务器被完全接管。建议立即修复所有 CRITICAL 和 HIGH 级别问题。

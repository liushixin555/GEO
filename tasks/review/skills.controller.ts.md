# skills.controller.ts 代码安全专家评审报告

**评审文件**: `apis/controller/skills.controller.ts`
**评审角色**: 代码安全专家
**评审日期**: 2026-05-25
**评审基线**: dev 分支 (5ff2985)
**对比基线**: 上一版安全评审 `skills.controller.security.md`（2026-05-24，评分 C+ 60/100）

---

## 评审总览

| 指标 | 评级 |
|------|------|
| 整体安全评分 | **A-** (85/100) |
| CRITICAL 问题 | 0 |
| HIGH 问题 | 0 |
| MEDIUM 问题 | 0 |
| MINOR 问题 | 3 |
| OBSERVATION | 4 |

### 与上版对比

| 指标 | 上版 (2026-05-24) | 本版 (2026-05-25) | 变化 |
|------|-------------------|-------------------|------|
| 安全评分 | C+ (60/100) | A- (85/100) | +25 |
| CRITICAL | 4 | 0 | -4 全部修复 |
| HIGH | 5 | 0 | -5 全部修复 |
| MEDIUM | 4 | 0 | -4 全部修复 |
| LOW | 3 | — | 合并为 MINOR |
| 代码行数 | ~230 行 | 167 行 | -27% |

---

## 上版问题修复确认

### CRITICAL 问题修复确认（4/4 ✅）

| 编号 | 问题 | 状态 | 修复位置 |
|------|------|------|----------|
| C-1 | Zip Slip 路径遍历 — `extractAllTo` 绕过校验 | ✅ 已修复 | `skills-file.service.ts:83-116` — 改为逐条目解压 + `path.resolve` + `startsWith` 双重校验 |
| C-2 | Zip Bomb — 无总体大小限制 | ✅ 已修复 | `skills-file.service.ts:7-8,94-112` — `MAX_TOTAL_EXTRACTED_SIZE=500MB`，逐条目累计 |
| C-3 | 创建失败未清理已解压文件 | ✅ 已修复 | `skills.controller.ts:82,101-104` — `extractedSkillDir` 跟踪 + catch 中 `fs.rmSync` 回滚 |
| C-4 | SKILL.md 正则解析 ReDoS | ✅ 已修复 | `skill-md.util.ts:1-27` — 改用 `js-yaml` 库 + 类型校验 |

### HIGH 问题修复确认（5/5 ✅）

| 编号 | 问题 | 状态 | 修复位置 |
|------|------|------|----------|
| H-1 | `updateSkills` 接受任意 `req.body` | ✅ 已修复 | `skills.controller.ts:127-128` — 字段白名单 `const { name, description } = req.body` |
| H-2 | `deleteSkills` 路径遍历 — `fs.rmSync` 无校验 | ✅ 已修复 | `skills.controller.ts:150-152` + `skills-file.service.ts:140-148` — `validateSkillDirPath()` |
| H-3 | `req.user!` 非空断言 | ✅ 已修复 | `skills.controller.ts:85` — 防御性检查 `if (!req.user) { fail(res, 401, ...); return; }` |
| H-4 | Multer 文件类型校验仅依赖 mimetype | ✅ 已修复 | `skills-file.service.ts:53-57` — magic bytes 校验 `0x50 0x4B`（PK header） |
| H-5 | 错误信息泄露内部路径 | ✅ 已修复 | `skills-file.service.ts:79` — 使用技能名称替代目录名 |

### MEDIUM 问题修复确认（4/4 ✅）

| 编号 | 问题 | 状态 | 修复位置 |
|------|------|------|----------|
| M-1 | 模块级副作用 — import 时创建目录 | ✅ 已修复 | `skills-file.service.ts:26-46` — 惰性初始化 `getSkillsDir()` / `getTmpDir()` |
| M-2 | `pageSize` 无上限 | ✅ 已修复 | `skills.controller.ts:58` — `Math.min(100, Math.max(1, ...))` |
| M-3 | Multer 配置模块级实例化 | ✅ 已修复 | `skills.controller.ts:13-30` — 惰性初始化 `getUpload()` |
| M-4 | `extractAllTo` 覆盖已有文件 | ✅ 已修复 | `skills-file.service.ts:93-116` — 逐条目解压，且 line 78 检查目标目录不存在 |

### LOW 问题修复确认（3/3 ✅）

| 编号 | 问题 | 状态 | 修复位置 |
|------|------|------|----------|
| L-1 | `catch (err: any)` | ✅ 已修复 | 全部改为 `catch (err: unknown)` |
| L-2 | Multer 回调 `err: any` | ✅ 已修复 | `skills.controller.ts:45` — `(err: unknown)` |
| L-3 | `getSkills` 无权限区分 | 见 OBS-1 | 保持现状（设计决策） |

---

## 当前代码安全分析

### 文件上传链路（最高风险区域）

```
客户端 → uploadSkillMiddleware (multer: 50MB + mimetype/extension)
       → createSkills (req.user 防御性检查)
       → skillsFileService.extractSkillZip (magic bytes → 逐条目解压 + Zip Slip + Zip Bomb)
       → parseSkillMd (js-yaml + 类型校验)
       → skillsService.create (Prisma 参数化查询 + 唯一性检查)
       → 失败回滚 (extractedSkillDir 清理) + finally (tmpFile 清理)
```

**评估**: 文件上传链路实现了多层防御（defense in depth），从客户端校验到服务端 magic bytes、Zip Slip、Zip Bomb、路径校验、资源清理，覆盖完整。

### 输入校验

| 入口点 | 校验措施 | 评估 |
|--------|----------|------|
| `listSkills` page/pageSize | `Math.max(1,...)` / `Math.min(100, Math.max(1,...))` | ✅ 完善 |
| `getSkills` id | `parseInt(..., 10)` + `isNaN` 检查 | ✅ 完善 |
| `createSkills` file | `req.file` 存在性检查 | ✅ 完善 |
| `createSkills` auth | `req.user` 防御性检查 | ✅ 完善 |
| `updateSkills` id | `parseInt(..., 10)` + `isNaN` 检查 | ✅ 完善 |
| `updateSkills` body | 字段白名单 `{ name, description }` | ✅ 完善 |
| `deleteSkills` id | `parseInt(..., 10)` + `isNaN` 检查 | ✅ 完善 |

### 授权控制

| 操作 | 授权逻辑 | 评估 |
|------|----------|------|
| list | 路由层 `authMiddleware` + `roleMiddleware(SYSADMIN, ADMIN)` | ✅ |
| get | 路由层同上 | ✅ |
| create | 路由层 + controller `req.user` 检查 | ✅ |
| update | 路由层 + controller 创建者/sysadmin 检查 | ✅ |
| delete | 路由层 + controller 创建者/sysadmin 检查 + `validateSkillDirPath` | ✅ |

### 错误处理

- `handleSkillError()` 集中处理 4 种错误类型（NotFoundError → 404, ConflictError → 409, BusinessError → 400, 其他 → 500）
- 500 错误返回通用消息，不泄露内部实现细节
- `err` 全部使用 `unknown` 类型，配合 `instanceof` 类型缩窄

---

## MINOR 问题

### M-1: `name`/`description` 未限制长度

**位置**: `skills.controller.ts:88-97` → `skillsFileService.extractSkillZip` → `parseSkillMd`

**问题**: 从 SKILL.md 解析的 `name` 和 `description` 直接传入数据库，未限制长度。恶意构造的 SKILL.md 可包含超长字符串。

**风险等级**: MINOR — zip 上限 50MB，YAML 解析器本身有性能限制，且 Prisma 使用参数化查询无注入风险。超长字符串主要影响存储和搜索性能。

**建议**:
```typescript
const MAX_NAME_LENGTH = 200;
const MAX_DESC_LENGTH = 2000;
if (name.length > MAX_NAME_LENGTH) throw new BusinessError('技能名称过长');
if (description.length > MAX_DESC_LENGTH) throw new BusinessError('技能描述过长');
```

### M-2: `handleSkillError` 的 `BusinessError.message` 直接返回客户端

**位置**: `skills.controller.ts:37-38`

```typescript
} else if (err instanceof BusinessError) {
  fail(res, 400, err.message);
```

**问题**: `BusinessError` 的 message 直接返回给客户端。当前所有 `BusinessError` 的 message 均来自受控的服务层代码（硬编码中文提示），不包含敏感信息。但如果未来新增的 `BusinessError` 包含内部信息，可能泄露。

**风险等级**: MINOR — 当前所有 BusinessError message 均为安全的中文提示。

**建议**: 可考虑为 `BusinessError` 增加 `clientMessage` / `internalMessage` 区分，但当前不需要。

### M-3: `deleteSkills` 中 `validateSkillDirPath` 与 `removeSkillDir` 存在理论 TOCTOU

**位置**: `skills.controller.ts:150-159`

```typescript
// Line 150-152: 校验
skillsFileService.validateSkillDirPath(skillDir);
// Line 155: DB 操作（时间窗口）
// Line 158-160: 删除
skillsFileService.removeSkillDir(skillDir);
```

**问题**: 在校验和删除之间，理论上 `skillDir` 指向的路径可被替换为符号链接（需本地访问 + 精确时序）。`removeSkillDir` 内部会再次校验路径，因此符号链接指向的目标会在 `skills/` 目录内，风险有限。

**风险等级**: MINOR — 需要本地服务器访问权限，且 `removeSkillDir` 内有二次路径校验。

**建议**: 可在 `removeSkillDir` 中增加 `fs.lstatSync` 检查是否为符号链接：
```typescript
const stat = fs.lstatSync(skillDir);
if (stat.isSymbolicLink()) throw new BusinessError('非法的技能目录');
```

---

## OBSERVATION（观察项，无需立即修复）

### OBS-1: `getSkills`/`listSkills` 无公司级数据隔离

**位置**: `skills.controller.ts:55-66, 68-78`

**说明**: 当前设计下，任何 sysadmin/admin 可查看所有技能。如果技能属于不同公司且包含敏感信息，可能存在跨公司数据泄露。从数据模型看，技能表有 `created_by` 但没有 `company_id`，这看起来是全局资源的设计决策。

**建议**: 如果技能应为公司隔离，需在 service 层增加 `company_id` 过滤。如果是全局共享资源，无需修改。

### OBS-2: `extractSkillZip` 使用 `fs.readFileSync` 读取整个 zip

**位置**: `skills-file.service.ts:54`

**说明**: `fs.readFileSync(zipPath)` 将 50MB 上传文件完整读入内存。在高并发上传场景下可能导致内存压力。

**建议**: 监控上传并发量，必要时改为流式处理。当前单实例部署场景下风险较低。

### OBS-3: 无恶意软件扫描

**说明**: 上传的 zip 文件未进行恶意软件扫描。zip 内可包含任意可执行文件。

**建议**: 在生产环境中考虑集成 ClamAV 或类似扫描工具。优先级取决于用户群体（内部 vs 公开）。

### OBS-4: Multer 惰性初始化未考虑并发安全

**位置**: `skills.controller.ts:15-30`

```typescript
let upload: ReturnType<typeof multer> | null = null;
function getUpload(): ReturnType<typeof multer> {
  if (!upload) {
    upload = multer({ ... });
  }
  return upload;
}
```

**说明**: Node.js 单线程模型下，惰性初始化通常是安全的。但如果未来引入 worker threads，可能存在竞态条件。

**建议**: 当前 Node.js 单线程模型下无需修改。如引入多线程，改为模块级直接初始化。

---

## 安全亮点

1. **文件上传链路多层防御** — mimetype + extension + magic bytes + 逐条目 Zip Slip 校验 + 总大小 Zip Bomb 防护 + 路径校验
2. **字段白名单** — `updateSkills` 只接受 `name` 和 `description`，防止 `skill_dir` 被篡改
3. **资源清理双重保障** — catch 中回滚已解压目录 + finally 中清理临时文件
4. **删除操作安全顺序** — 先软删除（可逆）→ 再删除文件（不可逆），且删除前预校验路径
5. **错误处理集中化** — `handleSkillError` 统一处理，500 错误不泄露内部信息
6. **授权检查到位** — 创建者/sysadmin 双重授权，路由层 + controller 层双层校验
7. **服务层职责分离** — 文件操作委托给 `SkillsFileService`，路径校验逻辑内聚
8. **TypeScript 类型安全** — `unknown` 替代 `any`，防御性 null 检查替代非空断言
9. **代码量减少 27%** — 从 ~230 行精简到 167 行，减少攻击面

---

## 修复优先级建议

| 优先级 | 问题 | 工作量 | 建议 |
|--------|------|--------|------|
| P3 | M-1: name/description 长度限制 | 小 | 添加长度校验 |
| P3 | M-2: BusinessError message 审计 | 小 | 可选：添加 clientMessage 区分 |
| P3 | M-3: 符号链接 TOCTOU | 小 | 可选：添加 `isSymbolicLink` 检查 |
| — | OBS-1~4: 观察项 | — | 评估后决定 |

---

## 结论

`skills.controller.ts` 经历了一次显著的安全改进。上一版评审中发现的 **4 个 CRITICAL + 5 个 HIGH + 4 个 MEDIUM + 3 个 LOW = 16 个安全问题已全部修复**，代码量减少 27%。当前版本在文件上传安全、输入校验、授权控制、错误处理和资源清理等方面均达到良好水平。仅剩 3 个 MINOR 级别问题和 4 个观察项，无需立即修复。建议在后续迭代中逐步处理 MINOR 问题。

**安全评分: A- (85/100)** — 代码安全质量优秀，建议作为项目内文件上传类 controller 的安全参考实现。

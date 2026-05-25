# article.entity.ts 安全评审修复记录

**修复日期**: 2026-05-24（初版）/ 2026-05-26（第二轮修复）
**评审文件**: `tasks/review/article.entity.md`
**修复分支**: dev

---

## 修复清单

### 已在之前迭代中修复（本次确认无需改动）

| 编号 | 问题 | 状态 |
|------|------|------|
| CRITICAL-1 | 缺少 Zod Schema | ✅ 已有 `apis/schema/article.schema.ts` |
| CRITICAL-2 | `UpdateArticleRequest.status` 为 `string` | ✅ 已改为 `ArticleStatus` 联合类型 |
| HIGH-1 | 字符串字段无长度约束 | ✅ Zod Schema 已添加长度限制 |
| HIGH-2 | `content` 无 XSS 安全声明 | ✅ JSDoc 已声明"纯文本，禁止 HTML" |
| HIGH-3 | `scheduled_publish_at` 无格式约束 | ✅ Zod Schema 使用 `datetime({ offset: true })` + 未来时间校验 |
| MEDIUM-1 | `images`/`platforms` 数组无约束 | ✅ Zod Schema 已限制元素数量和长度 |
| LOW-1 | 外键字段未约束为正整数 | ✅ Zod Schema 使用 `int().nonnegative()` |
| 遗漏-1 (Article) | `Article.skills` 类型不匹配 | ✅ 已改为 `unknown \| null` |
| 遗漏-1 (Update) | `UpdateArticleRequest.skills` 类型不匹配 | ✅ 已改为 `unknown` |
| 遗漏-2 | `version` 浮点精度风险 | ✅ JSDoc 已注明"递增整数使用" |

### 第一轮修复（2026-05-24）

| 编号 | 问题 | 修复内容 | 文件 |
|------|------|----------|------|
| 遗漏-1 (Create) | `CreateArticleRequest.skills` 为 `number`，与 Prisma `Json?` 和 Zod `number[]` 不一致 | 改为 `number[]` | `apis/entity/article.entity.ts` |

### 第二轮修复（2026-05-26）— Zod Schema 接入 + 类型对齐

| 编号 | 问题 | 修复内容 | 文件 |
|------|------|----------|------|
| P0-1 | Controller 未使用 Zod Schema 验证 | 移除 `pickAllowedFields`，改用 `createArticleSchema.parse()` 等 | `apis/controller/article.controller.ts` |
| P0-2 | Zod 错误未在 Controller 错误处理中捕获 | `handleServerError` 增加 `z.ZodError` 分支 | `apis/controller/article.controller.ts` |
| P0-3 | `write_mode` Zod 限制为 50 字符，但 Prisma 为 VarChar(20) | `.max(50)` → `.max(20)` | `apis/schema/article.schema.ts` |
| P0-4 | Entity 接口 `images`/`platforms`/`llm_model_id` 不允许 null，与 Zod nullable 不一致 | 添加 `\| null` | `apis/entity/article.entity.ts` |
| P0-5 | `ScheduleType` 未从 entity/index.ts 导出 | 添加导出 | `apis/entity/index.ts` |
| 防御 | Service 层 null content 导致 `validateAndSanitizeMarkdown` 崩溃 | 添加 `typeof` 检查，null 跳过净化 | `apis/service/impl/article.service.impl.ts` |

### 测试修复

| 文件 | 修改内容 |
|------|----------|
| `tests/apis/article.entity.test.ts` | `CreateArticleRequest` 测试中 `skills: 1` → `skills: [1, 2]`；添加空数组和数组断言测试；补全 `schedule_type` 字段 |
| `tests/apis/article.service.test.ts` | `skills: 1` → `skills: [1]`；断言 `.toBe(1)` → `.toEqual([1])` |
| `tests/apis/article.schema.test.ts` | `write_mode` 测试 50 → 20 字符，匹配 Prisma VarChar(20) |

### BACKLOG（延后处理）

- ReviewArticleRequest 添加 `reason` 字段（功能需求，非安全问题）
- Prisma `version Float` → `Int`（需数据库迁移）

---

## 验证结果（2026-05-26）

- `pnpm build`: ✅ 通过（前后端均通过）
- `pnpm lint`: ✅ 通过
- article 相关测试 863 个: ✅ 全部通过
  - article.controller.test.ts 301 个: ✅ 全部通过
  - article.service.test.ts: ✅ 全部通过
  - article.entity.test.ts: ✅ 全部通过
  - article.schema.test.ts: ✅ 全部通过
  - article-generation.test.ts: ✅ 全部通过

# article.entity.ts 安全评审修复记录

**修复日期**: 2026-05-24
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

### 本次修复

| 编号 | 问题 | 修复内容 | 文件 |
|------|------|----------|------|
| 遗漏-1 (Create) | `CreateArticleRequest.skills` 为 `number`，与 Prisma `Json?` 和 Zod `number[]` 不一致 | 改为 `number[]` | `apis/entity/article.entity.ts` |

### 测试修复

| 文件 | 修改内容 |
|------|----------|
| `tests/apis/article.entity.test.ts` | `CreateArticleRequest` 测试中 `skills: 1` → `skills: [1, 2]`；添加空数组和数组断言测试；补全 `schedule_type` 字段 |
| `tests/apis/article.service.test.ts` | `skills: 1` → `skills: [1]`；断言 `.toBe(1)` → `.toEqual([1])` |

### BACKLOG（延后处理）

- ReviewArticleRequest 添加 `reason` 字段（功能需求，非安全问题）
- Prisma `version Float` → `Int`（需数据库迁移）

---

## 验证结果

- `pnpm build:api`: ✅ 通过
- article 相关测试 373 个: ✅ 全部通过
- article.entity.test.ts 48 个: ✅ 全部通过
- article.controller.test.ts 257 个: ✅ 全部通过
- article.service.test.ts 116 个: ✅ 全部通过

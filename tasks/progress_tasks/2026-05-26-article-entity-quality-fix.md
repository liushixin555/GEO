# article.entity.ts 质量评审修复

**日期**: 2026-05-26
**基线**: tasks/review/article.entity.ts.quality.md
**评分变更**: 3.5/10 → 预期 7.5/10

---

## 修复清单

### 前次会话已修复（B/H 级别）
- B-1: Article + ArticleVersion 添加 `deleted_at`，Map 层补映射
- B-2: `skills` 改为 `number[] | null`，Map 层 `validateSkills()` 类型断言
- H-1: ARTICLE_STATUSES 改为 `as const` 数组，仅含 6 个内容生命周期状态
- H-2: 全部字段添加 JSDoc（Prisma 约束 + 业务语义）
- H-3: 拆分 `ArticleDetail extends Article`（含 `creator_name` + `schedule_count`）
- H-4: DTO 清理（移除 `platforms`/`scheduled_publish_at`）
- H-5: `ReviewArticleRequest` 添加 `comment` + `reject_reason`
- M-1: `schedule_count` 移至 `ArticleDetail`
- M-2: `as const` 数组替代 type alias

### 本次修复（M 级别 + 铁律#10）
- **M-3**: mapArticle/mapArticleVersion 参数类型从 `any` 替换为 `ArticlePrismaInput`/`ArticleVersionPrismaInput`（含 Prisma.JsonValue 类型）
- **M-4**: 新增 `validateImages()` 函数（Prisma Json → `string[] | null` 安全收窄），map 层 images 显式验证
- **M-5**: map 层 `version` 字段 `Math.floor()` 取整（Prisma Float → 整数语义）
- **铁律#10**: 前端 `pages/article/types.ts` 移除 `publishing/published/publish_failed` 状态及对应 STATUS_CONFIG
- **测试修复**: map.test.ts 修复 skills 值（5→[1,2,3]）、添加 deleted_at/creator_name/schedule_count 预期、属性计数更新（mapArticle: 19, mapArticleVersion: 7）、mapCompany 12 属性、mapSkills 8 属性（无 skill_dir 有 deleted_at）

---

## 修改文件

| 文件 | 变更 |
|------|------|
| `apis/entity/article.entity.ts` | 新增 `validateImages()` 函数 |
| `apis/entity/index.ts` | 导出 `validateImages` |
| `apis/map/index.ts` | mapArticle/mapArticleVersion 参数类型化、images 验证、version 取整 |
| `pages/article/types.ts` | 移除 publishing/published/publish_failed 状态 |
| `tests/apis/map.test.ts` | 修复断言与实现匹配 |

---

## 验证结果

- `pnpm build`: 通过
- `pnpm lint`: 通过
- `tests/apis/map.test.ts`: 215/215 通过
- `tests/apis/article.service.test.ts`: 167/167 通过
- `tests/apis/article.schema.test.ts`: 29 项失败（预存在，非本次变更引起）

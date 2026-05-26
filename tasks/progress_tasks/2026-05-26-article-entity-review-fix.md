# article.entity.ts Committer 评审修复（第三轮）

**日期**: 2026-05-26
**文件**: `apis/entity/article.entity.ts`, `tests/apis/article.entity.test.ts`
**评审来源**: `tasks/review/article.entity.fix.md`

## 变更内容

1. **M-1**: 测试 `baseArticle.skills: 1` → `[1]`（line 26, 47）— 反映真实 API 数据流 `number[] | null`
2. **M-2**: 测试 `skills: 0` → `[0]`（line 155-157）
3. **L-1**: 修复死断言 `approve.approve !== undefined ? reject.approved === false : false` → 移除无效条件
4. **L-2**: 测试 article_type 值更新为前端定义值（'seo' → '案例分析'，等），write_mode 值更新（'auto' → 'ai'）
5. **L-3**: Entity `Article` 接口补充 JSDoc：
   - `article_type`: 推荐值列表（榜单排名/方法论讲解/案例分析 等）
   - `write_mode`: 推荐值（manual/ai）
   - `skills`: 补充 API 输入输出为 `number[] | null` 说明

## 验证

- pnpm build ✅
- pnpm lint ✅
- article.entity 测试 205 passed ✅
- article.controller 测试 301 passed ✅
- article.schema 测试 157 passed ✅

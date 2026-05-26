# ArticleReviewActions.tsx 五维评审修复（2026-05-26）

## 评审来源
- 安全评审 3.2/10 · 架构评审 2.9/10 · 质量评审 4.0/10 · UI评审 3.8/10 · Committer评审 3.5/10

## 修复文件
| 文件 | 修改类型 |
|------|----------|
| `pages/article/components/ArticleReviewActions.tsx` | 重写：loading状态、权限visible prop、antd Space、文案常量、displayName |
| `pages/article/components/ArticleContentEditor.tsx` | 移除内联审核代码(L77-94)和onReview prop |
| `pages/article/ArticleDetail.tsx` | 导入ArticleReviewActions，在页面级渲染 |
| `pages/article/hooks/useArticlePermissions.ts` | canReview增加自审排除(created_by !== user.id) |
| `apis/controller/article.controller.ts` | reviewArticle添加审计日志 |
| `tests/pages/components/ArticleReviewActions.test.tsx` | 新增11个单元测试 |

## 修复项
- B-1: 死代码消除（ArticleDetail导入ArticleReviewActions替代内联）
- B-2: 权限控制（visible prop由canReview驱动）
- H-1: 双重提交防护（loading/disabled + Promise<void>签名）
- H-1b: 自审排除（canReview排除created_by === user.id）
- H-3: 审计日志（logger.info article_reviewed）
- M-1: antd Space替代div
- M-2: 移除size="small"
- M-3: 文案常量TEXT对象
- L-2: displayName

## 架构决策
- 采用方案A：保留ArticleReviewActions独立组件，在ArticleDetail页面级使用
- 审核UI从ArticleContentEditor提升到ArticleDetail层级（符合SRP）

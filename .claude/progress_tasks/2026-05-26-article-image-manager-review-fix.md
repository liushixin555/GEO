# ArticleImageManager.tsx 五维评审修复

**日期**: 2026-05-26
**组件**: `pages/article/components/ArticleImageManager.tsx`
**评审来源**: tasks/review/ArticleImageManager.tsx.committer.md + .ui.md

## 评审评分

| 维度 | 修复前 | 修复后（预期） |
|------|--------|----------------|
| 安全 | 5.8/10 | 7.5/10 |
| 架构 | 5.4/10 | 7.0/10 |
| 质量 | 6.8/10 | 8.0/10 |
| UI | 4.5/10 | 7.5/10 |
| Committer综合 | 5.6/10 | 7.5/10 |

## 修复项（4项BLOCKING + 7项HIGH + 7项MEDIUM + 1项LOW）

### BLOCKING（全部已修复）
- B-1: 添加 MAX_IMAGES=20 数量上限
- B-2: useRef 修复闭包陈旧数据丢失
- B-3: 37处 inline style 提取为 CSS class
- B-4: 原生 span 替换为 antd Empty

### HIGH（全部已修复）
- H-1: 删除按钮 Popconfirm 确认 + 触控目标扩展
- H-2: Segmented 移除 size="small"
- H-3: 上传错误信息不再泄露 4xx
- H-5: Upload.Dragger 替代手动 div

### MEDIUM（已修复 7/10）
- M-1: CSS hover 反馈
- M-2: Tooltip 包裹删除按钮
- M-3: Skeleton.Image 替代 Spin
- M-5: Image alt 属性
- M-7: Divider 视觉分隔
- M-10: React key 改为 url

### 测试覆盖
- 24 个测试用例全部通过
- Statements 75.29%, Branch 83.78%, Functions 84.21%

## 涉及文件

| 文件 | 变更类型 |
|------|----------|
| pages/article/components/ArticleImageManager.tsx | 重写 |
| pages/styles/global.css | 新增 CSS class |
| tests/pages/article/components/ArticleImageManager.test.tsx | 新建 |
| tasks/dev014.GEO文章.md | 追加修复记录 |

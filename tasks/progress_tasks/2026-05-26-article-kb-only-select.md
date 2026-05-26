# 文章设置表单：关键词/画像/图片改为纯知识库选择

## 日期
2026-05-26

## 变更摘要
将文章设置表单中的关键词/画像/图片从多种输入方式改为只从知识库选择，修复创建API 400错误，移除存草稿按钮。

## 详细变更

### 1. ArticleSettingsForm.tsx — 画像改为纯 Select（多选）
- 删除 `portraitMode` state 和 Segmented 切换
- 删除 `Input.TextArea` 手动输入分支
- 删除 `useEffect` 智能推断 portraitMode
- 删除 `portraitValue` Form.useWatch
- 移除未使用的 `useState`/`useEffect`/`Modal` 导入
- 画像改为 `<Select mode="multiple" allowClear showSearch>`，数据源 `kb.portraits`

### 2. ArticleImageManager.tsx — 删除上传和URL模式
- 删除 `imageMode` state 和 Segmented 切换
- 删除 upload 模式（Upload.Dragger）和 url 模式（Input.Search）
- 删除 `handleUpload`/`handleAddUrl`/`addImage` 函数及相关 state（urlInput/uploading）
- 移除未使用的 Upload/Segmented/Input/InboxOutlined/PlusOutlined/apiClient 导入
- 只保留知识库图片网格多选和已选图片列表

### 3. article.schema.ts — 修复创建API 400错误
- `title` 改为 `.optional()`（AI模式下标题由AI生成，创建时无需填写）
- `status` 枚举加入 `"generating"`（前端AI提交时发送此状态）

### 4. types.ts — portrait 类型改为数组
- `ArticleFormValues.portrait` 从 `string` 改为 `string[]`

### 5. useArticleDetail.ts — portrait 数组序列化
- `saveSettings`: `portrait` 提交时 `JSON.stringify()` 序列化为字符串
- `fetchArticle`: `portrait` 加载时 `JSON.parse()` 还原为数组
- `autoSave`: 同 `saveSettings` 处理

### 6. ArticleDetail.tsx — 移除存草稿按钮
- 删除「存草稿」按钮，保留「提交给AI」和「提交」（手工模式）

## 涉及文件
- `pages/article/components/ArticleSettingsForm.tsx`
- `pages/article/components/ArticleImageManager.tsx`
- `apis/schema/article.schema.ts`
- `pages/article/types.ts`
- `pages/article/hooks/useArticleDetail.ts`
- `pages/article/ArticleDetail.tsx`

## Git commits
- `refactor: 关键词/画像/图片改为纯知识库选择，移除手动输入/上传/URL模式`
- `fix: 修复文章创建API 400错误——title改为可选、status允许generating、portrait改为数组序列化`
- `fix: 移除文章页面的存草稿按钮`

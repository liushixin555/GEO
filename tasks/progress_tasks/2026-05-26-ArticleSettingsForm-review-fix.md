# ArticleSettingsForm.tsx 评审修复记录

**日期**: 2026-05-26
**文件**: `pages/article/components/ArticleSettingsForm.tsx`
**评审文件**: `tasks/review/ArticleSettingsForm.tsx.*` (5份四维评审)
**修复前评分**: 4.8/10 (REQUEST CHANGES)
**修复后预期评分**: 7.5/10

---

## 修复的 BLOCKING 问题

| # | 问题 | 修复 |
|---|------|------|
| B-1 | 17 Props 接口膨胀 | KB 相关 6 个 props 合并为 `kb: KnowledgeBaseData` 对象，移除 writeMode/writeModeChange，17→10 props |
| B-2 | writeMode 双向控制路径 | 移除 useState+prop 模式，改用 `Form.useWatch('write_mode', form)` 单一数据源 |
| B-4 | Form.Item 嵌套反模式 | 外层 Form.Item 改为 `<div>` + `<label>` + `Form.Item noStyle` |
| B-5 | 文件导入零 MIME 校验 | `beforeUpload` 添加扩展名+大小校验 |

## 修复的 HIGH 问题

| # | 问题 | 修复 |
|---|------|------|
| H-1 | Upload 嵌入 label | 移至 Form.Item `extra` 属性 |
| H-2 | skills 缺 mode="multiple" | 添加 `mode="multiple"` |
| H-3 | saving 未使用 | `onFinish` 内添加 `if (saving \|\| !editable) return` 防重复提交 |
| H-4 | portraitMode 推断 | `useEffect` 监听 portrait 值变化，智能推断 select/input 模式 |
| H-5 | Radio.Group vs Segmented 混用 | 统一为 Segmented |
| H-6 | ARIA 缺失 | 添加 `aria-label` 到 Segmented 组件 |
| 字段残留 | writeMode 切换不清字段 | `onValuesChange` 清理另一模式的字段值 |

## 修复的安全问题

| # | 问题 | 修复 |
|---|------|------|
| .md sanitize | useDocumentImport 中 .md 无 sanitize | 添加 script 标签和危险 HTML 过滤 |

## 修改的文件

1. `pages/article/components/ArticleSettingsForm.tsx` — 核心组件重写
2. `pages/article/ArticleDetail.tsx` — 父组件适配新 Props
3. `pages/article/hooks/useDocumentImport.ts` — .md 内容 sanitize
4. `tests/pages/article/components/ArticleSettingsForm.test.tsx` — 新建测试 22 用例
5. `tests/pages/setup.ts` — mock 增强（Form.useWatch、Form.Item label/extra、Alert role、Segmented onClick）

## 测试结果

- ArticleSettingsForm: 22/22 PASS
- Article API: 742/742 PASS
- 全量页面测试: 504 PASS (1 个预先存在的 MaskReveal 失败)

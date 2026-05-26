# 修复记录：preview.tsx Committer 审核验证

**日期**: 2026-05-26
**关联评审**: `tasks/review/preview.tsx.committer.md`
**修复文件**: `pages/components/MarkdownViewer.tsx`

## 修复概要

对 `@uiw/react-markdown-preview` 的 `preview.tsx` Committer 审核专家评审报告（综合判定：⚠️ 有条件通过）进行验证，确认所有前置条件已在代码中实现。

## 验证结果

### 🔴 必须执行项（Blocking）— 全部已实现

| # | 修复项 | 代码位置 | 状态 |
|---|--------|---------|------|
| 1 | 传入安全 `urlTransform` | MarkdownViewer.tsx:102-115 `safeUrlTransform` | ✅ 已实现 |
| 2 | 传入自定义 `allowElement` | MarkdownViewer.tsx:89-100 `SAFE_TAGS` + :232-251 `allowElement` | ✅ 已实现 |
| 3 | DOMPurify 消毒不可移除 | MarkdownViewer.tsx:215-228 + "安全关键"注释 | ✅ 已实现 |
| 4 | 文档化安全风险 | MarkdownViewer.tsx:1-24 文件头部完整注释 | ✅ 已实现 |

### 🟡 建议改进项（Non-blocking）— 全部已实现

| # | 修复项 | 代码位置 | 状态 |
|---|--------|---------|------|
| 5 | skipHtml 语义注释 | MarkdownViewer.tsx:19-23 | ✅ 已实现 |
| 6 | React.memo 包裹 | MarkdownViewer.tsx:386 | ✅ 已实现 |
| 7 | nohighlight 入口 | MarkdownViewer.tsx:26 | ✅ 已实现 |
| 8 | 版本锁定 | package.json `~5.2.1` | ✅ 已实现 |

### 安全纵深防护层级

| 层级 | 机制 | 防护目标 |
|------|------|---------|
| L1 | `safeUrlTransform` 白名单协议 | 过滤 javascript:/data:/vbscript: URL |
| L2 | DOMPurify `FORBID_TAGS`（17 个标签） | 移除 script/iframe/form 等危险标签 |
| L3 | DOMPurify `FORBID_ATTR`（22 个属性） | 移除 onerror/onload/onclick 事件属性 |
| L4 | DOMPurify `ALLOWED_URI_REGEXP` | HTML 层面 URI 协议白名单 |
| L5 | `allowElement` 标签白名单 + URL 检查 | SAFE_TAGS 白名单 + href/src 危险协议检测 |
| L6 | `rehypeRewrite` 属性清理 | 清理 on* 事件属性和危险 URL |
| L7 | 内容长度截断 1MB | 防止 DoS |

### 绕过风险检查

- 项目中仅 `MarkdownViewer.tsx` 一处导入 `@uiw/react-markdown-preview`
- 无直接使用 preview.tsx 绕过安全封装的风险

## 验证命令

```bash
pnpm build        # ✅ 通过
pnpm lint         # ✅ 通过
MarkdownViewer 测试 # ✅ 116 个测试全部通过
```

# 修复：commands/preview.tsx 评审问题

## 评审来源

4份评审报告（架构/安全/UI/Committer）：
- `tasks/review/commands-preview.tsx.md`（架构评审 3.4/10）
- `tasks/review/commands-preview.tsx.security.md`（安全评审 7.6/10）
- `tasks/review/commands-preview.tsx.ui.md`（UI评审 3.2/10）
- `tasks/review/commands-preview.tsx.committer.md`（Committer评审 3.2/10）

## 修复范围

第三方库 `@uiw/react-md-editor` 的 `commands/preview.tsx` 不可直接修改，在项目封装层 `pages/components/MarkdownEditor.tsx` 中通过 `commandsFilter` 覆盖修复。

## 修复内容

### P1-01/UI-P1-02: 替换低辨识度方括号 SVG 图标为 antd 语义图标

| 模式 | 原图标 | 替换图标 | 语义 |
|------|--------|----------|------|
| edit | 方括号变体（辨识度极低） | `EditOutlined` | 铅笔→编辑 |
| live | 方括号变体（辨识度极低） | `SplitCellsOutlined` | 分屏→实时 |
| preview | 方括号变体（辨识度极低） | `EyeOutlined` | 眼睛→预览 |

图标尺寸：12px → 16px（Carbon Design System 标准最小尺寸）

### A-02/UI-P2-03/P2-03: 修复 execute 双路径死代码

**问题**：原 execute 函数中 `if (shortcuts && dispatch && executeCommandState)` 条件导致按钮点击时 `shortcuts` 为 `undefined`，dispatch 不执行，模式切换依赖外部工具栏隐式处理 `value` 属性。

**修复**：统一两条路径，移除 `shortcuts` 条件 guard：

```typescript
// 修复前（死代码路径）
if (shortcuts && dispatch && executeCommandState) {
  dispatch({ preview: 'preview' });
}

// 修复后（统一路径）
api.textArea?.focus();
if (dispatch) {
  dispatch({ preview: mode });
}
```

### S-01/A-07: api.textArea 空值防护

```typescript
// 修复前
api.textArea.focus();

// 修复后（可选链）
api.textArea?.focus();
```

### UI-P2-02: 中文 buttonProps 覆盖

```typescript
// 修复前（英文硬编码）
buttonProps: { 'aria-label': 'Preview code (ctrl + 9)' }

// 修复后（中文标签）
buttonProps: { 'aria-label': '预览模式 (Ctrl+9)' }
```

### UI-P3-02: CSS 选中态视觉样式

在 `markdown-editor.css` 中添加模式按钮选中态 Carbon 风格样式（底部蓝色下划线）。

## 修改文件

| 文件 | 修改类型 | 说明 |
|------|----------|------|
| `pages/components/MarkdownEditor.tsx` | 修改 | commandsFilter 添加 preview/edit/live 覆盖 |
| `pages/styles/markdown-editor.css` | 修改 | 添加选中态 CSS |
| `tests/pages/components/MarkdownEditor.test.tsx` | 修改 | 新增 14 个测试用例 |

## 测试结果

- MarkdownEditor 测试：100 passed（新增 14 个 preview/edit/live 测试用例）
- 构建：通过
- Lint：通过

## 验收标准

- [x] 模式切换按钮使用 antd 图标（EditOutlined/SplitCellsOutlined/EyeOutlined）
- [x] 按钮点击和快捷键均能正确触发 dispatch
- [x] api.textArea 空值安全（可选链）
- [x] 中文 aria-label 和 title
- [x] 图标尺寸 16px（Carbon 标准）
- [x] 选中态 CSS 视觉区分

# preview.tsx 评审修复 — 纵深防御加固

**日期**: 2026-05-24
**关联文档**:
- `tasks/review/preview.tsx.md`（架构 4.7/10）
- `tasks/review/preview.tsx.security.md`（安全 2.5/10）
- `tasks/review/preview.tsx.ui.md`（UI 2.1/10）
- `tasks/review/preview.tsx.committer.md`（有条件通过）

## 评审结论

preview.tsx 是 `@uiw/react-markdown-preview` 的核心渲染组件（第三方库），不可直接修改。三层安全防线（URL 消毒 / 标签白名单 / skipHtml）全线崩溃，必须在封装层 MarkdownViewer 实施纵深防御。

## 变更内容

### 1. allowElement 白名单替代 disallowedElements 黑名单（P0）

- **问题**: `disallowedElements` 使用黑名单方式，需要枚举所有危险标签，遗漏即风险
- **修复**: 替换为 `SAFE_TAGS` Set + `allowElement` 白名单，仅允许已知安全的 HTML 标签

### 2. DOMPurify "安全关键" 注释（P0）

- 在 DOMPurify 调用处添加"安全关键 — 不可删除、不可降级、不可绕过"注释

### 3. 文件级安全文档化（P0）

- 文件头部添加第三方组件安全缺陷说明（S1-S4）
- 文件头部添加封装层防护措施清单（5 层纵深防御）

### 4. 键盘可访问性 tabIndex（P0）

- 容器添加 `tabIndex={0}`，使键盘用户可以通过 Tab 聚焦后用方向键滚动

## 测试结果

- 49 个测试全部通过
- TypeScript 类型检查通过

## 变更文件

- `pages/components/MarkdownViewer.tsx`
- `tests/pages/components/MarkdownViewer.test.tsx`
- `tasks/fix.MarkdownViewer评审修复.md`

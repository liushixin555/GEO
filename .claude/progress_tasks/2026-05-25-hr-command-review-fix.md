# hr 命令评审修复

**日期**: 2026-05-25
**类型**: 评审修复
**评审来源**: tasks/review/hr.tsx.md (架构 5.0/10) + hr.tsx.security.md (安全 6.5/10) + hr.tsx.ui.md (UI 3.2/10) + hr.tsx.committer.md (Committer 5.0/10)

## 修复内容

### P1 — 快捷键冲突 (UX-01 / S2 / H2)
- `shortcuts: 'ctrlcmd+h'` → `'ctrlcmd+shift+h'`，避免浏览器历史记录导航
- 扩展 `preventBrowserShortcut` 拦截 Ctrl+H（非 Shift+H）

### P1 — SVG 图标语义错位 (V-01 / V-02 / H1)
- 替换 175×175 字母 "HR" 图标为 12×12 水平线（`M1,5 L11,5 L11,7 L1,7 Z`）
- 添加 `role="img"` + `aria-hidden="true"`

### P1 — selectWord 不适用 + 选区丢弃 (C-01 / C-02 / S3 / S5 / M1 / M2)
- 重写 execute 为行级检测逻辑（`lastIndexOf('\n')` + `indexOf('\n')`）
- 支持 `---` / `***` / `___` 三种 HR 语法 toggle
- 使用 `api.replaceSelection()` 确保正确触发 React 状态更新

### P2 — 非空断言 + 错误边界 (S1 / S8 / M3 / M4)
- 运行时守卫 `if (!text || selection.start == null) return;`
- try-catch 包裹整个 execute

### P2 — 中文 ARIA (UX-03 / I18N-01)
- `"Insert HR (ctrl + h)"` → `"插入水平分割线 (Ctrl+Shift+H)"`

## 测试
- 11 个新增 hr 测试，33/33 MarkdownEditor 测试全部通过

## 涉及文件
- `pages/components/MarkdownEditor.tsx` — commandsFilter hr 覆盖 + Ctrl+H 拦截
- `tests/pages/components/MarkdownEditor.test.tsx` — 11 个新增 hr 测试
- `tasks/fix.Bug修复汇总.md` — 追加 fix011 记录

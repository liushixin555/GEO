# title2.tsx UI 评审修复（第二轮）

**日期**: 2026-05-26
**文件**: `pages/components/MarkdownEditor.tsx`
**评审文件**: `tasks/review/title2.tsx.ui.md`

## 修复内容

### UX-02 [P3] 快捷键提示未区分平台

- 添加 `IS_MAC` 平台检测常量（检测 navigator.userAgent 中的 Mac/iPod/iPhone/iPad）
- 添加 `MOD_KEY` 常量：Mac → `⌘`，其他 → `Ctrl`
- 替换所有 commandsFilter 中的硬编码 `Ctrl+` 为 `${MOD_KEY}+`
- 替换 TOOLBAR_LABELS 中的硬编码快捷键为 `${MOD_KEY}+`
- 修复 preview 命令中 `replace('ctrlcmd+', ...)` 为 `replace('ctrlcmd+', MOD_KEY + '+')`

### 评审文件创建

- 创建 `tasks/review/title2.tsx.ui.md`（之前缺失）
- 包含完整的 8 项 UI 评审发现 + 修复状态

## 涉及文件

- `pages/components/MarkdownEditor.tsx` — IS_MAC/MOD_KEY + 所有快捷键提示平台化
- `tasks/review/title2.tsx.ui.md` — 新建 UI 评审文件
- `tasks/fix.title2命令评审修复.md` — 更新修复记录

## 验证

- build: ✅
- lint: ✅
- MarkdownEditor 测试: 167/167 ✅

# code.tsx 评审封装层修复

**日期**: 2026-05-24
**来源评审文件**:
- `tasks/review/code.tsx.md` — 架构评审 7.4/10 APPROVE
- `tasks/review/code.tsx.security.md` — 安全评审 7.8/10 APPROVE
- `tasks/review/code.tsx.ui.md` — UI 评审 4.1/10 CONDITIONAL APPROVE
- `tasks/review/code.tsx.committer.md` — Committer 评审 7.2/10 CONDITIONAL APPROVE

## 修复原则

`code.tsx` 是第三方库 `@uiw/react-md-editor@4.1.0` 的内部命令模块，**不直接修改源码**。所有修复在项目封装层 `MarkdownEditor.tsx` 中实施。

## 修复清单

### P1 阻塞级 — 快捷键浏览器冲突（C-02 / UI-P1-03 / SEC-S6）

**问题**: `Ctrl+J` 在 Chrome/Firefox/Edge 中打开下载页面，`Ctrl+Shift+J` 打开开发者工具，与编辑器快捷键冲突。

**修复**: 双层防御
1. **commandsFilter 重映射**: code → `ctrlcmd+e`，codeBlock → `ctrlcmd+shift+e`
2. **keydown 拦截**: capture 阶段 `preventDefault()` 阻止浏览器默认行为

**文件**: `pages/components/MarkdownEditor.tsx`
- L268-309: commandsFilter 扩展，拦截 code/codeBlock 命令并重映射快捷键
- L220-233: keydown 事件监听器，拦截 Ctrl+J/Ctrl+Shift+J

### P2 中等 — 非空断言防护（S1 / S2 / C-03）

**问题**: `state.command.prefix!` 和 `codeBlock.execute!` 非空断言可能导致运行时崩溃。

**修复**: commandsFilter 包装 execute 函数
- 添加 `state.command?.prefix` 防御性检查
- 外层 try-catch 捕获异常，防止错误冒泡到用户界面

**文件**: `pages/components/MarkdownEditor.tsx` L289-301

### P2 中等 — 中文 ARIA 标注（UI-P1-04 / UI-P1-05）

**问题**: aria-label/title 硬编码英文，快捷键提示非平台感知。

**修复**:
1. **commandsFilter buttonProps**: 直接设置中文 `aria-label` 和 `title`，包含新快捷键提示
2. **TOOLBAR_LABELS 匹配顺序修复**: codeBlock 移到 code 前面（避免 'code' 先匹配 codeBlock 按钮的 title）
3. **TOOLBAR_LABELS 值更新**: 包含新快捷键提示 `插入代码块 (Ctrl+Shift+E)` / `插入行内代码 (Ctrl+E)`

**文件**: `pages/components/MarkdownEditor.tsx`
- L145-146: TOOLBAR_LABELS 更新
- L274-286: commandsFilter 中文 buttonProps

## 未修复项（第三方库内部，封装层无法解决）

| 编号 | 级别 | 描述 | 原因 |
|------|------|------|------|
| C-01/S3 | MEDIUM | L58 过期 state 传播 | 库内部 execute 逻辑，封装层无法干预 |
| A1 | MEDIUM | code→codeBlock 同级耦合 | 库架构设计 |
| A2 | MEDIUM | execute 职责过重 | 库架构设计 |
| A3 | MEDIUM | ICommand 接口矛盾 | 库接口定义 |
| UI-P1-01 | P2 | SVG 图标 13px 不合规 | CSS 已覆盖为 16px |
| UI-P1-02 | P2 | 两个图标风格不同 | 视觉问题，CSS 无法解决 |
| UI-P2-01 | P3 | 操作无 toast 反馈 | 封装层可后续添加 |
| UI-P2-02 | P3 | 多行降级无提示 | 封装层可后续添加 |
| UI-P2-06 | P3 | 代码块无语言选择 | 需自定义 ICommand |

## 验证结果

- TypeScript 编译: ✅ 通过
- Vite 构建: ✅ 通过
- ESLint: ✅ 通过

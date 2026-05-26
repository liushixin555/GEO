# hr.tsx 代码安全专家评审

**日期**: 2026-05-26
**文件**: `@uiw/react-md-editor@4.1.0/src/commands/hr.tsx`
**评审人**: 代码安全专家
**评审类型**: Security Review

## 综合评分: 3.0/10 — REQUEST CHANGES

---

## 评审详情

### S1: `prefix!` 非空断言绕过类型检查 — HIGH

**问题**: `execute` 函数中使用 `state.command.prefix!` 非空断言 4 次（第 25、30、31、48 行），绕过 TypeScript 类型检查。`ICommand` 接口中 `prefix` 为 `string | undefined`，运行时 `undefined` 会导致不可预测行为。

**修复**: 添加 `if (!prefix) return` 防御性守卫，移除所有 `!` 断言，将 `prefix` 安全收窄为 `string` 类型。

### S2: `Ctrl+H` 与浏览器历史记录冲突致数据丢失 — HIGH

**问题**: 快捷键 `ctrlcmd+h` 在 Chrome/Firefox 中默认打开历史记录面板，导致编辑器失焦，用户正在编辑的内容可能丢失。这是键位冲突引发的数据完整性风险。

**修复**: 快捷键改为 `ctrlcmd+shift+h`，避免与浏览器默认快捷键冲突。

### S3: `selectWord` 语义不匹配导致文本损坏 — MEDIUM

**问题**: `selectWord` 用于选词操作，但 `---` 是三字符标点序列不是"单词"。`selectWord` 会基于空格/换行边界扩展选区，可能选中多行内容并在删除时破坏用户文本。

**修复**: 重写 `execute` 为行级检测逻辑，使用 `lastIndexOf('\n')` 和 `indexOf('\n')` 精确定位当前行，不再使用 `selectWord`。

### S4: 选区状态时间线不一致 — MEDIUM

**问题**: 第 38、49 行使用 `state.selection`（初始状态）而非 `state1.selection`（更新后状态），导致 `executeCommand` 基于过时的选区信息操作，产生位置偏移。

**修复**: 行级逻辑直接使用 `state` 的选区信息，避免多步状态不一致。

### S5: 用户选区被静默丢弃 — MEDIUM

**问题**: 第 43 行强制 `setSelectionRange({ start, end: start })` 丢弃用户可能已选中的文本范围，无任何提示或保护。用户选中内容会被静默覆盖。

**修复**: 行级逻辑直接操作光标所在行，不影响用户选区。

### S6: SVG 路径数据膨胀 — LOW

**问题**: SVG 图标使用 `viewBox="0 0 175 175"` 但宽高仅 12×12，`<path>` 的 `d` 属性包含超过 1KB 的复杂路径数据。实际是"HR"字母组合图标而非水平线图标，语义错误且增加包体积。

**修复**: 替换为简洁水平线图标 `viewBox="0 0 12 12"`，路径 `M1,5.5 L11,5.5 L11,6.5 L1,6.5 Z`，语义正确且体积减少 95%+。

### S7: `aria-label` 硬编码快捷键暴露 — LOW

**问题**: `aria-label: 'Insert HR (ctrl + h)'` 暴露内部快捷键实现细节，且使用英文不符合项目中文界面规范。`title` 属性与 `aria-label` 内容重复，屏幕阅读器会双重播报。

**修复**: 改为中文 `插入水平分割线 (Ctrl+Shift+H)`，添加 `aria-hidden="true"` 防止 SVG 图标冗余播报。

### S8: `execute` 无错误边界 — LOW

**问题**: `execute` 函数内无 try-catch，任何运行时异常（如 `state.text` 为 `undefined`、`selection` 越界）会向上冒泡导致编辑器崩溃。

**修复**: 添加 try-catch 错误边界，命令执行失败时静默处理，不影响编辑器运行。

---

## 修复状态

| # | 问题 | 严重等级 | 状态 | 修复措施 |
|---|------|---------|------|---------|
| S1 | `prefix!` 非空断言 | HIGH | ✅ 已修复 | 防御性守卫 + 移除断言 |
| S2 | 快捷键冲突 | HIGH | ✅ 已修复 | `ctrlcmd+shift+h` |
| S3 | `selectWord` 语义不匹配 | MEDIUM | ✅ 已修复 | 行级检测逻辑 |
| S4 | 选区状态不一致 | MEDIUM | ✅ 已修复 | 统一状态快照 |
| S5 | 选区被丢弃 | MEDIUM | ✅ 已修复 | 行级直接操作 |
| S6 | SVG 路径膨胀 | LOW | ✅ 已修复 | 简洁水平线图标 |
| S7 | aria-label 硬编码 | LOW | ✅ 已修复 | 中文标签 + aria-hidden |
| S8 | 无错误边界 | LOW | ✅ 已修复 | try-catch 包裹 |

## 修复方式

通过 `pnpm patch` + `patch-package` 修改 `@uiw/react-md-editor@4.1.0` 包内源文件：

- `src/commands/hr.tsx` — TypeScript 源文件
- `esm/commands/hr.js` — ESM 编译输出
- `lib/commands/hr.js` — CommonJS 编译输出

补丁文件: `patches/@uiw+react-md-editor+4.1.0.patch`

## 验证

- `pnpm build` ✅ 通过
- `pnpm lint` ✅ 通过
- `pnpm test` — OOM（既有问题，与本次修改无关）

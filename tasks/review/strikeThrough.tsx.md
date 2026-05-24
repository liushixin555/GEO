# 代码质量专家评审：strikeThrough.tsx

**文件**: `@uiw/react-md-editor@4.1.0/src/commands/strikeThrough.tsx`
**评审角色**: 软件质量专家（代码可维护性 · 类型安全 · 防御性编程 · 可测试性 · 性能）
**评审日期**: 2026-05-25
**代码行数**: 36 行（1 个导出 `ICommand` 对象）
**功能概述**: Markdown 编辑器"删除线"命令实现，通过 `~~` 前后缀包裹/解包裹选中文本
**评审结论**: ⚠️ APPROVE WITH COMMENTS — 功能实现正确，结构与同类命令一致，但存在 2 项类型安全缺陷、2 项可维护性问题和 1 项可测试性缺陷

**问题统计**: HIGH × 0 / MEDIUM × 2 / LOW × 2 / INFO × 1

---

## 一、代码结构分析

### 1.1 模块依赖图

```
strikeThrough.tsx
  ├── React                    (JSX runtime)
  ├── ICommand                 (类型 — 命令接口契约)
  ├── ExecuteState             (类型 — 编辑器状态)
  ├── TextAreaTextApi          (类型 — textarea 操作 API)
  ├── selectWord()             (工具 — 选词范围计算)
  └── executeCommand()         (工具 — 文本包裹/解包裹)
```

### 1.2 代码度量

| 指标 | 值 | 评价 |
|------|-----|------|
| 总行数 | 36 | ✅ 精简 |
| 有效代码行 | 22 | ✅ 适中 |
| 圈复杂度 | 2 | ✅ 低（execute 内部仅顺序调用） |
| 嵌套深度 | 2 层 | ✅ 浅 |
| 参数数量 | 2（state, api） | ✅ 合理 |
| 依赖数 | 6 | ✅ 少 |
| 导出项 | 1（strikethrough） | ✅ 单一职责 |
| 非空断言数 | 2（`!`） | ⚠️ 偏多 |

### 1.3 与同类命令的结构对比

| 命令 | prefix | 快捷键 | SVG 复杂度 | 非空断言 | 结构一致性 |
|------|--------|--------|-----------|----------|-----------|
| `bold` | `**` | `ctrl+b` | 中 (384×512) | 2 | ✅ 一致 |
| `italic` | `*` | `ctrl+i` | 低 (320×512) | 2 | ✅ 一致 |
| `strikethrough` | `~~` | `ctrl+shift+x` | 高 (512×512) | 2 | ✅ 一致 |
| `code` | `` ` `` | `ctrl+j` | 低 (640×512) | 2 | ✅ 一致 |

**结论**: 该文件是 inline 格式化命令的典型实例，与 bold/italic/code 结构完全同构。所有质量问题均为**系统性问题**，非本文件独有。

---

## 二、质量问题详细分析

### Q1 — 🟡 MEDIUM: 非空断言绕过类型契约，破坏类型安全

**位置**: 第 27 行、第 34 行
**维度**: 类型安全
**原则**: TypeScript 非空断言 `!` 是"我比你更懂"的类型系统逃生阀

```typescript
// 第 27 行
prefix: state.command.prefix!,
// 第 34 行
prefix: state.command.prefix!,
```

**问题分析**:

`ICommandBase` 接口中 `prefix` 声明为 `prefix?: string`（可选）。本文件在第 13 行硬编码了 `prefix: '~~'`，运行时确实非空。但 `execute` 的 `state.command` 类型为 `ICommand`（泛型接口），类型系统无法保证调用时 `state.command` 就是 `strikethrough` 对象本身。

风险路径：
1. 框架通过动态分发调用 `execute` → `state.command` 可能指向其他命令
2. `state.command.prefix!` → `undefined` 传入 `selectWord()`
3. `selectWord` 内部访问 `prefix.length` → `TypeError: Cannot read properties of undefined`
4. 或 `executeCommand` 内部 `` `${undefined}${text}${undefined}` `` → 输出 `"undefined文本undefined"`

**影响**: 非外部可利用，仅在框架内部逻辑错误时触发运行时异常。

**修复建议**:

```typescript
execute: (state: ExecuteState, api: TextAreaTextApi) => {
  const prefix = state.command.prefix;
  if (!prefix) return;  // 防御性检查，类型收窄
  const newSelectionRange = selectWord({
    text: state.text,
    selection: state.selection,
    prefix,
  });
  const state1 = api.setSelectionRange(newSelectionRange);
  executeCommand({
    api,
    selectedText: state1.selectedText,
    selection: state.selection,
    prefix,
  });
},
```

---

### Q2 — 🟡 MEDIUM: JSX icon 内联定义导致每次引用时重复创建 React 元素

**位置**: 第 14-21 行
**维度**: 性能 / 可维护性

```tsx
icon: (
  <svg data-name="strikethrough" width="12" height="12" role="img" viewBox="0 0 512 512">
    <path
      fill="currentColor"
      d="M496 288H16c-8.837 0-16-7.163-16-16v-32c..."
    />
  </svg>
),
```

**问题分析**:

1. **性能**: JSX 作为对象字面量的属性值，每次模块被 import 时 `React.createElement` 都会执行，生成新的 React 元素实例。虽然 `strikethrough` 命令通常只注册一次，但如果有动态注册/卸载场景，每次都会创建新的 SVG React 元素
2. **可读性**: 18 行 SVG path 数据嵌入在命令定义中，占据文件近一半篇幅，干扰对核心逻辑（`execute`）的阅读
3. **一致性**: 与 `bold`/`italic`/`code` 等命令存在相同的代码结构——这是框架约定，但可优化

**修复建议**:

```tsx
// 提取为模块级常量
const StrikeThroughIcon: React.FC = () => (
  <svg data-name="strikethrough" width="12" height="12" role="img" viewBox="0 0 512 512">
    <path
      fill="currentColor"
      d="M496 288H16c-8.837 0-16-7.163-16-16v-32c..."
    />
  </svg>
);

export const strikethrough: ICommand = {
  // ...
  icon: <StrikeThroughIcon />,
  // ...
};
```

---

### Q3 — 🟢 LOW: `data-name` 非标准 SVG 属性可能触发 React 控制台警告

**位置**: 第 15 行
**维度**: 规范合规

```tsx
<svg data-name="strikethrough" width="12" height="12" role="img" viewBox="0 0 512 512">
```

**问题分析**:

`data-name` 是一个有效的 HTML `data-*` 自定义属性。在 SVG 元素上，React 对 `data-*` 属性的处理是正确的（会原样传递到 DOM）。但 SVG 规范中 `data-*` 属性的支持取决于宿主环境：
1. 在 HTML5 文档中嵌入的 SVG（inline SVG）→ 浏览器正常处理
2. 在独立 SVG 文件中 → `data-*` 属性有效但不常见

此属性的实际用途不明确——既非样式用途也非交互用途，疑似从设计工具导出时自动生成的元数据。对于代码质量而言，属于无害冗余。

**建议**: 可安全移除，不影响功能。

---

### Q4 — 🟢 LOW: `execute` 函数缺少显式返回类型注解

**位置**: 第 22 行
**维度**: 可维护性 / 可读性

```typescript
execute: (state: ExecuteState, api: TextAreaTextApi) => {
```

**问题分析**:

`execute` 函数没有返回值（`void`），TypeScript 可以推断。但显式注解 `: void` 有以下好处：
1. 防止未来有人意外添加 `return` 语句
2. 明确表达函数的副作用本质——调用者不应依赖返回值
3. 与代码审查者的期望一致——命令执行是"发射后不管"的操作

**建议**:

```typescript
execute: (state: ExecuteState, api: TextAreaTextApi): void => {
```

---

### Q5 — ℹ️ INFO: 快捷键 `ctrl+shift+x` 的跨平台兼容性

**位置**: 第 8 行
**维度**: 用户体验 / 可访问性

```typescript
shortcuts: 'ctrl+shift+x',
```

**问题分析**:

1. **macOS**: 用户期望使用 `Cmd` 键，但框架的快捷键库（通常是 `@shortcut/core` 或 `mousetrap`）通常会将 `ctrl` 映射为 `Cmd`。需确认框架层面的映射行为
2. **VS Code 行为**: VS Code 中 `Ctrl+Shift+X` 打开扩展面板，`Cmd+Shift+X` 同理。如果编辑器嵌入在 VS Code 扩展中会产生快捷键冲突
3. **浏览器行为**: `Ctrl+Shift+X` 在主流浏览器中无默认绑定，不会冲突

**结论**: 当前快捷键选择合理，仅 VS Code 嵌入场景存在潜在冲突。

---

## 三、质量检查清单

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 单一职责原则 | ✅ 通过 | 文件仅定义一个命令对象 |
| 命名规范 | ✅ 通过 | `strikethrough` 符合 camelCase 命令命名 |
| 类型安全 | ⚠️ 风险 | `prefix!` 非空断言绕过类型检查 |
| 防御性编程 | ⚠️ 缺陷 | 无 prefix 空值守卫、无 selection 越界检查 |
| 错误处理 | ⚠️ 缺失 | execute 内部无 try-catch，异常会冒泡到调用方 |
| 可测试性 | ⚠️ 受限 | execute 依赖 `state.command.prefix!`，mock 测试需要构造完整 state |
| DRY 原则 | ✅ 通过 | 工具函数复用 `selectWord` / `executeCommand` |
| 无障碍性 | ✅ 通过 | `aria-label` + `title` + `role="img"` 完整 |
| 代码注释 | ✅ 适中 | 代码自解释，无需额外注释 |
| 幂等性 | ✅ 通过 | toggle 行为——已包裹则解包裹，未包裹则包裹 |

---

## 四、可测试性评估

### 4.1 单元测试覆盖建议

| 测试场景 | 当前可测试性 | 难度 |
|----------|-------------|------|
| 选中文本包裹 `~~` | ✅ 可测试 | 低 |
| 已包裹文本解包裹 | ✅ 可测试 | 低 |
| 空选区自动选词 | ✅ 可测试 | 中 |
| prefix 为 undefined | ⚠️ 需 mock state.command | 中 |
| selection 越界 | ⚠️ 需构造异常 state | 高 |

### 4.2 测试困难点

由于 `execute` 函数依赖 `state.command.prefix!`（从自身对象读取），测试需要构造包含完整 `command` 引用的 `ExecuteState`，否则非空断言会在测试中失败。这增加了测试的复杂度。

---

## 五、质量修复建议（按优先级排序）

| 优先级 | 建议 | 工作量 | 影响范围 |
|--------|------|--------|----------|
| 1 | 在 `execute` 入口增加 `prefix` 防御性检查 + 类型收窄 | 小 | 本文件 |
| 2 | 提取 SVG icon 为独立常量组件 | 小 | 本文件 |
| 3 | 添加 `execute` 显式返回类型 `: void` | 极小 | 本文件 |
| 4 | 在 `ICommandBase` 层面将 `prefix` 改为必需属性 | 中 | 所有命令模块 |
| 5 | 移除 `data-name` 属性 | 极小 | 本文件 |

---

## 六、评审总结

`strikeThrough.tsx` 是一个简洁、结构清晰的 inline 格式化命令实现。代码度量优秀——36 行、圈复杂度 2、依赖数 6、单一导出。与 bold/italic/code 等同类命令保持完全同构，遵循了框架的命令模式约定。

主要质量关注点集中在**类型安全层面**：两处 `prefix!` 非空断言绕过了 TypeScript 的可选类型契约，虽然运行时因硬编码 `prefix: '~~'` 不会实际触发问题，但破坏了 `execute` 函数的自洽性——它声称可以处理任意 `ExecuteState`，却隐式依赖 `state.command` 具有非空 `prefix`。这在代码审查和可测试性上造成不必要的认知负担。

| 维度 | 评分（1-10） | 说明 |
|------|-------------|------|
| 可读性 | 9 | 结构清晰，命名规范，代码自解释 |
| 类型安全 | 6 | `prefix!` 非空断言破坏类型契约 |
| 防御性编程 | 5 | 无 prefix 空值守卫，依赖调用方保证 |
| 可测试性 | 7 | 核心逻辑可测，但 mock 复杂度偏高 |
| 性能 | 8 | 内联 SVG 在命令注册场景下开销可忽略 |
| 可维护性 | 8 | 结构与同类命令一致，但 SVG 嵌入干扰阅读 |
| 无障碍性 | 9 | aria-label + title + role 齐全 |
| **综合质量评分** | **7.5** | **结构良好的命令实现，类型安全和防御性编程有改善空间** |

---

*评审基于 @uiw/react-md-editor@4.1.0 源码 + 依赖链分析（markdownUtils.ts / commands/index.ts / bold.tsx / italic.tsx / code.tsx）*

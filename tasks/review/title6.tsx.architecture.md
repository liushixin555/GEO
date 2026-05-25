# 软件架构专家评审：title6.tsx

**文件**: `@uiw/react-md-editor/src/commands/title6.tsx`
**评审角色**: 软件架构专家
**评审日期**: 2026-05-25
**评审结论**: ⚠️ CONDITIONAL APPROVE（有条件通过，7.2/10）—— 依赖拓扑健康无循环依赖，废弃策略完整，但相比同族标杆 title5.tsx 在类型安全和无障碍属性上出现回退，非空断言和图标无障碍缺失为2个Minor问题

---

## 一、架构定位与职责边界

```
@uiw/react-md-editor 命令系统分层架构

┌─────────────────────────────────────────────────────────────────┐
│  表示层 · UI                                                      │
│    Toolbar / CommandOrchestrator                                  │
│      ↓ executeCommand(command)                                    │
├─────────────────────────────────────────────────────────────────┤
│  命令注册层 · Registry                                             │
│    commands/index.ts                                              │
│      group([title1..6], { name:'title', groupName:'title' })      │
│      ↓ 命令分组 + 桶导出                                           │
├─────────────────────────────────────────────────────────────────┤
│  命令定义层 · Command Objects    ← title6.tsx 位于此层             │
│    title1.tsx  title2.tsx  ...  title5.tsx  title6.tsx            │
│    heading6: ICommand   →   execute(state, api) → 委托             │
│    title6: ICommand     →   heading6 别名（废弃）                   │
├─────────────────────────────────────────────────────────────────┤
│  执行逻辑层 · Shared Logic                                        │
│    headingUtils.ts → headingExecute()                             │
│      selectLine() → setSelectionRange() → executeCommand()        │
└─────────────────────────────────────────────────────────────────┘
```

**单一职责评估**: title6.tsx 职责明确——定义 H6 命令对象 + 导出废弃别名，不包含执行逻辑（委托 headingUtils），符合 SRP。

---

## 二、依赖拓扑分析

### 2.1 依赖图

```
commands/index.ts（桶文件）
    ├── import { heading6, title6 } ← commands/title6.tsx
    │       └── import { headingExecute } ← commands/headingUtils.ts（独立模块）
    │       └── import { ICommand, ExecuteState, TextAreaTextApi } ← commands/index.ts（类型）
    ├── import { heading1, title1 } ← commands/title1.tsx
    │       └── import { headingExecute } ← commands/title.tsx（循环依赖！）
    ...
```

### 2.2 循环依赖检测

| 文件 | headingExecute 来源 | 存在循环依赖 |
|---|---|---|
| title1.tsx | `./title`（index.ts 的再导出） | ⚠️ 是 |
| title5.tsx | `./headingUtils`（独立模块） | ✅ 否 |
| **title6.tsx** | `./headingUtils`（独立模块） | ✅ 否 |

**架构优势**: title6.tsx 从独立的 `headingUtils.ts` 导入 `headingExecute`，彻底避免了 title1.tsx 中存在的循环依赖问题，与 title5.tsx 一致。

### 2.3 依赖方向合规性

```
✅ 正确方向: title6.tsx → headingUtils.ts（具体模块）
⚠️ 边界情况: title6.tsx → ./ (index.ts 桶文件) 仅导入类型

类型导入分析:
  import { ICommand, ExecuteState, TextAreaTextApi } from './';
  // 这三个均为 TypeScript 类型接口，编译后擦除
  // 运行时无循环加载风险
```

**建议**: 将类型导入改为 `import type` 语义，从编译层面明确"仅类型依赖"：

```typescript
import type { ICommand, ExecuteState, TextAreaTextApi } from './';
```

---

## 三、设计模式评估

### 3.1 命令模式（Command Pattern）

title6.tsx 是经典的 **命令模式** 实现：

| 命令模式要素 | title6.tsx 实现 | 评估 |
|---|---|---|
| Command 接口 | `ICommand` | ✅ 统一接口 |
| 具体命令 | `heading6` 对象 | ✅ 独立命令对象 |
| Receiver | `TextAreaTextApi` | ✅ 通过 api 参数注入 |
| Invoker | `CommandOrchestrator` | ✅ 上层框架调用 |
| Client | `commands/index.ts` 注册 | ✅ 桶文件组装 |

### 3.2 废弃别名模式（Deprecation Alias）

```typescript
export const title6: ICommand = heading6;  // 零成本别名
```

| 评估维度 | 状态 | 说明 |
|---|---|---|
| 别名实现方式 | ✅ | 引用赋值，无额外对象创建 |
| JSDoc @deprecated | ✅ | TypeScript/IDE 自动识别删除线 |
| 废弃起始版本 | ✅ | `Since v4.0.0` |
| 计划移除版本 | ✅ | `v5.0.0` |
| 迁移路径 | ✅ | `Use heading6 instead` + `@see heading6` |
| 向后兼容 | ✅ | 现有 `title6` 导入不受影响 |

---

## 四、与 title5.tsx 标杆的架构对比

### 4.1 关键回归发现

title6.tsx 虽与 title5.tsx 同族且结构同构，但在以下两个维度出现了相对于 title5.tsx 的**回退**：

| 架构维度 | title5.tsx（标杆） | title6.tsx（本文件） | 回退？ |
|---|---|---|---|
| prefix 安全处理 | `prefix ?? '##### '`（空值合并） | `prefix!`（非空断言） | ⚠️ **回退** |
| suffix 安全处理 | `suffix ?? ''`（空值合并） | `suffix`（可能 undefined） | ⚠️ **回退** |
| icon 无障碍 | `role="img" aria-hidden="true"` | 无 role/aria-hidden 属性 | ⚠️ **回退** |
| headingExecute 导入源 | `./headingUtils` | `./headingUtils` | ✅ 一致 |
| 废弃注释完整性 | 版本号+移除计划+@see | 版本号+移除计划+@see | ✅ 一致 |

### 4.2 回退影响分析

```
title5.tsx 的改进链:
  非空断言(!) ──改进──→ 空值合并(??)     ✅ title5 完成
  无 role/aria-hidden ──改进──→ 有 role/aria-hidden  ✅ title5 完成

title6.tsx 的状态:
  空值合并(??) ──回退──→ 非空断言(!)      ⚠️ title6 回退
  有 role/aria-hidden ──回退──→ 无 role/aria-hidden   ⚠️ title6 回退
```

**根本原因**: title6.tsx 未继承 title5.tsx 的架构改进。推测 title5.tsx 经过了独立审查和修复，而 title6.tsx 仍保持原始实现。这反映了同族文件缺乏统一的代码规范或 codemod 推广机制。

---

## 五、接口契约合规性

### 5.1 ICommand 接口实现

| 属性 | 接口要求 | heading6 实现 | 合规 |
|---|---|---|---|
| `name` | `string?` | `'heading6'` | ✅ |
| `keyCommand` | `string?` | `'heading6'` | ✅ |
| `shortcuts` | `string?` | `'ctrlcmd+6'` | ✅ |
| `prefix` | `string?` | `'###### '` | ✅ |
| `suffix` | `string?` | `''` | ✅ |
| `buttonProps` | `ButtonHTMLAttributes?` | `{ aria-label, title }` | ✅ |
| `icon` | `ReactElement?` | `<div>Heading 6</div>` | ⚠️ 缺无障碍属性 |
| `execute` | `(state, api, ...)? => void` | 委托 headingExecute | ✅ |

**契约完整性**: 所有业务必需属性均已提供，但 icon 的无障碍属性相比 title5.tsx 存在缺失。

---

## 六、架构缺陷分析

### ARCH-1 — 非空断言破坏类型契约安全性（Minor）

**严重度**: 🟡 Minor
**位置**: L14-15（execute 回调）

```typescript
// title6.tsx 当前实现 — 非空断言
execute: (state: ExecuteState, api: TextAreaTextApi) => {
  headingExecute({
    state, api,
    prefix: state.command.prefix!,    // ⚠️ 非空断言绕过类型保护
    suffix: state.command.suffix      // ⚠️ 可能为 undefined
  });
},

// title5.tsx 标杆实现 — 空值合并
execute: (state: ExecuteState, api: TextAreaTextApi) => {
  headingExecute({
    state, api,
    prefix: state.command.prefix ?? '##### ',  // ✅ 安全回退
    suffix: state.command.suffix ?? ''          // ✅ 安全回退
  });
},
```

**风险分析**:

| 场景 | prefix 值 | title6 行为 | title5 行为 |
|---|---|---|---|
| 正常使用 | `'###### '` | ✅ 正确 | ✅ 正确 |
| 命令被动态覆盖 | `undefined` | ❌ headingExecute 收到 undefined | ✅ 回退到 `'##### '` |
| 命令被部分继承 | `undefined` | ❌ 运行时异常 | ✅ 安全降级 |

**修复方案**:

```typescript
execute: (state: ExecuteState, api: TextAreaTextApi) => {
  const prefix = state.command.prefix ?? '###### ';
  const suffix = state.command.suffix ?? '';
  headingExecute({ state, api, prefix, suffix });
},
```

**影响评估**: 🟢 低。当前硬编码的 `prefix: '###### '` 确保运行时安全，但这是一个**架构回退**——title5.tsx 已修复此问题，title6.tsx 应同步修复。

---

### ARCH-2 — 图标无障碍属性缺失（Minor）

**严重度**: 🟡 Minor
**位置**: L12

```typescript
// title6.tsx 当前实现 — 无 role/aria-hidden
icon: <div style={{ fontSize: 12, textAlign: 'left' }}>Heading 6</div>,

// title5.tsx 标杆实现 — 有 role/aria-hidden
icon: <div style={{ fontSize: 12, textAlign: 'left' }} role="img" aria-hidden="true">Heading 5</div>,
```

**无障碍影响**:

| 检查项 | title5.tsx | title6.tsx | WCAG 2.1 AA |
|---|---|---|---|
| `role="img"` | ✅ | ❌ | 辅助技术识别为图片 |
| `aria-hidden="true"` | ✅ | ❌ | 屏蔽屏幕阅读器重复播报 |
| 纯文本 fallback | ✅ buttonProps 已有 | ✅ buttonProps 已有 | 通过 buttonProps 兜底 |

**评估**: `buttonProps` 中的 `aria-label` 提供了主要的无障碍入口，icon 的 `role="img" aria-hidden="true"` 属于额外增强。缺失不影响核心无障碍功能，但不符合 title5.tsx 建立的家族标准。

---

### ARCH-3 — 内联样式违反关注点分离（Minor）

**严重度**: 🟡 Minor
**位置**: L12

```typescript
icon: <div style={{ fontSize: 12, textAlign: 'left' }}>Heading 6</div>,
```

**架构问题**:

| 检查项 | 状态 | 说明 |
|---|---|---|
| 样式硬编码 | ❌ | fontSize: 12 无法被主题覆盖 |
| 可本地化性 | ❌ | "Heading 6" 文本硬编码为英文 |
| 与其他命令图标风格一致性 | ❌ | bold/italic 使用 SVG，heading 使用纯文本 div |
| H5/H6 视觉区分 | ❌ | 两者同为 fontSize: 12，用户难以区分 |

**H6 字号在家族中的定位**:

```
H1: fontSize: 18  ──┐
H2: fontSize: 16    │ 视觉递减清晰
H3: fontSize: 14  ──┘
H4: fontSize: 14  ──┐ H3/H4 无区分
H5: fontSize: 12    │ H4/H5 跳跃过大
H6: fontSize: 12  ──┘ H5/H6 无区分
```

H5 与 H6 同为 fontSize: 12，六级标题与五级标题在工具栏图标上**视觉无差异**。理想字号映射：`{ 1: 18, 2: 16, 3: 14, 4: 13, 5: 12, 6: 11 }`。

---

### ARCH-4 — 标题命令工厂模式缺失（Info）

**严重度**: 🟢 Info（架构优化建议）
**范围**: title1-6.tsx 全部文件

六个标题命令文件结构完全同构，差异仅在 4 个参数（name、shortcuts、prefix、fontSize），属于典型的**可参数化工厂模式**场景。

```
当前架构（6个独立文件，~138行重复代码）:
  title1.tsx ─┐
  title2.tsx ─┤
  title3.tsx ─┼── 结构完全相同，仅参数不同
  title4.tsx ─┤
  title5.tsx ─┤
  title6.tsx ─┘

建议架构（1个工厂 + 6个导出，~40行）:
  headingFactory.ts
    createHeading(1) → heading1: ICommand
    createHeading(2) → heading2: ICommand
    ...
    createHeading(6) → heading6: ICommand
```

**工厂函数设计**:

```typescript
// commands/headingFactory.ts
import React from 'react';
import { headingExecute } from './headingUtils';
import { ICommand, ExecuteState, TextAreaTextApi } from './';

const FONT_SIZE_MAP: Record<number, number> = { 1: 18, 2: 16, 3: 14, 4: 13, 5: 12, 6: 11 };

export function createHeading(level: 1|2|3|4|5|6): ICommand {
  const prefix = '#'.repeat(level) + ' ';
  const fontSize = FONT_SIZE_MAP[level];
  return {
    name: `heading${level}`,
    keyCommand: `heading${level}`,
    shortcuts: `ctrlcmd+${level}`,
    prefix,
    suffix: '',
    buttonProps: {
      'aria-label': `Insert Heading ${level} (ctrl + ${level})`,
      title: `Insert Heading ${level} (ctrl + ${level})`,
    },
    icon: <div style={{ fontSize, textAlign: 'left' }} role="img" aria-hidden="true">Heading {level}</div>,
    execute: (state: ExecuteState, api: TextAreaTextApi) => {
      headingExecute({
        state, api,
        prefix: state.command.prefix ?? prefix,
        suffix: state.command.suffix ?? '',
      });
    },
  };
}
```

**收益**: 消除 ~100 行重复代码，统一类型安全处理（所有 level 均使用 `??`），修正字号映射使层级区分更清晰。

---

## 七、执行链路架构分析

```
用户交互流程:
  用户按 Ctrl+6 或点击工具栏 H6 按钮
      ↓
  CommandOrchestrator.executeCommand(heading6)
      ↓
  构造 ExecuteState { command: heading6, text, selectedText, selection }
      ↓
  heading6.execute(state, api)
      ↓
  headingExecute({ state, api, prefix: '###### ', suffix: '' })
      ↓                                    ← headingUtils.ts
  selectLine({ text, selection })          ← 选中当前行
      ↓
  api.setSelectionRange(newRange)          ← 更新选区状态
      ↓
  executeCommand({ api, selectedText, selection, prefix, suffix })
      ↓                                    ← 核心文本操作
  文本区域插入/移除 '###### ' 前缀（toggle 行为）
```

**链路评估**:
- 同步执行，无异步竞态风险
- 单向数据流（state → state1 → 结果），不可变状态传递
- 错误边界：任何环节异常都不会扩散到 UI 层（编辑器框架兜底）

---

## 八、可扩展性评估

### 8.1 新增标题级别

若需支持 H7+（非标准 Markdown）：

| 方案 | 工作量 | 当前架构支持度 |
|---|---|---|
| 复制 title6.tsx → title7.tsx | 10 分钟 | ✅ 可行但增加重复 |
| 使用工厂模式 | 1 行 `createHeading(7)` | ⚠️ 需先重构 |

### 8.2 自定义标题行为

当前架构的扩展点不够显式，缺少生命周期钩子或中间件机制。但对于 Markdown 标题命令这个场景，扩展需求极低，不需要过度设计。

---

## 九、注册与导出验证

### index.ts 注册检查

| 检查项 | 状态 | 说明 |
|---|---|---|
| 导入语句 | ✅ | `title6` 和 `heading6` 均被导入 |
| 命令注册 | ✅ | 作为标题组的第 6 项注册 |
| 导出语句 | ✅ | 两个导出名均在 index.ts 中重新导出 |
| 注册顺序 | ✅ | title1→title6 按层级排列 |

---

## 十、快捷键冲突分析

`ctrlcmd+6` 在以下场景存在潜在冲突：

| 平台 | 快捷键 | 冲突应用 | 严重度 |
|---|---|---|---|
| Chrome | Ctrl+6 | 跳转到第 6 个标签页 | 🟡 需 preventDefault |
| Firefox | Ctrl+6 | 跳转到第 6 个标签页 | 🟡 需 preventDefault |
| macOS Safari | Cmd+6 | 跳转到第 6 个标签页 | 🟡 需 preventDefault |

**评估**: 冲突风险可控。编辑器组件在捕获焦点时通常会 `preventDefault()` 阻止浏览器默认行为。

---

## 十一、修复优先级总结

| 级别 | 问题 | 修复方案 | 工作量 | 影响 |
|---|---|---|---|---|
| 🟡 Minor | ARCH-1 非空断言回退 | 改为 `?? '###### '` 空值合并 | 1 行 | 对齐 title5 标杆 |
| 🟡 Minor | ARCH-2 图标无障碍缺失 | 添加 `role="img" aria-hidden="true"` | 1 行 | 对齐 title5 标杆 |
| 🟡 Minor | ARCH-3 内联样式 | 改用 CSS 类名或 CSS 变量 | 5 分钟 | 提升主题化能力 |
| 🟢 Info | ARCH-4 工厂模式 | 创建 headingFactory.ts | 30 分钟 | 消除 ~100 行重复 |

---

## 十二、对本项目（by_geo）的影响评估

| 影响维度 | 风险等级 | 说明 |
|---|---|---|
| 功能正确性 | 🟢 低 | heading6 命令逻辑正确，Markdown H6 插入功能正常 |
| 升级兼容性 | 🟡 中 | 若项目使用了 `title6` 导入名，v5.0.0 移除后需迁移为 `heading6` |
| 定制扩展性 | 🟢 低 | 叶节点命令文件，无需定制 |
| 安全性 | 🟢 低 | 纯客户端文本操作，零攻击面 |
| 性能 | 🟢 低 | 命令由用户手动触发，单次同步执行 |

---

## 十三、评审总结

### 架构优势

1. **依赖拓扑最优** — 从独立模块 `headingUtils` 导入，无循环依赖，与 title5.tsx 一致
2. **命令模式实现规范** — 职责单一（定义命令数据 + 委托执行），符合 SRP
3. **废弃策略完整** — JSDoc 版本号 + 移除计划 + @see 引导齐备
4. **buttonProps 无障碍完善** — `aria-label` + `title` 双重属性，WCAG 2.1 AA 合规
5. **跨平台快捷键** — ctrlcmd 自动映射，覆盖主流操作系统
6. **零运行时开销** — 废弃别名 `title6 = heading6` 是引用赋值
7. **Markdown 规范合规** — H6 前缀 `###### ` 完全符合 CommonMark 规范

### 架构缺陷

1. **非空断言回退**（Minor）— title5.tsx 已改用 `??` 空值合并，title6.tsx 仍用 `!` 非空断言
2. **图标无障碍缺失**（Minor）— title5.tsx 已添加 `role="img" aria-hidden="true"`，title6.tsx 未同步
3. **内联样式**（Minor）— fontSize 硬编码不利于主题化，且 H5/H6 字号相同缺乏视觉区分
4. **代码重复**（Info）— title1-6 可合并为工厂模式

### 综合评价

title6.tsx 在核心架构层面表现良好——依赖拓扑健康、废弃策略完整、命令模式规范。但与同族标杆 title5.tsx 相比，title6.tsx 在类型安全（非空断言 vs 空值合并）和无障碍属性（缺少 role/aria-hidden）两个维度出现了**明显回退**。这反映出同族文件缺乏统一的代码规范传播机制：title5.tsx 的改进未能通过 codemod 或代码审查推广到 title6.tsx。

**评分理由**: title5.tsx 作为标杆获得 7.8/10，title6.tsx 在两个 Minor 维度回退，扣除 0.6 分。

**评审结论**: ⚠️ CONDITIONAL APPROVE（有条件通过）—— 架构质量 7.2/10，建议同步 title5.tsx 的类型安全和无障碍改进后可提升至 7.8/10。

---

*评审人: 软件架构专家*
*评审日期: 2026-05-25*

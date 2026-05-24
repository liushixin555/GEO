# 软件架构专家评审：strikeThrough.tsx

**文件**: `@uiw/react-md-editor@4.1.0/src/commands/strikeThrough.tsx`
**评审角色**: 软件架构专家（模块职责 · 抽象层级 · 接口契约 · 耦合度 · 内聚性 · 可扩展性 · 设计模式 · 架构演进性）
**评审日期**: 2026-05-25
**代码行数**: 36 行（1 个导出 `ICommand` 对象）
**功能概述**: Markdown 编辑器"删除线"命令实现，通过 `~~` 前后缀包裹/解包裹选中文本，属于 inline 命令簇，使用 `selectWord` + `executeCommand` 两步管道完成文本变换
**评审结论**: ✅ APPROVE WITH COMMENTS 7.5分 — 架构定位精确，是命令实现层 inline 命令簇的教科书级模板实现；数据流线性无分支（优于 quote.tsx 的块级管道），与 bold/italic/code 结构完全同构；但 inline 命令共性管道未提取、ICommand 接口缺少分类维度、非空断言为系统性类型安全隐患

**问题统计**: HIGH × 1 / MEDIUM × 2 / LOW × 2 / INFO × 2

---

## 一、架构定位分析

### 1.1 模块在系统中的位置

```
react-md-editor 命令实现层分类视图
┌──────────────────────────────────────────────────────────────────────┐
│                          命令编排层                                    │
│  TextAreaCommandOrchestrator.executeCommand()                        │
│    → 构建 ExecuteState { command, ...textState }                     │
│    → 调用 command.execute(state, api, ...)                           │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
              ┌────────────────┼────────────────────┐
              ▼                ▼                    ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────┐
│ Inline 命令簇     │ │ Block 命令簇      │ │ Toggle 命令簇         │
│ (使用selectWord  │ │ (使用insertEach)  │ │ (状态切换)            │
│  +executeCommand)│ │                  │ │                      │
│                  │ │                  │ │                      │
│ bold.tsx         │ │ quote.tsx        │ │ fullscreen.tsx       │
│ italic.tsx       │ │ list.tsx (×3)    │ │ preview.tsx          │
│ strikethrough.tsx│ │ hr.tsx           │ │                      │
│   ← 本文件       │ │                  │ │                      │
│ code.tsx         │ │                  │ │                      │
└──────┬───────────┘ └──────┬───────────┘ └──────────────────────┘
       │                    │
       ▼                    ▼
┌──────────────────┐ ┌──────────────────────────────────────────────┐
│ 基础设施层        │ │ 基础设施层 (Block 专用)                        │
│ executeCommand() │ │ insertBeforeEachLine()                        │
│ selectWord()     │ │ getBreaksNeededForEmptyLineBefore()           │
│ getSurroundingWord│ getBreaksNeededForEmptyLineAfter()           │
└──────────────────┘ └──────────────────────────────────────────────┘
```

**strikethrough.tsx 的架构角色**: 命令实现层的**行内命令**（Inline Command），与 bold.tsx / italic.tsx / code.tsx 同属一个子簇。它们共享完全相同的执行管道：`selectWord → setSelectionRange → executeCommand`，仅通过 `prefix` 参数差异化。

### 1.2 依赖关系图

```
strikethrough.tsx 依赖拓扑
──────────────────────────────────────────
                     strikethrough.tsx
                       ╱              ╲
                      ╱                ╲
        commands/index.ts          utils/markdownUtils.ts
        (类型导入)                  (行为导入)
             │                    ┌──────┴──────┐
             │                    │             │
        ICommand 接口        selectWord()  executeCommand()
        ExecuteState             │             │
        TextAreaTextApi     TextRange     文本包裹/解包裹
```

**依赖方向评价**: ✅ 所有依赖指向下层（基础设施层），无循环依赖，无跨层直接访问。

**依赖宽度**: 2 个 markdownUtils 导入（`selectWord`、`executeCommand`），是所有命令簇中依赖面最窄的——对比 block 命令簇（quote.tsx 依赖 4 个函数）。

### 1.3 被依赖关系

```
Afferent 依赖链（谁使用了 strikethrough.tsx）
──────────────────────────────────────────
commands/index.ts → getCommands() → 默认命令列表
                                     │
                                     ▼
                              Editor.tsx / Toolbar
                              → 用户通过按钮或 Ctrl+Shift+X 触发
```

**Afferent 耦合 (Ca)**: 1（仅被 commands/index.ts 导入）
**Efferent 耦合 (Ce)**: 3（React, commands/index.ts 类型, markdownUtils.ts）
**不稳定性 (I)**: 3/(1+3) = 0.75 → 叶子模块，高不稳定性正常

### 1.4 架构度量

| 度量 | 值 | 评价 |
|------|----|------|
| 代码行数 | 36 行 | ✅ 精简 |
| 传入耦合 (Ca) | 1 | ✅ 最小公开面 |
| 传出耦合 (Ce) | 3 | ✅ 依赖面最窄 |
| 内聚度 (LCOM) | 高（通信内聚） | ✅ execute 内所有操作围绕同一数据流 |
| 抽象层级数 | 2 层（命令对象 → 基础设施函数） | ✅ 扁平结构适合当前规模 |
| 圈复杂度 | 1（execute 内无条件分支） | ✅ 线性数据流 |
| 代码-数据比 | 50%/50%（逻辑 vs SVG 数据） | ⚠️ SVG 占比偏高 |

---

## 二、架构问题详细分析

### P1-HIGH-01：Inline 命令管道未抽象——bold/italic/strikethrough/code 四命令完全同构

**架构层面**: DRY · 抽象缺失 · 工厂模式
**严重度**: HIGH — 架构级设计缺陷

**同构度分析**:

```
bold.tsx vs italic.tsx vs strikethrough.tsx vs code.tsx 逐行对比:
─────────────────────────────────────────────────────────────────────
步骤                        bold       italic     strike     code
─────────────────────────────────────────────────────────────────────
1. name                    "bold"     "italic"   "strike.." "code"
2. keyCommand              "bold"     "italic"   "strike.." "code"
3. shortcuts               ctrl+b     ctrl+i     ctrl+shift+x ctrl+j
4. prefix                  "**"       "*"        "~~"       "`"
5. icon                    <svg/>     <svg/>     <svg/>     <svg/>
6. execute:
   6a. selectWord()        L27-30     L27-30     L23-27     L27-30
   6b. setSelectionRange   L31        L31        L28        L31
   6c. executeCommand()    L32-37     L32-37     L29-34     L32-37
─────────────────────────────────────────────────────────────────────
代码重复率: ~95%（仅差异：name/prefix/shortcuts/icon）
```

**问题本质**:

四个 inline 命令实现了**完全相同的执行管道**，唯一差异是配置参数。但没有任何共享抽象——每个命令都独立实现了相同的 3 步流程：

```
Inline 命令通用管道（未被显式建模）:
┌─────────────────────────────────────────────────────────┐
│ Phase 1: selectWord(state) → 扩展选区到完整单词边界       │
│ Phase 2: api.setSelectionRange(range) → 应用新选区       │
│ Phase 3: executeCommand({ api, selectedText, prefix })  │
│           → 包裹/解包裹文本                              │
└─────────────────────────────────────────────────────────┘
```

**架构后果**:

| 后果 | 说明 |
|------|------|
| Bug 修复扩散 | 管道逻辑的 bug 需要同步修改 4 个文件 |
| 行为不一致风险 | 4 份独立实现可能因微小差异导致行为偏差 |
| 扩展成本倍增 | 添加新 inline 命令（如 `~~` 变体 `~` 单删除线）需要复制整段管道 |
| 测试冗余 | 相同的管道逻辑需要分别测试 4 次 |
| 代码体积膨胀 | 4 × 36 ≈ 144 行实际可压缩为 ~30 行 |

**重构建议——Inline 命令工厂函数**:

```typescript
// utils/createInlineCommand.ts
export function createInlineCommand(config: {
  name: string;
  prefix: string;
  shortcuts: string;
  icon: React.ReactNode;
}): ICommand {
  return {
    name: config.name,
    keyCommand: config.name,
    shortcuts: config.shortcuts,
    buttonProps: {
      'aria-label': `Add ${config.name} text (${config.shortcuts})`,
      title: `Add ${config.name} text (${config.shortcuts})`,
    },
    prefix: config.prefix,
    icon: config.icon,
    execute: (state: ExecuteState, api: TextAreaTextApi): void => {
      const prefix = state.command.prefix;
      if (!prefix) return;
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
  };
}

// strikethrough.tsx 简化为
export const strikethrough = createInlineCommand({
  name: 'strikethrough',
  prefix: '~~',
  shortcuts: 'ctrl+shift+x',
  icon: <StrikeThroughIcon />,
});
```

**严重性理由**: HIGH — 4 个命令 95% 同构是架构层面的抽象缺失。strikethrough.tsx 作为 inline 命令簇的一员，其 execute 逻辑完全可以由工厂函数生成，而非独立实现。

---

### P2-MEDIUM-01：ICommand 接口缺少命令分类维度——Inline/Block/Toggle 共享同一类型

**架构层面**: 类型系统 · 接口契约 · 可辨识联合
**严重度**: MEDIUM — 类型安全缺陷

**问题分析**:

```
当前 ICommand 接口设计:
┌────────────────────────────────────────────────────────────────┐
│ interface ICommandBase<T> {                                     │
│   prefix?: string;        // ← 可选，但 strikethrough 必需      │
│   suffix?: string;        // ← 可选，但 strikethrough 必需      │
│   keyCommand?: string;    // ← 可选，但所有命令都设置            │
│   execute?: (...) => void; // ← 可选，但所有命令都实现           │
│ }                                                               │
│                                                                 │
│ 问题: ICommand 无法从类型层面区分:                               │
│   ├── inline 命令 (bold/italic/strike/code) → 需要 prefix        │
│   ├── block 命令 (quote/list)     → 需要 prefix，使用不同管道   │
│   └── toggle 命令 (fullscreen)    → 不需要 prefix/suffix        │
└────────────────────────────────────────────────────────────────┘
```

**对 strikethrough.tsx 的影响**:

1. `prefix` 声明为 `prefix?: string`，但 execute 函数通过 `state.command.prefix!` 断言其必存在（第 27、34 行）
2. 类型系统无法阻止创建一个 `keyCommand: 'strikethrough'` 但没有 `prefix` 的命令对象
3. 调用者无法从类型签名判断一个 ICommand 是行内命令还是块级命令

**架构改进建议——可辨识联合**:

```typescript
type ICommandKind = 'inline' | 'block' | 'toggle';

interface IInlineCommand extends ICommandBase {
  kind: 'inline';
  keyCommand: string;     // 必需
  prefix: string;         // 必需（非可选）
  execute: (state: ExecuteState, api: TextAreaTextApi) => void;
}

interface IBlockCommand extends ICommandBase {
  kind: 'block';
  keyCommand: string;
  prefix: string;
  suffix?: never;         // 行内命令不使用 suffix
}

type ICommand = IInlineCommand | IBlockCommand | IToggleCommand;
```

**收益**: TypeScript 编译器可在 `switch(state.command.kind)` 分支中自动收窄类型，彻底消除 `prefix!` 非空断言。

---

### P2-MEDIUM-02：非空断言绕过类型契约——与所有 inline 命令共享的系统性问题

**架构层面**: 类型安全 · 契约式设计
**严重度**: MEDIUM — 运行时异常风险

**位置**: 第 27 行、第 34 行

```typescript
// 第 27 行
prefix: state.command.prefix!,
// 第 34 行
prefix: state.command.prefix!,
```

**影响分析**:

```
undefined 传播路径:
state.command.prefix = undefined (假设框架分发错误)
  │
  ├── [路径 1] → selectWord({ prefix: undefined })
  │   └── getSurroundingWord() 中 prefix.length → TypeError
  │
  └── [路径 2] → executeCommand({ prefix: undefined })
      └── toggle 前后缀 → "undefined文本undefined" → 输出污染
```

**与其他命令的对比**:

| 命令 | `prefix!` 使用次数 | 同簇 |
|------|-------------------|------|
| bold.tsx | 2 | inline |
| italic.tsx | 2 | inline |
| strikethrough.tsx | 2 | inline |
| code.tsx | 2 | inline |
| quote.tsx | 2 | block |
| list.tsx | 1 | block |

**结论**: 这是**系统性架构问题**，根因在 `ICommandBase.prefix` 的可选性声明。strikethrough.tsx 是 inline 命令簇的一个实例，受同一设计缺陷影响。

---

### P3-LOW-01：SVG 图标资源与命令逻辑同层部署

**架构层面**: 关注点分离 · 资源管理
**严重度**: LOW — 代码组织

**位置**: 第 14-21 行

SVG path 数据占模块体积的 ~50%（约 8 行 / 36 行总行数），属于**静态资源**而非**逻辑代码**。

**与同类命令对比**: 所有命令（bold/italic/list/link/code）都有相同的 SVG 嵌入模式，是库级别的架构风格选择，非 strikethrough.tsx 独有问题。

**建议**: 若架构重构，可将 SVG 图标提取到 `commands/icons.ts`：

```typescript
// commands/icons.ts
export const StrikeThroughIcon: React.FC = () => <svg>...</svg>;

// strikethrough.tsx
import { StrikeThroughIcon } from './icons';
```

---

### P3-LOW-02：变量命名 `state1` 无法传达语义——时间耦合隐式化

**架构层面**: 可读性 · 数据流清晰度
**严重度**: LOW

**位置**: 第 28 行

```typescript
const state1 = api.setSelectionRange(newSelectionRange);
```

`state` → `state1` 的转换意味着"应用新选区后的编辑器状态"。但 `state1` 这个名称：
1. 无法表达其语义（"选区已更新的状态"）
2. 隐含了与 `state` 的时间耦合——读者必须理解 `state1` 继承了 `state.text` 但覆盖了 `state.selection`
3. 后续代码混用 `state1.selectedText`（第 31 行）和 `state.selection`（第 33 行），增加了理解负担

**建议**: `selectedState` 或 `afterSelectionUpdate`。

---

### INFO-01：strikethrough.tsx 是 inline 命令簇中架构最简洁的实例

在所有 inline 命令中，strikethrough.tsx 的 execute 函数是**完全无分支**的实现：

```
Inline 命令 execute 复杂度梯度:
──────────────────────────────────────────
bold.tsx    italic.tsx    strikethrough.tsx    code.tsx
  │            │              │                  │
  │  线性管道   │  线性管道    │  线性管道        │  线性管道
  │  3步       │  3步         │  3步             │  3步
  │            │              │                  │
  └────────────┴──────────────┴──────────────────┘
     四者完全同构，strikethrough.tsx 可作为
     提取 inline 命令工厂函数的最佳模板
```

**架构建议**: 以 strikethrough.tsx 的 execute 为模板，提取 `createInlineCommand` 工厂函数（见 P1-HIGH-01）。

---

### INFO-02：strikethrough.tsx 的数据流是所有命令中最清晰的

```
strikethrough.tsx 数据流:
──────────────────────────────────────────────────────────
ExecuteState ──→ selectWord() ──→ TextRange (新选区)
                                       │
                                       ▼
                              api.setSelectionRange()
                                       │
                                       ▼
                              state1 (选区已更新)
                                       │
                                       ▼
                              executeCommand()
                                       │
                                       ▼
                              textarea 文本变换
──────────────────────────────────────────────────────────
特点: 3 步线性管道，无分支，无回溯，无条件逻辑
对比: link.tsx 有 3 路分支，list.tsx 有 Add/Remove 双路径
```

---

## 三、架构模式评估

### 3.1 当前模式应用

| 模式 | 应用位置 | 评价 |
|------|----------|------|
| **Command Pattern** | `ICommand` 接口 + strikethrough 对象 | ✅ 标准实现，支持注册/执行/快捷键 |
| **Pipeline Pattern** | execute 内的 3 步线性流程 | ⚠️ 隐式管道——未显式建模为可组合阶段 |
| **Strategy Pattern** | 无 | N/A——只有一种策略（包裹/解包裹由 executeCommand 内部处理） |
| **Factory Method** | 无 | ❌ 缺失——inline 命令无工厂抽象 |
| **Template Method** | 无 | ❌ 缺失——bold/italic/strike/code 共享结构但无共享抽象 |

### 3.2 推荐架构：Inline 命令工厂

```
┌─────────────────────────────────────────────────────────────┐
│  工厂层: createInlineCommand(config) → ICommand               │
│    消除 bold/italic/strike/code 95% 结构性重复                │
├─────────────────────────────────────────────────────────────┤
│  管道层: executeInlineCommand(state, api, prefix)             │
│    ├── Phase 1: selectWord (纯函数)                          │
│    ├── Phase 2: setSelectionRange (副作用)                   │
│    └── Phase 3: executeCommand (纯函数 + 副作用)             │
├─────────────────────────────────────────────────────────────┤
│  类型层: IInlineCommand extends ICommandBase                  │
│    prefix: string (必需，非可选)                              │
│    消除 state.command.prefix! 非空断言                        │
├─────────────────────────────────────────────────────────────┤
│  资源层: icons.ts                                             │
│    SVG 图标数据独立管理                                       │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 可扩展性评估

```
扩展场景                         当前难度    重构后难度    说明
─────────────────────────────────────────────────────────
新增 inline 命令（如下划线）      高          极低         工厂函数 + 配置对象
修改删除线前缀                   低          极低         prefix 参数化
添加嵌套删除线                   高          中           需扩展 executeCommand
替换 SVG 图标                    中          低           资源层独立管理
修改选区扩展策略                 高          低           Phase 1 可独立替换
国际化 aria-label                中          低           工厂函数统一处理
```

---

## 四、安全评估（架构视角）

| 维度 | 评价 |
|------|------|
| 攻击面 | ✅ 极小——全部操作限于 textarea.value 纯文本域 |
| 信任边界 | ✅ 无网络请求、无敏感数据访问、无代码执行 |
| 状态一致性 | ⚠️ state/state1 时间耦合存在理论上的不一致风险，但安全影响为零 |
| 供应链 | ✅ 无外部运行时依赖（仅 React JSX + 内部工具函数） |
| 注入风险 | ✅ 纯文本操作，textarea.value 不解析 HTML |

**安全结论**: 无架构级安全风险。

---

## 五、总结

### 5.1 问题汇总

| ID | 严重度 | 原则/分类 | 问题 | 修复难度 |
|----|--------|----------|------|----------|
| P1-HIGH-01 | HIGH | DRY/抽象 | 与 bold/italic/code 95% 管道结构重复，inline 命令无工厂抽象 | 中 |
| P2-MEDIUM-01 | MEDIUM | 类型安全 | ICommand 缺少命令分类，prefix 可选但 inline 命令必需 | 中 |
| P2-MEDIUM-02 | MEDIUM | 类型契约 | `prefix!` 非空断言绕过类型检查，系统性问题 | 低 |
| P3-LOW-01 | LOW | SoC | SVG 数据（~50% 体积）与逻辑代码同文件 | 极低 |
| P3-LOW-02 | LOW | 可读性 | `state1` 命名不传达语义 | 极低 |
| INFO-01 | INFO | 复杂度 | inline 命令簇中完全无分支的实现，可作为工厂模板 | — |
| INFO-02 | INFO | 数据流 | 3 步线性管道是所有命令中数据流最清晰的 | — |

### 5.2 综合评分

| 维度 | 评分 (1-10) | 说明 |
|------|-------------|------|
| 单一职责 | 9 | 文件级职责单一，仅定义一个命令对象 |
| 接口设计 | 5 | ICommand 过于宽泛，prefix 可选但实际必需 |
| 耦合度 | 8 | 依赖面最窄（仅 2 个 markdownUtils 函数），传入耦合最小 |
| 内聚性 | 9 | 通信内聚——所有操作围绕同一数据流 |
| 可扩展性 | 5 | 无工厂抽象，新增 inline 命令需复制代码 |
| 可维护性 | 8 | 结构清晰，线性流程易理解，与同类命令完全一致 |
| 设计模式 | 6 | Command 模式正确，但 inline 命令工厂缺失 |
| 安全性 | 9 | 纯文本操作，攻击面极小 |
| **综合** | **7.5** | **✅ APPROVE WITH COMMENTS** |

### 5.3 优先重构建议

| 优先级 | 建议 | 工作量 | 收益 |
|--------|------|--------|------|
| 1 | 提取 `createInlineCommand` 工厂函数（以 strikethrough.tsx 为模板） | 中 | 消除 bold/italic/strike/code 95% 重复，新增 inline 命令仅需配置 |
| 2 | ICommand 添加命令分类维度（可辨识联合） | 中 | 消除 `prefix!` 非空断言，编译期类型安全 |
| 3 | execute 入口添加 prefix 防御性检查 | 极小 | 运行时安全网，零成本 |
| 4 | SVG 图标提取到 `icons.ts` | 小 | 降低模块体积 50%，关注点分离 |

### 5.4 集成风险评估

在本项目中使用 `strikethrough.tsx` 的架构风险等级：**低**

- 作为 `@uiw/react-md-editor` 的工具栏命令使用，不作为自定义扩展点
- 交互范围限于 textarea 文本操作，无网络/存储/权限相关逻辑
- 架构问题（inline 命令未抽象、ICommand 分类缺失）影响的是库自身的可维护性，不影响使用方
- strikethrough.tsx 的 3 步线性 execute 管道在运行时行为上稳定可靠，无分支条件，不存在策略选择错误的风险
- `~~` 前缀在 Markdown 规范中稳定（GFM 扩展，已被广泛采用），不存在语法变迁风险

---

*评审基于 @uiw/react-md-editor@4.1.0 源码 + 依赖链分析（markdownUtils.ts / commands/index.ts / bold.tsx / italic.tsx / code.tsx / quote.tsx / list.tsx）*

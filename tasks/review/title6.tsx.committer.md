# title6.tsx — Committer 审核专家评审报告

**评审日期**: 2026-05-25
**评审角色**: Committer 审核专家（代码合并准入 + 依赖准入评估 + 项目规范遵循 + 生产就绪度）
**文件路径**: `node_modules/@uiw/react-md-editor/src/commands/title6.tsx`
**代码行数**: 23 行
**文件性质**: 第三方依赖包代码（`@uiw/react-md-editor` v4.1.0 的六级标题命令定义）
**测试文件**: 无专属测试（三方库，测试由上游维护）
**关联文件**: `headingUtils.ts`（共享执行逻辑）、`commands/index.ts`（命令注册）、title1-5.tsx（同族命令）
**已有评审**: 质量评审（title6.tsx.md）、架构评审（title6.tsx.architecture.md）、安全评审（title6.tsx.security.md）、UI 评审（title6.tsx.ui.md）

---

## 一、Committer 审核总览

本审核从代码提交审核人（Committer）视角审视，重点不在于评判第三方库代码质量（上游维护者负责），而在于评估**本项目是否应采纳此依赖命令、当前使用方式是否正确、已发现的缺陷对本项目的影响程度**。

`title6.tsx` 定义了 Markdown 编辑器的六级标题（H6）命令，是 `@uiw/react-md-editor` 工具栏标题命令组的成员之一。该命令通过委托 `headingUtils.ts` 的 `headingExecute` 实现文本操作，同时导出 `title6` 作为向后兼容的废弃别名。代码结构简洁（23 行），依赖拓扑健康（无循环依赖），功能正确。对本项目而言，H6 命令的集成风险较低，但需关注废弃 API 迁移和工具栏样式覆盖两个维度。

| 审核维度 | 评分 | 判定 |
|----------|------|------|
| 依赖准入评估 | 8/10 | 通过 — 命令逻辑正确，依赖拓扑健康，无循环依赖 |
| API 契约正确性 | 8/10 | 通过 — ICommand 接口实现完整，buttonProps 无障碍属性齐全 |
| 项目防御充分性 | 9/10 | 通过 — 纯文本操作零攻击面，执行链同步无竞态 |
| 项目规范遵循 | 4/10 | 不通过 — 图标使用原生 div + 内联样式，违反 antd 组件铁律和 DESIGN.md 规范 |
| 生产就绪度 | 7/10 | 有条件通过 — 功能正确，但交互状态依赖框架层，CSS 覆盖需完善 |
| 上游风险可控性 | 7/10 | 有条件通过 — 非空断言和废弃 API 两个继承性风险需关注 |

**综合判定: 有条件通过（CONDITIONAL APPROVE）— 命令功能正确可安全使用，需补充工具栏 CSS 样式覆盖**

---

## 二、代码逐行审查（Committer 视角）

### 2.1 源码全文（附行号标注）

```tsx
1   import React from 'react';
2   import { headingExecute } from './headingUtils';
3   import { ICommand, ExecuteState, TextAreaTextApi } from './';
4
5   export const heading6: ICommand = {
6     name: 'heading6',
7     keyCommand: 'heading6',
8     shortcuts: 'ctrlcmd+6',
9     prefix: '###### ',
10    suffix: '',
11    buttonProps: { 'aria-label': 'Insert Heading 6 (ctrl + 6)', title: 'Insert Heading 6 (ctrl + 6)' },
12    icon: <div style={{ fontSize: 12, textAlign: 'left' }}>Heading 6</div>,
13    execute: (state: ExecuteState, api: TextAreaTextApi) => {
14      headingExecute({ state, api, prefix: state.command.prefix!, suffix: state.command.suffix });
15    },
16  };
17
18  /**
19   * @deprecated Since v4.0.0. Use `heading6` instead.
20   * Scheduled for removal in v5.0.0.
21   * @see heading6
22   */
23  export const title6: ICommand = heading6;
```

### 2.2 逐行审查意见

| 行号 | 代码 | Committer 审查意见 |
|------|------|----------|
| 1 | `import React from 'react'` | ✅ 库内部代码，需兼容 React 17 及以下，本项目 React 18 兼容 |
| 2 | `import { headingExecute } from './headingUtils'` | ✅ 从独立工具模块导入，无循环依赖（优于 title1.tsx 从 `./title` 导入的方式） |
| 3 | `import { ICommand, ... } from './'` | ⚠️ 从桶文件导入类型，建议使用 `import type` 语义明确仅类型依赖。编译后擦除，运行时无影响 |
| 5-10 | 命令元数据定义 | ✅ name/keyCommand/shortcuts/prefix/suffix 全部正确，H6 语法 `###### ` 符合 CommonMark 规范 |
| 8 | `shortcuts: 'ctrlcmd+6'` | ⚠️ 与浏览器 Ctrl+6（跳转第 6 个标签页）冲突，编辑器需 preventDefault。本项目使用场景中编辑器捕获焦点后通常可拦截 |
| 11 | `buttonProps: { aria-label, title }` | ✅ 无障碍属性完整，WCAG 2.1 AA 合规 |
| 12 | `icon: <div style={{...}}>Heading 6</div>` | ⚠️ **本项目关注点**：(1) 使用原生 div 而非 antd 组件，违反项目铁律；(2) fontSize: 12 与 title5 完全相同，H5/H6 无视觉区分；(3) 内联样式无法被主题覆盖。需在本项目 CSS 层面覆盖 |
| 12 | `fontSize: 12` | ⚠️ H5 和 H6 均为 12px，六级标题字号的视觉层级在此处断裂。这是上游的设计决策，不影响功能正确性，但影响用户识别效率 |
| 13-14 | `headingExecute({ ..., prefix: state.command.prefix! })` | ⚠️ **本项目关注点**：非空断言 `!` 绕过 TypeScript 类型保护。若 `state.command.prefix` 为 undefined（极端场景），会导致下游 TypeError。但 `heading6.prefix` 已硬编码为 `'###### '`，运行时安全。相比 title5.tsx 使用 `??` 空值合并，此处是架构回退 |
| 14 | `suffix: state.command.suffix` | ⚠️ suffix 可能为 undefined（接口定义为 `suffix?: string`），但 headingExecute 的默认参数 `suffix = ''` 提供了保护 |
| 18-22 | `@deprecated` JSDoc 注释 | ✅ 废弃策略完整：版本号（v4.0.0）+ 移除计划（v5.0.0）+ 迁移路径（`Use heading6 instead`）+ `@see` 引导 |
| 23 | `export const title6 = heading6` | ✅ 零成本引用别名，不创建额外对象。本项目需确认未使用 `title6` 导入名，避免 v5.0.0 升级时编译中断 |

---

## 三、依赖准入评估

### 3.1 heading6 命令的功能必要性

| 决策维度 | 评估 | 说明 |
|----------|------|------|
| 功能需求 | ✅ 必需 | 本项目的 Markdown 文章编辑器需支持六级标题 |
| 语法正确性 | ✅ | `###### ` 完全符合 CommonMark GFM 规范 |
| 快捷键合理性 | ✅ | `ctrlcmd+6` 符合用户直觉（H1-H6 连续映射） |
| toggle 行为 | ✅ | 重复执行可切换标题前缀的插入/移除，交互逻辑正确 |
| 向后兼容 | ✅ | `title6` 废弃别名确保旧代码不受影响 |

**结论**: heading6 命令是本项目 Markdown 编辑器的必要功能组件，功能实现正确，准入评估**通过**。

### 3.2 依赖版本与升级风险

| 风险项 | 等级 | 说明 | 缓解措施 |
|--------|------|------|----------|
| `title6` 在 v5.0.0 被移除 | 🟡 中 | 若本项目代码使用 `title6` 导入，升级后编译失败 | 确认使用 `heading6` 导入 |
| `headingExecute` 签名变更 | 🟢 低 | 内部 API，上游一般不会 breaking | 关注 changelog |
| `ctrlcmd+6` 快捷键被移除 | 🟢 低 | 核心命令快捷键，上游不太可能移除 | — |

**建议**: 在 `package.json` 中保持 `@uiw/react-md-editor` 的当前版本锁定，升级前确认 `title6` 导入迁移。

---

## 四、项目防御充分性审核

### 4.1 安全风险缓解状态

| 上游风险 | 严重度 | 本项目缓解 | 状态 |
|----------|--------|-----------|------|
| document.execCommand 废弃 API（S3） | MEDIUM | 浏览器仍支持，fallback 路径完整 | ✅ 可接受 |
| 手动伪造 UIEvent isTrusted=false（S4） | MEDIUM | React 18 对 isTrusted 宽容处理 | ✅ 可接受 |
| prefix! 非空断言 DoS（S1） | MEDIUM | heading6.prefix 硬编码非空 | ✅ 运行时安全 |
| 废弃导出 title6 共享引用（S8） | LOW | 确认使用 heading6 导入即可 | ✅ 需验证 |
| suffix = prefix 默认值陷阱（S2） | LOW | headingUtils 显式传 suffix='' | ✅ 已缓解 |

### 4.2 防御评估结论

title6.tsx 的安全风险全部来自执行链下游（`InsertTextAtPosition.ts` 的 DOM 操作层），是 `@uiw/react-md-editor` 库的系统性问题，非 title6.tsx 特有。本项目的 `helmet` 中间件和 CSP 配置可部分缓解浏览器层面的风险。防御充分性评估为**通过**。

---

## 五、项目规范遵循审核

### 5.1 antd 组件铁律合规性

| 检查项 | 合规状态 | 说明 |
|--------|----------|------|
| 图标使用 antd 组件 | ❌ 不合规 | 使用原生 `<div>` 而非 antd Button/Typography/SVG 图标 |
| 交互状态使用 antd 交互 | ❌ 不合规 | 无 hover/active/focus 状态，无 antd Design Token |
| 悬停提示使用 antd Tooltip | ⚠️ 部分合规 | 使用原生 HTML title 属性而非 antd Tooltip |

**注意**: 此为第三方库内部代码，不受项目铁律约束。但本项目消费方需通过 CSS 覆盖来对齐规范。

### 5.2 DESIGN.md 合规性

| 规范项 | 合规状态 | 说明 |
|--------|----------|------|
| 字体族（IBM Plex Sans） | ❌ 不合规 | 图标使用浏览器默认字体栈 |
| 色彩变量（Carbon tokens） | ❌ 不合规 | 使用浏览器默认色 #000 而非 Carbon ink #161616 |
| 圆角（flat-square 0px） | ✅ 合规 | 默认 div 无圆角 |
| 排版规范（caption 12px） | ⚠️ 部分合规 | fontSize 匹配但缺 fontWeight/lineHeight/letterSpacing |
| 间距（4px 网格） | ❌ 不合规 | 无 padding |

### 5.3 规范遵循结论

**不通过**。但考虑到这是第三方库内部实现，不可直接修改源码。需在本项目的 `global.css` 中通过 CSS 覆盖解决。

---

## 六、生产就绪度审核

### 6.1 功能正确性

| 测试场景 | 预期行为 | 风险 |
|----------|----------|------|
| 空行插入 H6 | 插入 `###### ` 前缀 | ✅ 正确 |
| 已有文本插入 H6 | 在行首插入 `###### ` | ✅ 正确 |
| 已是 H6 的行再次执行 | 移除 `###### ` 前缀（toggle） | ✅ 正确 |
| 已是 H3 的行执行 H6 | 替换 `### ` 为 `###### ` | ✅ 正确 |
| Ctrl+6 快捷键触发 | 等同于执行 heading6 | ✅ 正确 |

### 6.2 性能

| 维度 | 现状 | 风险 | 缓解 |
|------|------|------|------|
| 命令执行性能 | 同步单次执行 | 🟢 低 | 用户手动触发，不涉及批量操作 |
| 内存占用 | 单个命令对象 + 1 个废弃别名引用 | 🟢 低 | 零额外开销 |
| bundle 体积影响 | 命令定义 < 1KB | 🟢 低 | 可忽略 |

### 6.3 可观测性

| 维度 | 现状 | 建议 |
|------|------|------|
| 命令执行错误 | ❌ headingExecute 异常未捕获 | 上游框架层兜底，本项目无需额外处理 |
| 用户操作审计 | ❌ 无操作日志 | 非核心功能，低优先级 |
| 废弃 API 使用检测 | ❌ 无运行时检测 | TypeScript 编译时已标记 |

### 6.4 生产就绪度结论

**有条件通过**。核心功能正确、性能无瓶颈，但工具栏样式覆盖是生产上线前的必要工作。

---

## 七、与其他评审的交叉引用

| 评审文件 | 核心发现 | Committer 视角评判 |
|----------|----------|-------------------|
| title6.tsx.md（质量评审） | 评分 7.8，Q1 非空断言 Minor | 同意。上游问题，heading6.prefix 硬编码确保运行时安全。不阻塞依赖准入 |
| title6.tsx.md（质量评审） | Q2 内联样式 fontSize 12 与 H5 相同 Minor | 同意。上游设计决策，功能正确但视觉无区分。需 CSS 覆盖 |
| title6.tsx.architecture.md（架构评审） | 评分 7.2，相比 title5 出现非空断言和无障碍属性回退 | 同意。架构回退是上游维护问题，不影响本项目的功能使用 |
| title6.tsx.security.md（安全评审） | 评分 7.2，S3 execCommand + S4 手动伪造事件 MEDIUM | 同意。系统性风险，所有 title 命令共享。本项目当前使用场景风险可控 |
| title6.tsx.security.md（安全评审） | S1 非空断言 MEDIUM | 同意。heading6.prefix 硬编码为 `'###### '` 确保运行时安全 |
| title6.tsx.ui.md（UI 评审） | 评分 6.4，交互状态缺失 HIGH + H5/H6 无区分 HIGH | 同意。需在本项目 `global.css` 中通过 CSS 覆盖补齐 |

---

## 八、审核意见汇总

### 🔴 必须修复（Blocking）— 在本项目层面

| # | 问题 | 修复位置 | 修复方案 |
|---|------|----------|----------|
| 1 | **工具栏按钮交互状态缺失**（hover/active/focus） | `pages/styles/global.css` | 为 `.w-md-editor-toolbar button` 添加 hover/focus/active 样式（Carbon 规范） |
| 2 | **H5/H6 按钮视觉无区分** | `pages/styles/global.css` | 为 `button[aria-label*="Heading 6"]` 设置差异化字号（11px）或灰度 |

### 🟡 建议改进（Non-blocking）

| # | 问题 | 修复位置 | 建议 |
|---|------|----------|------|
| 3 | 确认本项目未使用废弃的 `title6` 导入 | `pages/` 全局搜索 | `grep -r "title6" pages/` 确认使用 `heading6` |
| 4 | 工具栏按钮颜色未对齐 Carbon | `pages/styles/global.css` | 添加 `color: var(--color-ink)` 覆盖 |
| 5 | 工具栏按钮间距不足 | `pages/styles/global.css` | 添加 `padding: 12px 16px` 覆盖 |
| 6 | 焦点环缺失（WCAG 2.4.7） | `pages/styles/global.css` | 添加 `:focus-visible { outline: 2px solid var(--color-primary) }` |
| 7 | 图标缺少无障碍属性 | 上游问题 | 无法在本项目修复，建议向上游提交 PR |

### 🟢 认可的优点

| # | 优点 | 说明 |
|---|------|------|
| 1 | 依赖拓扑健康 | 从独立模块 `headingUtils` 导入，无循环依赖，优于 title1.tsx |
| 2 | 废弃策略完整 | JSDoc 版本号 + 移除计划 + @see 引导齐备，供应链风险可控 |
| 3 | ICommand 接口实现完整 | 所有属性正确提供，buttonProps 无障碍属性齐全 |
| 4 | 功能正确 | H6 前缀 `###### ` 符合 CommonMark 规范，toggle 行为正确 |
| 5 | 零运行时开销 | 废弃别名 `title6 = heading6` 是引用赋值，不创建额外对象 |
| 6 | 代码简洁 | 23 行代码，职责单一，审计成本低 |

---

## 九、最终裁决

### 裁决结果：⚠️ 有条件通过（CONDITIONAL APPROVE）

**裁决理由**：

1. **功能正确性充分**: heading6 命令的 H6 语法（`###### `）、快捷键（`ctrlcmd+6`）、toggle 行为（重复执行切换标题）均符合 Markdown 编辑器的功能预期。执行链委托 `headingUtils.ts`，同步执行无竞态风险。

2. **依赖拓扑健康**: title6.tsx 从独立模块 `headingUtils.ts` 导入 `headingExecute`，彻底避免了 title1.tsx 中存在的循环依赖问题。依赖方向单一清晰。

3. **安全风险可控**: 本文件自身零攻击面（纯数据定义模块），执行链下游的 MEDIUM 级风险（`document.execCommand` 废弃 API、手动伪造事件）是 `@uiw/react-md-editor` 库的系统性问题，非 title6.tsx 特有。当前主流浏览器仍支持这些 API，短期内不影响使用。

4. **废弃策略规范**: `title6 → heading6` 的迁移路径明确（v5.0.0 移除），本项目需确认使用 `heading6` 导入名。

5. **样式不合规需修复**: 工具栏图标使用原生 div + 内联样式，与 DESIGN.md 的 Carbon Design System 规范不一致，且 H5/H6 按钮视觉无区分。需通过 CSS 覆盖解决，这是**唯一阻塞项**。

### 合并前必须完成（CSS 覆盖）：

- [ ] 确认本项目未使用废弃的 `title6` 导入名（应使用 `heading6`）
- [ ] 在 `global.css` 中为 `.w-md-editor-toolbar button` 添加 hover/active/focus 交互状态
- [ ] 在 `global.css` 中为 H6 按钮添加差异化样式（与 H5 视觉区分）
- [ ] 通过 `pnpm build:page` 构建验证
- [ ] 通过 `pnpm lint` 无错误

### 合并后应排期改进：

- [ ] 为 `.w-md-editor-toolbar button` 添加 Carbon 颜色和间距覆盖
- [ ] 添加 `:focus-visible` 焦点环样式
- [ ] 统一 react-md-editor 工具栏主题为 Carbon 风格
- [ ] 评估用 antd Dropdown 替代 6 个独立标题按钮的可行性

### 依赖版本建议：

- 保持 `@uiw/react-md-editor` 版本锁定
- 关注上游 v5.0.0 changelog 中的 `title6` 移除公告
- 关注 `document.execCommand` 在浏览器中的支持状态变化

---

**评审人**: Committer 审核专家
**评审结论**: CONDITIONAL APPROVE — 命令功能正确可安全使用，需补充工具栏 CSS 样式覆盖（约 1-2 小时工作量）
**建议优先级**: P2（非阻塞，建议本迭代完成 CSS 覆盖）
**预期修复工作量**: 约 1-2 小时（2 项必需 CSS 覆盖 + 废弃导入检查 + 构建验证）

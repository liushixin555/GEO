# link.tsx — Committer 审核专家评审报告

**文件**: `@uiw/react-md-editor@4.1.0/src/commands/link.tsx`
**评审角色**: Committer 审核专家（代码合并准入 · 依赖可接受性 · 项目集成风险 · 规范兼容性 · 生产就绪度）
**评审日期**: 2026-05-25
**代码行数**: 58 行（1 个导出 `ICommand` 对象）
**功能概述**: Markdown 编辑器"插入链接"命令实现，通过 `[text](url)` 语法包裹选中文本或插入占位符，含三路分支（URL 自动识别、空白模板插入、文本包裹）
**评审结论**: ⚠️ CONDITIONAL APPROVE — 第三方库内部命令模块，功能基本可用但存在 4 项 P1 级严重问题（快捷键冲突 + javascript: URL 穿透 + 空链接文本 WCAG 违规 + data-name 复制粘贴错误），需在封装层覆盖后方可安全集成

**前序评审**:
- 质量评审 6.4/10 ⚠️ APPROVE WITH COMMENTS（H1×1 data-name 复制粘贴 Bug + M1×3 类型安全/URL 检测/硬编码 prefix + L1×3 SVG title/let 重赋值/模板不一致）
- 安全评审 6.8/10 ⚠️ APPROVE WITH COMMENTS（M1×1 javascript: URL 穿透渲染层 + S2-S5 LOW×4 非空断言/过期状态/选区越界/URL 检测）
- UI 评审 2.5/10 ⚠️ CONDITIONAL APPROVE（P1×4 Ctrl+L 非标准快捷键+data-name 复制错误+空链接文本 WCAG 违规+12px 图标不合规，P2×6 URL 检测粗放+非空断言+双占位符无引导+SVG 缺 aria-hidden+填充图标非 Carbon 风格+原生 title 非 antd Tooltip）
- 架构评审 5.5/10 ⚠️ APPROVE WITH COMMENTS（H1×1 URL 检测不属于命令层+M1×2 双重配置源 prefix/suffix+M2×1 与 image.tsx 85% 代码重复+M3×1 selection 跨阶段状态混用）

---

## 一、Committer 审核总览

本文件是第三方库 `@uiw/react-md-editor@4.1.0` 的内部命令模块，非本项目自定义代码。Committer 审核重点在于：该文件是否存在影响项目集成的阻塞问题、是否需要在封装层做额外适配、以及已知问题的优先级排序和合并风险评估。

| 审核维度 | 评分 | 判定 |
|----------|------|------|
| 代码质量 | 6/10 | 有条件通过 — 三路分支逻辑功能可用，但 data-name Bug + URL 检测粗放影响可靠性 |
| 安全可接受性 | 6/10 | 有条件通过 — 命令层安全，但渲染链 javascript: URL 穿透需封装层白名单过滤 |
| 项目集成兼容性 | 4/10 | 有条件通过 — 快捷键冲突、空链接文本、无 antd 集成，需封装层全面覆盖 |
| 依赖稳定性 | 9/10 | 通过 — 零外部运行时依赖，纯 textarea 文本操作 |
| 生产就绪度 | 6/10 | 有条件通过 — 功能基本可用，但 URL 误判 + prefix! 崩溃风险 + 快捷键冲突影响体验 |

**综合判定: 有条件通过（CONDITIONAL APPROVE）**

> `link.tsx` 是工具栏命令中**渲染链安全风险最高**的模块——因为它直接生成 `<a href="...">` 结构，`javascript:` URL 可穿透到 Markdown 渲染层成为存储型 XSS 向量。同时空链接文本 `[](url)` 构成 WCAG 违规、Ctrl+L 快捷键与浏览器地址栏冲突。**必须在封装层完成 P1 级修复后方可投入生产使用。**

---

## 二、代码质量审核

### 2.1 代码结构分析

```tsx
export const link: ICommand = {          // L5: 命令对象，实现 ICommand 接口
  name: 'link',                           // L6: 命令标识符
  keyCommand: 'link',                     // L7: 键盘命令映射键
  shortcuts: 'ctrlcmd+l',                 // L8: ⚠️ 与浏览器 Ctrl+L=选中地址栏 冲突
  prefix: '[',                            // L9: Markdown 链接左标记
  suffix: '](url)',                       // L10: Markdown 链接右标记
  buttonProps: { ... },                   // L11: 按钮 ARIA + title 属性（英文硬编码）
  icon: (<svg>...</svg>),                 // L12-18: ⚠️ data-name="italic" 复制粘贴错误
  execute: (state, api) => { ... },       // L20-57: 三路分支命令执行逻辑
};
```

**结构评价**:

| 维度 | 评价 | 说明 |
|------|------|------|
| 设计模式 | ⚠️ 勉强 | 命令模式外壳规范，但 execute 内部三路分支缺乏策略抽象 |
| 代码简洁度 | ⚠️ 一般 | 58 行含 3 个分支 + let 重赋值 + 魔法字符串，复杂度高于 bold/italic |
| 函数职责 | ❌ 差 | execute 承担 URL 检测 + 策略选择 + 选区计算 + 语法包裹四项职责 |
| 可维护性 | ⚠️ 勉强 | 三组不同 prefix/suffix 组合无注释无常量，修改一处需检查全部 |

### 2.2 execute 逻辑正确性验证

```typescript
// L20-57
execute: (state: ExecuteState, api: TextAreaTextApi) => {
  let newSelectionRange = selectWord({ text, selection, prefix: state.command.prefix!, suffix });
  let state1 = api.setSelectionRange(newSelectionRange);

  // 分支1 (L28): URL 检测 — includes('http') / includes('www')
  if (state1.selectedText.includes('http') || state1.selectedText.includes('www')) {
    newSelectionRange = selectWord({ text, selection, prefix: '[](', suffix: ')' });  // re-select
    state1 = api.setSelectionRange(newSelectionRange);
    executeCommand({ api, selectedText: state1.selectedText, selection: state.selection,
                     prefix: '[](', suffix: ')' });
  }
  // 分支2+3 (L38-55): 非 URL
  else {
    if (state1.selectedText.length === 0) {
      // 分支2: 空选区 — 插入 [title](url)
      executeCommand({ api, selectedText: '', selection, prefix: '[title', suffix: '](url)' });
    } else {
      // 分支3: 有选区 — 包裹为 [文本](url)
      executeCommand({ api, selectedText: state1.selectedText, selection,
                       prefix: state.command.prefix!, suffix: state.command.suffix });
    }
  }
},
```

**执行路径分析**:

| 场景 | 输入 | 分支 | 结果 | 正确性 |
|------|------|------|------|--------|
| 选中 `https://example.com` | URL 文本 | 1 (URL) | `[](https://example.com)` | ⚠️ 链接文本为空 |
| 选中 `the http protocol` | 含 http 非 URL | 1 (URL) | `[](the http protocol)` | ❌ 误判 |
| 无选区+空行 | 空文本 | 2 (空选区) | `[title](url)` | ✅ 占位符 |
| 选中 `公司官网` | 普通文本 | 3 (包裹) | `[公司官网](url)` | ✅ 包裹 |
| 光标在 `[text](url)` 内 | 已有链接语法 | 理应 toggle | 三路均不匹配完整语法 | ❌ 无 toggle |

**关键发现 — C-01: URL 分支输出空链接文本 `[](url)`（P1 级可访问性缺陷）**:

与 image.tsx 对比，link.tsx 的 URL 分支输出 `[](url)` — 链接文本**完全为空**。image.tsx 至少提供 `![image](url)` 默认 alt 文本。空链接文本违反 WCAG 2.4.4 Link Purpose，屏幕阅读器无法播报链接目的，SEO 也受影响。

**关键发现 — C-02: link.tsx 有 re-select 但 image.tsx 没有（行为不对称）**:

link.tsx 的 URL 分支（L29-30）正确地执行了 re-select（重新 `selectWord` + `setSelectionRange`），而 image.tsx 跳过了这一步。这表明 link.tsx 的逻辑比 image.tsx 更完整。

### 2.3 非空断言 `prefix!` 分析

```typescript
prefix: state.command.prefix!,  // L24, L53 — 非空断言
```

**安全评审已标记为 LOW，架构评审已标记**。Committer 视角：

1. `link` 对象硬编码了 `prefix: '['`（L9），运行时 `state.command.prefix` 必然为 `'['`
2. `ICommand` 接口中 `prefix?: string` 是可选的，框架动态分发时理论上可传入不同 command 对象
3. `!` 非空断言仅在编译期消除类型错误，运行时 `undefined` 会传入 `selectWord` → 行为不可预测
4. 与 bold/italic/image 中的同类问题一致，是库级别的系统性类型设计问题

**Committer 判断**: 不阻塞依赖引入，封装层提供防御性默认值即可。

---

## 三、依赖可接受性审核

### 3.1 依赖链分析

```
link.tsx
├── React (JSX 运行时) — 项目已有依赖，无版本冲突风险
├── ICommand / ExecuteState / TextAreaTextApi (commands/index.ts) — 库内部类型
├── selectWord (utils/markdownUtils.ts) — 纯字符串运算，无副作用
└── executeCommand (utils/markdownUtils.ts) — 纯文本拼接，通过 TextAreaTextApi 操作 DOM
```

| 依赖 | 类型 | 稳定性 | 风险 |
|------|------|--------|------|
| `React` | 外部 | 高 | 无 — 项目统一管理版本 |
| `ICommand` 接口 | 库内部 | 高 | 低 — 接口自 v3 稳定未变 |
| `selectWord()` | 库内部 | 高 | 低 — 纯字符串运算，无正则无网络 |
| `executeCommand()` | 库内部 | 高 | 低 — 纯 textarea.value 操作 |
| `TextAreaTextApi` | 库内部 | 高 | 低 — DOM API 封装 |

**结论**: 零外部运行时依赖。所有库内依赖均为纯运算函数，无网络/存储/副作用调用。依赖链完全可接受。

### 3.2 库版本风险

| 风险项 | 评估 | 说明 |
|--------|------|------|
| 库版本锁定 | ✅ 安全 | `package.json` 锁定 `@uiw/react-md-editor@4.1.0` |
| API 兼容性 | ✅ 稳定 | `ICommand` 接口自 v3 起未破坏性变更 |
| 维护活跃度 | ⚠️ 中等 | 库最近更新频率较低，但功能已成熟稳定 |
| 上游修复前景 | ⚠️ 不确定 | URL 检测和 javascript: URL 过滤需确认上游态度 |

---

## 四、项目集成兼容性审核

### 4.1 与本项目封装层的兼容性

本项目通过 `MarkdownEditor.tsx` + `markdown-editor.css` 封装了 `@uiw/react-md-editor`。`link` 命令的集成方式：

| 集成点 | link.tsx 行为 | 本项目覆盖 | 兼容性 |
|--------|-------------|-----------|--------|
| 工具栏按钮渲染 | SVG 12×12 填充图标 | CSS 可部分覆盖 | ⚠️ 需封装层替换 |
| 按钮颜色 | `currentColor` 继承 | CSS `color` 属性覆盖 | ✅ 完全兼容 |
| Tooltip | 原生 `title`（英文） | 无覆盖 | ❌ 不符合 antd 规范 |
| ARIA | 英文 `aria-label` | 无覆盖 | ❌ 不支持中文 |
| SVG 无障碍 | 有 `role="img"` 但缺 `aria-hidden` | 无覆盖 | ❌ WCAG 不合规 |
| SVG data-name | `"italic"`（错误） | 无覆盖 | ❌ 复制粘贴 Bug |
| 快捷键 | `ctrlcmd+l` | 无覆盖 | ❌ 与浏览器地址栏冲突 |
| URL 检测 | `includes('http')` | 无覆盖 | ❌ 误判/漏判并存 |
| 链接文本输出 | 空文本 `[](url)` | 无覆盖 | ❌ WCAG 2.4.4 违规 |
| 文本操作 | textarea 纯文本 | 无需覆盖 | ✅ 完全兼容 |
| URL 方案验证 | 无 | 无覆盖 | ❌ javascript: URL 可穿透 |

### 4.2 封装层必须修复项

基于四份前序评审的发现，本项目封装层处理 `link.tsx` 相关事项：

| 优先级 | 事项 | 来源 | 状态 | 说明 |
|--------|------|------|------|------|
| **P1-1** | 创建 `customLink` 命令覆盖默认实现 | 本评审 | **必须** | 全面替代默认 link 命令 |
| **P1-2** | 快捷键改为 `ctrlcmd+k`（行业标准） | UI/UI-P1-01 | **必须** | 消除浏览器冲突 + 行业认知 |
| **P1-3** | URL 方案白名单过滤 | 安全/S1 | **必须** | 消除 javascript: URL 穿透 |
| **P1-4** | URL 分支从 URL 提取域名作默认链接文本 | UI/UI-P1-03 | **必须** | 消除空链接文本 WCAG 违规 |
| P2-1 | URL 检测改用正则 | 质量/M2 + 安全/S5 | 建议 | 减少误判/漏判 |
| P2-2 | SVG 添加 `aria-hidden="true"` + 修正 data-name | UI/UI-P1-02 + UI/UI-P2-04 | 建议 | WCAG 合规 |
| P2-3 | 中文 ARIA 标注 + antd Tooltip 注入 | UI/UI-P2-06 + UI/UI-P3-03 | 建议 | 中文化 |
| P2-4 | Carbon 风格线性轮廓图标 | UI/UI-P2-05 | 建议 | 设计系统对齐 |
| P3-1 | 占位符 `title` 自动选中引导 | UI/UI-P2-03 | 可选 | 操作引导 |
| P3-2 | `prefix!` 改为防御性默认值 | 安全/S2 | 可选 | 消除崩溃风险 |

---

## 五、与同级命令的一致性审核

`link.tsx` 与其他命令的结构对比：

| 属性 | bold | italic | **link** | image |
|------|------|--------|----------|-------|
| 分支数 | 0 | 0 | **2** (URL+其他) | 3 |
| execute 行数 | 4 | 4 | **12** | 16 |
| `let` 重赋值 | 0 | 0 | **2** | 2 |
| re-select | — | — | **✅ URL分支有** | ❌ 缺失 |
| `prefix!` 断言 | ×2 | ×2 | **×2** | ×2 |
| SVG 尺寸 | 12×12 | 12×12 | **12×12** | 13×13 |
| SVG data-name | "bold" | "italic" | **"italic" ❌** | — |
| SVG `aria-hidden` | ❌ | ❌ | **❌** | ❌ |
| 英文 buttonProps | ✅ | ✅ | **✅** | ✅ |
| 快捷键 | `ctrlcmd+b` ✅ | `ctrlcmd+i` ✅ | **`ctrlcmd+l` ❌** | `ctrlcmd+k` ❌ |
| URL 分支输出 | — | — | **`[](url)` ❌ 空文本** | `![image](url)` ⚠️ 有默认 |
| 渲染链安全 | N/A | N/A | **⚠️ `<a href>` XSS 风险** | ⚠️ `<img src>` 加载风险 |

**核心差异**:

1. **link 是渲染链安全风险最高的命令** — 直接生成 `<a href="...">`，javascript: URL 可穿透到渲染层成为存储型 XSS
2. **link 的 URL 分支输出优于 image** — link 有 re-select（image 缺失），但输出空链接文本（image 至少有默认 alt）
3. **link 的快捷键是唯一一个与浏览器冲突的** — Ctrl+L 在所有主流浏览器中 = 选中地址栏
4. **link 与 image 同构度 85%** — 但硬编码值的分布不一致（link 分支 A 硬编码，image 分支 A 用配置）

**结论**: link.tsx 的问题中，`prefix!` 非空断言和英文 buttonProps 属于**系统性问题**（所有命令共有），可统一在封装层处理。但渲染链 XSS、空链接文本、快捷键冲突是 **link 独有的严重问题**，必须在封装层专项修复。

---

## 六、已知问题优先级汇总

### 6.1 阻塞"直接使用"但不阻塞"依赖引入"的问题

| 编号 | 来源 | 级别 | 描述 | Committer 决策 |
|------|------|------|------|---------------|
| SEC-S1 | 安全评审 | MEDIUM | javascript: URL 未过滤穿透渲染层 | **阻塞直接使用** — 封装层必须白名单过滤 |
| UI-P1-01 | UI 评审 | P1 | Ctrl+L 快捷键与浏览器地址栏冲突 + 非行业标准 | **阻塞直接使用** — 封装层必须改快捷键为 Ctrl+K |
| UI-P1-03 | UI 评审 | P1 | URL 分支生成空链接文本 `[](url)` — WCAG 2.4.4 违规 | **阻塞直接使用** — 封装层必须提供默认链接文本 |
| QUAL-H1 | 质量评审 | HIGH | SVG data-name="italic" 复制粘贴错误 | **阻塞直接使用** — 封装层必须修正 |

### 6.2 不阻塞但建议修复的问题

| 编号 | 来源 | 级别 | 描述 | Committer 决策 |
|------|------|------|------|---------------|
| SEC-S2 | 安全评审 | LOW | `prefix!` 非空断言可致 TypeError 崩溃 | **不阻塞** — 封装层提供默认值 |
| SEC-S3 | 安全评审 | LOW | 分支 A 使用原始 state.selection 过期状态 | **不阻塞** — JS 单线程模型下几乎不可能发生 |
| SEC-S4 | 安全评审 | LOW | selectWord 返回值未校验选区范围 | **不阻塞** — JS 字符串 API 自带容错 |
| SEC-S5 | 安全评审 | LOW | URL 检测逻辑粗糙（误判/漏判） | **不阻塞** — 封装层用正则替代 |
| QUAL-M1 | 质量评审 | MEDIUM | 非空断言绕过类型系统 | **不阻塞** — 库级别系统性问题 |
| QUAL-M2 | 质量评审 | MEDIUM | URL 检测逻辑 `includes('http')` 过于简单 | **不阻塞** — 封装层可正则替代 |
| QUAL-M3 | 质量评审 | MEDIUM | 分支 A 硬编码 prefix/suffix 与命令配置不对称 | **不阻塞** — 第三方代码 |
| UI-P1-02 | UI 评审 | P1 | SVG data-name 错误 | 同 QUAL-H1 |
| UI-P1-04 | UI 评审 | P1 | 图标 12×12 低于 Carbon 标准 16px | **不阻塞** — CSS 可覆盖 |
| UI-P2-01 | UI 评审 | P2 | URL 检测粗放 | 同 QUAL-M2 |
| UI-P2-02 | UI 评审 | P2 | `prefix!` 崩溃风险 | 同 SEC-S2 |
| UI-P2-03 | UI 评审 | P2 | 占位符无视觉引导 | **不阻塞** — 封装层可自动选中 |
| UI-P2-04 | UI 评审 | P2 | SVG 缺 aria-hidden | **不阻塞** — 封装层添加 |
| UI-P2-05 | UI 评审 | P2 | 填充图标不符 Carbon 线性轮廓 | **不阻塞** — 封装层替换 |
| UI-P2-06 | UI 评审 | P2 | 原生 title 替代 antd Tooltip | **不阻塞** — 封装层用 Tooltip |
| ARCH-H1 | 架构评审 | HIGH | URL 检测不属于命令层（职责越界） | **不阻塞** — 第三方架构问题 |
| ARCH-M1 | 架构评审 | MEDIUM | 双重配置源 prefix/suffix | **不阻塞** — 第三方代码 |
| ARCH-M2 | 架构评审 | MEDIUM | 与 image.tsx 85% 代码重复 | **不阻塞** — 第三方架构问题 |
| ARCH-M3 | 架构评审 | MEDIUM | selection 跨阶段状态混用 | **不阻塞** — 逻辑当前正确 |

### 6.3 封装层建议修复（按优先级）

| 优先级 | 修复项 | 预估工时 | 修复位置 |
|--------|--------|---------|---------|
| **P1-1** | 创建 `customLink` 覆盖默认命令（含 URL 白名单 + 域名提取 + 正则 URL 检测） | 2h | `pages/components/Editor/commands/` |
| **P1-2** | 快捷键改为 `ctrlcmd+k` | 5min | 同上 |
| **P1-3** | SVG 图标替换（16px + aria-hidden + data-name 修正 + Carbon 线性轮廓） | 30min | 同上 |
| P2-1 | antd Popover/Modal 链接编辑界面（链接文本 + URL 双输入） | 3h | 同上 |
| P2-2 | 中文 ARIA + antd Tooltip | 1h | 同上 + CSS |
| P3-1 | 操作反馈 message + 占位符自动选中 | 1h | 同上 |

**封装层总工时**: P1 约 2.5h，P1+P2 约 6.5h

---

## 七、Committer 决策依据

### 7.1 合并准入检查清单

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 功能完整性 | ⚠️ 部分 | 三路分支基本可用，URL 分支有 re-select（优于 image），但空链接文本 + 无 toggle 行为 |
| 安全性达标 | ⚠️ 有条件 | 命令层安全（textarea 纯文本），但渲染链 javascript: URL 需封装层白名单 |
| 项目规范兼容 | ❌ 不合规 | 快捷键冲突、空链接文本、无 antd 集成、无 Carbon 对齐、无中文支持 |
| 依赖稳定性 | ✅ 通过 | 零外部运行时依赖，库版本锁定 |
| 生产就绪 | ⚠️ 有风险 | prefix! 崩溃风险 + URL 误判 + 快捷键冲突 + 空链接文本 |
| 测试覆盖 | ℹ️ 豁免 | 第三方库内部模块，测试由库自身保障 |
| 向后兼容 | ✅ 通过 | 新引入依赖，无兼容性问题 |

### 7.2 裁决理由

1. **第三方库模块**: `link.tsx` 是 `@uiw/react-md-editor` 的内部实现，Committer 职责是评估其对项目的影响，而非要求修改第三方源码
2. **安全评审有条件通过**: 命令层通过纯 textarea 操作天然免疫 DOM-based XSS。但 `javascript:` URL 可穿透渲染层——这是所有工具栏命令中**渲染链风险最高**的（bold/italic/code 不生成含 URL 的 HTML 属性），封装层必须对渲染层配置 URL 方案白名单
3. **与 bold.tsx（APPROVE）对比**: bold 安全 8.0/10、UI 4.3/10；link 安全 6.8/10、UI 2.5/10 — 差距主要来自渲染链 XSS 风险和空链接文本
4. **与 image.tsx（CONDITIONAL APPROVE 5.0）对比**: image 安全 3.5/10（CRITICAL XSS）、UI 2.3/10；link 安全 6.8/10（MEDIUM）、UI 2.5/10 — link 比 image 安全性更好（无 CRITICAL 级问题），URL 分支有 re-select（逻辑更完整）
5. **封装层可全面覆盖**: 所有问题（快捷键、URL 白名单、空链接文本、图标、ARIA）均可通过创建 `customLink` 命令解决
6. **条件**: 必须在封装层完成 P1 级修复后方可投入生产使用

### 7.3 与同层命令 Committer 评审对比

| 维度 | bold.tsx | image.tsx | **link.tsx** |
|------|----------|-----------|-------------|
| 安全评审 | 8.0/10 ✅ | 3.5/10 ❌ | **6.8/10 ⚠️** |
| UI 评审 | 4.3/10 | 2.3/10 | **2.5/10** |
| 架构评审 | — | 3.8/10 | **5.5/10** |
| Committer 裁决 | APPROVE 8.0 | CONDITIONAL APPROVE 5.0 | **CONDITIONAL APPROVE 6.0** |
| 封装层工时 | P2+P3 共 2h | P1 起步 2.5h | **P1 起步 2.5h** |
| re-select | — | ❌ 缺失 | **✅ 有** |
| 渲染链 XSS | N/A | ⚠️ `<img src>` | **⚠️ `<a href>` (最高风险)** |

---

## 八、最终裁决

### 裁决结果: 有条件通过（CONDITIONAL APPROVE）

**条件**:

1. ✅ 可安全引入 `@uiw/react-md-editor@4.1.0` 依赖
2. ⚠️ **禁止直接使用默认 `link` 命令** — 必须在封装层创建 `customLink` 命令覆盖
3. 📋 `customLink` 必须包含以下 P1 级修复：
   - URL 方案白名单过滤（消除 javascript: URL 穿透渲染层）
   - 快捷键改为 `ctrlcmd+k`（行业标准，消除浏览器冲突）
   - URL 分支从 URL 提取域名作为默认链接文本（消除空链接文本 WCAG 违规）
   - SVG 图标修正 data-name + 替换为 Carbon 风格 16px 线性轮廓图标
4. 📋 建议后续迭代完成 P2 级修复（antd Popover 双模式 + 中文 ARIA + URL 检测正则）

**裁决摘要**:

`link.tsx` 是一个功能基本可用但存在多个严重问题的 Markdown 编辑器链接命令模块。与同层级的 `bold.tsx`（APPROVE）相比，link 命令的核心优势在于 URL 分支有 re-select（比 image.tsx 更完整），但其三路分支策略带来的复杂度引发了四个 P1 级问题：

1. **渲染链 XSS 风险最高** — `javascript:` URL 可穿透到 Markdown 渲染层，这是所有工具栏命令中独有的高危风险（bold/italic/code 不生成含 URL 的 HTML 属性）
2. **空链接文本 WCAG 违规** — URL 分支输出 `[](url)` 无链接文本，屏幕阅读器无法理解链接目的
3. **快捷键与浏览器冲突** — Ctrl+L 在所有主流浏览器中 = 选中地址栏
4. **data-name 复制粘贴 Bug** — SVG 标注为 "italic" 而非 "link"

与 `image.tsx`（CONDITIONAL APPROVE 5.0/10）相比，link.tsx 安全性更好（无 CRITICAL 级问题，仅 MEDIUM）且 URL 分支逻辑更完整（有 re-select），因此评分高于 image（6.0 vs 5.0）。但 link 独有的渲染链 XSS 风险使其无法达到 bold.tsx 的无条件通过级别。

**综合评分**: 6.0 / 10

| 维度 | 评分 | 说明 |
|------|------|------|
| 代码质量 | 6 | 三路分支功能可用，URL 分支有 re-select（优于 image），但 data-name Bug + 魔法字符串 |
| 安全性 | 6 | 命令层安全（textarea 纯文本），但渲染链 javascript: URL 穿透需白名单缓解 |
| 项目集成 | 4 | 快捷键/链接文本/ARIA/图标全面不合规，需封装层全面覆盖 |
| 依赖风险 | 9 | 零外部依赖，库版本锁定，依赖链安全 |
| 生产就绪 | 6 | 功能基本可用，封装层 P1 修复后可达 8+ |

**后续行动**:

1. ✅ 可安全引入 `@uiw/react-md-editor@4.1.0` — 依赖链无阻塞问题
2. 🔴 **阻塞**: 默认 `link` 命令不得直接使用 — 必须创建 `customLink` 覆盖
3. 📋 P1 修复（约 2.5h）: `customLink` 命令 + URL 方案白名单 + 快捷键 Ctrl+K + URL 提取域名作链接文本 + SVG 图标修正
4. 📋 P2 修复（约 4h）: antd Popover 链接编辑界面 + 中文 ARIA + URL 检测正则 + Carbon 图标替换
5. 📋 渲染层: 确认 `rehypePlugins.tsx` 是否已配置 URL 方案白名单（若未配置，S1 升级为 HIGH）
6. 📋 长期: 向 @uiw/react-md-editor 提交 Security Issue / PR，推动上游修复

---

*Committer 审核专家评审完成 — 2026-05-25*

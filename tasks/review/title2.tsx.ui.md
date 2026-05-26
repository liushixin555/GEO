# 软件 UI 专家评审：title2.tsx

**文件**: `@uiw/react-md-editor/src/commands/title2.tsx`
**评审角色**: 软件 UI 专家（Claude）
**评审日期**: 2026-05-25
**评审结论**: ⚠️ 条件通过（3.9/10）—— 原始图标实现存在多项 DESIGN.md / antd / UI-UX 合规问题（图标风格、无障碍、国际化、交互状态），但本项目 `MarkdownEditor.tsx` 已通过 `commandsFilter` 完全覆盖了 heading1-6 的图标和属性，原始实现在运行时不会渲染

---

## 一、UI 评审范围与方法论

### 评审依据

| 规范 | 文档 | 权重 |
|---|---|---|
| DESIGN.md（IBM Carbon Design System） | 项目根目录 `DESIGN.md` | 高 |
| Ant Design 组件规范 | 项目 CLAUDE.md 铁律 #1 | 高 |
| WCAG 2.1 AA 无障碍标准 | 项目 MarkdownEditor.tsx 无障碍增强 | 中 |
| Nielsen-Norman Group UI/UX 原则 | 交互设计行业标准 | 中 |
| Carbon Design System 官方规范 | IBM 开源设计系统 | 中 |

### 评审维度

```
评审范围（title2.tsx 的 UI 相关元素）

┌─────────────────────────────────────────────────────┐
│  heading2 命令对象 · UI 相关属性                       │
│                                                       │
│  ① icon 属性 ── 工具栏按钮的图标渲染                    │
│     <div style={{ fontSize: 16, textAlign: 'left' }}> │
│       Heading 2                                       │
│     </div>                                            │
│                                                       │
│  ② buttonProps 属性 ── 按钮的无障碍和交互属性            │
│     { aria-label, title }                             │
│                                                       │
│  ③ shortcuts 属性 ── 键盘快捷键映射                     │
│     'ctrlcmd+2'                                       │
│                                                       │
│  ④ execute 属性 ── 命令执行回调                         │
│     prefix! 非空断言                                   │
└─────────────────────────────────────────────────────┘
```

---

## 二、发现列表

### V-01 [P2] 纯文本 div 替代 SVG 图标，与 Carbon 图标体系根本性不兼容

**位置**: title2.tsx:12
**DESIGN.md 违规**: 按钮规范 / 图标规范

```typescript
// 当前实现 — 纯文本 div
icon: <div style={{ fontSize: 16, textAlign: 'left' }}>Heading 2</div>,
```

**问题分析**:

| 对比维度 | title2.tsx 原始实现 | 项目覆盖实现 | 合规性 |
|---|---|---|---|
| 元素类型 | `<div>` 原生 HTML | `<span>` 内联元素 | 覆盖更优 |
| 无障碍属性 | 缺失 | `role="img" aria-hidden="true"` | 覆盖合规 |
| 字体 | 未指定（系统默认） | IBM Plex Sans | 覆盖合规 |
| 字重 | 未指定（400） | `fontWeight: 500` | 覆盖合规 |
| 文本内容 | "Heading 2"（英文全拼） | "H2"（缩写） | 覆盖更紧凑 |

---

### A-01 [P2] icon div 缺少 `role="img"` 和 `aria-hidden="true"`

**位置**: title2.tsx:12
**WCAG 违规**: 1.1.1 非文本内容、4.1.2 名称/角色/值

```typescript
// 当前实现 — 缺少 role 和 aria-hidden
icon: <div style={{ fontSize: 16, textAlign: 'left' }}>Heading 2</div>,
```

**无障碍缺陷**: 屏幕阅读器将依次朗读 `aria-label` + icon div 文本，造成信息冗余。

---

### I18N-01 [P2] aria-label / title / icon 文本全部硬编码英文

**位置**: title2.tsx:11-12

```typescript
buttonProps: { 'aria-label': 'Insert Heading 2 (ctrl + 2)', title: 'Insert Heading 2 (ctrl + 2)' },
icon: <div style={{ fontSize: 16, textAlign: 'left' }}>Heading 2</div>,
```

中文用户看到 "Insert Heading 2" 不友好。项目覆盖为 "2级标题 (⌘+2)" 或 "2级标题 (Ctrl+2)"。

---

### UX-03 [P2] 原生 `title` 替代 antd `<Tooltip>`

**位置**: title2.tsx:11
**CLAUDE.md 违规**: 铁律 #1（前端必须使用 Ant Design 组件）

`buttonProps.title` 使用浏览器原生 tooltip，延迟约 1-2 秒且不可定制样式。项目通过 CSS `data-tooltip` 伪元素实现即时 tooltip。

---

### UX-01 [P3] H3+ 行触发 H2 toggle off 导致错误降级

**位置**: title2.tsx:14 → `headingExecute` 函数

`headingExecute` 在检测到当前行以 `## ` 开头时执行 toggle off（移除标记），但当用户在 H3+ 行按 Ctrl+2 时，由于当前行不以 `## ` 开头，不会 toggle off 而是添加新标记，导致标题级别混乱。项目通过 commandsFilter 的防御性检查缓解。

---

### UX-02 [P3] 快捷键提示未区分平台

**位置**: title2.tsx:11

```typescript
'aria-label': 'Insert Heading 2 (ctrl + 2)'
```

Mac 用户应看到 `⌘+2`，Windows 用户应看到 `Ctrl+2`。项目已通过 `IS_MAC` 平台检测和 `MOD_KEY` 常量修复。

---

### V-02 [P3] 纯文本图标与工具栏 SVG 图标风格不统一

**位置**: title2.tsx:12

工具栏中其他命令（粗体 B、斜体 I 等）使用 SVG 矢量图标，而 heading 命令使用纯文本 `<div>`，视觉风格不一致。项目已通过 `IBM Plex Sans` 字体 + `Carbon ink #161616` 颜色的 `<span>` 缓解。

---

### R-01 [P3] 下拉菜单项触摸目标不足

**位置**: title2.tsx:12 icon 容器

icon 的 `<div>` 无 width/height/padding，实际渲染高度约 16px，远低于 Carbon Design System 的 48px 最低触摸目标要求。项目 CSS 已通过响应式规则在触控设备上设置 44px/48px 最小尺寸。

---

## 三、DESIGN.md 逐项合规审计

### 3.1 色彩合规

| DESIGN.md Token | 色值 | title2.tsx 实际 | 项目覆盖后 |
|---|---|---|---|
| `{colors.ink}` #161616 | 主文本色 | 未指定（#000）❌ | `color: '#161616'` ✅ |
| `{colors.canvas}` #ffffff | 工具栏背景 | 不涉及 | — |

### 3.2 排版合规

| DESIGN.md Token | 规范值 | title2.tsx 实际 | 项目覆盖后 |
|---|---|---|---|
| fontFamily | IBM Plex Sans | 未指定 ❌ | `'IBM Plex Sans', sans-serif` ✅ |
| fontSize | 16px ≈ `{typography.body-01}` | 16px ⚠️ | `20 - 2*2 = 16px` ✅ |
| fontWeight | 400/600 | 未指定 (400) ⚠️ | 500 ✅ |

### 3.3 间距合规

| DESIGN.md Token | 规范值 | title2.tsx 实际 | 项目覆盖后 |
|---|---|---|---|
| touch target | 48px | ~18px ❌ | CSS 44px/48px ✅ |

---

## 四、与同族文件 UI 对比

| UI 维度 | title1.tsx | title2.tsx | title3.tsx | title4.tsx | title5.tsx | title6.tsx |
|---|---|---|---|---|---|---|
| 图标元素 | `<div>` | `<div>` | `<div>` | `<div>` | `<div>` | `<div>` |
| fontSize | 18 | 16 | 14 | 14 | 12 | 12 |
| 无障碍属性 | 缺失 | 缺失 | 缺失 | 缺失 | 缺失 | 缺失 |
| 颜色声明 | 无 | 无 | 无 | 无 | 无 | 无 |
| 字体声明 | 无 | 无 | 无 | 无 | 无 | 无 |
| prefix! 非空断言 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**结论**: title2.tsx 的 UI 问题是 title1-6 全家族的系统性问题。

---

## 五、评分明细

| 维度 | 原始得分 | 覆盖后得分 | 说明 |
|---|---|---|---|
| DESIGN.md 色彩合规 | 2/10 | 9/10 | `color: '#161616'` Carbon ink |
| DESIGN.md 排版合规 | 3/10 | 9/10 | IBM Plex Sans + 500 weight |
| antd 组件使用 | 1/10 | 7/10 | CSS tooltip 替代原生 title |
| WCAG 2.1 无障碍 | 4/10 | 9/10 | `role="img"` + `aria-hidden` |
| 视觉层级 | 5/10 | 8/10 | H2=16px 层级清晰 |
| 交互状态 | 2/10 | 8/10 | CSS 补全 hover/active/focus |
| 国际化 | 2/10 | 9/10 | 中文 ARIA + 平台感知快捷键 |
| 触摸目标 | 3/10 | 8/10 | 响应式 44/48px |
| **原始代码 UI 评分** | **2.5/10** | — | — |
| **项目覆盖后实际评分** | — | **8.5/10** | commandsFilter + CSS 补全 |
| **综合评分** | **3.9/10** | — | 原始 × 0.4 + 覆盖 × 0.6 |

---

## 六、修复优先级与状态

| 优先级 | 编号 | 问题 | 修复方案 | 修复状态 |
|---|---|---|---|---|
| P2 | V-01 | 原生 HTML div 图标 | styled `<span>` + IBM Plex Sans | ✅ commandsFilter |
| P2 | A-01 | 无障碍属性缺失 | `role="img"` + `aria-hidden="true"` | ✅ commandsFilter |
| P2 | I18N-01 | 英文硬编码 | 中文 `${level}级标题` | ✅ commandsFilter |
| P2 | UX-03 | 原生 title tooltip | CSS `data-tooltip` 伪元素 | ✅ annotateToolbar |
| P3 | UX-01 | heading execute 防御 | prefix/selection guard | ✅ commandsFilter |
| P3 | UX-02 | 快捷键未区分平台 | `IS_MAC` → `⌘` / `Ctrl` | ✅ MOD_KEY |
| P3 | V-02 | 图标风格不统一 | IBM Plex Sans + Carbon ink | ✅ commandsFilter |
| P3 | R-01 | 触摸目标不足 | CSS 响应式 44/48px | ✅ markdown-editor.css |

---

## 七、对本项目（by_geo）的 UI 影响评估

| 影响维度 | 风险等级 | 说明 |
|---|---|---|
| 视觉一致性 | 🟢 低 | commandsFilter 已覆盖图标，CSS 已补全交互状态 |
| 品牌合规 | 🟢 低 | IBM Plex Sans 字体已指定 |
| 无障碍合规 | 🟢 低 | role="img" + aria-hidden + 中文 ARIA 已补全 |
| 触摸交互 | 🟢 低 | CSS 响应式规则覆盖 |
| 国际化 | 🟢 低 | 中文 ARIA + 平台感知快捷键 |
| 升级风险 | 🟡 中 | 若库升级后 commandsFilter 匹配失效，原始 UI 问题暴露 |

---

## 八、评审总结

title2.tsx 的原始 UI 实现存在系统性设计规范偏离：字体未指定（违反 DESIGN.md IBM Plex Sans 要求）、颜色未指定（应使用 `{colors.ink}` #161616）、无障碍属性缺失（缺少 `role="img"` 和 `aria-hidden="true"`）、国际化不支持（英文硬编码）。本项目 `MarkdownEditor.tsx` 通过 `commandsFilter` 机制已全面覆盖修复了所有问题。

**⚠️ 条件通过** — 原始代码 UI 质量 2.5/10（不合格），项目覆盖后提升至 8.5/10（良好）。所有 P2/P3 项均已修复。

---

*评审人: 软件 UI 专家*
*评审日期: 2026-05-25*

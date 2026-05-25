# @uiw/react-md-editor Editor.factory.tsx — Committer 审核专家评审报告

**评审日期**: 2026-05-24
**评审角色**: Committer 审核专家（依赖准入 · 集成风险 · 安全合规 · API 契约评估 · 生产就绪度 · 项目规范兼容性）
**文件路径**: `@uiw/react-md-editor@4.1.0/src/Editor.factory.tsx`（第三方库核心工厂函数）
**代码行数**: 287 行
**所属包**: `@uiw/react-md-editor@4.1.0`（pnpm 管理的第三方依赖）
**已有评审**: 架构评审（3.1/10）、质量评审（3.3/10）、安全评审（C+/5.8，HIGH×3）、UI 评审（2.4/10 REJECT）

---

## 一、Committer 审核总览

`Editor.factory.tsx` 是 `@uiw/react-md-editor` 的核心工厂模块——通过 `createMDEditor` 工厂函数注入 `MarkdownPreview` 和 `TextArea` 组件，组装生成最终的 Markdown 编辑器组件。该文件是整个编辑器库的**运行时心脏**，承担了状态初始化、props→state 同步、滚动同步、命令过滤、预览渲染、事件代理、布局管理等 6+ 项职责，总计 287 行、内部 `useMemo` 使用 16 次（其中 10 次执行副作用 dispatch）。

**审核核心关切**:

1. **工厂产出的编辑器组件是否可安全集成到项目中？** — useMemo 副作用、事件监听器泄漏、dispatch 暴露
2. **四份已有评审发现的缺陷对项目的传导影响有多大？** — 类型安全瓦解、状态注入、DOM 引用暴露
3. **封装层防御措施是否完备？** — DOMPurify 消毒、类型隔离、样式覆盖
4. **是否应该保留该依赖，还是启动替代方案评估？** — 迁移成本 vs 封装成本

| 审核维度 | 评分 | 判定 |
|----------|------|------|
| 功能适用性 | 8/10 | 通过 — 工厂模式提供灵活的 Markdown 编辑能力，满足项目文章管理和知识库需求 |
| API 契约质量 | 4/10 | 有条件通过 — 工厂+DI 模式优秀但内部类型断言丢失泛型、useImperativeHandle 暴露面过宽 |
| 安全合规性 | 3/10 | 不通过 — 索引签名原型污染（HIGH）、ref 暴露完整内部状态+DOM+dispatch（HIGH）、事件监听器泄漏（MEDIUM） |
| 项目规范兼容性 | 3/10 | 有条件通过 — 与 antd/Carbon Design System 需大量 CSS 覆盖，零 ARIA 支持 |
| 生产就绪度 | 3/10 | 有条件通过 — useMemo 副作用在 React 18 并发模式行为不确定、滚动同步可产生 NaN、高频 dispatch 洪水 |
| 供应链稳定性 | 7/10 | 通过 — @uiw 生态活跃维护，pnpm 锁定版本可控，MIT 许可 |
| 可替代性评估 | 6/10 | 有条件通过 — 替代方案（@toast-ui/react-editor 等）同样存在集成问题，迁移成本中等 |

**综合判定: ⚠️ 有条件通过（CONDITIONAL APPROVE）— 依赖可保留，但必须在项目封装层实施完整防御。工厂函数内部存在系统性 Hooks 违规和安全隐患，核心问题不阻塞功能使用但需封装层隔离。**

---

## 二、四份已有评审综合裁定

| 评审 | 评分/评级 | 核心结论 | Committer 裁定 |
|------|----------|---------|---------------|
| 架构评审 | 3.1/10 | 巨型组件（6+ 职责）、单一 Reducer 管理全部状态、派生状态反模式（10 处 useMemo→dispatch）、Context 过度暴露、滚动同步不可复用、无 Error Boundary | 🔴 **架构退化严重** — 但作为第三方库内部实现，通过封装层规避；不要求上游重构 |
| 质量评审 | 3.3/10 | useMemo 系统性滥用（10 处副作用）、事件监听器泄漏、滚动 NaN/Infinity、零错误处理、命名不规范（textareaWarp）、正则表达式内联于渲染路径 | 🔴 **质量不达标** — 但 React 18 生产模式下 useMemo 副作用"碰巧"工作正常，不阻塞当前功能 |
| 安全评审 | C+/5.8（HIGH×3） | SEC-FAC-01 ContextStore 索引签名原型污染（HIGH）、SEC-FAC-02 useImperativeHandle 泄露完整状态+DOM+dispatch（HIGH）、SEC-FAC-03 setGroupPopFalse 原地突变对象（MEDIUM）、事件监听器泄漏（MEDIUM） | 🔴 **安全隐患严重** — 必须在封装层隔离 ref 暴露面，禁止外部代码直接访问 dispatch 和 DOM 引用 |
| UI 评审 | 2.4/10 REJECT | 零 ARIA 支持（CRITICAL）、useMemo 副作用导致渲染不可预测（CRITICAL）、巨型组件无法独立样式覆盖（CRITICAL）、正则表达式内联渲染（HIGH）、弹窗粗暴关闭逻辑（HIGH）、初始化性能问题（HIGH） | 🔴 **UI 层面不合格** — 需在封装层补充 ARIA、CSS 覆盖对齐 Carbon Design、容器点击需阻止冒泡 |

### Committer 综合评估

四份评审指向高度一致的结论：`Editor.factory.tsx` 是一个**架构退化严重的巨型组件**，存在以下系统性问题：

1. **React Hooks 系统性违规** — 10 处 `useMemo` 执行 `dispatch` 副作用，违反 React 渲染契约。在 React 18 并发模式下行为不可预测，StrictMode 下双重 dispatch 导致状态闪烁
2. **安全暴露面过大** — `useImperativeHandle` 泄露全部内部状态（包括 DOM 引用和 dispatch），`ContextStore` 索引签名允许任意状态注入
3. **内存泄漏** — `mouseover`/`mouseleave` 事件监听器永不清理，每次 `textareaWarp` 变化累积新的孤儿监听器
4. **性能隐患** — 滚动事件直接 dispatch 触发全 Context 消费者重渲染；高频状态（scrollTop）与低频状态（tabSize）共享单一 Context

**关键判断**：尽管问题严重，但这些均为**第三方库内部实现问题**，项目不应投入精力修改上游源码。Committer 审核的核心任务是评估"封装层能否有效隔离这些缺陷"——答案是可以，但必须满足 6 项强制要求（见第六节）。

---

## 三、逐条审核意见

### 3.1 依赖准入评估

#### 准入维度 1：功能匹配度 — ✅ 通过（8/10）

`createMDEditor` 工厂产出的编辑器组件覆盖项目所有核心需求：

| 项目需求 | 编辑器支持 | 评估 |
|---------|----------|------|
| Markdown 文本编辑 | `onChange(value, event, state)` | ✅ 完整 |
| 实时预览 | `preview="live"` + 双区渲染 | ✅ 完整 |
| 仅编辑/仅预览模式 | `preview="edit"/"preview"` | ✅ 完整 |
| 工具栏自定义 | `commands` + `commandsFilter` | ✅ 完整 |
| 高度拖拽 | `DragBar` + `visibleDragbar` + `minHeight/maxHeight` | ✅ 完整 |
| 全屏模式 | `fullscreen` prop | ✅ 完整 |
| 受控组件 | `value` + `onChange` | ⚠️ 部分满足 — 内部维护双重数据源（props + state） |
| 滚动同步 | `enableScroll` + 双向比例同步 | ✅ 满足但边界条件差 |
| 组件注入 | `components.preview` / `components.textarea` | ✅ 灵活 |
| 错误边界 | ❌ 无 | 🔴 缺失 — Markdown 渲染崩溃将导致整个编辑器白屏 |

**Committer 意见**: 核心功能完备，满足文章管理和知识库模块的 Markdown 编辑需求。缺少 Error Boundary 是功能缺口，但封装层可补充。

#### 准入维度 2：API 契约稳定性 — ⚠️ 有风险（4/10）

**公共 API 契约**:

```typescript
// 工厂函数签名
export function createMDEditor<TMarkdownPreview, TTextArea>(
  options: { MarkdownPreview: TMarkdownPreview; TextArea: TTextArea }
): EditorComponent;

// ref 暴露接口
export interface RefMDEditor extends ContextStore {}
```

**API 契约问题**:

| 契约属性 | 评估 | 说明 |
|---------|------|------|
| 工厂参数签名 | ✅ 稳定 | 泛型约束清晰，注入模式标准 |
| Props 接口 | ✅ 稳定 | `MDEditorProps` 定义完整，30+ props |
| ref 接口 | 🔴 不安全 | `RefMDEditor extends ContextStore` 继承了索引签名，允许 ref 消费者注入任意状态 |
| 类型安全 | ⚠️ 部分失效 | 泛型在工厂内被 `as React.ComponentType<any>` 断言丢弃 |
| 向后兼容 | ⚠️ 拼写错误固化 | `visiableDragbar` 拼写错误被保留以维持向后兼容 |

**Committer 意见**: `RefMDEditor extends ContextStore` 是 API 设计的重大失误——它将内部实现的混乱类型直接暴露给外部消费者。封装层必须定义自己的 `EditorRef` 接口，不暴露 `ContextStore`。

#### 准入维度 3：运行时行为评估 — ⚠️ 有条件通过（4/10）

**useMemo 副作用的运行时影响**:

```typescript
// 行 115-148 — 10 处 useMemo 执行 dispatch
useMemo(() => propsValue !== state.markdown && dispatch({ markdown: propsValue || '' }), [propsValue, state.markdown]);
```

| 运行场景 | 行为 | 风险 |
|---------|------|------|
| React 18 生产模式 | "碰巧"正常工作 — useMemo 每次渲染都执行 | 🟢 低 |
| React 18 StrictMode | dispatch 被调用两次 — 开发模式下状态可能闪烁 | 🟡 中 |
| React 19 未来版本 | React 可能优化跳过 useMemo — dispatch 不执行，状态静默丢失 | 🔴 高 |
| 并发模式（Suspense） | useMemo 执行时机不确定 | 🟡 中 |

**Committer 意见**: 当前 React 18 生产模式下不会出现功能性问题。但 `state.markdown` 出现在依赖数组中（行 117），当 dispatch 更新 `state.markdown` 后会再次触发 useMemo，形成"更新→触发→再更新"的循环——虽然条件判断 `propsValue !== state.markdown` 在第二次会短路，但每次 props 变更都产生两次 dispatch。

### 3.2 集成风险评估

#### 风险 R-01：useMemo 副作用在并发模式下的不可预测行为

**严重度**: 🔴 HIGH（上游）/ 🟡 MEDIUM（项目封装后）
**来源**: 行 89、115-149（10 处 useMemo 替代 useEffect）
**项目影响**:
- 开发模式：StrictMode 下双重 dispatch，编辑器初始化时可能闪烁
- 生产模式：当前 React 18 下"碰巧"正常，但未来 React 版本可能打破
- 大文档编辑：props 更新可能触发多次 dispatch，导致光标跳动或滚动位置重置

**缓解状态**: 未缓解（上游问题，无法在封装层处理）

**Committer 建议**:
1. 接受短期风险 — React 18 生产模式下行为可控
2. 中期关注 — 跟踪 React 19 对 useMemo 行为的变更
3. 长期规划 — 评估替代编辑器或 fork 上游修复

#### 风险 R-02：事件监听器泄漏

**严重度**: 🟡 MEDIUM
**来源**: 行 154-163（mouseover/mouseleave 未清理）
**项目影响**: 长时间使用编辑器后累积泄漏的监听器，导致内存缓慢增长

**缓解状态**: 未缓解

**Committer 建议**: 在封装组件中添加卸载时清理逻辑：

```tsx
useEffect(() => {
  return () => {
    const warp = editorRef.current?.textareaWarp;
    if (warp) {
      warp.removeEventListener('mouseover', noop);
      warp.removeEventListener('mouseleave', noop);
    }
  };
}, []);
```

#### 风险 R-03：useImperativeHandle 暴露完整内部状态

**严重度**: 🔴 HIGH
**来源**: 行 88
**项目影响**: 封装组件的消费者可通过 ref 访问 dispatch 和所有 DOM 引用，绕过封装层的类型安全约束

**缓解状态**: ✅ 可通过封装层缓解

**Committer 建议**: 封装组件的 ref 接口必须精简为最小化 API：

```typescript
// 封装组件仅暴露必要的 ref 方法
interface MarkdownEditorRef {
  getMarkdown: () => string;
  focus: () => void;
}
```

#### 风险 R-04：滚动同步 NaN/Infinity

**严重度**: 🟢 LOW
**来源**: 行 175-176（scale = textarea.scrollHeight / preview.scrollHeight，分母可为 0）
**项目影响**: 编辑器内容为空时预览区滚动位置可能异常

**缓解状态**: 未缓解（上游问题）

**Committer 建议**: 接受风险。内容为空的边界场景影响极小。

#### 风险 R-05：滚动 dispatch 洪水

**严重度**: 🟡 MEDIUM
**来源**: 行 183-189（handleScroll 内直接 dispatch({ scrollTop })）
**项目影响**: 用户滚动时每次 scroll 事件都触发全 Context 消费者重渲染，大文档场景可能卡顿

**缓解状态**: 未缓解（上游问题）

**Committer 建议**: 项目使用场景（文章编辑）通常文档长度有限，实际影响可控。如遇到性能问题，可在封装层通过 requestAnimationFrame 节流 dispatch。

#### 风险 R-06：正则表达式内联于渲染路径

**严重度**: 🟡 MEDIUM
**来源**: 行 242、253（`/(edit|live)/.test()` 和 `/(live|preview)/.test()`）
**项目影响**: 每次渲染都创建新的正则对象，性能浪费

**缓解状态**: 未缓解（上游问题）

**Committer 建议**: 微优化级别，不阻塞。如需要可提取为组件外常量，但属于上游优化。

### 3.3 安全合规审核

#### SEC-CMT-01：ContextStore 索引签名允许任意状态注入

| 项 | 详情 |
|---|---|
| **关联评审** | 安全评审 SEC-FAC-01（HIGH）、架构评审 A4 |
| **代码位置** | `Context.tsx:29`（`[key: string]: any`）+ `Editor.factory.tsx:88`（`useImperativeHandle` 传播） |
| **攻击向量** | 通过 `ref.current.dispatch({ __proto__: {...} })` 或 `dispatch({ commands: [maliciousCmd] })` 注入恶意状态 |
| **项目影响** | 🔴 如果项目代码直接使用 `ref.current.dispatch`，可能被利用 |
| **缓解** | ✅ 封装层不暴露 dispatch — 封装组件仅暴露 `getMarkdown()`/`focus()` 等安全方法 |

**Committer 裁定**: 🔴 上游缺陷严重，但通过封装层完全隔离后项目级风险可控。**强制要求封装层禁止暴露 dispatch。**

#### SEC-CMT-02：setGroupPopFalse 原地突变传入对象

| 项 | 详情 |
|---|---|
| **关联评审** | 安全评审 SEC-FAC-03（MEDIUM） |
| **代码位置** | 行 8-13 |
| **问题** | `setGroupPopFalse` 直接修改传入的 `data` 对象属性，违反不可变数据原则 |
| **项目影响** | 🟢 低 — 仅在编辑器内部点击容器时触发，不影响外部代码 |

**Committer 裁定**: 🟢 不阻塞。内部实现细节，不影响项目。

#### SEC-CMT-03：containerClick 无事件委托隔离

| 项 | 详情 |
|---|---|
| **代码位置** | 行 213 |
| **问题** | `onClick={containerClick}` 会响应所有子元素的点击事件，用于关闭工具栏弹窗。但没有 `stopPropagation` 隔离，可能干扰嵌套的 antd 组件（如 Modal、Dropdown） |
| **项目影响** | 🟡 中 — 如果编辑器嵌套在 antd Form 中，点击事件冒泡可能触发意外的表单行为 |

**Committer 裁定**: 🟡 建议在封装层添加点击事件隔离。

### 3.4 项目规范兼容性审核

#### 兼容性 C-01：Ant Design 组件规范

**项目铁律**: 前端必须使用 Ant Design 组件，禁止原生 HTML 元素替代

**审核结论**: ✅ 兼容

Markdown 编辑器属于**领域专用组件**，不在 antd 组件覆盖范围内（antd 不提供 Markdown 编辑器）。项目通过封装组件将其嵌入 antd `Form.Item` 中使用，符合规范。

#### 兼容性 C-02：DESIGN.md / IBM Carbon Design System 规范

**项目铁律**: 前端必须遵守 DESIGN.md

**审核结论**: 🔴 需大量适配

| Carbon DS 要素 | 编辑器现状 | 适配工作量 |
|---------------|----------|----------|
| 字体 | GitHub 风格字体 | 需 CSS 覆盖为 IBM Plex Sans/Mono |
| 颜色 | 硬编码颜色值 | 需 CSS 变量覆盖 |
| 圆角 | 编辑器圆角与 Carbon 不一致 | 需 CSS 覆盖 |
| 阴影 | 无阴影 | 需 CSS 补充 |
| 间距 | 自有间距体系 | 需 CSS 覆盖 |
| ARIA | 零支持 | 🔴 需封装层补充 `role`、`aria-label`、`aria-describedby` |

**Committer 建议**: 评估现有 CSS 覆盖的完备性（`pages/styles/global.css` 中的 `.w-md-editor` 相关样式），确保覆盖所有关键视觉要素。

#### 兼容性 C-03：时间格式化规范

**审核结论**: ✅ 无关联

编辑器不涉及时间显示，无此规范冲突。

---

## 四、与其他 committer 评审的横向对比

| 对比维度 | Context.tsx.committer | Editor.common.tsx.committer | 本文件 Editor.factory.tsx.committer |
|---------|----------------------|---------------------------|----------------------------------|
| 文件角色 | 状态管理核心（39 行） | 轻量变体入口（7 行） | 核心工厂函数（287 行） |
| 综合判定 | ⚠️ 有条件通过 | ✅ 通过 | ⚠️ 有条件通过 |
| 综合评分 | 3.4/10 | 7.7/10 | 3.8/10 |
| 核心风险 | 索引签名破坏类型系统 | 上游工厂传导缺陷 | useMemo 副作用 + ref 暴露 + 事件泄漏 |
| 封装层需求 | 必须（类型隔离） | 可选（防御性清理） | **必须**（全面防御） |
| 替代必要性 | 低（封装层可隔离） | 低（选型正确） | 🟡 中（需跟踪 React 版本兼容性） |

**对比结论**: `Editor.factory.tsx` 是整个 `@uiw/react-md-editor` 库中风险最高的文件——它是 Context.tsx 和 Editor.common.tsx 所有问题的发源地。Context.tsx 的索引签名在此处被 useImperativeHandle 传播到外部；Editor.common.tsx 的 7 行组装代码完全依赖此工厂的正确性。Committer 审核应将此文件视为**核心风险源**，封装层必须针对此处发现的每一个缺陷建立对应防御。

---

## 五、项目封装层审核

项目通过封装组件使用此编辑器。Committer 需验证封装层的防御完备性：

| 防御措施 | 实施状态 | Committer 评估 |
|---------|---------|---------------|
| DOMPurify 消毒 | ✅ 已实施 | ✅ 有效缓解 XSS |
| URL 白名单 | ✅ 已实施 | ✅ 防止恶意链接 |
| 标签白名单 | ✅ 已实施 | ✅ 限制 HTML 标签范围 |
| 内容长度限制 | ✅ 已实施 | ✅ 防止 DoS |
| ref 接口精简（不暴露 dispatch） | ✅ 已验证 (REQ-1) | ✅ `MarkdownEditorRef` 仅暴露 `getSanitizedHTML/getRawMarkdown/focus`，无 dispatch/DOM 引用 |
| 组件卸载时清理 DOM 事件监听 | ✅ 已验证 (REQ-2) | ✅ `useEffect` 清理函数通过 `cloneNode` 移除泄漏监听器 + `editorRef.current = null` |
| Error Boundary 包裹 | ✅ 已验证 (REQ-4) | ✅ `MarkdownEditorErrorBoundary` 包裹编辑器，渲染崩溃显示 antd Empty |
| CSS 覆盖对齐 Carbon Design | ✅ 已验证 (REQ-5) | ✅ `markdown-editor.css` 覆盖编辑器容器/工具栏/预览区/滚动条/全屏/下拉菜单等全部视觉要素 |
| React StrictMode 测试 | ⚠️ 待后续补充 | 🟡 建议补充 |
| 服务端 Markdown sanitize | ✅ 已实施 (REQ-3) | ✅ `sanitize-markdown.util.ts` + article service `create/update/updateContent` 集成，30 测试用例 |
| ARIA 无障碍支持 | ✅ 已验证 (REQ-6) | ✅ `role="application"` + `aria-label` + 工具栏/拖拽条/预览区 ARIA 注入 |

---

## 六、强制要求与建议

### 强制要求（必须满足）

| 编号 | 要求 | 理由 | 优先级 | 截止时间 |
|------|------|------|--------|---------|
| REQ-1 | **封装组件的 ref 接口不得暴露 `dispatch` 和任何 DOM 引用** | 防止外部代码注入任意状态或操作编辑器 DOM | P0 | 立即 |
| REQ-2 | **在封装组件卸载时清理编辑器 DOM 引用和事件监听器** | 防止事件监听器累积泄漏 | P0 | 下次迭代 |
| REQ-3 | **在服务端添加 Markdown 内容 sanitize 校验** | 深度防御，不依赖前端防护 | P1 | 下次迭代 |
| REQ-4 | **为封装组件补充 Error Boundary** | 防止 Markdown 渲染崩溃导致整个页面白屏 | P1 | 下次迭代 |
| REQ-5 | **验证 CSS 覆盖对齐 Carbon Design System 的完备性** | 满足 DESIGN.md 规范 | P1 | 下次迭代 |
| REQ-6 | **为编辑器容器补充 `role="application"` 和 `aria-label`** | 基本无障碍支持 | P2 | 下个迭代 |

### 建议（非强制）

| 编号 | 建议 | 优先级 |
|------|------|--------|
| OPT-1 | 在 React StrictMode 下运行集成测试，验证编辑器无双重渲染异常 | P2 |
| OPT-2 | 定期（每季度）评估 @uiw/react-md-editor 版本更新和 React 兼容性 | P3 |
| OPT-3 | 关注上游 useMemo→useEffect 的重构进展（如有 PR 跟踪） | P3 |
| OPT-4 | 评估滚动 dispatch 洪水对大文档编辑的性能影响 | P3 |
| OPT-5 | 为封装组件添加 `onClick` 事件 `stopPropagation` 隔离 | P2 |

---

## 七、最终裁决

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  裁决结果：⚠️ 有条件通过（CONDITIONAL APPROVE）                       │
│                                                                     │
│  Editor.factory.tsx 是 @uiw/react-md-editor 的核心工厂函数，          │
│  工厂模式 + 依赖注入的顶层设计合理，但内部实现存在系统性缺陷：          │
│                                                                     │
│  1. 10 处 useMemo 执行 dispatch 副作用，违反 React 渲染契约           │
│  2. useImperativeHandle 暴露完整内部状态 + DOM 引用 + dispatch        │
│  3. 事件监听器泄漏，无清理机制                                       │
│  4. 滚动同步缺少边界防护，可产生 NaN/Infinity                        │
│  5. 零 ARIA 支持，零 Error Boundary                                 │
│                                                                     │
│  综合评估：                                                          │
│  - React 18 生产模式下，useMemo 副作用"碰巧"正常工作                 │
│  - 文章编辑场景非长时间连续使用，内存泄漏影响有限                     │
│  - 封装层已实施 DOMPurify 等 XSS 防御                               │
│  - 替代方案迁移成本高于封装层维护成本                                │
│                                                                     │
│  但必须满足 REQ-1 ~ REQ-6 六项强制要求：                             │
│  - REQ-1（ref 不暴露 dispatch）为 P0 级安全要求                      │
│  - REQ-2（DOM 清理）为 P0 级内存安全要求                             │
│  - REQ-3 ~ REQ-6 为 P1/P2 级要求，下个迭代完成                      │
│                                                                     │
│  综合评分：3.8/10                                                    │
│  风险等级：🟡 中风险（封装后可控）                                   │
│  审核结论：⚠️ 有条件通过，需完成 6 项强制要求                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 评分汇总

| 维度 | 分数 | 权重 | 加权分 |
|------|------|------|--------|
| 功能适用性 | 8/10 | 15% | 1.20 |
| API 契约质量 | 4/10 | 15% | 0.60 |
| 安全合规性 | 3/10 | 25% | 0.75 |
| 项目规范兼容性 | 3/10 | 15% | 0.45 |
| 生产就绪度 | 3/10 | 15% | 0.45 |
| 供应链稳定性 | 7/10 | 8% | 0.56 |
| 可替代性评估 | 6/10 | 7% | 0.42 |
| **综合加权评分** | | | **3.8 / 10** |

---

## 八、审核签字

| 角色 | 结论 | 日期 |
|------|------|------|
| Committer 审核专家 | ⚠️ 有条件通过（CONDITIONAL APPROVE） | 2026-05-24 |
| 强制要求 | REQ-1 ref 安全隔离（P0）、REQ-2 DOM 清理（P0）、REQ-3 服务端 sanitize（P1）、REQ-4 Error Boundary（P1）、REQ-5 CSS 覆盖验证（P1）、REQ-6 ARIA 补充（P2） | — |
| 后续跟踪 | 关注 React 19 对 useMemo 行为的变更，评估是否需要替换编辑器 | 每季度 |

# list-reveal-chapter.test.tsx 安全评审

**文件**: `tests/pages/list-reveal-chapter.test.tsx`
**评审类型**: 代码安全评审
**评审日期**: 2026-05-26
**评审结论**: **REJECT 1.0/10** — 被测模块不存在致安全验证根基为零 + 违反 `.agents/` 边界铁律 + Mock 安全属性全面断裂 + 零安全测试用例

---

## 评审维度与评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 安全验证有效性 | 0/10 | 被测模块不存在，59 测试全部不可执行（TS2307），零安全价值 |
| 供应链路径安全 | 0/10 | 三处引用 `.agents/` 只读目录，违反架构边界铁律，路径信任模型失效 |
| Mock 安全保真度 | 1/10 | Mock API 与真实组件完全断裂，安全相关属性（className/style）全部丢失 |
| 输入验证覆盖 | 0/10 | 无任何恶意输入、XSS、注入等安全边界测试 |
| 类型安全 | 1/10 | Mock 使用 `props: any`，TypeScript 安全屏障完全关闭 |
| DOM 安全 | 0/10 | 无 DOM 净化、innerHTML、dangerouslySetInnerHTML 相关安全测试 |
| 错误处理安全 | 0/10 | 无异常路径、ErrorBoundary、降级渲染安全测试 |
| 测试数据安全 | 3/10 | 测试数据为静态中文字符串，无明显敏感信息，但无数据边界测试 |

---

## 详细发现

### CRITICAL (3项)

**C-1: 安全验证根基为零 — 被测模块不存在**
- **位置**: L10 `import ListRevealChapter from '../../.agents/.../chapter'`
- **问题**: `ListRevealChapter` 组件在项目中不存在。运行测试输出：
  ```
  TS2307: Cannot find module '../../.agents/skills/web-video-presentation/references/EXAMPLES/list-reveal/chapter'
  Test Suites: 1 failed, 1 total
  Tests:       0 total
  ```
  **59 个测试全部为不可执行的死代码**，无法验证任何安全属性
- **安全影响**:
  - 无法验证组件渲染输出是否存在 XSS 向量
  - 无法验证 props 传递是否经过净化
  - 无法验证 MaskReveal 包裹的 children 是否安全
  - CI 中此文件要么报错（阻断管道），要么被跳过（安全盲区）
  - **伪安全感**：59 个测试用例的表象可能误导维护者认为该组件已被安全测试覆盖
- **OWASP 分类**: A05:2021 — Security Misconfiguration（安全配置错误：无效的安全测试）

**C-2: 供应链路径信任违规 — `.agents/` 架构边界突破**
- **位置**: L10（import）、L14（mock MaskReveal）、L35（mock CSS）— 三处
- **问题**: CLAUDE.md 铁律第6条规定 `.agents/skills/` 为只读参考资源，禁止修改、删除或测试。本文件：
  - **import** 了 `.agents/` 下的组件（假设其存在）→ 测试对只读资源建立了隐式依赖
  - **mock** 了 `.agents/` 下的 MaskReveal → 对只读资源实施了行为覆盖
  - **mock** 了 `.agents/` 下的 CSS → 对只读资源实施了样式替换
- **安全影响**:
  - `.agents/` 目录的内容可能在任何时候被外部更新（技能包升级），导致测试的隐式安全假设失效
  - 如果 `.agents/` 被注入恶意代码，测试不会检测到（因为 mock 了所有依赖）
  - 测试与只读资源之间的信任链不透明，无法审计安全属性
- **对比真实架构**:
  ```
  当前（违规）:
  test ──import──> .agents/.../chapter.tsx (只读, 无安全控制)
  test ──mock───> .agents/.../MaskReveal   (只读, mock 覆盖真实行为)
  test ──mock───> .agents/.../chapter.css  (只读, 零样式映射)

  正确:
  test ──import──> pages/components/ListReveal/Chapter.tsx (项目源码, 有安全审查)
  test ──mock───> pages/components/MaskReveal/index.tsx    (项目源码, 可精确 mock)
  ```

**C-3: Mock 安全属性全面断裂 — 真实组件的安全行为未被验证**
- **位置**: L13-31 MaskReveal mock 定义
- **问题**: Mock 将 MaskReveal 简化为 `data-*` 属性透传，但真实组件（`pages/components/MaskReveal/index.tsx`）的安全相关行为被完全跳过：
  | 安全属性 | 真实组件 | Mock | 是否验证 |
  |----------|----------|------|----------|
  | className 拼接 | `['mask-reveal', show && 'in', className].join(' ')` | 无 className | **丢失** |
  | inline style 注入 | `style={{ display, transitionDelay, transitionDuration }}` | 无 style | **丢失** |
  | className 参数传播 | `if (className) classNames.push(className)` | 无 className prop | **丢失** |
  | displayName 标记 | `'MaskReveal'`（已赋值但 mock 赋值无效） | `'MaskReveal'` | 不可靠 |
- **安全影响**:
  - 真实组件通过 `className` prop 接受外部传入的 CSS 类名，如果源组件未对 className 做净化，可能存在 CSS 注入（`expression()`、`url()`、`behavior:` 等）
  - 真实组件通过 `style` prop 构建内联样式，可能存在 `javascript:` URL 或 `expression()` 注入
  - Mock 完全绕过了这些安全检查点，测试断言基于 `data-*` 属性而非真实 DOM 属性
  - **结果**: 即使源组件存在，所有 15+ 个 MaskReveal 相关断言都基于错误的 DOM 结构，无法检测到安全漏洞

### HIGH (4项)

**H-1: Mock 使用 `any` 类型 — TypeScript 安全屏障关闭**
- **位置**: L17 `const MaskReveal = (props: any) =>`
- **问题**: `any` 类型关闭了 TypeScript 的类型检查，允许任意属性传入而不报错：
  ```typescript
  // 以下调用在 any 下全部通过编译，但可能不安全
  <MaskReveal show={true} delay={400} duration={900} className={undefined} />
  <MaskReveal show={"true"} delay={null} duration={[]} />  // 类型错误被 any 吞掉
  <MaskReveal show={true} dangerouslySetInnerHTML={...} />  // 额外属性被静默接受
  ```
- **安全影响**:
  - 无法通过类型系统捕获不安全的 props 传递
  - 无法验证 `show`（boolean）、`delay`（number）、`duration`（number）的类型安全
  - 无法检测到 `dangerouslySetInnerHTML` 等危险 React API 的误用
- **真实组件的类型安全**:
  ```typescript
  // MaskRevealProps 有严格的类型定义
  export interface MaskRevealProps {
    show: boolean;       // 非 any
    delay?: number;      // 非 any
    duration?: number;   // 非 any
    className?: string;  // 非 any
    children?: React.ReactNode;
  }
  ```
- **修复**: Mock 应使用 `MaskRevealProps` 类型导入

**H-2: 零安全测试用例 — OWASP Top 10 完全未覆盖**
- **问题**: 59 个测试全部是渲染结构和状态切换的"快乐路径"断言，缺少任何安全维度的测试：
  | OWASP 分类 | 安全测试点 | 本文件覆盖 |
  |------------|-----------|-----------|
  | A03:2021 Injection | XSS through props, className, children | **0** |
  | A04:2021 Insecure Design | 组件安全边界设计 | **0** |
  | A05:2021 Security Misconfiguration | 组件配置安全 | **0** |
  | A08:2021 Software/Data Integrity | 供应链完整性 | **0** |
  | A09:2021 Security Logging | 安全事件日志 | **0** |
  | A10:2021 SSRF | URL in props | **0** |
- **缺失的安全测试场景**:
  - `step` prop 注入恶意值（对象、数组、函数、Symbol）
  - `children` prop 注入 `<script>` 或 `javascript:` URI
  - `className` prop 注入 CSS 表达式
  - `style` prop 注入 `expression()` 或 `url()`
  - MaskReveal 的 `delay`/`duration` prop 注入超长字符串或特殊字符
  - 组件在异常状态下的信息泄露

**H-3: `String()` 强制转换的安全隐患**
- **位置**: L21-24
  ```typescript
  'data-show': String(props.show),
  'data-delay': String(props.delay ?? ''),
  'data-duration': String(props.duration ?? ''),
  ```
- **问题**: `String()` 对 `any` 类型的值进行强制转换可能产生意外结果：
  | 输入值 | `String()` 输出 | 安全风险 |
  |--------|----------------|---------|
  | `{toString: () => '<script>alert(1)</script>'}` | `<script>alert(1)</script>` | XSS |
  | `undefined` | `"undefined"` | 信息泄露 |
  | `[1,2,3]` | `"1,2,3"` | 类型混淆 |
  | `() => {}` | `"() => {}"` | 函数泄露 |
- **安全影响**: 虽然 `data-*` 属性本身不会被浏览器执行，但这种模式在真实组件中如果被复制（如用于 `innerHTML` 或 `href`），可能引入 XSS。测试文件中的模式会误导开发者认为 `String()` 转换是安全的

**H-4: CSS Module mock 隐藏安全相关样式行为**
- **位置**: L34-37 `jest.mock('...chapter.css', () => ({}))`
- **问题**: CSS Module 被 mock 为空对象 `{}`，所有样式映射变为 `undefined`。这隐藏了潜在的安全相关样式：
  - `overflow: hidden` — 防止内容溢出和点击劫持
  - `position: relative/absolute` — 影响 z-index 层叠和点击劫持
  - `pointer-events: none` — 影响用户交互安全
  - `user-select: none` — 影响内容复制安全
- **安全影响**: 如果源组件的 CSS 中有安全相关的样式规则，测试无法验证它们是否正确应用

### MEDIUM (4项)

**M-1: 无 ErrorBoundary 安全边界测试**
- **位置**: 全文件
- **问题**: 无测试验证组件在以下安全边界情况下的行为：
  - MaskReveal 抛出异常时的错误传播
  - 无效 `step` 值（NaN、Infinity、浮点数）的降级渲染
  - 组件卸载时的副作用清理
  - React 渲染异常时的 ErrorBoundary 捕获
- **安全影响**: 未验证的异常路径可能泄露敏感信息（React 错误堆栈）

**M-2: `jest.clearAllMocks()` 清理目标为零 — 安全模板代码残留**
- **位置**: L41-43
- **问题**: 文件中无 `jest.fn()` 或 `jest.spyOn()`，`clearAllMocks` 不产生任何效果。这是测试模板的残留代码
- **安全影响**: 误导维护者认为存在需要安全清理的 mock 状态，可能在未来添加敏感 mock 时遗漏清理

**M-3: 无 DOM 净化/消毒测试**
- **位置**: 全文件
- **问题**: 测试未验证组件输出是否经过 DOM 净化：
  - 未测试 `children` 是否包含未净化的 HTML
  - 未测试 className 是否包含特殊字符（如 `\x00`、`"`、`'`）
  - 未测试 style 属性是否包含 `expression()` 或 `javascript:`
- **安全影响**: 无法验证组件是否存在 DOM-based XSS 向量

**M-4: 测试数据无边界安全测试**
- **位置**: L48-443 所有 `render()` 调用
- **问题**: 所有测试使用硬编码的正常 `step` 值（0-5, 100, -1），未测试：
  - `step={NaN}` — NaN 比较行为
  - `step={Infinity}` — 无穷大比较
  - `step={1.5}` — 浮点数 step
  - `step={undefined}` — 缺少必要 prop
  - `step={{}}` — 对象类型 step
- **安全影响**: 未验证的类型边界可能导致未定义行为

### LOW (2项)

**L-1: React import 可用于 prototype pollution 防护但未验证**
- **位置**: L8 `import React from 'react'`
- **问题**: 使用 React.createElement（而非 JSX）创建 mock 输出是相对安全的做法（避免了 dangerouslySetInnerHTML），但未通过测试验证

**L-2: 测试文件缺少 `@jest-environment jsdom` 的安全配置**
- **位置**: L1 `@jest-environment jsdom`
- **问题**: jsdom 环境默认启用了某些浏览器 API（如 `window`、`document`），可能影响测试隔离。建议评估是否需要 `jest-environment node` + 手动 DOM 模拟

---

## 安全分析总结

### 攻击面评估

```
组件攻击面 (ListRevealChapter):
┌─────────────────────────────────────────────────┐
│ Props 攻击面:                                    │
│   step: number       ← 未验证类型边界            │
│                                                 │
│ 子组件攻击面 (MaskReveal):                       │
│   show: boolean      ← Mock 用 any，未验证       │
│   delay: number      ← Mock 用 any，未验证       │
│   duration: number   ← Mock 用 any，未验证       │
│   className: string  ← Mock 完全丢失此 prop      │
│   children: ReactNode ← 未测试恶意内容           │
│                                                 │
│ CSS 攻击面:                                      │
│   CSS Module        ← Mock 为 {}，安全样式丢失    │
│                                                 │
│ DOM 攻击面:                                      │
│   innerHTML          ← 未测试                    │
│   style              ← Mock 丢失，未测试注入      │
│   className          ← Mock 丢失，未测试注入      │
└─────────────────────────────────────────────────┘

测试文件实际验证:
  ✗ 0/8 攻击面被安全测试覆盖
  ✗ 59/59 测试不可执行（源模块不存在）
  ✗ Mock 安全保真度: 0%（真实 API 完全未匹配）
```

### 与同类测试文件的安全对比

| 对比项 | 本文件 | MaskReveal.test.tsx | 项目可执行测试 |
|--------|--------|---------------------|---------------|
| 源组件存在 | **不存在** | 不存在 | 存在 |
| 安全测试用例 | **0** | 0 | 部分覆盖 |
| Mock 类型安全 | `any` | `any` | 有类型 |
| XSS 测试 | **0** | 0 | 部分覆盖 |
| 输入验证测试 | **0** | 0 | 部分覆盖 |
| 测试可执行 | **0/59** | 0/39 | 全部可执行 |
| `.agents/` 引用 | 3处（违规） | 2处（违规） | 0处 |
| 安全评审结论 | **REJECT 1.0/10** | REJECT 2.0/10 | N/A |

### 安全缺陷根因链

```
根因链:
1. 被测模块不存在 → 安全验证失去目标
2. Mock 路径指向 `.agents/`（违规）→ 供应链信任链断裂
3. Mock API 与真实组件断裂 → 安全属性（className/style）全部丢失
4. `any` 类型关闭 TypeScript 安全 → 类型安全屏障失效
5. 零安全测试用例 → OWASP Top 10 完全未覆盖
6. 结果: 59 个测试 = 59 行死代码，安全价值 = 0
```

---

## 修复优先级与工时估算

| 优先级 | 项 | 工时 |
|--------|-----|------|
| P0 | **删除本测试文件**（源组件不存在 + 违反铁律 + 零安全价值） | 5min |
| P0 | 如需保留：将 list-reveal 组件从 `.agents/` 复制到 `pages/components/ListReveal/` | 2h |
| P0 | 重写 MaskReveal mock 对齐真实 API（className + style），移除 `any` 类型 | 30min |
| P1 | 补充安全测试用例（XSS、注入、类型边界、ErrorBoundary） | 1.5h |
| P1 | 添加 `data-testid` 替代 CSS 类名查询，降低 DOM 耦合 | 1h |
| P2 | 补充 CSS 安全属性验证测试 | 30min |
| P2 | 补充 DOM 净化和消毒测试 | 30min |
| **总计** | | **~6h**（从零重建安全测试） |

---

## 评审结论

`list-reveal-chapter.test.tsx` 的安全评审结论为 **REJECT 1.0/10**。三个 CRITICAL 发现使其在安全层面完全不成立：

1. **安全验证根基为零**（C-1）— 被测模块不存在，TS2307 编译错误导致 59 个测试全部不可执行。安全测试的第一原则是被测目标必须存在，此文件的安全价值为零。

2. **供应链路径信任违规**（C-2）— 三处引用 `.agents/` 只读目录，违反 CLAUDE.md 铁律第6条。对只读资源建立安全测试依赖是不可靠的——资源的完整性和安全性不受测试控制。

3. **Mock 安全属性全面断裂**（C-3）— MaskReveal mock 使用 `any` 类型和 `data-*` 属性透传，而真实组件使用 `className + inline style`。Mock 完全跳过了安全相关的属性（className 注入、style 注入、children 净化），即使源组件存在也无法检测安全漏洞。

**建议**: 立即删除此文件。如果将来需要 `list-reveal/chapter` 组件，应先将组件移至 `pages/components/ListReveal/` 目录，基于真实组件 API 和 `MaskRevealProps` 类型定义编写新的安全测试，覆盖 XSS 防护、输入验证、错误边界和 DOM 净化。

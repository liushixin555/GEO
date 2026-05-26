# list-reveal-chapter.test.tsx 架构评审

**文件**: `tests/pages/list-reveal-chapter.test.tsx`
**评审类型**: 软件架构评审
**评审日期**: 2026-05-26
**评审结论**: **REJECT 1.0/10** — 被测模块不存在致架构根基为零 + 违反 `.agents/` 只读铁律 + Mock 架构与真实组件 API 断裂 + 测试层次错位

---

## 评审维度与评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 被测目标存在性 | 0/10 | ListRevealChapter 源组件不存在，整个测试架构无地基 |
| 合规性 | 0/10 | 三处引用 `.agents/` 只读目录，违反 CLAUDE.md 铁律第6条 |
| Mock 架构准确性 | 2/10 | MaskReveal mock 用 data-* 透传，真实组件用 className+style，API 完全断裂 |
| 测试层次定位 | 2/10 | 声称是单元测试但依赖完整的 CSS 类名结构和 DOM 层级，层次模糊 |
| 测试隔离性 | 4/10 | jest.mock 覆盖了外部依赖，但 mock 目标路径全部不存在 |
| 描述块组织 | 5/10 | describe 按 step 值分区合理，但内部断言粒度不一致 |
| 依赖方向 | 1/10 | 测试依赖不存在的外部模块，依赖方向为虚指向 |

---

## 详细发现

### CRITICAL (3项)

**C-1: 被测模块不存在 — 架构根基为零**
- **位置**: L10 `import ListRevealChapter from '../../.agents/skills/web-video-presentation/references/EXAMPLES/list-reveal/chapter'`
- **问题**: `ListRevealChapter` 组件在项目中不存在。`.agents/skills/web-video-presentation/references/EXAMPLES/list-reveal/` 目录为空，无 `chapter.tsx` 或 `chapter.ts`。TypeScript 编译直接报 TS2307，**59 个测试全部不可执行**
- **架构影响**:
  - 测试文件是一份"悬空模块"——它的 import 图中只有一个不存在的节点
  - 在模块依赖图中，此文件是死叶节点，无上游消费者、无下游被测目标
  - CI 管道中此文件必然报错或被跳过，无法提供任何回归保护
- **验证**:
  ```
  FAIL tests/pages/list-reveal-chapter.test.tsx
  TS2307: Cannot find module '../../.agents/skills/web-video-presentation/references/EXAMPLES/list-reveal/chapter'
  Test Suites: 1 failed, 1 total
  Tests:       0 total
  ```

**C-2: 违反 `.agents/` 只读铁律 — 架构边界违规**
- **位置**: L10（import）、L14（mock MaskReveal）、L35（mock CSS）— 三处引用 `.agents/skills/` 路径
- **问题**: CLAUDE.md 铁律第6条规定 `.agents/skills/` 为只读参考资源，禁止修改、删除或测试。本文件的整个测试架构建立在被禁路径之上
- **架构影响**:
  - 测试模块的依赖图跨越了项目规定的架构边界
  - 即使 `.agents/` 中的文件存在，测试它们也违反了项目的分层约束
  - 正确的架构做法：如果需要使用该组件，应将其复制到项目源码层（如 `pages/components/ListReveal/`），然后在源码层编写测试
- **依赖方向图**:
  ```
  本文件 ──import──> .agents/skills/.../chapter.tsx (不存在, 越界)
  本文件 ──mock───> .agents/skills/.../MaskReveal    (不存在, 越界)
  本文件 ──mock───> .agents/skills/.../chapter.css   (不存在, 越界)

  正确依赖方向:
  测试文件 ──import──> pages/components/ListReveal/Chapter.tsx (项目源码)
  测试文件 ──mock───> pages/components/MaskReveal/index.tsx   (项目源码, 可选)
  ```

**C-3: Mock 架构与真实组件 API 完全断裂**
- **位置**: L13-31 MaskReveal mock 定义
- **问题**: Mock 将 MaskReveal 简化为 `data-*` 属性透传：
  ```typescript
  // Mock 实现 (L17-28)
  const MaskReveal = (props: any) =>
    React.createElement('span', {
      'data-testid': 'mask-reveal',
      'data-show': String(props.show),
      'data-delay': String(props.delay ?? ''),
      'data-duration': String(props.duration ?? ''),
    }, props.children);
  ```
  而真实 MaskReveal（`pages/components/MaskReveal/index.tsx`）的架构是：
  ```typescript
  // 真实组件 (MaskReveal/index.tsx)
  const classNames = ['mask-reveal'];
  if (show) classNames.push('in');
  if (className) classNames.push(className);
  const style = {
    display: 'inline-block',
    transitionDelay: show ? `${delay}ms` : '0ms',
    transitionDuration: duration ? `${duration}ms` : undefined,
  };
  ```
- **架构断裂点**:
  | 行为 | Mock | 真实组件 |
  |------|------|----------|
  | show 状态切换 | `data-show="true/false"` | className 添加/移除 `in` |
  | className 拼接 | **丢失** | `mask-reveal in ${className}` |
  | style 计算 | **丢失** | `transitionDelay/transitionDuration` CSS |
  | children 渲染 | 透传 | 透传（唯一一致） |
  | displayName | **丢失** | `'MaskReveal'` |
- **影响**: Mock 创建了一个与真实组件完全不同的 DOM 结构。测试断言基于 `data-*` 属性（如 L92-96 的 `data-duration`/`data-show`），而真实组件使用 className 和 inline style。**即使源组件存在，所有 MaskReveal 相关断言也会失败**

### HIGH (5项)

**H-1: 测试层次错位 — 既非单元测试也非集成测试**
- **问题**: 本文件声称测试一个 React 组件，但架构定位模糊：
  - 如果是**单元测试**：不应依赖完整的 CSS 类名结构（`.lr-intro`、`.lr-slot-ghost` 等 15+ 个 CSS 类），这些是实现细节
  - 如果是**集成测试**：应使用真实的 MaskReveal（`pages/components/MaskReveal/index.tsx` 存在），而非 mock
  - 如果是**快照测试**：应使用 `toMatchSnapshot()` 记录每个 step 的完整渲染输出，而非逐一断言 DOM 结构
- **影响**: 测试层次不清导致断言策略混乱——既有 DOM 结构验证（单元风格），又有场景切换验证（集成风格），还有精确计数（实现细节）

**H-2: CSS Module mock 架构缺陷 — 零样式映射**
- **位置**: L34-37 `jest.mock('...chapter.css', () => ({}))`
- **问题**: CSS Module 被 mock 为空对象 `{}`，所有 `styles['lr-intro']` 等引用变为 `undefined`。但测试中所有断言基于硬编码的 CSS 类名字符串（如 `.querySelector('.lr-intro')`），与 CSS Module 的哈希化机制矛盾
- **架构矛盾**:
  - 如果源组件使用 `className={styles['lr-intro']}`，真实渲染的 className 是哈希值如 `lr-intro_a3b2c`，而非 `.lr-intro`
  - 如果源组件使用 `className="lr-intro"`（普通字符串），则不需要 CSS Module mock
  - 测试架构同时假定了两种互斥的 CSS 使用方式

**H-3: 测试与被测模块无版本绑定**
- **问题**: 测试中对组件行为的假设（如 step=0 渲染 `lr-intro`、3 个 slot 的标题/正文内容、kicker 文字等）全部来自测试作者的想象或临时文档，没有与任何接口定义或类型契约绑定
- **缺失的架构要素**:
  - 无 `ListRevealChapterProps` 类型定义导入
  - 无 step 值的枚举或常量定义
  - 无 slot 数据源的 fixture 文件
  - 无组件 API 的契约文档
- **影响**: 如果将来创建源组件，其实现几乎不可能与 59 个断言精确匹配

**H-4: 断言策略过度依赖 CSS 类名实现细节**
- **问题**: 59 个测试中 35+ 个使用 `querySelector('.lr-xxx')` 或 `classList.contains('lr-xxx')`，与 CSS 类名强耦合。这是最脆弱的断言层：
  - CSS 重构（BEM 命名变更、CSS-in-JS 迁移）→ 大量测试失败
  - className 拼写错误 → 测试通过但实际功能错误
  - 类名合并（如条件类名）→ `querySelector` 可能匹配不到
- **建议**: 使用 `data-testid` 或 `@testing-library/react` 的语义化查询（`getByRole`、`getByText`）

**H-5: 无错误路径和异常架构测试**
- **问题**: 59 个测试全部是"快乐路径"断言，缺少：
  - 组件渲染异常时的 ErrorBoundary 行为
  - 缺少必要 props 时的降级渲染
  - MaskReveal 抛出异常时的传播路径
  - 无效 step 值的类型错误处理
- **影响**: 测试架构缺少"负面测试"维度，无法验证组件的健壮性边界

### MEDIUM (5项)

**M-1: describe 组织粒度不一致**
- **位置**: L46-130 (step=0, 14个it)、L133-174 (step=1, 8个it)、L177-212 (step=2, 7个it)
- **问题**: step=0 有 14 个测试（包含大量细节断言），而 step=4+ 只有 4 个测试。不同 step 的测试覆盖深度差异大，无统一的断言模板
- **建议**: 抽取通用 slot 状态断言函数（如 `expectSlotState(step, slotIndex, state)`），统一各 step 的断言深度

**M-2: MaskReveal 调用计数测试是脆弱的实现细节断言**
- **位置**: L337-367 整个 describe 块
- **问题**: 精确断言 MaskReveal 实例数量（如 step=2 期望 3 个）是最脆弱的测试类型——任何实现变更（如给 ghost 槽位也加动画）都会导致失败，但不是真正的 bug
- **架构层面**: 应测试"每个 active/past 槽位的标题是否被 MaskReveal 包裹"（行为），而非"页面总共有几个 MaskReveal"（计数）

**M-3: 无 TestRenderer 或浅渲染策略**
- **问题**: 所有测试使用完整的 `render()`（RTL），但 mock 了所有外部依赖。如果源组件有子组件树、context provider、或 useEffect 副作用，完整渲染的成本远高于浅渲染
- **建议**: 对于纯展示组件，考虑 `shallow render` 或仅测试关键交互

**M-4: beforeEach(clearAllMocks) 是架构噪音**
- **位置**: L41-43
- **问题**: 文件中无 `jest.fn()` / `jest.spyOn()`，clearAllMocks 清理目标为零。这是模板代码残留，误导维护者认为存在需要清理的 mock 状态

**M-5: 缺少类型安全的断言辅助函数**
- **问题**: 大量重复的 DOM 查询模式（如 `container.querySelector('.lr-slot')?.classList.contains(...)`）可提取为类型安全的辅助函数：
  ```typescript
  function getSlot(container: HTMLElement, index: number): HTMLElement
  function getSlotState(container: HTMLElement, index: number): 'ghost' | 'active' | 'past'
  function getMaskRevealProps(element: Element): { show: boolean; delay: number; duration: number }
  ```
- **影响**: 缺少抽象层导致测试代码与 DOM 结构高度耦合，重构成本高

### LOW (3项)

**L-1: 相对路径过深**
- **位置**: L10 `../../.agents/skills/...`
- **问题**: 5 层相对路径降低可读性，但这是 Jest 配置限制

**L-2: 无测试文件与源文件的关联文档**
- **问题**: 缺少注释说明为什么测试 `.agents/` 下的组件（即使有的话也应该在源码目录）

**L-3: React import 冗余**
- **位置**: L8 `import React from 'react'`
- **问题**: React 17+ JSX Transform 不需要显式 import，但 jest.mock 内部 require('react') 使其可接受

---

## 架构分析总结

### 模块依赖图

```
实际状态（全部断裂）:
┌─────────────────────────────┐
│ list-reveal-chapter.test.tsx│
│  ├── import ──> .agents/.../chapter.tsx     ✗ 不存在
│  ├── mock ────> .agents/.../MaskReveal      ✗ 不存在, 越界
│  └── mock ────> .agents/.../chapter.css     ✗ 不存在
└─────────────────────────────┘

应有架构:
┌─────────────────────────────┐     ┌────────────────────────────┐
│ list-reveal-chapter.test.tsx│     │ pages/components/          │
│  ├── import ──> ListReveal/ │────>│   ListReveal/Chapter.tsx   │
│  │                 Chapter  │     │   ListReveal/Chapter.css   │
│  ├── mock ────> MaskReveal  │────>│   (使用真实或精确 mock)     │
│  └── mock ────> Chapter.css │     └────────────────────────────┘
└─────────────────────────────┘
```

### 测试架构缺陷根因分析

```
根因链:
1. `.agents/` 目录结构不稳定 → 参考资源不应作为测试目标
2. 组件未迁移到项目源码层 → 测试架构失去被测目标
3. Mock 基于假设而非真实 API → Mock 与真实组件断裂
4. 断言基于想象中的 DOM 结构 → 无法验证任何真实行为
5. 结果: 59 个测试 = 59 行死代码
```

### 与同类测试文件的对比

| 对比项 | 本文件 | MaskReveal.test.tsx (已评审) | 项目中可执行的测试 |
|--------|--------|------------------------------|-------------------|
| 源组件存在 | **不存在** | 不存在 | 存在 |
| `.agents/` 引用 | 3处（越界） | 2处（越界） | 0处 |
| Mock 路径正确 | 0/3 | 0/2 | N/A |
| 测试可执行 | 0/59 | 0/39 | 全部可执行 |
| 架构层次 | 模糊 | 模糊 | 明确 |
| 评审结论 | **REJECT 1.0/10** | REJECT 1.5/10 | N/A |

---

## 修复优先级与工时估算

| 优先级 | 项 | 工时 |
|--------|-----|------|
| P0 | 删除本测试文件（源组件不存在 + 违反铁律） | 5min |
| P0 | 如需保留：将 list-reveal 组件从 `.agents/` 复制到 `pages/components/ListReveal/` | 2h |
| P0 | 重写 MaskReveal mock 对齐真实 API（className + style） | 30min |
| P1 | 重新设计断言策略（data-testid / 语义化查询替换 CSS 类名） | 1h |
| P1 | 抽取类型安全的 DOM 查询辅助函数 | 30min |
| P2 | 补充错误路径、边界值、a11y 测试 | 1h |
| P2 | 统一 describe 断言模板，消除粒度差异 | 30min |
| **总计** | | **~6h**（从零重建） |

---

## 评审结论

`list-reveal-chapter.test.tsx` 的架构评审结论为 **REJECT 1.0/10**。三个 CRITICAL 发现使其在架构层面完全不成立：

1. **被测模块不存在**（C-1）— 测试架构的第一要素是被测目标必须存在。此文件 import 的 `ListRevealChapter` 组件在项目中不存在，`59 个测试全部为不可执行的死代码`。

2. **违反 `.agents/` 只读铁律**（C-2）— 三处 import/mock 路径指向项目规定禁止测试的只读目录。正确的架构做法是将组件迁移到项目源码层后再编写测试。

3. **Mock 架构与真实 API 断裂**（C-3）— MaskReveal mock 使用 `data-*` 属性透传，而真实组件使用 className + inline style。两套完全不同的 DOM 结构意味着即使源组件存在，所有 MaskReveal 相关的 15+ 个断言也会失败。

**建议**: 立即删除此文件。如果将来需要 `list-reveal/chapter` 组件，应先将组件移至 `pages/components/ListReveal/` 目录，基于真实组件 API 和 `MaskRevealProps` 类型定义编写新测试。

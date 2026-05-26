# list-reveal-chapter.test.tsx 质量评审

**文件**: `tests/pages/list-reveal-chapter.test.tsx`
**评审类型**: 软件质量评审
**评审日期**: 2026-05-26
**评审结论**: **REJECT 1.2/10** — 源组件不存在致全部59测试不可执行 + 违反 `.agents/` 只读铁律 + Mock 与真实组件 API 不匹配

---

## 评审维度与评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 可执行性 | 0/10 | TS2307 编译错误，0 测试通过，源组件不存在 |
| 合规性 | 1/10 | 违反 CLAUDE.md 铁律第6条：禁止测试 `.agents/` 目录 |
| 测试覆盖设计 | 5/10 | step 分支覆盖思路合理，但 Mock 与真实组件严重偏离 |
| Mock 质量 | 2/10 | MaskReveal mock 丢失核心行为（show 状态切换），CSS mock 为空对象 |
| 边界覆盖 | 6/10 | 覆盖 step 0-5、负数、极端值 100，但缺 null/undefined/浮点数 |
| 断言质量 | 5/10 | DOM 查询合理但过于依赖 CSS 类名，无 snapshot 兜底 |
| 代码规范 | 4/10 | 中英文混用、冗余 beforeEach、部分测试重复 |

---

## 详细发现

### CRITICAL (3项)

**C-1: 源组件不存在，全部测试不可执行**
- **位置**: L10 `import ListRevealChapter from '../../.agents/skills/web-video-presentation/references/EXAMPLES/list-reveal/chapter'`
- **问题**: 目标路径 `.agents/skills/web-video-presentation/references/EXAMPLES/list-reveal/chapter.tsx` 文件不存在。运行测试报 TS2307 编译错误，**59 个测试全部无法执行**
- **验证**:
```
FAIL tests/pages/list-reveal-chapter.test.tsx
TS2307: Cannot find module '../../.agents/skills/web-video-presentation/references/EXAMPLES/list-reveal/chapter'
Test Suites: 1 failed, 1 total
Tests:       0 total
```
- **影响**: 整个测试文件是死代码，CI/CD 无法检测任何回归
- **修复**: 要么创建源组件，要么删除此测试文件

**C-2: 违反 `.agents/` 目录只读铁律**
- **位置**: L10, L14, L35 — 三处 import/mock 引用 `.agents/skills/` 路径
- **问题**: CLAUDE.md 铁律第6条明确规定："禁止修改或测试 `.agents/` 目录 — `.agents/skills/` 下的所有文档（README、SKILL、manifest、模板、主题等）禁止任何形式的修改、删除或测试，该目录为只读参考资源"
- **影响**: 违反项目硬性规则，即使源文件存在也不应对其编写测试
- **修复**: 如果需要 list-reveal 组件，应将其复制到项目源码目录（如 `pages/components/ListReveal/`）后再编写测试

**C-3: MaskReveal Mock 与真实组件 API 不匹配**
- **位置**: L17-30 MaskReveal mock
- **问题**: Mock 仅透传 `show/delay/duration` 为 data 属性，而真实 `MaskReveal`（`pages/components/MaskReveal/index.tsx`）具备：
  - `className` prop → 拼接到 `mask-reveal in` 类名
  - `style` prop → 设置 `transitionDelay` 和 `transitionDuration`
  - `show` 状态 → 控制 `in` 类名添加
  - `displayName` 赋值
- Mock 将所有行为简化为 `data-*` 属性透传，完全丧失了对 `show` 状态切换、`className` 拼接、`style` 计算的验证能力
- **影响**: 即使测试通过，也不能证明 MaskReveal 的集成行为正确
- **修复**: 如果源组件存在，应使用真实 MaskReveal 或更精确地 mock 其行为

### HIGH (5项)

**H-1: CSS Module mock 为空对象，零样式验证**
- **位置**: L34-37 `jest.mock('...chapter.css', () => ({}))`
- **问题**: CSS module 被 mock 为 `{}`，所有 `styles.xxx` 引用变为 `undefined`。如果源组件使用 `styles['lr-intro']` 等 CSS module 引用，实际渲染的 className 会是 `undefined` 而非预期类名
- **影响**: 所有基于 CSS 类名的断言（`.querySelector('.lr-intro')`）在真实 CSS module 环境下可能失败
- **修复**: 使用 identity-obj-proxy 或手动返回类名映射
```typescript
jest.mock('...chapter.css', () => new Proxy({}, {
  get: (_, key) => key,
}));
```

**H-2: 无 null/undefined/浮点数 step 边界测试**
- **问题**: 测试覆盖了 step 0-5、-1、100，但缺少：
  - `step={undefined}` — 未传 prop 时的行为
  - `step={null}` — 显式 null
  - `step={0.5}` — 浮点数
  - `step={NaN}` — 非数字
- **影响**: 源组件如果缺少 prop 校验，可能在这些边界崩溃
- **修复**: 补充边界测试

**H-3: 场景切换测试缺少完整生命周期验证**
- **位置**: L369-411 场景切换 describe
- **问题**: rerender 测试仅验证 DOM 结构变化，缺少：
  - 组件卸载时是否清理定时器/副作用
  - 快速连续 rerender 是否产生竞态
  - 从高 step 切回低 step 的行为
- **影响**: 状态切换的完整正确性无法保证

**H-4: 缺少无障碍性（a11y）测试**
- **问题**: 59 个测试中无任何 a11y 相关断言：
  - 无 `aria-label`、`role` 属性验证
  - 无语义化标签检查（h1/h2/button 等）
  - 无 axe-core 自动化 a11y 检测
- **影响**: 组件可访问性完全未知

**H-5: beforeEach(clearAllMocks) 无效且误导**
- **位置**: L41-43 `beforeEach(() => { jest.clearAllMocks(); })`
- **问题**: 文件中仅使用 `jest.mock()`（模块级 hoisted mock），无 `jest.fn()` 或 `jest.spyOn()` 调用。`clearAllMocks()` 在每次测试前执行但清理目标为零，是无效代码
- **影响**: 给维护者造成"存在需要清理的 mock"的错误印象
- **修复**: 移除此 beforeEach 或添加注释说明意图

### MEDIUM (5项)

**M-1: 槽位编号测试冗余**
- **位置**: L414-423 `forEach([0,1,2,3,4])` — 5 个测试
- **问题**: 5 个 step 值测试完全相同的断言（01/02/03 编号存在），因为编号是静态内容不随 step 变化。一个测试足够
- **影响**: 测试套件膨胀，运行时间增加
- **修复**: 合并为单一测试或使用 `test.each` 并验证差异点

**M-2: 测试描述中英文混用不规范**
- **位置**: 多处，如 L47 `'step=0 — 引子'` vs L308 `'active 槽位的 title 被 MaskReveal 包裹（duration=900）'`
- **问题**: describe 用中文，it 用中英文混合，部分用英文关键字（active/ghost/past），部分用中文
- **修复**: 统一使用中文描述或统一英文

**M-3: DOM 查询过于依赖实现细节**
- **问题**: 所有断言使用 `.querySelector('.lr-xxx')` 和 `classList.contains()`，与 CSS 类名强耦合。CSS 重构（如改用 CSS-in-JS 或 BEM 命名变更）会导致大量测试失败
- **建议**: 配合 `data-testid` 或使用 `@testing-library/react` 的语义化查询（`getByRole`/`getByText`）

**M-4: 缺少 snapshot 测试**
- **问题**: 组件有明确的渲染结构，但无 snapshot 测试兜底。每个 step 的完整渲染输出应有 snapshot 记录，防止意外结构变更
- **建议**: 对 step 0-4 各生成一次 snapshot

**M-5: MaskReveal 调用统计可能随实现变化**
- **位置**: L337-367 MaskReveal 调用统计 describe
- **问题**: 测试断言精确的 MaskReveal 实例数量（如 "step=2: 3 个"），这是实现细节而非行为验证。如果源组件决定对 ghost 槽位也添加 MaskReveal（如渐入效果），这些测试全部失败
- **修复**: 改为验证关键内容的 reveal 行为而非精确计数

### LOW (3项)

**L-1: import 路径使用相对路径 `../../`**
- **位置**: L10, L14, L35
- **问题**: 深层相对路径可读性差，但这是 Jest 配置限制，可接受

**L-2: 缺少测试文件头部模块描述**
- **位置**: L1-7 注释
- **现状**: 有 `@jest-environment jsdom` 和简要说明，内容合理
- **建议**: 可补充作者/创建日期

**L-3: 未使用 React import**
- **位置**: L8 `import React from 'react'`
- **问题**: React 17+ JSX Transform 不再需要显式 import React，但 jest.mock 内部使用了 `require('react')`，保留 import 也可接受

---

## 测试统计

| 指标 | 值 |
|------|-----|
| 测试文件 | 1 |
| describe 块 | 11 |
| 测试用例 | 59 |
| **可执行测试** | **0** |
| Mock 文件 | 3（全部引用不存在的路径） |
| 覆盖源文件 | 0（源不存在） |

---

## Mock 路径审计

| Mock 目标 | 路径 | 文件存在 | 问题 |
|-----------|------|----------|------|
| ListRevealChapter | `.agents/skills/.../list-reveal/chapter` | **不存在** | C-1 |
| MaskReveal | `.agents/skills/.../components/MaskReveal` | 不存在（真实路径: `pages/components/MaskReveal`） | C-3 |
| CSS Module | `.agents/skills/.../list-reveal/chapter.css` | **不存在** | H-1 |

---

## 与同类测试文件的对比

| 对比项 | 本文件 | `MaskReveal.test.tsx`（已评审） |
|--------|--------|-------------------------------|
| 源组件存在 | **不存在** | 不存在（1.5/10 REJECT） |
| `.agents/` 引用 | 是（违反铁律） | 是（违反铁律） |
| 测试可执行 | 0/59 | 0/39 |
| Mock 质量 | data-* 透传 | 类似问题 |
| 评审结论 | **REJECT 1.2/10** | REJECT 1.5/10 |

**结论**: 本文件与已评审的 `MaskReveal.test.tsx` 存在相同的根本性问题——对 `.agents/` 只读目录中不存在的组件编写测试。这是项目级系统性问题，需要从流程层面解决。

---

## 修复优先级与工时估算

| 优先级 | 项 | 工时 |
|--------|-----|------|
| P0 | C-1+C-2: 删除本测试文件（源组件不存在+违反铁律） | 5min |
| P0 | C-2: 如需保留，将组件从 `.agents/` 复制到 `pages/components/` | 1h |
| P0 | C-3: 重写 MaskReveal mock 匹配真实 API | 30min |
| P1 | H-1: CSS module mock 改用 identity-obj-proxy | 15min |
| P1 | H-2: 补充边界测试（null/undefined/NaN） | 30min |
| P2 | H-3~H-5, M-1~M-5 | 1h |
| **总计** | | **~3.5h**（从零重建） |

---

## 总结

`list-reveal-chapter.test.tsx` 是一份**完全不可执行的测试文件**。三个根本性问题使其评审分数极低：(1) 被测组件不存在，TypeScript 编译失败；(2) 所有 import 路径指向 `.agents/` 只读目录，违反 CLAUDE.md 铁律；(3) MaskReveal mock 与真实组件 API 严重不匹配。即使假设源组件存在，Mock 质量低下（空 CSS mock、行为丢失）也会导致测试信度不足。

**建议**: 删除此文件。如果将来需要 list-reveal 组件，应先将组件移至项目源码目录，再基于真实 API 编写测试。

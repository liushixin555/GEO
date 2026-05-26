# MaskReveal.test.tsx 软件架构专家评审

**文件**: `tests/pages/video-presentation/MaskReveal.test.tsx`
**被测目标**: `.agents/skills/web-video-presentation/templates/src/components/MaskReveal`（不存在）
**评审日期**: 2026-05-26
**评审类型**: 软件架构评审
**综合评分**: **1.5 / 10** — REJECT

---

## 评分维度

| 维度 | 得分 | 权重 | 加权分 |
|------|------|------|--------|
| 测试架构与被测组件结构对齐度 | 0/10 | 25% | 0.00 |
| 测试隔离策略与依赖边界 | 2/10 | 20% | 0.40 |
| 测试分层与职责划分 | 4/10 | 15% | 0.60 |
| 测试套件可维护性与可扩展性 | 5/10 | 15% | 0.75 |
| 项目集成架构合规性 | 0/10 | 15% | 0.00 |
| Jest 配置与构建管线对齐 | 3/10 | 10% | 0.30 |
| **加权总分** | | | **2.05 → 1.5** |

> 评分说明：由于两个 CRITICAL 阻断项直接导致测试架构的根基不存在（源组件不存在 + 违反项目铁律），大多数维度得分为理论分析（"假设源组件存在时的评估"），不改变 REJECT 结论。

---

## 一、架构阻断项（BLOCKING）

### B-1: 被测组件不存在——测试架构建立于虚设之上 `[BLOCKING]`

**位置**: L6
```typescript
import { MaskReveal } from '../../../.agents/skills/web-video-presentation/templates/src/components/MaskReveal';
```

**事实**:
- `.agents/skills/web-video-presentation/templates/src/` 下仅有 `hooks/` 和 `registry/` 两个子目录
- `components/` 目录 **不存在**
- `MaskReveal` 组件文件 **不存在**
- 快照文件 `__snapshots__/MaskReveal.test.tsx.snap` 是孤立产物

**架构影响**:

```
┌──────────────────────────────────────────────────────┐
│             MaskReveal.test.tsx 测试架构              │
├──────────────────────────────────────────────────────┤
│  describe: 渲染逻辑 (5 tests)      → ✗ 无渲染目标    │
│  describe: CSS 类名 (10 tests)     → ✗ 无组件实例    │
│  describe: 内联样式 (9 tests)      → ✗ 无样式来源    │
│  describe: Children 渲染 (6 tests) → ✗ 无容器组件    │
│  describe: 状态切换联动 (4 tests)  → ✗ 无状态管理    │
│  describe: Props 边界 (6 tests)    → ✗ 无 props 接口 │
│  describe: 快照测试 (3 tests)      → ✗ 无快照基准    │
│  describe: unmount 稳定性 (5 tests)→ ✗ 无生命周期    │
└──────────────────────────────────────────────────────┘
          │
          ▼ 导入路径
┌──────────────────────────────────────────────────────┐
│  .agents/.../components/MaskReveal  ← 文件不存在     │
│  .agents/.../components/            ← 目录不存在     │
└──────────────────────────────────────────────────────┘
```

整棵测试架构树没有根节点。39 个测试用例、8 个 describe 分组、所有断言逻辑——全部无法执行。

**严重性**: BLOCKING — 这是最高优先级的架构缺陷。没有源组件，测试架构的存在本身就是错误的。

### B-2: 违反项目铁律——直接测试 `.agents/` 只读目录 `[BLOCKING]`

**项目规则**（`.claude/rules.md` L44）:
> 禁止操作 `.agents/skills/web-video-presentation` — 该目录已删除，禁止任何形式的创建、修改、恢复或测试

**CLAUDE.md 铁律**:
> 禁止修改或测试 `.agents/` 目录 — `.agents/skills/` 下的所有文档禁止任何形式的修改、删除或测试，该目录为只读参考资源

**架构违规分析**:

```
项目架构边界:

  生产代码(pages/) ← 允许测试 ← 测试代码(tests/)
       ↑                    ↑
       │                    │
  参考资源(.agents/) ← 禁止测试 ← 测试代码(tests/)
       ↑
       │ × 违规：MaskReveal.test.tsx 直接导入 .agents/ 组件
```

`.agents/skills/` 在项目架构中定位为 **只读参考资源**（类似于 node_modules 或第三方文档），其设计目的是：
1. 为开发提供参考模板和设计规范
2. 不参与项目的编译、测试、构建流程
3. 可随时删除而不影响项目功能

测试文件直接依赖 `.agents/` 违反了这一架构边界，造成：
- 测试与只读资源产生耦合
- 删除 `.agents/` 会导致测试失败（实际上 `.agents/` 中的组件已不存在）
- 项目构建管线无法正确处理此依赖

**严重性**: BLOCKING — 违反项目架构规则，是不可接受的架构设计。

---

## 二、Jest 项目配置架构分析

### 2.1 三项目配置结构

`jest.config.ts` 定义了三个独立项目：

```
jest.config.ts
├── project: api        → roots: tests/apis/
├── project: page       → roots: tests/pages/
│                         testPathIgnorePatterns: video-presentation
└── project: video-presentation → roots: tests/pages/video-presentation/
                                   custom transform: jest.transform.js
```

**架构观察**:
- `page` 项目通过 `testPathIgnorePatterns` 排除 `video-presentation` 测试
- `video-presentation` 项目有独立的 transform 配置（`jest.transform.js`）
- 这意味着 `video-presentation` 测试在架构上被视为**独立子系统**，不属于 `page` 测试体系

### 2.2 配置碎片化问题

**问题 H-1: 三套独立配置增加维护成本**

`video-presentation` 项目与 `page` 项目共享 `jsdom` 环境和 `identity-obj-proxy` CSS mock，但有独立的：
- transform 配置（`jest.transform.js` vs `ts-jest`）
- roots 定义
- 无 `moduleNameMapper` 中的 `@pages/` 别名

**影响**: 当需要更改测试基础设施时（如添加新的 setup 文件、更新 tsconfig），必须同步修改三个位置而非两个。

---

## 三、测试架构设计分析（假设源组件存在）

> 以下分析基于"如果源组件存在"的假设，评估测试架构本身的设计质量。

### 3.1 测试分层架构

```
MaskReveal.test.tsx 测试分层:

L1: 渲染逻辑        → 验证 DOM 输出（span 存在性）
L2: CSS 类名        → 验证 className 组合
L3: 内联样式        → 验证 style 属性
L4: Children 渲染   → 验证内容透传
L5: 状态切换联动    → 验证 rerender 行为
L6: Props 边界      → 验证默认值和极端值
L7: 快照测试        → 验证 DOM 结构回归
L8: unmount 稳定性  → 验证生命周期安全
```

**架构评价**:

| 维度 | 评价 |
|------|------|
| 分层清晰度 | 良好 — 8 个 describe 区块职责分明 |
| 层间依赖 | 良好 — 每个 describe 独立，无跨 describe 状态共享 |
| 覆盖层次 | 中等 — 缺少性能测试、可访问性测试、事件测试 |
| 冗余度 | 偏高 — L1/L2/L5 存在大量重复断言（约 30% 重叠） |

### 3.2 测试隔离策略

**问题 M-1: 零 Mock 策略**

整个测试文件没有任何形式的 mock：

```typescript
// 无 jest.mock()
// 无 jest.fn()
// 无 jest.spyOn()
// 无 jest.replaceProperty()
```

`beforeEach` 中的 `jest.clearAllMocks()`（L10）是空操作——没有 mock 需要清理。

**架构分析**: 这是一把双刃剑：

| 优势 | 劣势 |
|------|------|
| 测试更接近真实行为 | 无法隔离外部依赖 |
| 无 mock 维护成本 | 无法模拟错误场景 |
| 测试代码更简洁 | 无法测试边界条件（如 CSS 类定义不存在） |
| 执行速度更快 | 无法验证内部调用链 |

对于纯展示型组件（如 MaskReveal），零 mock 策略是合理的。但如果组件引入了任何外部依赖（hooks、context、CSS modules），此策略将无法维持。

### 3.3 测试查询策略

```
查询方法使用分布:

screen.getByText()     → 53 次（主查询方式）
container.querySelector →  5 次（后备方式）
screen.getByRole()     →  0 次（未使用）
screen.getByTestId()   →  0 次（未使用）
```

**问题 M-2: 语义查询缺失**

测试完全依赖 `getByText` 进行元素定位，这是 Testing Library 的**推荐次优选择**（最优为 `getByRole`）。对于一个纯展示组件，`getByText` 可以接受，但如果组件支持交互（如 `onClick`），则需要 `getByRole` 来验证可访问性。

**问题 M-3: container.querySelector 破坏封装**

L206-209、L269-273 等处使用 `container.querySelector('span')` 直接查询 DOM，绕过了 Testing Library 的抽象层。这使测试与组件的 DOM 实现细节产生耦合——如果根元素从 `span` 改为 `div`，测试将失败。

### 3.4 快照测试架构

```
快照架构:

MaskReveal.test.tsx (L424-444)
  ├── show=true 基础快照
  ├── show=false 基础快照
  └── 完整 props 快照
      │
      ▼
__snapshots__/MaskReveal.test.tsx.snap
  （记录 DOM 结构 → 但源组件不存在，快照是虚假的）
```

**架构问题**:
1. 快照覆盖的 3 种状态组合已被单元测试完整覆盖，快照无增量价值
2. 组件 DOM 结构极为简单（单 `<span>`），快照回归检测的价值趋近于零
3. 快照是脆弱的——任何样式微调都会触发快照更新，增加维护噪音

---

## 四、测试覆盖度架构分析

### 4.1 Props 接口覆盖矩阵

假设 MaskReveal 组件的 Props 接口为：

```typescript
interface MaskRevealProps {
  show: boolean;       // 必填
  delay?: number;      // 可选，默认 0
  duration?: number;   // 可选，默认无
  className?: string;  // 可选
  children?: React.ReactNode;  // 可选
}
```

| Prop | 正常值 | 零值/空值 | 负值 | 大数值 | 未传 |
|------|--------|----------|------|--------|------|
| show | ✅ | ✅ | N/A | N/A | ✗（必填） |
| delay | ✅ | ✅ (0) | ✅ | ✅ | ✅ (默认0) |
| duration | ✅ | ✅ (0) | ✅ | ✗ | ✅ |
| className | ✅ | — | — | — | ✅ |
| children | ✅ | ✅ ('') | — | — | △ |

**未覆盖的 Props 场景**:

| 场景 | 严重性 | 说明 |
|------|--------|------|
| `null` children | MEDIUM | React 常见用法 `{condition && <El/>}` |
| `undefined` children | MEDIUM | 组件可能收到 undefined |
| `false` children | LOW | 布尔值在 React 中不渲染 |
| 超大数值 duration | LOW | 可能导致 CSS 值溢出 |
| `show` 切换 + `children` 变更 | MEDIUM | 同时变更两个 props |

### 4.2 行为覆盖矩阵

| 行为维度 | 已覆盖 | 未覆盖 |
|----------|--------|--------|
| 初始渲染 | ✅ | — |
| 类名组合 | ✅ | — |
| 样式计算 | ✅ | transition-property 定义 |
| 状态切换 | ✅ | — |
| Children 透传 | ✅ | null/undefined/false |
| 卸载安全 | ✅ | — |
| 可访问性 | — | aria-hidden、role、focus |
| 事件处理 | — | onClick、onTransitionEnd |
| CSS 过渡完整性 | — | transition-property + delay + duration 联动 |
| React key 稳定性 | — | 列表中使用的 key 行为 |
| ref 转发 | — | forwardRef 支持 |
| TypeScript 类型安全 | — | 无类型导入，编译期无保障 |

---

## 五、架构风险矩阵

```
                     高影响
                       │
    B-1 源组件不存在   │   B-2 铁律违规
                       │   H-1 配置碎片化
  ─────────────────────┼───────────────────── 高概率
                       │
    M-1 零Mock策略     │   M-2 语义查询缺失
    M-3 querySelector  │   M-4 快照低价值
                       │
                     低影响
```

---

## 六、修复优先级矩阵

| 优先级 | 编号 | 工作量 | 修复建议 |
|--------|------|--------|---------|
| P0 | B-1 | 2h | 创建 MaskReveal 组件或修正导入路径，使源文件可定位 |
| P0 | B-2 | 1h | 将测试目标从 `.agents/` 迁移到 `pages/components/` 正式目录 |
| P1 | H-1 | 0.5h | 评估 video-presentation 项目配置是否可合并到 page 项目 |
| P1 | M-2 | 0.5h | 补充 `getByRole` 语义查询，替换部分 `getByText` |
| P1 | M-3 | 0.5h | 替换 `container.querySelector` 为 `screen` 查询 |
| P2 | M-1 | 0.5h | 评估是否需要 mock（如 CSS module、外部 hooks） |
| P2 | M-4 | 0.5h | 考虑删除或精简快照测试 |
| P3 | — | 1h | 合并重复测试用例（L1/L2/L5 约 30% 重叠） |

**总修复工作量**: ~6h（其中 P0 占 3h）

---

## 七、架构改进建议

### 7.1 测试文件应遵循的项目架构

```
推荐架构:

pages/
  components/
    MaskReveal/
      index.tsx           ← 生产组件
      MaskReveal.module.css  ← 样式文件

tests/
  pages/
    components/
      MaskReveal.test.tsx  ← 测试文件（导入 pages/components/MaskReveal）
```

```
当前架构（错误）:

tests/pages/video-presentation/
  MaskReveal.test.tsx      ← 导入 .agents/.../MaskReveal（不存在）
```

### 7.2 Jest 配置建议

如果 video-presentation 组件被迁移到 `pages/components/`，则：
- 测试文件应移至 `tests/pages/components/` 或 `tests/pages/video-presentation/`（保留但修正导入）
- `jest.config.ts` 中 `page` 项目的 `testPathIgnorePatterns` 应更新
- 独立的 `video-presentation` 项目配置可考虑合并到 `page` 项目

### 7.3 测试架构改进方向

1. **引入类型导入**: `import type { MaskRevealProps } from '...'` — 编译期验证 props 传递正确
2. **参数化重复用例**: 使用 `test.each` 合并 CSS 类名和边界值测试
3. **删除无效 beforeEach**: `jest.clearAllMocks()` 在无 mock 的测试中是噪音
4. **补充可访问性测试**: 验证 `aria-hidden` 在 `show=false` 时的行为
5. **添加 `ref` 转发测试**: 验证组件是否正确暴露 DOM 引用

---

## 八、结论

### 架构优势（理论层面）

- G-1: 8 个 describe 区块按行为维度分组，结构清晰
- G-2: 测试覆盖了组件的主要行为维度（渲染/样式/状态/边界/稳定性）
- G-3: 使用 `rerender` 验证状态切换，测试了组件的动态行为
- G-4: 测试独立性良好，无跨 describe 状态泄漏

### 架构风险（实际层面）

- R-1: **被测组件不存在** — 整个测试架构建立于虚设之上，39 个测试用例全部不可执行（B-1）
- R-2: **违反项目铁律** — 直接测试 `.agents/` 只读目录，违反项目架构边界规则（B-2）
- R-3: **快照是虚假产物** — 源组件不存在时生成的快照无任何回归检测价值
- R-4: **配置碎片化** — 独立的 video-presentation Jest 项目增加了维护负担

### 评审结论

**REJECT** — 测试架构存在两个根本性阻断：

1. **架构根基不存在**: 测试的目标组件文件不存在，整棵测试架构树无根节点。这不是"测试写得好不好"的问题，而是"测试有没有意义"的问题。39 个精心设计的测试用例，全部因为 `import` 路径指向的文件不存在而无法执行。

2. **违反架构边界**: `.agents/skills/` 在项目架构中明确定义为只读参考资源，禁止测试。测试文件直接依赖此目录，不仅违反规则，还造成了目录删除后测试失败的架构脆弱性。

**与前序质量评审的关系**: 本次架构评审（1.5/10）的评分低于质量评审（3.8/10），原因在于架构评审更关注"测试架构是否正确建立"而非"测试用例是否设计良好"。即使 39 个测试用例设计完美（理论可达 7.0/10），如果架构根基不存在，评分也应趋近于零。

**修复后预期**: 解决 B-1（创建源组件 + 迁移导入路径）和 B-2（迁移到正式源码目录）后，预期架构评分可达 **6.0-6.5/10**。

---

*软件架构专家评审完成 — 2026-05-26*

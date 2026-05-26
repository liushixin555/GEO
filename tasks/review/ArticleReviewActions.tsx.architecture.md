# ArticleReviewActions.tsx — 软件架构专家评审

| 维度 | 评分 | 等级 |
|------|------|------|
| 组件职责边界 | 2.0/10 | CRITICAL |
| 消费者集成状态 | 1.0/10 | CRITICAL |
| 状态管理架构 | 3.0/10 | CRITICAL |
| Props 契约完备性 | 4.0/10 | HIGH |
| 权限感知架构 | 3.0/10 | HIGH |
| 组件可复用性 | 4.5/10 | HIGH |
| 跨组件一致性 | 3.0/10 | HIGH |
| **综合** | **2.9/10** | **CRITICAL** |

**结论：REQUEST CHANGES** — 存在 3 项 CRITICAL 架构缺陷，4 项 HIGH 级别问题。组件从未被任何文件导入使用，属于死代码；同时 `ArticleContentEditor.tsx` 以内联方式重复了相同功能，形成严重的 DRY 违反和架构断裂。

---

## CRITICAL-1 — 组件从未被导入使用，是死代码

**位置**：`ArticleReviewActions.tsx` 全文件（29 行）

全局搜索 `ArticleReviewActions` 仅在以下位置出现：
- 组件自身定义文件
- 质量评审文档引用

**无任何 `.tsx` / `.ts` 文件 import 此组件**。`ArticleContentEditor.tsx` L77-94 以内联方式复制了完全相同的 Alert + Popconfirm + Button 结构：

```tsx
// ArticleContentEditor.tsx L77-94 — 与 ArticleReviewActions.tsx 功能完全重复
{article?.status === 'pending_review' && (
  <Alert type="warning" message="该文章待审核" showIcon style={{ marginBottom: 12 }}
    action={
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Popconfirm ...onConfirm={() => onReview(true)}>
          <Button type="primary" icon={<CheckCircleOutlined />}>审核通过</Button>
        </Popconfirm>
        <Popconfirm ...onConfirm={() => onReview(false)}>
          <Button danger icon={<CloseCircleOutlined />}>审核不通过</Button>
        </Popconfirm>
      </div>
    }
  />
)}
```

**影响链**：

1. **两套代码需同步维护**：文案、样式、交互逻辑任何变更需修改两处
2. **已产生行为分歧**：`ArticleReviewActions` 按钮 `size="small"`，内联版本无 size（默认 medium）；内联版本多 `alignItems: 'center'`
3. **增加认知负担**：开发者需同时理解两套实现才能确认行为一致性
4. **bundle 中存在无用代码**：即使 tree-shaking 可能移除，仍增加维护成本

**修复方案（二选一）**：

- **A（推荐）**：在 `ArticleContentEditor.tsx` 中 `import ArticleReviewActions` 替换内联代码，将 `status === 'pending_review'` 条件判断作为组件内部职责
- **B**：删除 `ArticleReviewActions.tsx`，保留 `ArticleContentEditor.tsx` 中的内联实现（如果审核 UI 确实只在此处使用）

---

## CRITICAL-2 — 组件与消费者的职责边界模糊，条件渲染职责错位

**位置**：`ArticleReviewActions.tsx` L9-26 vs `ArticleContentEditor.tsx` L77-94

**架构问题**：组件自身不包含 `status === 'pending_review'` 判断逻辑，将条件渲染推给消费者：

```tsx
// ArticleReviewActions — 无条件判断，只渲染 Alert
const ArticleReviewActions = ({ onReview }) => <Alert .../>

// ArticleContentEditor — 消费者负责条件判断
{article?.status === 'pending_review' && <Alert .../>}
```

这违反了**"信息专家原则"（Information Expert Pattern）**——审核 UI 出现的条件（`pending_review` 状态）是审核组件自身的领域知识，不应由消费者掌握。

**对比项目中其他状态驱动组件的模式**：

| 组件 | 状态条件 | 条件判断位置 |
|------|---------|------------|
| `ArticleSettingsForm` | `isSettingsEditable` | **父组件**传入 prop |
| `ArticleContentEditor` | `isContentEditable` | **父组件**传入 prop |
| `ArticleContentEditor` 中审核内联 | `article.status === 'pending_review'` | **组件自身**内部判断 |

项目采用了两种不一致的模式：设置/编辑使用 prop 传入可编辑状态，审核操作使用内部状态判断。

**修复建议**：组件应自行接收 `status` 或 `visible` prop 来控制渲染，或接受 `article` 对象自行判断：

```tsx
// 方案 1：接受 visible prop（显式控制）
interface Props {
  visible: boolean;
  onReview: (approved: boolean) => void;
}

// 方案 2：接受 article 状态（组件自行判断）
interface Props {
  status: ArticleStatus;
  onReview: (approved: boolean) => void;
}
```

---

## CRITICAL-3 — 组件缺少状态管理，无法支持异步操作生命周期

**位置**：L6 `onReview: (approved: boolean) => void`，L17/L20 onConfirm 回调

**架构缺陷**：组件是纯无状态展示组件，但审核操作是一个**异步业务流程**：

```
用户点击 → Popconfirm 确认 → API 请求 (PUT /review) → 成功/失败 → UI 反馈
```

当前架构中，异步生命周期被撕裂在三个层级：

| 层级 | 文件 | 职责 |
|------|------|------|
| UI 展示层 | `ArticleReviewActions.tsx` | 渲染按钮（无状态） |
| UI 逻辑层 | `ArticleContentEditor.tsx` | 中转 `onReview` 回调 |
| 数据层 | `useArticleActions.ts` L15-24 | 发起 API 调用、显示 message |

**问题**：

1. **加载态断裂**：`useArticleActions.review` 是 async 函数返回 Promise，但 `onReview` 类型签名为 `(approved: boolean) => void`，Promise 返回值被丢弃
2. **防重复点击缺失**：组件无法感知 API 调用进行中，用户可连续点击
3. **错误状态无反馈**：API 失败后只通过 `message.error` 提示，组件内无任何视觉变化

**修复建议**：组件应管理自身的 loading 状态，`onReview` 签名应支持 Promise：

```tsx
interface ArticleReviewActionsProps {
  onReview: (approved: boolean) => Promise<void>;
}

const ArticleReviewActions: React.FC<Props> = ({ onReview }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReview = async (approved: boolean) => {
    setLoading(true);
    setError(null);
    try {
      await onReview(approved);
    } catch {
      setError(approved ? '审核通过操作失败' : '审核不通过操作失败');
    } finally {
      setLoading(false);
    }
  };
  // Button 添加 loading={loading} disabled={loading}
};
```

---

## HIGH-1 — 组件缺少权限感知，与 useArticlePermissions 架构脱节

**位置**：`ArticleReviewActions.tsx` 全组件 vs `useArticlePermissions.ts`

项目已有权限架构 `useArticlePermissions`：

```typescript
// useArticlePermissions.ts L20
const canReview = article?.status === 'pending_review' && user.role === 'sysadmin';
```

审核操作需要 `sysadmin` 角色，但 `ArticleReviewActions` 完全不感知权限：

| 权限维度 | `useArticlePermissions` | `ArticleReviewActions` | `ArticleContentEditor` 内联 |
|---------|------------------------|----------------------|--------------------------|
| 角色检查 | `user.role === 'sysadmin'` | ❌ 无 | ❌ 无 |
| 状态检查 | `status === 'pending_review'` | ❌ 无 | ✅ 有 |
| 组合判断 | `canReview` | ❌ 无 | ❌ 无 |

**严重性**：虽然前端权限不是安全屏障（后端 API 会校验），但前端缺少权限控制会导致：
1. 非 sysadmin 用户看到审核按钮，点击后 API 返回 403，用户体验差
2. 权限逻辑散落在不同组件中，难以全局审计

**修复建议**：组件应接收 `canReview` prop 或自行判断权限：

```tsx
interface ArticleReviewActionsProps {
  visible: boolean;        // 或 canReview
  onReview: (approved: boolean) => Promise<void>;
}
```

---

## HIGH-2 — ArticleContentEditor 职责过重，审核操作嵌入内容编辑器违反 SRP

**位置**：`ArticleContentEditor.tsx` L77-94

`ArticleContentEditor` 已承担 5 项职责：

| # | 职责 | Props |
|---|------|-------|
| 1 | 版本显示 + 保存状态 | `article`, `contentSaving` |
| 2 | 内容模式切换（浏览/编辑） | `contentMode`, `onContentModeChange` |
| 3 | 内容保存 | `onSaveContent` |
| 4 | 提交审核 / 重新生成 | `onSubmitForReview`, `onRegenerate` |
| 5 | **审核操作** | `onReview` |

第 5 项（审核操作）是**独立的业务流程**，与内容编辑无直接关联。将其嵌入编辑器导致：
- 编辑器组件 props 膨胀（11 个 props）
- 审核流程无法在其他场景复用
- 组件渲染树中，审核 UI 和编辑 UI 强耦合

**项目对比**：`ArticleDetail.tsx` 作为页面级编排组件，已经管理了 `actions`（来自 `useArticleActions`）、`permissions`、`detail` 等多个 hooks。审核操作应在 `ArticleDetail` 层级直接使用 `ArticleReviewActions`，而非穿过 `ArticleContentEditor` 中转。

**修复建议**：将审核 UI 从 `ArticleContentEditor` 中提取出来，在 `ArticleDetail.tsx` 中直接使用：

```tsx
// ArticleDetail.tsx
{permissions.canReview && (
  <ArticleReviewActions
    visible={detail.article?.status === 'pending_review'}
    onReview={actions.review}
  />
)}
<ArticleContentEditor
  // 移除 onReview prop
  {...otherProps}
/>
```

---

## HIGH-3 — inline style 硬编码违反项目 CSS Token 架构

**位置**：L14 `style={{ marginBottom: 12 }}`，L16 `style={{ display: 'flex', gap: 8 }}`

项目已建立 CSS 变量体系（`pages/styles/global.css`），但组件使用硬编码数值：

| 样式属性 | 当前值 | 应使用 Token |
|---------|--------|-------------|
| `marginBottom: 12` | 硬编码 | `var(--spacing-sm)` 或 antd token `spacing[3]` |
| `gap: 8` | 硬编码 | `var(--spacing-xs)` 或 antd token `spacing[2]` |

**内联版本额外问题**：`ArticleContentEditor.tsx` L84 还添加了 `alignItems: 'center'`，两处实现样式不一致。

**修复**：使用 antd `Space` 组件或 CSS 类：

```tsx
// 使用 antd Space（推荐）
<Space size={8}>
  <Popconfirm ...><Button .../></Popconfirm>
  <Popconfirm ...><Button .../></Popconfirm>
</Space>
```

---

## HIGH-4 — onReview 回调类型不支持异步反馈，类型签名与实现不匹配

**位置**：L6 `onReview: (approved: boolean) => void`

**类型层面**：回调返回 `void`，但实际消费者 `useArticleActions.review` 返回 `Promise<void>`：

```typescript
// useArticleActions.ts L15
const review = useCallback(async (approved: boolean): Promise<void> => {
  // ...
}, [...]);
```

TypeScript 的 `() => void` 签名允许传入 `() => Promise<void>` 函数（协变），所以编译不报错。但这掩盖了运行时的 Promise 被丢弃问题，消费者无法获知操作完成。

**影响**：
- 无法实现加载态（C-3 的根因）
- 无法实现错误回退（操作失败后无法在组件内显示错误信息）
- 类型系统无法保护异步操作的完整性

---

## MEDIUM-1 — Popconfirm 硬编码中文文案，未与内联版本统一管理

**位置**：L13/17/18/20/21

6 处中文硬编码字符串与 `ArticleContentEditor.tsx` 中完全相同但分别维护。未来文案变更（如 "审核通过" 改为 "批准"）需同步修改两处。

**修复**：如果采用方案 A（保留 ArticleReviewActions），只需维护一处；如果采用方案 B，此问题自动消除。

---

## MEDIUM-2 — 组件缺少 displayName 和 TypeScript 严格导出

**位置**：L28

```tsx
export default React.memo(ArticleReviewActions);
```

React.memo 包裹后部分打包器会丢失组件名。项目应统一添加 `displayName`。

---

## MEDIUM-3 — Button size 在两处实现不一致

**位置**：L18/L21 `size="small"` vs `ArticleContentEditor.tsx` L86/L89 无 size 属性

| 实现 | Button 高度 | 一致性 |
|------|-----------|--------|
| `ArticleReviewActions.tsx` | ~24px（small） | 与 DESIGN.md 40px 不符 |
| `ArticleContentEditor.tsx` 内联 | ~32px（default） | 较接近 |

两处审核按钮高度相差 8px，视觉效果不一致。

---

## LOW-1 — Popconfirm okText/cancelText 冗余

**位置**：L17/L20

如果项目通过 `ConfigProvider` 配置了全局中文 locale，此处 `okText="确认"` / `cancelText="取消"` 是多余的。

---

## LOW-2 — 未利用 antd Space 组件

**位置**：L16

```tsx
<div style={{ display: 'flex', gap: 8 }}>
```

antd 的 `Space` 组件已提供 flex 布局 + 间距控制，应使用 `<Space size={8}>` 替代原生 div + inline style，同时自动处理子元素间距和对齐。

---

## 架构改进路线图

### 第一阶段（阻断级，必须修复）

| # | 问题 | 修复方案 | 预估工时 |
|---|------|---------|---------|
| C-1 | 死代码 | 在 `ArticleContentEditor` 中导入 ArticleReviewActions 替换内联代码，或删除此组件 | 15min |
| C-2 | 条件渲染职责错位 | 组件接受 `visible` 或 `status` prop，自行控制渲染 | 10min |
| C-3 | 缺少状态管理 | 添加 loading/error 状态，onReview 支持 Promise | 30min |

### 第二阶段（质量提升）

| # | 问题 | 修复方案 | 预估工时 |
|---|------|---------|---------|
| H-1 | 无权限感知 | 接收 `canReview` prop 或在组件内判断 | 15min |
| H-2 | 审核嵌入编辑器 | 从 ArticleContentEditor 中提取到 ArticleDetail 层级 | 30min |
| H-3 | inline style | 使用 antd Space 替代 flex div | 10min |
| H-4 | onReview 类型 | `onReview: (approved: boolean) => Promise<void>` | 5min |

### 第三阶段（长期优化）

| # | 问题 | 修复方案 |
|---|------|---------|
| M-1 | 文案双维护 | 统一到单一组件中 |
| M-3 | Button size 不一致 | 移除 size="small" |
| L-1 | 冗余 okText/cancelText | 依赖 ConfigProvider locale |
| L-2 | 原生 div 布局 | 使用 antd Space |

---

## 修复后预期评分

| 维度 | 当前 | 修复后 |
|------|------|--------|
| 组件职责边界 | 2.0 | 7.5 |
| 消费者集成状态 | 1.0 | 8.0 |
| 状态管理架构 | 3.0 | 8.0 |
| Props 契约完备性 | 4.0 | 8.0 |
| 权限感知架构 | 3.0 | 7.5 |
| 组件可复用性 | 4.5 | 8.0 |
| 跨组件一致性 | 3.0 | 7.5 |
| **综合** | **2.9** | **7.8** |

---

## 评审信息

| 项目 | 值 |
|------|-----|
| 文件 | pages/article/components/ArticleReviewActions.tsx |
| 行数 | 29 |
| 评审类型 | 软件架构专家评审 |
| 评审日期 | 2026-05-26 |
| 关联文件 | pages/article/components/ArticleContentEditor.tsx, pages/article/ArticleDetail.tsx, pages/article/hooks/useArticleActions.ts, pages/article/hooks/useArticlePermissions.ts, pages/article/types.ts |
| 关联评审 | [质量评审](ArticleReviewActions.tsx.quality.md) 4.0/10 |

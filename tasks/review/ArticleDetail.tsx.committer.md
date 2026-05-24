# pages/article/ArticleDetail.tsx — Committer 审核专家评审报告

**评审日期**: 2026-05-24
**评审角色**: Committer 审核专家（代码合并准入 + 测试完备性 + 功能规格符合度 + 项目规范遵循 + 生产就绪度）
**文件路径**: `pages/article/ArticleDetail.tsx`
**代码行数**: 889 行
**测试文件**: 不存在（`tests/pages/article/` 目录不存在）
**关联文件**: `pages/components/Layout.tsx:185`（路由注册 `/article/:id`）, `pages/context/AppContext.tsx`（项目上下文）, `apis/controller/article.controller.ts`（后端接口）
**任务规格**: `tasks/dev014.GEO文章.md`
**已有评审**: 质量评审（ArticleDetail.tsx.md，C+）、安全评审（ArticleDetail.tsx.security.md，D+）、UI评审（ArticleDetail.tsx.ui.md，4.2/10）、架构评审（ArticleDetail.tsx.architecture.md，D+）

---

## 一、Committer 审核总览

从代码提交审核人（Committer）视角审视，`ArticleDetail.tsx` 是项目核心业务页面，已正确注册路由（`Layout.tsx:185`）且可被导航到达。但该文件存在**5项规格偏差（其中3项为功能缺失）**、**零测试覆盖**、**1处确定性 Bug（ant 组件 prop 错误）**，以及从安全评审继承的存储型 XSS 高危漏洞。作为 Committer，本文件**不满足合并准入标准**。

| 审核维度 | 评分 | 判定 |
|----------|------|------|
| 功能规格符合度 | 5/10 | ❌ 拒绝 — 3项功能缺失 + 2项规格偏差 + 1处死代码 |
| 测试完备性 | 0/10 | ❌ 拒绝 — 无任何测试文件 |
| 路由契约正确性 | 9/10 | ✅ 通过 — 路由注册正确，参数传递正确 |
| 项目规范遵循 | 4/10 | ❌ 拒绝 — Alert prop 错误、any 类型滥用、内联样式过多 |
| 安全合规性 | 3/10 | ❌ 拒绝 — 存储型 XSS、JSON.parse 无防护、Token 大面积暴露 |
| 生产就绪度 | 4/10 | ❌ 拒绝 — 无 Error Boundary、无未保存提示、无降级处理 |

**综合判定: ❌ 拒绝合并（REJECT）**

**核心理由**: 规格偏差导致功能缺失（删除、重新提交、待审核正文编辑）、零测试覆盖、ant 组件 prop Bug 将导致错误信息不显示。

---

## 二、规格符合度逐项审计

以下逐条比对 `tasks/dev014.GEO文章.md` 的验收标准与代码实现。

| # | 验收标准 | 代码实现 | 判定 |
|---|----------|----------|------|
| 1 | 系统管理员可查看所有项目的文章 | `canEditSettings`/`canEditContent` 含 sysadmin 判断；后端兜底 | ✅ 通过 |
| 2 | 运营者只能查看自己有权限的项目下的文章 | 后端 `checkProjectOperator` 兜底 | ✅ 通过 |
| 3 | 运营者访问无权限项目的文章时返回 403 | 后端校验，前端 `message.error` 展示 | ✅ 通过 |
| 4 | 只有创建者和 sysadmin 可编辑文章 | L297-307 `canEditSettings` + `canEditContent` 双重判断 | ✅ 通过 |
| 5 | 编辑仅限草稿/AI生成失败/发布失败状态 | `canEditSettings` 仅允许 draft/manual_writing；`canEditContent` 含 EDITABLE_STATUSES | ⚠️ 部分通过（见 BLK-03） |
| 6 | 编辑提交后文章回到 AI 生成中状态 | `handleSaveSettings` 中 `submitForGeneration=true` 时设 `status='generating'` | ✅ 通过 |
| 7 | **仅草稿状态下可删除文章** | **无删除按钮、无 handleDelete 函数** | ❌ **缺失** |
| 8 | 待审核状态可审核通过/不通过 | L797-813 审核按钮（审核通过/不通过） | ✅ 通过 |
| 9 | 审核通过进入发布中，不通过回到草稿 | `handleReview(approved: boolean)` 调用后端 | ✅ 通过 |
| 10 | 关键词可选择AI知识库关键词 | L557-558 `kbKeywords` + Select | ✅ 通过 |
| 11 | 画像支持输入/选择切换 | L561-578 Segmented 切换 | ✅ 通过 |
| 12 | 插图可选择AI知识库图片或手动输入URL | L580-681 三模式（知识库/上传/URL） | ✅ 通过 |
| 13 | 发布平台从发布平台数据表中选择 | L690-765 平台选择 Modal + 分页 | ✅ 通过 |
| 14 | 必填字段为空时提示错误 | antd Form rules `required` | ✅ 通过 |
| 15 | 新建/编辑/查看为独立路由页面 | `/article/:id` 路由，`id` 为 `new` 或数字 | ✅ 通过 |
| 16 | 文章有正文时 Tab 切换 | 使用 Collapse（非 Tabs），详见 MED-01 | ⚠️ 偏差 |
| 17 | 正文每次保存自动递增版本号 | 后端处理，前端显示 `version.toFixed(1)` | ✅ 通过 |
| 18 | 版本历史保存在 article_versions 表 | 后端处理，前端**无版本历史浏览入口** | ⚠️ 部分实现 |
| 19 | **待审核状态创建者仍可编辑正文** | `EDITABLE_STATUSES` 不含 `pending_review`，**不可编辑** | ❌ **Bug** |
| 20 | 非编辑状态时字段为只读（disabled） | `isSettingsEditable` 控制所有字段 disabled | ✅ 通过 |

**通过**: 14/20（70%）
**不通过**: 3项缺失/Bug，3项部分通过/偏差

---

## 三、致命问题（Blocker）

### BLK-01: 零测试覆盖 — 违反项目 TDD 铁律

**严重度**: 🔴 BLOCKER
**位置**: `tests/pages/article/` 目录不存在

**验证**:

| 检查项 | 结果 |
|--------|------|
| 测试目录存在 | ❌ 无 `tests/pages/article/` |
| 组件渲染测试 | ❌ |
| 表单交互测试 | ❌ |
| API 调用测试 | ❌ |
| 权限逻辑测试 | ❌ |
| 状态流转测试 | ❌ |
| 文档导入测试 | ❌ |

CLAUDE.md 开发铁律第 4 条明确要求"严格测试"。对于 889 行的核心业务组件，以下场景必须覆盖：

```
1. 新建文章 — AI 生成模式表单提交
2. 新建文章 — 手工编写模式表单提交
3. 编辑草稿 — 保存设置
4. 编辑草稿 — 保存正文
5. AI 生成失败 — 重新提交
6. 待审核 — 审核通过/不通过
7. 权限控制 — 非 sysadmin/非创建者不可编辑
8. 文档导入 — .md / .docx 解析
9. 自动保存 — 5 分钟定时器
10. 画像/插图/平台选择交互
```

**Committer 裁决**: 补全测试后方可合并，最低覆盖 10 个核心场景。

---

### BLK-02: 缺少删除功能 — 规格要求的功能缺失

**严重度**: 🔴 BLOCKER
**位置**: 全文件
**规格来源**: `tasks/dev014.GEO文章.md` 业务规则第 4 条

**分析**:

规格明确要求：
> 4. **删除限制**：
>    - 仅草稿状态下可删除文章
>    - 仅文章创建者和 sysadmin 可删除

后端已实现 `DELETE /api/projects/:projectId/articles/:id` 端点（`dev014.GEO文章.md` API 端点表第 5 行），但前端代码中：
- 无 `handleDelete` 函数
- 无删除按钮
- 无 Popconfirm 删除确认

**Committer 裁决**: 必须补全删除功能。实现方案：
```tsx
{/* 在 form-actions 区域，draft 状态下显示 */}
{(isNew || article?.status === 'draft') && (
  <Popconfirm title="确认删除此文章？" onConfirm={handleDelete} okText="确认" cancelText="取消">
    <Button danger loading={deleting}>删除文章</Button>
  </Popconfirm>
)}
```

---

### BLK-03: 待审核状态正文不可编辑 — 规格违反

**严重度**: 🔴 BLOCKER
**位置**: L21 `EDITABLE_STATUSES`, L303-307 `canEditContent()`
**规格来源**: `tasks/dev014.GEO文章.md` 业务规则第 9 条

**分析**:

规格明确要求：
> 9. **待审核状态正文编辑**：
>    - 文章处于待审核（pending_review）状态时，创建者仍可编辑正文内容

但代码中：
```typescript
const EDITABLE_STATUSES = ['draft', 'manual_writing', 'generate_failed', 'publish_failed'];
// ❌ 缺少 'pending_review'
```

导致在 `pending_review` 状态下：
- `canEditContent()` 返回 `false`
- 内容区的 Segmented（浏览/编辑切换）不显示
- "保存正文"按钮不显示
- 创建者无法编辑正文

**修复**:
```typescript
const EDITABLE_STATUSES = ['draft', 'manual_writing', 'generate_failed', 'publish_failed', 'pending_review'];
```

同时需注意：在 `pending_review` 状态下，仅 `created_by` 用户（非 sysadmin）或 sysadmin 可编辑正文，且仅限内容编辑，不可编辑设置字段。当前 `canEditContent` 已包含此权限判断逻辑，修复 `EDITABLE_STATUSES` 即可。

---

### BLK-04: generate_failed / publish_failed 状态无法重新提交 — 功能断裂

**严重度**: 🔴 BLOCKER
**位置**: L402-414 `handleRegenerate`（死代码）、L866-883 action buttons
**规格来源**: `tasks/dev014.GEO文章.md` 状态流转图

**分析**:

规格要求的状态流转：
```
AI生成失败 ──(编辑后提交)──→ AI生成中
发布失败 ──(编辑后提交)──→ AI生成中
```

代码存在两个问题：

**问题 1**: `handleRegenerate` 函数（L402-414）已实现但**从未在 JSX 中调用**，属于死代码。全文件搜索 `handleRegenerate` 仅在函数定义处出现一次。

**问题 2**: 底部 action buttons 仅在 `article?.status === 'draft'` 时显示：
```tsx
{(isNew || article?.status === 'draft') && (
  <Button ...>存草稿</Button>
)}
```

这意味着在 `generate_failed` 和 `publish_failed` 状态下：
- 用户可以编辑正文内容（`isContentEditable` 为 `true`）
- 但没有任何"重新提交"按钮
- `handleRegenerate` 已写好却从未使用
- 用户陷入死胡同：能编辑但无法提交

**修复方案**:
```tsx
{/* 在 contentTab 的操作栏中添加 */}
{article && ['generate_failed', 'publish_failed'].includes(article.status) && isContentEditable && (
  <Popconfirm title="确认重新提交AI生成？" onConfirm={handleRegenerate} okText="确认" cancelText="取消">
    <Button size="small" type="primary" icon={<ReloadOutlined />}>重新生成</Button>
  </Popconfirm>
)}
```

---

### BLK-05: Alert 组件 prop 错误 — 错误信息不显示

**严重度**: 🔴 BLOCKER（确定性 Bug）
**位置**: L526 `Alert` 组件

**分析**:

```tsx
// L526
<Alert type="error" title={error} className="form-alert" showIcon closable onClose={() => setError('')} />
```

Ant Design 的 `Alert` 组件**不接受 `title` prop**。正确属性是 `message`。这意味着 `error` 状态信息**永远不会被渲染到页面上**。

验证：antd Alert API 文档确认，显示文本的属性是 `message`（必填）和 `description`（选填），不存在 `title` 属性。

**修复**:
```tsx
<Alert type="error" message={error} className="form-alert" showIcon closable onClose={() => setError('')} />
```

**Committer 注**: 同一文件 L799 的 `Alert` 也使用了 `title` prop，需一并修复：
```tsx
// L799
<Alert type="warning" title="该文章待审核" ... />
// 应改为
<Alert type="warning" message="该文章待审核" ... />
```

---

## 四、高危问题（High）

### HIG-01: JSON.parse 无防护 — 页面白屏风险

**严重度**: 🟠 HIGH
**位置**: L47

```typescript
const user = JSON.parse(localStorage.getItem('user') || '{}');
```

如果 `localStorage` 中的 `user` 值被意外损坏（非合法 JSON），`JSON.parse` 将抛出异常，导致整个组件崩溃。由于该行位于组件函数体顶层（非 try-catch 内），React Error Boundary 如果不存在则直接白屏。

**修复**:
```typescript
const [user, setSafeUser] = useState<{ id: number; role: string }>(() => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {} as any;
  }
});
```

或更简洁：
```typescript
let user: any = {};
try { user = JSON.parse(localStorage.getItem('user') || '{}'); } catch {}
```

---

### HIG-02: 存储型 XSS — Markdown 渲染无消毒

**严重度**: 🟠 HIGH
**位置**: L816-825
**来源**: 安全评审 SEC-ART-01（CRITICAL → Committer 降级为 HIGH）

```tsx
<MDEditor value={content} preview="live" />
<MDEditor.Markdown source={content} />
```

`MDEditor` 和 `MDEditor.Markdown` 默认不进行 HTML/JS 消毒。如果后端未对文章内容进行 HTML sanitize（当前后端 `updateArticleContent` 仅做类型检查），攻击者可注入 `<script>` 或 `<img onerror=alert(1)>` 等恶意代码。

**Committer 裁决**: 此问题的根因在后端（内容存储前未消毒），但前端应作为纵深防御添加 `DOMPurify` 或类似库。鉴于后端已有 JWT 认证 + RBAC 限制了谁可以编辑内容，降级为 HIGH。修复方式：
```tsx
import DOMPurify from 'dompurify';
<MDEditor.Markdown source={DOMPurify.sanitize(content)} />
```

---

### HIG-03: 自动保存定时器清理条件不完整 — 内存泄漏

**严重度**: 🟠 HIGH
**位置**: L93-133

```typescript
useEffect(() => {
  const TIMER = 5 * 60 * 1000;
  const timer = setInterval(async () => { ... }, TIMER);
  return () => clearInterval(timer);
}, [isNew, id, projectId]); // ← isNew 变化时不重建定时器？
```

**问题**: 依赖数组包含 `isNew`，当用户创建新文章后（`isNew` 从 `true` 变为 `false`），定时器会被销毁并重建，但闭包中的 `isNew` 值会更新。然而，在 L101-120 的 `if (isNew)` 分支中，新文章自动保存后会调用 `navigate(..., { replace: true })`，此后 `isNew` 变为 `false`，定时器重建。这个流程理论上可行，但在快速操作场景下（保存 → 立即编辑 → 定时器触发），可能出现竞态：
1. 定时器闭包中 `isNew=true`
2. 用户手动保存，`navigate` 触发，`isNew` 变为 `false`
3. 但旧定时器尚未清理，仍在 `isNew=true` 分支执行
4. 导致重复创建文章

**修复建议**: 使用 `useRef` 追踪 `isNew` 的实时值，而非依赖 `useEffect` 闭包：
```typescript
const isNewRef = useRef(isNew);
isNewRef.current = isNew;
```

---

### HIG-04: 13+ 处重复读取 localStorage — 性能 + 维护风险

**严重度**: 🟠 HIGH
**位置**: L100, L140, L198-199, L315, L334, L348, L376, L392, L406, L419, L487, L227

每个异步操作都独立调用 `localStorage.getItem('token')`：
```typescript
const token = localStorage.getItem('token');
```

**问题**:
1. 性能：`localStorage.getItem` 是同步 I/O 操作，在同一个渲染周期内被调用多次
2. 维护：如果 token 存储方式变更（如迁移到 httpOnly cookie），需修改 13+ 处
3. 一致性：无法保证所有调用使用相同的 token（虽然实际中差异极小）

**修复建议**: 抽取为工具函数或 Context：
```typescript
// utils/auth.ts
export const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

// 使用
const res = await axios.get(`/api/...`, { headers: getAuthHeaders() });
```

---

## 五、中等问题（Medium）

### MED-01: 使用 Collapse 而非 Tabs — 规格偏差

**严重度**: 🟡 MEDIUM
**位置**: L836-848, L861-865
**规格来源**: `tasks/dev014.GEO文章.md` 功能说明

规格明确要求：
> 使用 Tab 标签页切换「文章设置」和「正文」

代码使用了 `Collapse`（折叠面板）而非 `Tabs`（标签页）。虽然 Collapse 在视觉上可同时展开多个面板，但与规格不符。

**Committer 裁决**: 功能上可用，不阻塞合并，但应作为技术债务排期修复。

---

### MED-02: 无版本历史浏览功能

**严重度**: 🟡 MEDIUM
**位置**: L773 仅显示版本号
**规格来源**: `tasks/dev014.GEO文章.md` API 端点表

后端已提供 `GET /api/projects/:projectId/articles/:id/versions` 端点，但前端：
- 仅显示当前版本号 `版本 {(article.version ?? 1.0).toFixed(1)}`
- 无版本历史列表
- 无版本对比功能
- 无版本回滚功能

**Committer 裁决**: 核心版本管理功能（自动递增、历史存储）由后端保证，前端缺失浏览入口不阻塞合并，但应排期补全。

---

### MED-03: any 类型滥用 — 类型安全降级

**严重度**: 🟡 MEDIUM
**位置**: L68, L105, L202, L309, L314, L365, L478

多处使用 `any` 类型：

| 行号 | 代码 | 问题 |
|------|------|------|
| L68 | `const [platformList, setPlatformList] = useState<any[]>([])` | 应定义 Platform interface |
| L105 | `const payload: any = {` | 应定义 CreateArticlePayload type |
| L202 | `(s: any) => ({ label: s.name, value: s.id })` | 应定义 Skill/Model interface |
| L309 | `async (values: any)` | Form values 应有类型定义 |
| L314 | `const payload: any = {` | 应定义 UpdateArticlePayload type |
| L47 | `const user = JSON.parse(...)` | 解析结果为 any |
| L478 | `catch (err: any)` | 应使用 unknown + 类型守卫 |

---

### MED-04: 表单操作按钮条件过于限制

**严重度**: 🟡 MEDIUM
**位置**: L866-883

```tsx
{isSettingsEditable && (
  <div className="form-actions">
    {(isNew || article?.status === 'draft') && ( ... )}
    {(isNew || article?.status === 'draft') && writeMode !== 'manual' && ( ... )}
    {(isNew || article?.status === 'draft') && writeMode === 'manual' && ( ... )}
  </div>
)}
```

三个按钮全部硬编码 `article?.status === 'draft'`，导致：
- `manual_writing` 状态下：`isSettingsEditable` 为 `true`，但按钮全不显示
- `generate_failed` / `publish_failed` 状态下：同样无按钮

如果 `manual_writing` 状态下不应显示设置保存按钮（合理，因为此时应通过内容区的"提交审核"按钮操作），则代码逻辑正确但注释不够清晰。Commit 要求补充注释说明为何 `manual_writing` 不需要设置保存按钮。

---

### MED-05: 未保存变更提示缺失

**严重度**: 🟡 MEDIUM
**位置**: L851-885

用户编辑表单或正文后，如果直接点击返回按钮（`ArrowLeftOutlined`），所有未保存的变更将丢失，无任何确认提示。

```tsx
<Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/article')} />
// ❌ 应添加：如果有未保存的变更，弹出确认框
```

**修复建议**: 使用 antd `Form.isFieldsTouched()` 检测表单变更，结合 `content !== article?.content` 检测正文变更。

---

## 六、低等问题（Low）

### LOW-01: mammoth HTML 转 Markdown 用正则 — 脆弱转换

**位置**: L443-455

HTML 到 Markdown 的转换使用正则替换（`replace(/<h1...>/gi, ...)`），这种方式：
- 无法处理嵌套标签
- 无法处理 HTML 实体（仅处理了 4 种：`&nbsp;`, `&amp;`, `&lt;`, `&gt;`）
- 无法处理列表（`<ul>/<ol>/<li>`）
- 无法处理链接（`<a>`）

**建议**: 使用专门的 HTML-to-Markdown 库（如 `turndown`）。

### LOW-02: 图片管理三种模式共用 imageList — 无来源追踪

**位置**: L58, L604-664

知识库选择、上传、URL 输入三种方式都向同一个 `imageList` 数组添加 URL，无法区分图片来源。如果需要"仅允许删除手动添加的图片，不允许删除知识库图片"，当前设计无法支持。

### LOW-03: document.getElementById 直接 DOM 操作

**位置**: L187, L357

```tsx
document.getElementById('article-content-section')?.scrollIntoView({ behavior: 'smooth' });
```

React 推荐使用 `useRef` 而非 `document.getElementById`。当前已定义 `contentRef` 但未用于此目的。

### LOW-04: 平台选择 Modal 无最大选择数限制

**位置**: L708-764

用户可以选择无限数量的发布平台，无上限限制。在实际业务中，通常需要限制平台数量（如最多 10 个）以避免过度发布。

### LOW-05: 手工编写模式标题仅在 manual 时显示

**位置**: L536-543

```tsx
{writeMode === 'manual' && (
  <Form.Item name="title" label={...} rules={[{ required: true }]}>
```

AI 生成模式下不显示标题输入框（标题由 AI 生成），符合业务逻辑。但 `ArticleData.title` 字段始终存在，如果 AI 模式下用户想预填标题则无法操作。这不是 Bug，是设计决策，但应在规格中明确说明。

---

## 七、代码质量统计

| 指标 | 值 | 评价 |
|------|-----|------|
| 总行数 | 889 | 过大（建议 < 300 行，超过应拆分） |
| useState 数量 | 17 | 过多（建议 < 10，考虑 useReducer 或拆分） |
| useEffect 数量 | 6 | 偏多，依赖关系不清晰 |
| async 函数数量 | 12 | 过多，建议抽取到 hooks 或 service 层 |
| 内联 style 对象数量 | 40+ | 过多，应使用 CSS 类 |
| any 类型使用次数 | 7+ | 偏多，应定义具体类型 |
| 重复代码模式 | 13 处 `localStorage.getItem('token')` | 应抽取工具函数 |
| 死代码 | 1 个函数（`handleRegenerate`） | 应使用或删除 |
| antd 组件误用 | 2 处 Alert `title` prop | 确定性 Bug |

---

## 八、与已有评审的交叉分析

| 已有评审 | 评级 | Committer 认同度 | 说明 |
|----------|------|-----------------|------|
| 质量评审（ArticleDetail.tsx.md） | C+ | ✅ 完全认同 | 组件体量超标、可维护性差的诊断准确 |
| 安全评审（ArticleDetail.tsx.security.md） | D+ | ✅ 完全认同 | XSS 风险和 Token 暴露分析准确，Committer 降级了部分严重度（后端有 RBAC 兜底） |
| UI 评审（ArticleDetail.tsx.ui.md） | 4.2/10 | ✅ 基本认同 | Alert prop 错误和内联样式问题的诊断准确，部分 UI 优化建议需在功能补全后再实施 |
| 架构评审（ArticleDetail.tsx.architecture.md） | D+ | ✅ 完全认同 | God Component 诊断准确，但 Committer 认为架构重构不阻塞本次合并，功能补全优先 |

---

## 九、Committer 最终裁决

### 裁决结果: ❌ REJECT（拒绝合并）

### 裁决理由

1. **功能缺失（致命）**: 缺少删除功能、待审核正文编辑、失败状态重新提交 — 占规格验收标准的 15%
2. **确定性 Bug（致命）**: Alert `title` prop 导致错误信息和审核提示不显示
3. **零测试覆盖（致命）**: 889 行核心业务组件无任何测试，违反项目 TDD 铁律
4. **死代码（高危）**: `handleRegenerate` 已实现但从未使用，导致失败状态无法重新提交

### 合并前必须完成（Blocking）

| 序号 | 修改项 | 严重度 | 预估工作量 |
|------|--------|--------|-----------|
| 1 | 修复 Alert `title` → `message`（2 处） | BLOCKER | 5 分钟 |
| 2 | `EDITABLE_STATUSES` 添加 `'pending_review'` | BLOCKER | 2 分钟 |
| 3 | 添加 `handleDelete` 函数 + 删除按钮 + Popconfirm | BLOCKER | 30 分钟 |
| 4 | 在 contentTab 中使用 `handleRegenerate`，添加重新生成按钮 | BLOCKER | 15 分钟 |
| 5 | `JSON.parse` 添加 try-catch 防护 | HIGH | 5 分钟 |
| 6 | 补全核心测试用例（至少 10 个场景） | BLOCKER | 3 小时 |
| 7 | 通过 `pnpm build` 和 `pnpm lint` | BLOCKER | — |

### 合并后应排期改进（Non-blocking）

| 序号 | 修改项 | 优先级 |
|------|--------|--------|
| 1 | Collapse 改为 Tabs（规格对齐） | P1 |
| 2 | 抽取 `getAuthHeaders` 工具函数 | P1 |
| 3 | 添加 Markdown 渲染消毒（DOMPurify） | P1 |
| 4 | 添加未保存变更提示 | P2 |
| 5 | 补全版本历史浏览 UI | P2 |
| 6 | 定义 Article/Platform/FormValues 类型替换 any | P2 |
| 7 | 替换 mammoth 正则转换为 turndown 库 | P3 |
| 8 | 40+ 内联样式迁移到 CSS 类 | P3 |
| 9 | 组件拆分（God Component → 多个子组件 + hooks） | P3 |

---

## 十、Committer 签名

**审核人**: Committer 审核专家
**审核日期**: 2026-05-24
**裁决**: ❌ REJECT
**预期修复工作量**: 约 4-5 小时（功能补全 1 小时 + 测试编写 3 小时 + 构建/ lint 修复 1 小时）
**后续跟踪**: 修复全部 Blocker 后重新提交 Committer 审核；High/Medium 问题可合并后分批修复
